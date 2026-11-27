import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const APP_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const requireFromApp = createRequire(path.join(APP_DIR, 'package.json'));
const ts = requireFromApp('typescript');

const moduleCache = new Map();

function loadTsModule(relPath) {
  const normalized = relPath.endsWith('.ts') || relPath.endsWith('.tsx')
    ? relPath
    : fs.existsSync(path.join(APP_DIR, `${relPath}.ts`))
      ? `${relPath}.ts`
      : `${relPath}.tsx`;
  const fullPath = path.join(APP_DIR, normalized);
  if (moduleCache.has(fullPath)) {
    return moduleCache.get(fullPath).exports;
  }

  const src = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const mod = { exports: {} };
  moduleCache.set(fullPath, mod);

  const dir = path.dirname(normalized);
  const sandbox = {
    module: mod,
    exports: mod.exports,
    console,
    URL,
    Intl,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    RegExp,
    JSON,
    Uint8Array,
    crypto: globalThis.crypto,
    require: (spec) => {
      if (spec === 'react-native') {
        return { Platform: { OS: 'web' } };
      }
      if (spec.startsWith('.')) {
        const resolvedRel = path.normalize(path.join(dir, spec));
        return loadTsModule(resolvedRel);
      }
      return {};
    },
  };
  vm.runInNewContext(transpiled, sandbox, { filename: normalized });
  return mod.exports;
}

const walkScoring = loadTsModule('src/engine/walkScoring.ts');
const auPresets = loadTsModule('src/constants/auPresets.ts');
const presets = loadTsModule('src/constants/presets.ts');
const auSuburbs = loadTsModule('src/constants/auSuburbs.ts');
const chinaCoords = loadTsModule('src/utils/chinaCoords.ts');
const validation = loadTsModule('src/utils/validation.ts');
const parkPhotos = loadTsModule('src/constants/parkPhotos.ts');
const deepLinks = loadTsModule('src/utils/deepLinks.ts');
const translations = loadTsModule('src/i18n/translations.ts');
const spotGuide = loadTsModule('src/utils/spotGuide.ts');
const memberDefaults = loadTsModule('src/constants/memberDefaults.ts');
const photoMemoryPicker = loadTsModule('src/utils/photoMemoryPicker.ts');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

console.log('Running PawCast Core Safety & Domain Unit Tests...\n');

// 1. Paw & Asphalt Surface Heat Safety
test('Estimates dangerous sunlit bitumen heat (>57°C) on 35°C Aussie summer noon', () => {
  const hotHour = {
    isoTime: '2026-01-15T13:00:00+11:00',
    epochMs: Date.parse('2026-01-15T02:00:00Z'),
    tempC: 35,
    feelsLikeC: 37,
    precipProb: 0,
    precipMm: 0,
    weatherCode: 0,
    windKph: 10,
    uvIndex: 12.2,
    humidity: 35,
    cloudCover: 5,
    solarRadiationWm2: 920,
    isDay: true,
    usAqi: 22,
  };
  const scored = walkScoring.scoreWeatherHour(hotHour, 0, presets.DEFAULT_DOG_PROFILE);
  assert.ok(scored.asphaltTempC >= 57, `Expected asphalt >= 57°C, got ${scored.asphaltTempC}`);
  assert.equal(scored.pawTier, 'danger');
  assert.ok(scored.walkScore <= 45, `Expected low walkScore on extreme noon, got ${scored.walkScore}`);
});

test('Sensitive puppy paws trigger warmer paw tier earlier than tough paws', () => {
  const warmHour = {
    isoTime: '2026-11-20T12:00:00+11:00',
    epochMs: Date.parse('2026-11-20T01:00:00Z'),
    tempC: 27,
    feelsLikeC: 27,
    precipProb: 0,
    precipMm: 0,
    weatherCode: 1,
    windKph: 12,
    uvIndex: 8,
    humidity: 45,
    cloudCover: 20,
    solarRadiationWm2: 760,
    isDay: true,
    usAqi: 20,
  };
  const softPup = { ...presets.DEFAULT_DOG_PROFILE, pawSensitivity: 'sensitive' };
  const toughPup = { ...presets.DEFAULT_DOG_PROFILE, pawSensitivity: 'tough' };
  const softRes = walkScoring.scoreWeatherHour(warmHour, 0, softPup);
  const toughRes = walkScoring.scoreWeatherHour(warmHour, 0, toughPup);
  assert.ok(softRes.walkScore < toughRes.walkScore, 'Sensitive paws must score stricter than tough paws');
});

// 2. Extreme Australian UV 11+
test('Flags extreme_uv when UV index >= 11', () => {
  const uvHour = {
    isoTime: '2026-12-10T13:00:00+11:00',
    epochMs: Date.parse('2026-12-10T02:00:00Z'),
    tempC: 22,
    feelsLikeC: 22,
    precipProb: 0,
    precipMm: 0,
    weatherCode: 0,
    windKph: 14,
    uvIndex: 11.6,
    humidity: 42,
    cloudCover: 10,
    solarRadiationWm2: 520,
    isDay: true,
    usAqi: 18,
  };
  const scored = walkScoring.scoreWeatherHour(uvHour, 0, presets.DEFAULT_DOG_PROFILE);
  assert.ok(scored.reasons.includes('extreme_uv'), `Expected extreme_uv reason, got ${scored.reasons}`);
});

// 3. Multi-Dog Pack Safety Mode (Husky + Frenchie together)
test('Multi-dog pack scoring enforces strictest heat & paw limits across all active dogs', () => {
  const mildWarmHour = {
    isoTime: '2026-11-22T15:00:00+11:00',
    epochMs: Date.parse('2026-11-22T04:00:00Z'),
    tempC: 25,
    feelsLikeC: 27,
    precipProb: 0,
    precipMm: 0,
    weatherCode: 1,
    windKph: 8,
    uvIndex: 6,
    humidity: 68,
    cloudCover: 35,
    solarRadiationWm2: 400,
    isDay: true,
    usAqi: 30,
  };
  const staffy = {
    id: 'dog-1',
    name: 'Bluey',
    breedId: 'staffy',
    size: 'medium',
    ageGroup: 'adult',
    coat: 'short',
    brachycephalic: false,
    pawSensitivity: 'tough',
    hasDogLicense: true,
  };
  const frenchie = {
    id: 'dog-2',
    name: 'Mochi',
    breedId: 'frenchie',
    size: 'small',
    ageGroup: 'adult',
    coat: 'short',
    brachycephalic: true,
    pawSensitivity: 'sensitive',
    hasDogLicense: false,
  };

  const merged = walkScoring.mergePackDogProfile([staffy, frenchie]);
  assert.equal(merged.name, 'Bluey & Mochi');
  assert.equal(merged.brachycephalic, true);
  assert.equal(merged.pawSensitivity, 'sensitive');
  assert.equal(merged.hasDogLicense, false);

  const staffyOnly = walkScoring.scoreWeatherHour(mildWarmHour, 0, staffy);
  const frenchieOnly = walkScoring.scoreWeatherHour(mildWarmHour, 0, frenchie);
  const packScored = walkScoring.scoreWeatherHourForPack(mildWarmHour, 0, [staffy, frenchie]);
  assert.equal(packScored.walkScore, Math.min(staffyOnly.walkScore, frenchieOnly.walkScore));
  assert.ok(packScored.walkScore < staffyOnly.walkScore);
});

// 4. Seasonal Summer (Oct-Mar) & Weekend Dog-Beach Curfews
test('Port Melbourne Dog Beach enforces curfew at 13:00 in Nov (summer) and opens 24h in Jul (winter)', () => {
  const portMel = auPresets.MELBOURNE_PILOT_SPOTS.find((s) => s.id === 'mel-port-melbourne-beach');
  assert.ok(portMel);
  // Nov 18 2026 13:00 AEDT = 02:00 UTC
  const summerNoon = { weather: { epochMs: Date.parse('2026-11-18T02:00:00Z') } };
  const summerRes = walkScoring.evaluatePlaceOpenStatus(portMel, summerNoon, 'Australia/Melbourne');
  assert.equal(summerRes.isOpen, false);
  assert.match(summerRes.badgeText, /Curfew/i);

  // Jul 15 2026 13:00 AEST = 03:00 UTC
  const winterNoon = { weather: { epochMs: Date.parse('2026-07-15T03:00:00Z') } };
  const winterRes = walkScoring.evaluatePlaceOpenStatus(portMel, winterNoon, 'Australia/Melbourne');
  assert.equal(winterRes.isOpen, true);
});

test('Sirius Cove (Mosman) is open Wednesday 13:00 and curfewed Saturday 13:00', () => {
  const sirius = auPresets.SYDNEY_PILOT_SPOTS.find((s) => s.id === 'syd-sirius-cove');
  assert.ok(sirius);
  // Wed Nov 18 2026 13:00 AEDT = 02:00 UTC
  const wedNoon = { weather: { epochMs: Date.parse('2026-11-18T02:00:00Z') } };
  const wedRes = walkScoring.evaluatePlaceOpenStatus(sirius, wedNoon, 'Australia/Sydney');
  assert.equal(wedRes.isOpen, true);

  // Sat Nov 21 2026 13:00 AEDT = 02:00 UTC
  const satNoon = { weather: { epochMs: Date.parse('2026-11-21T02:00:00Z') } };
  const satRes = walkScoring.evaluatePlaceOpenStatus(sirius, satNoon, 'Australia/Sydney');
  assert.equal(satRes.isOpen, false);
  assert.match(satRes.badgeText, /Curfew/i);
});

test('Greenhills Ocean Dog Beach enforces midday curfew year-round (Jan & Jul)', () => {
  const greenhills = auPresets.SYDNEY_PILOT_SPOTS.find((s) => s.id === 'syd-greenhills-beach');
  assert.ok(greenhills);
  const janNoon = { weather: { epochMs: Date.parse('2026-01-15T02:00:00Z') } };
  const julNoon = { weather: { epochMs: Date.parse('2026-07-15T03:00:00Z') } };
  assert.equal(walkScoring.evaluatePlaceOpenStatus(greenhills, janNoon, 'Australia/Sydney').isOpen, false);
  assert.equal(walkScoring.evaluatePlaceOpenStatus(greenhills, julNoon, 'Australia/Sydney').isOpen, false);
});

// 5. WGS-84 -> GCJ-02 China Transform Safety
test('China WGS-84 -> GCJ-02 shifts Shanghai cleanly while leaving Melbourne & Sydney untouched', () => {
  const shShift = chinaCoords.wgs84ToGcj02(31.2118, 121.4485);
  assert.ok(Math.abs(shShift.latitude - 31.2118) > 0.0005 || Math.abs(shShift.longitude - 121.4485) > 0.001);

  const mel = chinaCoords.wgs84ToGcj02(-37.7975, 144.9805);
  assert.equal(mel.latitude, -37.7975);
  assert.equal(mel.longitude, 144.9805);

  const syd = chinaCoords.wgs84ToGcj02(-33.8861, 151.2111);
  assert.equal(syd.latitude, -33.8861);
  assert.equal(syd.longitude, 151.2111);
});

// 6. Suburb Directory Completeness & GPS Nearest-Suburb Resolver
test('Suburb directory excludes North Pole 9999 (799 Melbourne + 1,161 Sydney + 222 Shanghai) & accurate GPS matching', () => {
  const mel = auSuburbs.getAuSuburbsForCity('melbourne');
  const syd = auSuburbs.getAuSuburbsForCity('sydney');
  const sh = auSuburbs.getAuSuburbsForCity('shanghai');
  assert.equal(mel.length, 799);
  assert.equal(syd.length, 1161);
  assert.equal(sh.length, 222);
  assert.ok(!mel.some((s) => s.postcode === '9999' || s.name === 'North Pole'));

  const nearFitzroy = auSuburbs.findNearestAuSuburbs(-37.7975, 144.9805, 1, 50);
  assert.equal(nearFitzroy[0].suburb.city, 'melbourne');
  assert.match(nearFitzroy[0].suburb.name, /Fitzroy/i);

  const nearXuhui = auSuburbs.findNearestAuSuburbs(31.2118, 121.4485, 1, 50);
  assert.equal(nearXuhui[0].suburb.city, 'shanghai');
});

// 7. Security Validation: URL Allow-Lists, Photo Paths & Deep Links
test('Security validators reject XSS, javascript:, http:, and path traversal payloads', () => {
  assert.equal(parkPhotos.isSafeParkPhotoUrl('javascript:alert(1)'), false);
  assert.equal(parkPhotos.isSafeParkPhotoUrl('http://evil.example/x.jpg'), false);
  assert.equal(parkPhotos.isSafeParkPhotoUrl('/park-thumbs/../../etc/passwd.jpg'), false);
  assert.equal(parkPhotos.isSafeParkPhotoUrl('/park-thumbs/mel-brighton-beach.jpg'), true);
  assert.equal(parkPhotos.isSafeParkPhotoUrl('./park-thumbs/mel-brighton-beach.jpg'), true);
  assert.equal(parkPhotos.resolveParkPhotoUri('mel-brighton-beach'), './park-thumbs/mel-brighton-beach.jpg');

  assert.equal(validation.buildSafeDirectionsUrl(999, 0, 'Bad', false, 'walking'), null);
  const safeMaps = validation.buildSafeDirectionsUrl(-37.9082, 144.9862, 'Brighton', false, 'walking');
  assert.ok(safeMaps && safeMaps.startsWith('https://www.google.com/maps/dir/'));

  assert.equal(deepLinks.parseDeepLinkParams('#spot=<script>alert(1)</script>'), null);
  assert.equal(deepLinks.parseDeepLinkParams('#spot=../../secret'), null);
  const brightonLink = deepLinks.parseDeepLinkParams('#spot=mel-brighton-beach');
  assert.ok(brightonLink);
  assert.equal(brightonLink.focusSpotId, 'mel-brighton-beach');
  assert.equal(brightonLink.location.timezone, 'Australia/Melbourne');

  const fitzroyLink = deepLinks.parseDeepLinkParams('#suburb=mel-3065-fitzroy');
  assert.ok(fitzroyLink);
  assert.match(fitzroyLink.location.name, /Fitzroy/i);
});

// 8. Bilingual EN / Native Mandarin Integrity & Parity
test('EN and Mandarin string catalogs have full key parity and zero wrong 溜 characters', () => {
  const en = translations.getStrings('en');
  const zh = translations.getStrings('zh');
  const enKeys = Object.keys(en).sort();
  const zhKeys = Object.keys(zh).sort();
  assert.deepEqual(zhKeys, enKeys);

  for (const key of zhKeys) {
    const val = zh[key];
    if (typeof val === 'string') {
      assert.ok(!val.includes('溜'), `Found non-native character 溜 in zh.${key}: ${val}`);
    } else if (typeof val === 'function') {
      const sample = val('15', '19');
      assert.ok(!String(sample).includes('溜'), `Found non-native character 溜 in zh.${key}(): ${sample}`);
    }
  }
  assert.equal(translations.getLocaleTag('zh'), 'zh-CN');
  assert.equal(translations.getLocaleTag('en'), undefined);
});

test('Default dog is Pudding (white Maltipoo) and all breed labels localize to Mandarin', () => {
  assert.equal(presets.DEFAULT_DOG_PROFILE.name, 'Pudding');
  assert.equal(presets.DEFAULT_DOG_PROFILE.breedId, 'maltipoo');
  for (const b of presets.BREED_PRESETS) {
    const zhLabel = translations.getBreedLabel(b.id, b.label, 'zh');
    assert.ok(/[\u4e00-\u9fff]/.test(zhLabel), `Expected Chinese breed label for ${b.id}, got ${zhLabel}`);
  }
});

test('Bilingual spot names, open status, and doorstep loops localize cleanly for Mandarin', () => {
  const enSplit = spotGuide.splitSpotDisplayName('West Bund Dog Park · 西岸宠物友好公园', 'en');
  assert.equal(enSplit.primary, 'West Bund Dog Park');
  const zhSplit = spotGuide.splitSpotDisplayName('West Bund Dog Park · 西岸宠物友好公园', 'zh');
  assert.equal(zhSplit.primary, '西岸宠物友好公园');

  const portMel = auPresets.MELBOURNE_PILOT_SPOTS.find((s) => s.id === 'mel-port-melbourne-beach');
  const summerNoon = { weather: { epochMs: Date.parse('2026-11-18T02:00:00Z') } };
  const zhCurfew = walkScoring.evaluatePlaceOpenStatus(portMel, summerNoon, 'Australia/Melbourne', 'zh');
  assert.equal(zhCurfew.isOpen, false);
  assert.match(zhCurfew.badgeText, /海滩限时段/);

  const loopZh = walkScoring.buildDoorstepLoop(
    presets.PRESET_LOCATIONS[0],
    30,
    [],
    [],
    null,
    'zh'
  );
  assert.match(loopZh.anchorName, /周边清静林荫街区/);
  assert.match(loopZh.surfaceNote, /人行道/);
});

// 9. Firebase Auth Security Validators, PII Masking & Anti-Enumeration
test('Email & strong password validators enforce security bounds and reject weak/XSS inputs', () => {
  assert.equal(validation.validateEmail('  Pudding.Owner@Example.COM ').valid, true);
  assert.equal(validation.validateEmail('  Pudding.Owner@Example.COM ').normalized, 'pudding.owner@example.com');
  assert.equal(validation.validateEmail('not-an-email').valid, false);
  assert.equal(validation.validateEmail('<script>@example.com').valid, false);
  assert.equal(validation.validateEmail(`${'a'.repeat(250)}@example.com`).valid, false);

  assert.equal(validation.validateStrongPassword('short123').valid, false);
  assert.equal(validation.validateStrongPassword('password1234').valid, false);
  assert.equal(validation.validateStrongPassword('aaaaaaaaaaaa').valid, false);
  assert.equal(validation.validateStrongPassword('a'.repeat(129)).valid, false);

  const goodPwd = validation.validateStrongPassword('PuddingWalks26');
  assert.equal(goodPwd.valid, true);
  assert.equal(goodPwd.strength, 'good');

  const strongPwd = validation.validateStrongPassword('Pudding loves shady Melbourne parks!');
  assert.equal(strongPwd.valid, true);
  assert.equal(strongPwd.strength, 'strong');
});

test('Email masking hides PII and Firebase auth errors prevent account enumeration', () => {
  assert.equal(validation.maskEmail('alice.smith@gmail.com'), 'a***@gmail.com');
  assert.equal(validation.maskEmail('a@b.co'), 'a***@b.co');
  assert.equal(validation.maskEmail(null), '***');
  assert.equal(validation.maskEmail('invalid'), '***');

  // Anti-enumeration: user-not-found and wrong-password collapse to the same key
  assert.equal(validation.mapFirebaseAuthErrorCode('auth/user-not-found'), 'invalid_credentials');
  assert.equal(validation.mapFirebaseAuthErrorCode('auth/wrong-password'), 'invalid_credentials');
  assert.equal(validation.mapFirebaseAuthErrorCode('auth/invalid-credential'), 'invalid_credentials');
  assert.equal(validation.mapFirebaseAuthErrorCode('auth/email-already-in-use'), 'generic_error');
  assert.equal(validation.mapFirebaseAuthErrorCode('auth/too-many-requests'), 'too_many_requests');
  assert.equal(validation.mapFirebaseAuthErrorCode('auth/requires-recent-login'), 'requires_recent_login');
  assert.equal(validation.mapFirebaseAuthErrorCode('auth/network-request-failed'), 'network_error');

  for (const key of [
    'not_configured',
    'invalid_email',
    'weak_password',
    'invalid_credentials',
    'too_many_requests',
    'requires_recent_login',
    'network_error',
    'generic_error',
  ]) {
    const enMsg = translations.getAuthErrorMessage(key, 'en');
    const zhMsg = translations.getAuthErrorMessage(key, 'zh');
    assert.ok(enMsg.length > 8, `Missing EN error message for ${key}`);
    assert.ok(/[\u4e00-\u9fff]/.test(zhMsg), `Missing ZH error message for ${key}`);
    assert.ok(!zhMsg.includes('溜'), `Found forbidden 溜 in ZH auth error ${key}`);
  }
});

// 10. Member Profile, Tier 1 & Tier 2 Sync, CSV Safety, AMap Allow-list & Dog Quirks
test('Member profile, Tier 1 preferences, secret spots, reminders, and CSV export sanitize untrusted inputs', () => {
  const prof = memberDefaults.parseMemberProfile({
    displayName: '  <b>Sarah</b>  ',
    avatarUri: 'data:image/svg+xml;base64,PHN2Zz4=',
  });
  assert.equal(prof.displayName, 'b Sarah /b');
  assert.equal(prof.avatarUri, null);

  const validImg = memberDefaults.parseMemberProfile({
    displayName: 'Sarah',
    avatarUri: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
  });
  assert.equal(validImg.avatarUri, 'data:image/jpeg;base64,/9j/4AAQSkZJRg==');

  // High-entropy household invite tokens (192-bit CSPRNG)
  const tok = validation.generateSecureInviteToken(24);
  assert.match(tok, /^PAW-[a-f0-9]{48}$/);
  assert.equal(validation.sanitizeInviteToken(tok.toUpperCase()), tok);
  assert.equal(validation.sanitizeInviteToken('PAW-1234'), null);
  assert.equal(validation.sanitizeInviteToken('../etc/passwd'), null);

  // CSV formula-injection neutralization
  assert.equal(validation.escapeCsvCell('=CMD("calc")'), `"'=CMD(""calc"")"` );
  assert.equal(validation.escapeCsvCell('+1+2'), "'+1+2");
  const csv = memberDefaults.buildWalkLogsCsv([
    {
      id: 'w1',
      timestampMs: Date.parse('2026-11-27T08:00:00Z'),
      placeId: 'p1',
      placeName: '=HYPERLINK("http://evil")',
      cityLabel: 'Melbourne',
      durationMin: 30,
      distanceKm: 2.1,
      dogNames: ['Pudding'],
      tags: ['hydrated'],
      loggedBy: 'Sarah',
    },
  ]);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"")"`));

  // Preferred maps app allow-list including AMap (高德地图)
  const amapUrl = validation.buildSafeDirectionsUrl(31.2118, 121.4485, 'West Bund', 'amap', 'walking');
  assert.ok(amapUrl && amapUrl.startsWith('https://uri.amap.com/navigation?'));
  const appleUrl = validation.buildSafeDirectionsUrl(-37.7975, 144.9805, 'Edinburgh Gardens', 'apple', 'walking');
  assert.ok(appleUrl && appleUrl.startsWith('https://maps.apple.com/?'));

  // Care reminder date validation & renewal advance
  assert.equal(validation.sanitizeIsoDate('2026-02-30'), null);
  assert.equal(validation.sanitizeIsoDate('2026-12-15'), '2026-12-15');
  assert.equal(memberDefaults.advanceReminderIsoDate('2026-12-15', 1), '2027-01-15');
  assert.equal(memberDefaults.advanceReminderIsoDate('2026-12-15', 12), '2027-12-15');
});

test('Dog temperament quirks (hatesRain, customMaxTempC, quietMode) adjust scoring accurately', () => {
  const drizzlyHour = {
    isoTime: '2026-11-22T10:00:00+11:00',
    epochMs: Date.parse('2026-11-21T23:00:00Z'),
    tempC: 18,
    feelsLikeC: 18,
    precipProb: 45,
    precipMm: 0.5,
    weatherCode: 61,
    windKph: 10,
    uvIndex: 2,
    humidity: 80,
    cloudCover: 90,
    solarRadiationWm2: 80,
    isDay: true,
    usAqi: 20,
  };
  const normalDog = { ...presets.DEFAULT_DOG_PROFILE, hatesRain: false };
  const rainHater = { ...presets.DEFAULT_DOG_PROFILE, hatesRain: true };
  assert.ok(
    walkScoring.scoreWeatherHour(drizzlyHour, 0, rainHater).walkScore <
      walkScoring.scoreWeatherHour(drizzlyHour, 0, normalDog).walkScore
  );

  const warmHour = { ...drizzlyHour, tempC: 23, feelsLikeC: 23, precipProb: 0, precipMm: 0, weatherCode: 1 };
  const lowCapDog = { ...presets.DEFAULT_DOG_PROFILE, customMaxTempC: 17 };
  const highCapDog = { ...presets.DEFAULT_DOG_PROFILE, customMaxTempC: 27 };
  assert.ok(
    walkScoring.scoreWeatherHour(warmHour, 0, lowCapDog).walkScore <
      walkScoring.scoreWeatherHour(warmHour, 0, highCapDog).walkScore
  );
});

// 11. Photo Memory Map: EXIF GPS Parser & Photo Sanitization
test('EXIF GPS parser extracts JPEG coordinates & date accurately and rejects malformed buffers safely', () => {
  // Build a minimal valid little-endian JPEG APP1 Exif payload: 37°48'0" S, 144°58'48" E (-37.8, 144.98) + 2026:11:27
  const tiff = new Uint8Array(220);
  const w16 = (off, v) => {
    tiff[off] = v & 0xff;
    tiff[off + 1] = (v >> 8) & 0xff;
  };
  const w32 = (off, v) => {
    tiff[off] = v & 0xff;
    tiff[off + 1] = (v >> 8) & 0xff;
    tiff[off + 2] = (v >> 16) & 0xff;
    tiff[off + 3] = (v >>> 24) & 0xff;
  };
  // TIFF header: "II", 42, IFD0 at offset 8
  tiff[0] = 0x49; tiff[1] = 0x49;
  w16(2, 42);
  w32(4, 8);
  // IFD0 at 8: 2 entries -> DateTime (0x0132) & GPS IFD pointer (0x8825)
  w16(8, 2);
  // Entry 0: DateTime (0x0132), ASCII (2), count 20, offset 40
  w16(10, 0x0132); w16(12, 2); w32(14, 20); w32(18, 40);
  // Entry 1: GPS IFD (0x8825), LONG (4), count 1, offset 64
  w16(22, 0x8825); w16(24, 4); w32(26, 1); w32(30, 64);
  const dateStr = '2026:11:27 09:15:00\0';
  for (let i = 0; i < dateStr.length; i++) tiff[40 + i] = dateStr.charCodeAt(i);

  // GPS IFD at 64: 4 entries
  w16(64, 4);
  // 0x0001 GPSLatitudeRef = 'S'
  w16(66, 0x0001); w16(68, 2); w32(70, 2); tiff[74] = 'S'.charCodeAt(0);
  // 0x0002 GPSLatitude at offset 120 -> 37/1, 48/1, 0/1 = 37.8
  w16(78, 0x0002); w16(80, 5); w32(82, 3); w32(86, 120);
  // 0x0003 GPSLongitudeRef = 'E'
  w16(90, 0x0003); w16(92, 2); w32(94, 2); tiff[98] = 'E'.charCodeAt(0);
  // 0x0004 GPSLongitude at offset 150 -> 144/1, 58/1, 48/1 = 144.98
  w16(102, 0x0004); w16(104, 5); w32(106, 3); w32(110, 150);

  w32(120, 37); w32(124, 1); w32(128, 48); w32(132, 1); w32(136, 0); w32(140, 1);
  w32(150, 144); w32(154, 1); w32(158, 58); w32(162, 1); w32(166, 48); w32(170, 1);

  const segLen = 2 + 6 + tiff.length;
  const jpeg = new Uint8Array(2 + 2 + segLen + 2);
  jpeg[0] = 0xff; jpeg[1] = 0xd8; // SOI
  jpeg[2] = 0xff; jpeg[3] = 0xe1; // APP1
  jpeg[4] = (segLen >> 8) & 0xff; jpeg[5] = segLen & 0xff;
  const exifHdr = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
  jpeg.set(exifHdr, 6);
  jpeg.set(tiff, 12);
  jpeg[jpeg.length - 2] = 0xff; jpeg[jpeg.length - 1] = 0xd9; // EOI

  const meta = photoMemoryPicker.extractJpegExifMeta(jpeg);
  assert.equal(meta.latitude, -37.8);
  assert.equal(meta.longitude, 144.98);
  assert.equal(meta.takenDateIso, '2026-11-27');

  // Malformed / non-JPEG bytes must never throw
  const bad = photoMemoryPicker.extractJpegExifMeta(new Uint8Array([0x00, 0x01, 0xff, 0xe1, 0xff, 0xff]));
  assert.equal(bad.latitude, null);
  assert.equal(bad.longitude, null);
});

test('Photo memory parser enforces raster Data URIs, coordinate bounds, and text sanitization', () => {
  const parsed = memberDefaults.parsePhotoMemories([
    {
      id: 'bad-svg',
      thumbnailUri: 'data:image/svg+xml;base64,PHN2Zz4=',
      photoUri: 'data:image/jpeg;base64,/9j/4AAQ==',
      latitude: -37.8,
      longitude: 144.98,
      placeName: 'Evil',
      takenDateIso: '2026-11-27',
    },
    {
      id: 'bad-coords',
      thumbnailUri: 'data:image/jpeg;base64,/9j/4AAQ==',
      photoUri: 'data:image/jpeg;base64,/9j/4AAQ==',
      latitude: 999,
      longitude: 144.98,
      placeName: 'Mars',
      takenDateIso: '2026-11-27',
    },
    {
      id: 'good-1',
      thumbnailUri: 'data:image/jpeg;base64,/9j/4AAQ==',
      photoUri: 'data:image/jpeg;base64,/9j/4AAQ==',
      latitude: -37.9082,
      longitude: 144.9862,
      placeName: '<script>Brighton</script>',
      caption: 'Sunny walk!',
      takenDateIso: '2026-11-27',
      dogNames: ['Pudding'],
      createdAtMs: 1764220000000,
    },
  ]);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'good-1');
  assert.equal(parsed[0].placeName, 'script Brighton /script');
});

console.log(`\nUnit Test Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
