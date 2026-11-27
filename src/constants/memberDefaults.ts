import { haversineDistanceKm } from '../services/placesService';
import {
  AmenityKey,
  AppLanguage,
  CareReminder,
  CareReminderType,
  CustomWalkSpot,
  DefaultMapFilters,
  GearChecklistItem,
  GearTrigger,
  LocationPoint,
  LoopDurationMinutes,
  MemberPreferences,
  MemberProfile,
  PhotoMemory,
  PinnedLocation,
  PlaceCategory,
  PreferredMapsApp,
  WalkLogEntry,
  WalkLogTag,
  WalkPlace,
} from '../types/walk';
import {
  escapeCsvCell,
  isValidCoordinate,
  sanitizeAvatarDataUri,
  sanitizeDogName,
  sanitizeIsoDate,
  sanitizeText,
} from '../utils/validation';

export const MAX_PINNED_LOCATIONS = 5;
export const MAX_CUSTOM_SPOTS = 20;
export const MAX_CARE_REMINDERS = 12;
export const MAX_GEAR_ITEMS = 15;
export const MAX_LOCAL_PHOTO_MEMORIES = 24;
export const MAX_CLOUD_PHOTO_MEMORIES = 60;

export const DEFAULT_MAP_FILTERS: DefaultMapFilters = {
  beachesOnly: false,
  fencedOnly: false,
  offLeashOnly: false,
  shadedOnly: false,
  walkableOnly: false,
  pavedOnly: false,
  savedOnly: false,
  openOnly: false,
};

export const DEFAULT_MEMBER_PROFILE: MemberProfile = {
  displayName: '',
  avatarUri: null,
};

export const DEFAULT_MEMBER_PREFERENCES: MemberPreferences = {
  pinnedLocations: [],
  morningWalkHour: 7,
  eveningWalkHour: 18,
  defaultLoopDuration: 30,
  preferredMapsApp: 'auto',
  defaultMapFilters: { ...DEFAULT_MAP_FILTERS },
  inviteSignature: '',
  weeklyWalkGoal: 7,
  weeklyKmGoal: 15,
};

export function getDefaultGearChecklist(
  language: AppLanguage = 'en'
): GearChecklistItem[] {
  if (language === 'zh') {
    return [
      { id: 'gear-bags', label: '拾便袋与湿巾', trigger: 'always', checked: true },
      { id: 'gear-water', label: '便携水碗与饮用水', trigger: 'always', checked: true },
      { id: 'gear-paw-balm', label: '护爪膏 / 防烫鞋套', trigger: 'hot_paws', checked: false },
      { id: 'gear-raincoat', label: '狗狗雨衣与擦脚毛巾', trigger: 'rain', checked: false },
      { id: 'gear-led', label: '夜遛发光项圈', trigger: 'night', checked: false },
      { id: 'gear-rego', label: '养犬登记证（狗证）/ 牵引绳', trigger: 'license', checked: false },
    ];
  }
  return [
    { id: 'gear-bags', label: 'Poop bags & wipes', trigger: 'always', checked: true },
    { id: 'gear-water', label: 'Collapsible bowl & water', trigger: 'always', checked: true },
    { id: 'gear-paw-balm', label: 'Paw balm / heat booties', trigger: 'hot_paws', checked: false },
    { id: 'gear-raincoat', label: 'Raincoat & paw towel', trigger: 'rain', checked: false },
    { id: 'gear-led', label: 'LED collar light', trigger: 'night', checked: false },
    { id: 'gear-rego', label: 'Rego tag / 狗证 card', trigger: 'license', checked: false },
  ];
}

export const WALK_LOG_TAG_KEYS: WalkLogTag[] = [
  'hydrated',
  'good_recall',
  'potty',
  'paw_check',
  'hot',
  'social',
];

const VALID_MAPS_APPS = new Set<PreferredMapsApp>([
  'auto',
  'apple',
  'google',
  'amap',
]);
const VALID_CATEGORIES = new Set<PlaceCategory>([
  'dog_park',
  'dog_beach',
  'trail',
  'park',
]);
const VALID_REMINDER_TYPES = new Set<CareReminderType>([
  'rego',
  'rabies',
  'flea_tick',
  'grooming',
  'custom',
]);
const VALID_GEAR_TRIGGERS = new Set<GearTrigger>([
  'always',
  'hot_paws',
  'rain',
  'night',
  'license',
]);
const VALID_REPEAT_MONTHS = new Set([0, 1, 3, 6, 12]);

export function parseMemberProfile(raw: unknown): MemberProfile {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_MEMBER_PROFILE };
  }
  const obj = raw as Record<string, unknown>;
  return {
    displayName: sanitizeText(obj.displayName, 40),
    avatarUri: sanitizeAvatarDataUri(obj.avatarUri),
  };
}

export function parseDefaultMapFilters(raw: unknown): DefaultMapFilters {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_MAP_FILTERS };
  }
  const obj = raw as Record<string, unknown>;
  return {
    beachesOnly: Boolean(obj.beachesOnly),
    fencedOnly: Boolean(obj.fencedOnly),
    offLeashOnly: Boolean(obj.offLeashOnly),
    shadedOnly: Boolean(obj.shadedOnly),
    walkableOnly: Boolean(obj.walkableOnly),
    pavedOnly: Boolean(obj.pavedOnly),
    savedOnly: Boolean(obj.savedOnly),
    openOnly: Boolean(obj.openOnly),
  };
}

export function parseMemberPreferences(
  raw: unknown,
  parseLocation: (locRaw: unknown) => LocationPoint
): MemberPreferences {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_MEMBER_PREFERENCES,
      defaultMapFilters: { ...DEFAULT_MAP_FILTERS },
    };
  }
  const obj = raw as Record<string, unknown>;

  const pinnedLocations: PinnedLocation[] = [];
  if (Array.isArray(obj.pinnedLocations)) {
    for (const item of obj.pinnedLocations.slice(0, MAX_PINNED_LOCATIONS)) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      const id = sanitizeText(rec.id, 40);
      const label = sanitizeText(rec.label, 24);
      const locObj = rec.location as Record<string, unknown> | undefined;
      if (
        !id ||
        !label ||
        !locObj ||
        !isValidCoordinate(locObj.latitude, locObj.longitude)
      ) {
        continue;
      }
      pinnedLocations.push({
        id,
        label,
        location: parseLocation(locObj),
      });
    }
  }

  const rawMorning = obj.morningWalkHour;
  const morningWalkHour =
    rawMorning === null
      ? null
      : typeof rawMorning === 'number' &&
          Number.isInteger(rawMorning) &&
          rawMorning >= 5 &&
          rawMorning <= 12
        ? rawMorning
        : DEFAULT_MEMBER_PREFERENCES.morningWalkHour;

  const rawEvening = obj.eveningWalkHour;
  const eveningWalkHour =
    rawEvening === null
      ? null
      : typeof rawEvening === 'number' &&
          Number.isInteger(rawEvening) &&
          rawEvening >= 15 &&
          rawEvening <= 22
        ? rawEvening
        : DEFAULT_MEMBER_PREFERENCES.eveningWalkHour;

  const defaultLoopDuration: LoopDurationMinutes =
    obj.defaultLoopDuration === 15 ||
    obj.defaultLoopDuration === 30 ||
    obj.defaultLoopDuration === 45
      ? obj.defaultLoopDuration
      : 30;

  const preferredMapsApp: PreferredMapsApp =
    typeof obj.preferredMapsApp === 'string' &&
    VALID_MAPS_APPS.has(obj.preferredMapsApp as PreferredMapsApp)
      ? (obj.preferredMapsApp as PreferredMapsApp)
      : 'auto';

  const rawWalkGoal = Number(obj.weeklyWalkGoal);
  const weeklyWalkGoal =
    Number.isFinite(rawWalkGoal) && rawWalkGoal >= 1 && rawWalkGoal <= 21
      ? Math.round(rawWalkGoal)
      : DEFAULT_MEMBER_PREFERENCES.weeklyWalkGoal;

  const rawKmGoal = Number(obj.weeklyKmGoal);
  const weeklyKmGoal =
    Number.isFinite(rawKmGoal) && rawKmGoal >= 1 && rawKmGoal <= 100
      ? Math.round(rawKmGoal)
      : DEFAULT_MEMBER_PREFERENCES.weeklyKmGoal;

  return {
    pinnedLocations,
    morningWalkHour,
    eveningWalkHour,
    defaultLoopDuration,
    preferredMapsApp,
    defaultMapFilters: parseDefaultMapFilters(obj.defaultMapFilters),
    inviteSignature: sanitizeText(obj.inviteSignature, 60),
    weeklyWalkGoal,
    weeklyKmGoal,
  };
}

export function parseCustomWalkSpots(raw: unknown): CustomWalkSpot[] {
  if (!Array.isArray(raw)) return [];
  const clean: CustomWalkSpot[] = [];
  for (const item of raw.slice(0, MAX_CUSTOM_SPOTS)) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = sanitizeText(rec.id, 48);
    const name = sanitizeText(rec.name, 50);
    if (!id || !name || !isValidCoordinate(rec.latitude, rec.longitude)) {
      continue;
    }
    const category: PlaceCategory =
      typeof rec.category === 'string' &&
      VALID_CATEGORIES.has(rec.category as PlaceCategory)
        ? (rec.category as PlaceCategory)
        : 'park';
    const tags = Array.isArray(rec.tags)
      ? rec.tags
          .filter((x): x is string => typeof x === 'string')
          .map((x) => sanitizeText(x, 20))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const createdAtMs =
      typeof rec.createdAtMs === 'number' && Number.isFinite(rec.createdAtMs)
        ? Math.round(rec.createdAtMs)
        : Date.now();
    clean.push({
      id,
      name,
      category,
      latitude: rec.latitude as number,
      longitude: rec.longitude as number,
      suburbLabel: sanitizeText(rec.suburbLabel, 40) || 'My Spot',
      note: sanitizeText(rec.note, 120),
      tags,
      createdAtMs,
    });
  }
  return clean;
}

export function parseCareReminders(raw: unknown): CareReminder[] {
  if (!Array.isArray(raw)) return [];
  const clean: CareReminder[] = [];
  for (const item of raw.slice(0, MAX_CARE_REMINDERS)) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = sanitizeText(rec.id, 40);
    const title = sanitizeText(rec.title, 50);
    const dueDateIso = sanitizeIsoDate(rec.dueDateIso);
    if (!id || !title || !dueDateIso) continue;
    const type: CareReminderType =
      typeof rec.type === 'string' &&
      VALID_REMINDER_TYPES.has(rec.type as CareReminderType)
        ? (rec.type as CareReminderType)
        : 'custom';
    const repeatMonths =
      typeof rec.repeatMonths === 'number' &&
      VALID_REPEAT_MONTHS.has(rec.repeatMonths)
        ? (rec.repeatMonths as CareReminder['repeatMonths'])
        : 0;
    clean.push({
      id,
      dogName: sanitizeText(rec.dogName, 32) || 'Pudding',
      type,
      title,
      dueDateIso,
      repeatMonths,
    });
  }
  return clean.sort((a, b) => a.dueDateIso.localeCompare(b.dueDateIso));
}

export function parseGearChecklist(raw: unknown): GearChecklistItem[] | null {
  if (!Array.isArray(raw)) return null;
  const clean: GearChecklistItem[] = [];
  for (const item of raw.slice(0, MAX_GEAR_ITEMS)) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = sanitizeText(rec.id, 40);
    const label = sanitizeText(rec.label, 40);
    if (!id || !label) continue;
    const trigger: GearTrigger =
      typeof rec.trigger === 'string' &&
      VALID_GEAR_TRIGGERS.has(rec.trigger as GearTrigger)
        ? (rec.trigger as GearTrigger)
        : 'always';
    clean.push({
      id,
      label,
      trigger,
      checked: Boolean(rec.checked),
    });
  }
  return clean;
}

export function customSpotToWalkPlace(
  spot: CustomWalkSpot,
  originLat: number,
  originLon: number
): WalkPlace {
  const amenities: AmenityKey[] = [];
  const lowerTags = spot.tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => t.includes('shade') || t.includes('树荫'))) {
    amenities.push('shade');
  }
  if (lowerTags.some((t) => t.includes('water') || t.includes('饮水') || t.includes('水'))) {
    amenities.push('water');
  }
  if (lowerTags.some((t) => t.includes('fenced') || t.includes('off') || t.includes('围栏') || t.includes('松绳'))) {
    amenities.push('off_leash');
  }
  if (lowerTags.some((t) => t.includes('paved') || t.includes('dry') || t.includes('步道'))) {
    amenities.push('paved');
  }
  if (lowerTags.some((t) => t.includes('lit') || t.includes('夜'))) {
    amenities.push('lit');
  }
  if (amenities.length === 0) {
    amenities.push('shade', 'paved');
  }

  const isFenced = lowerTags.some((t) => t.includes('fenced') || t.includes('围栏'));
  const distKm =
    Math.round(
      haversineDistanceKm(originLat, originLon, spot.latitude, spot.longitude) * 10
    ) / 10;

  return {
    id: spot.id,
    name: `★ ${spot.name}`,
    subtitle: `${spot.suburbLabel}${spot.note ? ` · ${spot.note}` : ''}`,
    district: spot.suburbLabel,
    category: spot.category,
    latitude: spot.latitude,
    longitude: spot.longitude,
    distanceKm: distKm,
    amenities,
    accessRule: 'walk_in_free',
    leashPolicy: isFenced
      ? 'off_leash_fenced'
      : amenities.includes('off_leash')
        ? 'off_leash_unfenced'
        : 'leashed_only',
    spaceScore30: 27,
    spaceNote: spot.note || 'Personal saved secret spot',
    entryDetail: spot.suburbLabel,
    hoursLabel: '24h Open',
  };
}

export function daysUntilIsoDate(dueDateIso: string, nowMs = Date.now()): number {
  const safe = sanitizeIsoDate(dueDateIso);
  if (!safe) return 999;
  const [y, m, d] = safe.split('-').map(Number);
  const dueUtc = Date.UTC(y, m - 1, d);
  const now = new Date(nowMs);
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((dueUtc - todayUtc) / (24 * 60 * 60 * 1000));
}

export function advanceReminderIsoDate(
  dueDateIso: string,
  repeatMonths: number
): string {
  const safe = sanitizeIsoDate(dueDateIso);
  const base = safe
    ? new Date(`${safe}T00:00:00Z`)
    : new Date();
  const next = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + Math.max(1, repeatMonths),
      base.getUTCDate()
    )
  );
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates a formula-injection-safe CSV string of the user's Walk Journal.
 */
export function buildWalkLogsCsv(logs: WalkLogEntry[]): string {
  const header = [
    'Date',
    'Spot',
    'Area',
    'Duration (min)',
    'Distance (km)',
    'Dogs',
    'Tags',
    'Logged By',
    'Note',
  ];
  const rows = logs.map((entry) => [
    new Date(entry.timestampMs).toISOString(),
    entry.placeName,
    entry.cityLabel,
    entry.durationMin,
    entry.distanceKm,
    entry.dogNames.join('; '),
    (entry.tags || []).join('; '),
    entry.loggedBy || '',
    entry.note || '',
  ]);
  return [header, ...rows]
    .map((cols) => cols.map(escapeCsvCell).join(','))
    .join('\n');
}

export function parsePhotoMemory(raw: unknown): PhotoMemory | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const id = sanitizeText(rec.id, 48);
  const thumbnailUri = sanitizeAvatarDataUri(rec.thumbnailUri, 48_000);
  const photoUri = sanitizeAvatarDataUri(rec.photoUri, 170_000);
  if (
    !id ||
    !thumbnailUri ||
    !photoUri ||
    !isValidCoordinate(rec.latitude, rec.longitude)
  ) {
    return null;
  }
  const todayIso = new Date().toISOString().slice(0, 10);
  const takenDateIso = sanitizeIsoDate(rec.takenDateIso) || todayIso;
  const dogNames = Array.isArray(rec.dogNames)
    ? rec.dogNames
        .filter((x): x is string => typeof x === 'string')
        .map((x) => sanitizeDogName(x))
        .filter(Boolean)
        .slice(0, 5)
    : ['Pudding'];
  const createdAtMs =
    typeof rec.createdAtMs === 'number' && Number.isFinite(rec.createdAtMs)
      ? Math.round(rec.createdAtMs)
      : Date.now();
  return {
    id,
    thumbnailUri,
    photoUri,
    latitude: rec.latitude as number,
    longitude: rec.longitude as number,
    placeName: sanitizeText(rec.placeName, 60) || 'Walk Memory',
    suburbLabel: sanitizeText(rec.suburbLabel, 50) || '',
    caption: sanitizeText(rec.caption, 120),
    takenDateIso,
    dogNames: dogNames.length > 0 ? dogNames : ['Pudding'],
    createdAtMs,
  };
}

export function parsePhotoMemories(
  raw: unknown,
  limit = MAX_CLOUD_PHOTO_MEMORIES
): PhotoMemory[] {
  if (!Array.isArray(raw)) return [];
  const clean: PhotoMemory[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (clean.length >= limit) break;
    const parsed = parsePhotoMemory(item);
    if (parsed && !seen.has(parsed.id)) {
      seen.add(parsed.id);
      clean.push(parsed);
    }
  }
  return clean.sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function buildWalkLogsJson(logs: WalkLogEntry[]): string {
  return JSON.stringify(
    {
      app: 'PawCast',
      exportedAt: new Date().toISOString(),
      walkCount: logs.length,
      walks: logs,
    },
    null,
    2
  );
}
