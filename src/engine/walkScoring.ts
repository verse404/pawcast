import {
  AppLanguage,
  DogProfile,
  DoorstepLoopPlan,
  HourlyWeatherPoint,
  LocationPoint,
  LoopDurationMinutes,
  PawSafetyTier,
  PlaceMatchBadgeKey,
  PlaceOpenStatus,
  ReasonTag,
  ScorePillar,
  ScoredHour,
  ScoredPlace,
  StreetCorridor,
  WalkPlace,
  WalkQualityTier,
  WalkWindow,
} from '../types/walk';

/**
 * Estimates sun-exposed dark asphalt surface temperature (°C) using ambient air
 * temperature, incident shortwave solar radiation (W/m²), UV index, cloud cover,
 * wind convective cooling, and daylight status.
 *
 * Calibrated against veterinary pavement thermal studies:
 * - 25°C (77°F) clear sunny calm day -> ~51.5°C (125°F) asphalt
 * - 30°C (86°F) clear sunny calm day -> ~57°C (135°F) asphalt
 * - Nighttime or overcast rainy hours -> near ambient air temperature
 */
export function estimateAsphaltTempC(w: HourlyWeatherPoint): number {
  if (!w.isDay) {
    return w.tempC + 1.0;
  }

  // Solar gain from direct/diffuse shortwave radiation (0..950 W/m²).
  // Fallback to UV/cloud proxy if radiation is 0 during daytime.
  const effectiveRadiation =
    w.solarRadiationWm2 > 5
      ? w.solarRadiationWm2
      : Math.max(0, w.uvIndex * 95 * (1 - (w.cloudCover / 100) * 0.65));

  const radiationNormalized = Math.min(1, effectiveRadiation / 820);
  const maxSolarDeltaC = 28.5;
  const rawSolarGainC = Math.pow(radiationNormalized, 0.85) * maxSolarDeltaC;

  // Wind convective cooling reduces pavement surface buildup; wet pavement cools rapidly.
  const windCoolingFactor = Math.max(0.55, 1 - Math.min(w.windKph, 35) * 0.011);
  const wetCoolingOffset = w.precipMm > 0.3 || w.precipProb > 70 ? 6.5 : 0;

  const estimated = w.tempC + rawSolarGainC * windCoolingFactor - wetCoolingOffset;
  return Math.max(w.tempC - 1, Math.round(estimated * 10) / 10);
}

/**
 * Classifies asphalt surface temperature into paw-pad safety tiers, adjusted for
 * puppy/senior sensitive pads vs seasoned pads.
 */
export function classifyPawSafety(
  asphaltTempC: number,
  dog: DogProfile
): PawSafetyTier {
  const sensitivityShiftC =
    dog.pawSensitivity === 'sensitive'
      ? -2.8
      : dog.pawSensitivity === 'tough'
        ? 1.5
        : 0;

  const safeLimit = 43.3 + sensitivityShiftC; // ~110°F baseline
  const warmLimit = 51.6 + sensitivityShiftC; // ~125°F baseline
  const hotLimit = 57.2 + sensitivityShiftC; // ~135°F baseline

  if (asphaltTempC >= hotLimit) return 'danger';
  if (asphaltTempC >= warmLimit) return 'hot';
  if (asphaltTempC >= safeLimit) return 'warm';
  return 'safe';
}

export function classifyWalkQuality(score: number): WalkQualityTier {
  if (score >= 82) return 'ideal';
  if (score >= 64) return 'good';
  if (score >= 42) return 'caution';
  return 'avoid';
}

function getLocalHour24(epochMs: number, timezone?: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone || undefined,
    }).formatToParts(new Date(epochMs));
    const hourPart = parts.find((p) => p.type === 'hour');
    const parsed = hourPart ? Number(hourPart.value) : NaN;
    if (Number.isFinite(parsed)) {
      return parsed % 24;
    }
  } catch {
    // Fall back to local system hour if timezone is unrecognized
  }
  return new Date(epochMs).getHours();
}

function getLocalDecimalHour(epochMs: number, timezone?: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: timezone || undefined,
    }).formatToParts(new Date(epochMs));
    const h = Number(parts.find((p) => p.type === 'hour')?.value ?? NaN);
    const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    if (Number.isFinite(h)) {
      return (h % 24) + (Number.isFinite(m) ? m / 60 : 0);
    }
  } catch {
    // Fallback below
  }
  const d = new Date(epochMs);
  return d.getHours() + d.getMinutes() / 60;
}

function formatDecimalHourClock(decimalHour: number, locale?: string): string {
  const h = Math.floor(decimalHour) % 24;
  const m = Math.round((decimalHour - Math.floor(decimalHour)) * 60);
  const refUtc = new Date(Date.UTC(2026, 0, 1, h, m));
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(refUtc);
  } catch {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}

function getLocalMonth1to12(epochMs: number, timezone?: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      month: 'numeric',
      timeZone: timezone || undefined,
    }).formatToParts(new Date(epochMs));
    const m = Number(parts.find((p) => p.type === 'month')?.value ?? NaN);
    if (Number.isFinite(m) && m >= 1 && m <= 12) {
      return m;
    }
  } catch {
    // Fallback below
  }
  return new Date(epochMs).getMonth() + 1;
}

function isLocalWeekend(epochMs: number, timezone?: string): boolean {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: timezone || undefined,
    }).format(new Date(epochMs));
    return weekday === 'Sat' || weekday === 'Sun';
  } catch {
    const day = new Date(epochMs).getDay();
    return day === 0 || day === 6;
  }
}

/**
 * Evaluates whether a park, fenced dog run, or seasonal/weekend Australian timed dog beach
 * is open for off-leash access at the selected forecast hour.
 */
export function evaluatePlaceOpenStatus(
  place: WalkPlace,
  selectedHour: ScoredHour | null,
  timezone?: string,
  language: AppLanguage = 'en'
): PlaceOpenStatus {
  const isZh = language === 'zh';
  const loc = isZh ? 'zh-CN' : undefined;
  const rawSummary = place.hoursLabel || '24h Open';
  const summary =
    isZh && /^24h\s*open$/i.test(rawSummary.trim()) ? '24小时开放' : rawSummary;
  const targetMs = selectedHour?.weather.epochMs ?? Date.now();

  let activeWindows = place.openWindows;
  if (place.seasonalSummerWindows && place.seasonalSummerWindows.length > 0) {
    const month = getLocalMonth1to12(targetMs, timezone);
    const isAustralianDaylightSavingHalf = month >= 10 || month <= 3;
    if (isAustralianDaylightSavingHalf) {
      activeWindows = place.seasonalSummerWindows;
    }
  }
  if (
    place.weekendOpenWindows &&
    place.weekendOpenWindows.length > 0 &&
    isLocalWeekend(targetMs, timezone)
  ) {
    activeWindows = place.weekendOpenWindows;
  }

  if (!activeWindows || activeWindows.length === 0) {
    return {
      isOpen: true,
      closingSoon: false,
      badgeText: isZh ? '24小时开放' : 'Open 24h',
      hoursSummary: summary,
    };
  }

  const localDec = getLocalDecimalHour(targetMs, timezone);

  for (const [startH, endH] of activeWindows) {
    if (localDec >= startH && localDec < endH) {
      const remaining = endH - localDec;
      if (remaining <= 0.85 && endH < 24) {
        return {
          isOpen: true,
          closingSoon: true,
          badgeText: isZh
            ? `开放至 ${formatDecimalHourClock(endH, loc)}`
            : `Until ${formatDecimalHourClock(endH, loc)}`,
          hoursSummary: summary,
        };
      }
      return {
        isOpen: true,
        closingSoon: false,
        badgeText:
          endH >= 24
            ? isZh
              ? '当前可松绳'
              : 'Off-Leash Now'
            : isZh
              ? `开放中 · 至 ${formatDecimalHourClock(endH, loc)}`
              : `Open · until ${formatDecimalHourClock(endH, loc)}`,
        hoursSummary: summary,
      };
    }
  }

  const upcoming =
    activeWindows.find(([startH]) => startH > localDec)?.[0] ??
    activeWindows[0][0];

  return {
    isOpen: false,
    closingSoon: false,
    badgeText:
      place.accessRule === 'timed_beach'
        ? isZh
          ? `海滩限时段 · ${formatDecimalHourClock(upcoming, loc)} 开放松绳`
          : `Curfew · Off-Leash ${formatDecimalHourClock(upcoming, loc)}`
        : isZh
          ? `已闭园 · ${formatDecimalHourClock(upcoming, loc)} 开放`
          : `Closed · Opens ${formatDecimalHourClock(upcoming, loc)}`,
    hoursSummary: summary,
  };
}

/**
 * Scores a single forecast hour (0..100) for walking a specific dog profile.
 */
export function scoreWeatherHour(
  w: HourlyWeatherPoint,
  index: number,
  dog: DogProfile
): ScoredHour {
  let score = 100;
  const reasons: ReasonTag[] = [];

  const asphaltTempC = estimateAsphaltTempC(w);
  const pawTier = classifyPawSafety(asphaltTempC, dog);

  // 1. Ideal thermal band tailored to dog coat, snout, age, and size
  let comfortLowC = 10;
  let comfortHighC = 21.5;

  if (dog.coat === 'thick') {
    comfortLowC = 1;
    comfortHighC = 16.5;
  } else if (dog.coat === 'short') {
    comfortLowC = 13;
    comfortHighC = 23.5;
  }

  if (dog.brachycephalic) {
    comfortHighC = Math.min(comfortHighC, 18.5);
  }
  if (dog.ageGroup === 'senior' || dog.ageGroup === 'puppy') {
    comfortLowC += 2;
    comfortHighC -= 1.5;
  }

  const effectiveTempC = w.feelsLikeC * 0.6 + w.tempC * 0.4;

  if (effectiveTempC > comfortHighC) {
    const excessC = effectiveTempC - comfortHighC;
    const heatSlope = dog.brachycephalic ? 3.8 : dog.coat === 'thick' ? 3.3 : 2.5;
    score -= Math.min(52, excessC * heatSlope);

    if (dog.brachycephalic && (w.tempC >= 20 || (w.tempC >= 17.5 && w.humidity >= 70))) {
      score -= 10;
      reasons.push('brachy_heat_risk');
    } else if (dog.coat === 'thick' && w.tempC >= 19) {
      reasons.push('thick_coat_warm');
    }
  } else if (effectiveTempC < comfortLowC) {
    const coldDeficitC = comfortLowC - effectiveTempC;
    const coldSlope = dog.coat === 'short' || dog.size === 'small' ? 2.6 : 1.6;
    score -= Math.min(42, coldDeficitC * coldSlope);

    if (w.tempC <= 0) {
      reasons.push('freezing_alert');
    } else if (coldDeficitC >= 4 && (dog.coat === 'short' || dog.size === 'small')) {
      reasons.push('chilly_short_coat');
    }
  } else {
    reasons.push('comfortable_temp');
  }

  // 2. Paw surface safety penalty
  if (pawTier === 'danger') {
    score -= 46;
    reasons.push('paw_burn_danger');
  } else if (pawTier === 'hot') {
    score -= 26;
    reasons.push('paw_hot_grass_only');
  } else if (pawTier === 'warm') {
    score -= 10;
    reasons.push('paw_warm_test');
  } else if (w.isDay) {
    reasons.push('paw_safe_surface');
  }

  // 3. Precipitation, severe WMO weather codes & post-rain wet grass check
  const isStorm = w.weatherCode >= 95;
  const isHeavyPrecip = w.precipMm >= 2.5 || w.weatherCode === 65 || w.weatherCode === 82;
  const isCurrentlyWet =
    isStorm ||
    isHeavyPrecip ||
    w.precipProb >= 35 ||
    w.precipMm >= 0.25 ||
    (w.weatherCode >= 51 && w.weatherCode <= 82);
  const isPostRainWetTurf = !isCurrentlyWet && (w.trailingRainMm ?? 0) >= 0.65;

  if (isStorm) {
    score -= 50;
    reasons.push('heavy_rain_storm');
  } else if (isHeavyPrecip || w.precipProb >= 70) {
    score -= 30;
    reasons.push('heavy_rain_storm');
  } else if (w.precipProb >= 35 || w.precipMm >= 0.3) {
    score -= Math.round((w.precipProb - 20) * 0.38);
    reasons.push('rain_likely');
  } else if (isPostRainWetTurf) {
    const lowBellyOrFluffy =
      dog.size === 'small' ||
      dog.coat === 'thick' ||
      dog.breedId === 'corgi' ||
      dog.breedId === 'poodle';
    score -= lowBellyOrFluffy ? 6 : 3;
    reasons.unshift('wet_grass_post_rain');
  }

  // 4. Australian & Global UV (including Extreme 11+), Wind, and Air Quality
  if (w.uvIndex >= 11) {
    score -= Math.min(18, 12 + (w.uvIndex - 11) * 2);
    reasons.unshift('extreme_uv');
  } else if (w.uvIndex >= 7) {
    score -= Math.min(12, (w.uvIndex - 6) * 2.5);
    reasons.push('high_uv');
  }

  if (w.windKph >= 30) {
    score -= Math.min(16, (w.windKph - 26) * 0.8);
    reasons.push('strong_wind');
  }

  if (w.usAqi !== null) {
    if (w.usAqi >= 150) {
      score -= 35;
      reasons.push('poor_air_quality');
    } else if (w.usAqi >= 101) {
      score -= dog.brachycephalic || dog.ageGroup === 'senior' ? 22 : 15;
      reasons.push('poor_air_quality');
    } else if (w.usAqi <= 45 && reasons.length < 3) {
      reasons.push('clean_air');
    }
  }

  // 5. Daylight visibility comfort
  if (!w.isDay) {
    score -= 5;
    if (reasons.length < 3) {
      reasons.push('after_dark');
    }
  }

  const clampedScore = Math.max(4, Math.min(99, Math.round(score)));
  return {
    index,
    weather: w,
    asphaltTempC,
    pawTier,
    isPostRainWetTurf,
    walkScore: clampedScore,
    qualityTier: classifyWalkQuality(clampedScore),
    reasons: reasons.slice(0, 3),
  };
}

const PAW_STRICTNESS_ORDER: Record<PawSafetyTier, number> = {
  safe: 0,
  warm: 1,
  hot: 2,
  danger: 3,
};

const SIZE_ORDER: Record<DogProfile['size'], number> = {
  small: 0,
  medium: 1,
  large: 2,
  giant: 3,
};

/**
 * Merges 1 or more active dogs into a conservative combined Pack profile
 * (most heat-sensitive snout, softest paws, largest body for weight caps,
 * and license requirement only satisfied when every pup holds one).
 */
export function mergePackDogProfile(
  dogs: DogProfile[],
  language: AppLanguage = 'en'
): DogProfile {
  if (dogs.length === 0) {
    return {
      id: 'dog-primary',
      name: 'Pudding',
      breedId: 'maltipoo',
      size: 'small',
      ageGroup: 'adult',
      coat: 'medium',
      brachycephalic: false,
      pawSensitivity: 'sensitive',
      hasDogLicense: true,
      customPhotoUri: null,
    };
  }
  const primary = dogs[0];
  if (dogs.length === 1) {
    return primary;
  }

  const names = dogs.map(
    (d) => d.name.trim() || (language === 'zh' ? '狗狗' : 'Pup')
  );
  const displayName =
    language === 'zh'
      ? names.length === 2
        ? `${names[0]} 和 ${names[1]}`
        : `${names[0]} 等 ${names.length} 只`
      : names.length === 2
        ? `${names[0]} & ${names[1]}`
        : `${names[0]} + ${names.length - 1} pups`;

  const strictestPaw: DogProfile['pawSensitivity'] = dogs.some(
    (d) => d.pawSensitivity === 'sensitive'
  )
    ? 'sensitive'
    : dogs.some((d) => d.pawSensitivity === 'normal')
      ? 'normal'
      : 'tough';

  const largestSize = dogs.reduce<DogProfile['size']>(
    (acc, d) => (SIZE_ORDER[d.size] > SIZE_ORDER[acc] ? d.size : acc),
    primary.size
  );

  const conservativeAge: DogProfile['ageGroup'] = dogs.some(
    (d) => d.ageGroup === 'senior'
  )
    ? 'senior'
    : dogs.some((d) => d.ageGroup === 'puppy')
      ? 'puppy'
      : 'adult';

  const conservativeCoat: DogProfile['coat'] = dogs.some(
    (d) => d.coat === 'thick'
  )
    ? 'thick'
    : dogs.some((d) => d.coat === 'short')
      ? 'short'
      : 'medium';

  return {
    ...primary,
    name: displayName,
    size: largestSize,
    ageGroup: conservativeAge,
    coat: conservativeCoat,
    brachycephalic: dogs.some((d) => d.brachycephalic),
    pawSensitivity: strictestPaw,
    hasDogLicense: dogs.every((d) => d.hasDogLicense),
  };
}

/**
 * Scores a forecast hour for a multi-dog pack by evaluating every active dog
 * individually and applying the strictest score, paw tier, and safety warnings
 * (e.g. Husky coat heat risk + Frenchie flat-snout heat risk combined).
 */
export function scoreWeatherHourForPack(
  w: HourlyWeatherPoint,
  index: number,
  dogs: DogProfile[]
): ScoredHour {
  if (dogs.length <= 1) {
    return scoreWeatherHour(w, index, mergePackDogProfile(dogs));
  }

  const individual = dogs.map((d) => scoreWeatherHour(w, index, d));
  let worst = individual[0];
  let strictestPaw = individual[0].pawTier;
  const combinedReasons: ReasonTag[] = [];

  for (const res of individual) {
    if (res.walkScore < worst.walkScore) {
      worst = res;
    }
    if (PAW_STRICTNESS_ORDER[res.pawTier] > PAW_STRICTNESS_ORDER[strictestPaw]) {
      strictestPaw = res.pawTier;
    }
    for (const r of res.reasons) {
      if (!combinedReasons.includes(r)) {
        combinedReasons.push(r);
      }
    }
  }

  return {
    ...worst,
    pawTier: strictestPaw,
    qualityTier: classifyWalkQuality(worst.walkScore),
    reasons: combinedReasons.slice(0, 3),
  };
}

/**
 * Finds up to 3 distinct, practical waking-hour walk windows (6 AM - 9 PM local)
 * across the next 24 hours so owners can plan morning, midday, or golden-hour walks.
 */
export function findBestWalkWindows(
  scoredHours: ScoredHour[],
  sunsetEpochMs: number | null,
  timezone?: string
): WalkWindow[] {
  const horizon = scoredHours.slice(0, 24);
  if (horizon.length === 0) return [];

  interface Candidate {
    startIdx: number;
    endIdx: number;
    rankingScore: number;
    avgScore: number;
    peakScore: number;
  }

  const candidates: Candidate[] = [];

  for (let i = 0; i < horizon.length; i++) {
    const startHourLocal = getLocalHour24(horizon[i].weather.epochMs, timezone);
    // Restrict recommended routine windows to practical waking hours (6:00 - 20:59)
    if (startHourLocal < 6 || startHourLocal > 20) {
      continue;
    }

    // Build a 2-hour window when the next hour is also strong; otherwise 1-hour slot
    const slice =
      i + 1 < horizon.length &&
      horizon[i + 1].walkScore >= horizon[i].walkScore - 10 &&
      getLocalHour24(horizon[i + 1].weather.epochMs, timezone) <= 21
        ? [horizon[i], horizon[i + 1]]
        : [horizon[i]];

    const avgScore = Math.round(
      slice.reduce((acc, h) => acc + h.walkScore, 0) / slice.length
    );
    const peakScore = Math.max(...slice.map((h) => h.walkScore));

    if (avgScore < 45) {
      continue;
    }

    candidates.push({
      startIdx: i,
      endIdx: i + slice.length - 1,
      rankingScore: avgScore * 0.7 + peakScore * 0.3,
      avgScore,
      peakScore,
    });
  }

  candidates.sort((a, b) => b.rankingScore - a.rankingScore);

  const chosen: WalkWindow[] = [];
  for (const cand of candidates) {
    if (chosen.length >= 3) break;
    // Keep at least a 2-hour separation between recommended windows
    const overlaps = chosen.some(
      (w) => cand.startIdx <= w.endIndex + 2 && cand.endIdx >= w.startIndex - 2
    );
    if (overlaps) continue;

    const hoursInWindow = horizon.slice(cand.startIdx, cand.endIdx + 1);
    const startEpochMs = hoursInWindow[0].weather.epochMs;
    const endEpochMs =
      hoursInWindow[hoursInWindow.length - 1].weather.epochMs + 60 * 60 * 1000;
    const avgTempC =
      hoursInWindow.reduce((sum, h) => sum + h.weather.tempC, 0) /
      hoursInWindow.length;
    const maxAsphaltTempC = Math.max(...hoursInWindow.map((h) => h.asphaltTempC));

    const worstPawOrder: PawSafetyTier[] = ['safe', 'warm', 'hot', 'danger'];
    const pawTier = hoursInWindow.reduce<PawSafetyTier>(
      (worst, h) =>
        worstPawOrder.indexOf(h.pawTier) > worstPawOrder.indexOf(worst)
          ? h.pawTier
          : worst,
      'safe'
    );

    const isGoldenHour =
      sunsetEpochMs !== null &&
      startEpochMs <= sunsetEpochMs &&
      endEpochMs >= sunsetEpochMs - 90 * 60 * 1000;

    chosen.push({
      id: `win-${cand.startIdx}`,
      startEpochMs,
      endEpochMs,
      startIndex: cand.startIdx,
      endIndex: cand.endIdx,
      avgScore: cand.avgScore,
      peakScore: cand.peakScore,
      avgTempC,
      maxAsphaltTempC,
      pawTier,
      qualityTier: classifyWalkQuality(cand.avgScore),
      isGoldenHour,
    });
  }

  // Present chronologically so Morning -> Afternoon -> Evening reads naturally
  return chosen.sort((a, b) => a.startEpochMs - b.startEpochMs);
}

/**
 * Dynamically scores and ranks nearby places for the selected forecast hour so
 * shaded woods rise to #1 during sunny heat, lit paved parks rise after dark,
 * and off-leash dog parks shine during prime comfort hours.
 */
/**
 * Evaluates nearby places using PawCast's 100-Point 4-Pillar Valuation Framework:
 * 1. Space & Calm (30 pts): Path width, car-free separation, low crowd/scooter pressure
 * 2. Weather & Paws (25 pts): Canopy shade in heat, dry paving in rain, lighting at night
 * 3. Proximity & Entry (25 pts): Walking distance + Free Walk-In vs Booking/狗证 friction
 * 4. Dog Freedom & Fit (20 pts): Fenced off-leash play, water stations & size-rule compatibility
 */
export function scorePlacesForHour(
  places: WalkPlace[],
  selectedHour: ScoredHour | null,
  dog?: DogProfile,
  timezone?: string,
  language: AppLanguage = 'en'
): ScoredPlace[] {
  const dogLabel = dog?.name?.trim() || (language === 'zh' ? '狗狗' : 'your dog');
  return places
    .map((place) => {
      const hasShade = place.amenities.includes('shade');
      const hasWater = place.amenities.includes('water');
      const hasOffLeash = place.amenities.includes('off_leash');
      const hasLit = place.amenities.includes('lit');
      const hasPaved = place.amenities.includes('paved');

      const openStatus = evaluatePlaceOpenStatus(
        place,
        selectedHour,
        timezone,
        language
      );
      let isMuddyTurfRisk = false;

      let matchBadge: PlaceMatchBadgeKey =
        place.distanceKm <= 1.2 ? 'close_quick_walk' : 'scenic_loop';

      // Pillar 1: Space & Calm (0..30)
      const defaultSpace =
        place.category === 'dog_park'
          ? 27
          : place.category === 'trail'
            ? 26
            : place.maxDogWeightKg
              ? 19
              : 24;
      let spacePts = place.spaceScore30 ?? defaultSpace;
      if (
        place.maxDogWeightKg &&
        dog &&
        (dog.size === 'large' || dog.size === 'giant')
      ) {
        spacePts = Math.max(8, spacePts - 10);
      }
      const spaceNote =
        place.spaceNote ||
        (place.category === 'dog_park'
          ? 'Enclosed activity space · Separated from road traffic'
          : place.maxDogWeightKg
            ? 'Compact pocket garden · Narrower paths'
            : 'Wide pedestrian paths · Low scooter conflict');

      // Pillar 2: Weather & Paw Fit (0..25) — includes Post-Rain Wet Grass & Muddy Belly Physics
      let weatherPts = 21;
      let weatherNote = 'Comfortable surface for current conditions';
      if (selectedHour) {
        const w = selectedHour.weather;
        const isHotOrSunny =
          selectedHour.pawTier !== 'safe' || w.tempC >= 22 || w.uvIndex >= 5.5;
        const isWet = w.precipProb >= 35 || w.precipMm >= 0.2;
        const isPostRainWet = selectedHour.isPostRainWetTurf;
        const isNight = !w.isDay;

        if (isWet) {
          if (hasPaved) {
            weatherPts = 24;
            weatherNote = `Dry-draining paved footing keeps ${dogLabel}’s paws cleaner`;
            matchBadge = 'dry_paved';
          } else {
            weatherPts = 11;
            weatherNote = 'Unpaved lawn/trail gets muddy in rain';
            isMuddyTurfRisk = true;
          }
        } else if (isPostRainWet) {
          if (hasPaved && place.category !== 'dog_park') {
            weatherPts = 25;
            weatherNote = `Dry paved route — avoids post-rain muddy belly for ${dogLabel}`;
            matchBadge = 'dry_paved';
          } else if (hasPaved && place.category === 'dog_park') {
            weatherPts = 19;
            weatherNote = 'Paved approach is dry; off-leash lawn may still be damp';
          } else {
            weatherPts = 11;
            weatherNote = 'Post-rain soaked grass — muddy paws & belly likely';
            isMuddyTurfRisk = true;
          }
        } else if (isNight) {
          if (hasLit && hasPaved) {
            weatherPts = 24;
            weatherNote = 'Well-lit paved path for evening visibility';
            matchBadge = 'lit_evening';
          } else if (hasLit) {
            weatherPts = 21;
            weatherNote = 'Evening lighting available';
            matchBadge = 'lit_evening';
          } else {
            weatherPts = 11;
            weatherNote = 'Limited lighting after dark';
          }
        } else if (isHotOrSunny) {
          if (place.category === 'dog_beach' && w.uvIndex < 10 && selectedHour.pawTier !== 'danger') {
            weatherPts = 24;
            weatherNote = 'Cool bay/ocean wading water beats warm air';
            matchBadge = 'off_leash_prime';
          } else if (hasShade) {
            weatherPts = hasWater ? 25 : 23;
            weatherNote = 'Tree canopy cools ground & shields high UV';
            matchBadge = 'shaded_relief';
          } else {
            weatherPts = 12;
            weatherNote =
              place.category === 'dog_beach'
                ? 'Dry midday sand gets hot under high UV — stick to wet waterline'
                : 'Sun-exposed surface during warm/high-UV hours';
          }
        } else {
          weatherPts = hasShade || hasPaved ? 24 : 22;
          weatherNote = 'Safe ground temp & pleasant air';
          if (hasOffLeash && selectedHour.walkScore >= 75) {
            matchBadge = 'off_leash_prime';
          }
        }
      }

      // Pillar 3: Proximity, Entry Ease & Real-Time Operating Hours (0..25)
      let proxPts = Math.max(6, Math.round(25 - place.distanceKm * 1.65));
      let entryPenalty = 0;
      if (place.accessRule === 'booking_license') {
        entryPenalty = 4;
      } else if (place.accessRule === 'pet_ticket') {
        entryPenalty = 3;
      }
      proxPts = Math.max(4, proxPts - entryPenalty);
      const entryShort =
        place.accessRule === 'booking_license'
          ? 'WeChat booking + 狗证'
          : place.accessRule === 'pet_ticket'
            ? 'Pet ticket at gate'
            : 'Free walk-in';
      const distPrefix =
        place.distanceKm < 1.2
          ? 'Doorstep walk'
          : place.distanceKm < 2.5
            ? 'Neighborhood walk'
            : place.distanceKm <= 10
              ? 'Short city drive'
              : 'Suburban destination drive';
      let proxNote = `${distPrefix} · ${entryShort}`;

      let needsLicenseWarning = false;

      if (!openStatus.isOpen) {
        proxPts = 2;
        proxNote = `🔒 ${openStatus.badgeText} (${openStatus.hoursSummary})`;
        matchBadge = 'closed_at_hour';
      } else if (
        place.accessRule === 'booking_license' &&
        dog &&
        dog.hasDogLicense === false
      ) {
        proxPts = 3;
        proxNote = '🪪 Requires Shanghai 狗证 + rabies card at gate';
        matchBadge = 'needs_dog_license';
        needsLicenseWarning = true;
      } else if (openStatus.closingSoon) {
        proxPts = Math.max(4, proxPts - 5);
        proxNote = `⏳ ${openStatus.badgeText} · ${entryShort}`;
      }

      // Pillar 4: Dog Freedom & Rule Fit (0..20)
      let dogPts = hasOffLeash ? 18 : 14;
      if (hasWater) dogPts = Math.min(20, dogPts + 2);
      if (
        dog &&
        dog.hasDogLicense === false &&
        place.accessRule !== 'booking_license'
      ) {
        // In Australia / Global mode, toggling off Recall-Ready boosts fully fenced runs over unfenced parks/beaches
        if (place.leashPolicy === 'off_leash_fenced') {
          dogPts = 20;
        } else if (place.leashPolicy === 'off_leash_unfenced') {
          dogPts = Math.max(10, dogPts - 5);
        }
      }
      let dogNote =
        place.leashPolicy === 'off_leash_fenced'
          ? 'Fenced off-leash play + secure boundary'
          : place.leashPolicy === 'off_leash_unfenced'
            ? 'Unfenced council off-leash zone (voice recall needed)'
            : 'On-leash walk';

      if (
        place.maxDogWeightKg &&
        place.maxDogWeightKg <= 15 &&
        dog &&
        (dog.size === 'large' || dog.size === 'giant')
      ) {
        dogPts = 2;
        dogNote = `Restricted to small dogs ≤${place.maxDogWeightKg} kg`;
        if (openStatus.isOpen && !needsLicenseWarning) {
          matchBadge = 'small_dogs_only';
        }
      }

      let total = Math.max(
        20,
        Math.min(99, spacePts + weatherPts + proxPts + dogPts)
      );
      if (!openStatus.isOpen) {
        total = Math.min(44, total);
      } else if (needsLicenseWarning) {
        total = Math.min(52, total);
      }

      const pillars: ScorePillar[] = [
        {
          key: 'space',
          label: 'Space & Calm',
          points: spacePts,
          maxPoints: 30,
          note: spaceNote,
        },
        {
          key: 'weather',
          label: 'Weather & Paws',
          points: weatherPts,
          maxPoints: 25,
          note: weatherNote,
        },
        {
          key: 'proximity',
          label: 'Proximity & Entry',
          points: proxPts,
          maxPoints: 25,
          note: proxNote,
        },
        {
          key: 'dogFit',
          label: 'Dog Freedom',
          points: dogPts,
          maxPoints: 20,
          note: dogNote,
        },
      ];

      return {
        place,
        placeScore: total,
        matchBadge,
        pillars,
        openStatus,
        isMuddyTurfRisk,
        needsLicenseWarning,
      };
    })
    .sort((a, b) => b.placeScore - a.placeScore);
}

/**
 * Generates a calm circular doorstep walking loop (`15 / 30 / 45 min`) starting & ending at `center`,
 * steering toward the nearest `🟢 Easy` street corridor or green space and away from `🔴 Hard / Crowded` streets.
 */
function pickLocalizedSpotOrCorridorName(
  rawName: string,
  language: AppLanguage
): string {
  const parts = rawName.split(' · ');
  if (parts.length >= 2) {
    const rest = parts.slice(1).join(' · ').trim();
    if (language === 'zh' && /[\u4e00-\u9fff]/.test(rest)) {
      return rest;
    }
    return parts[0].trim();
  }
  return rawName;
}

export function buildDoorstepLoop(
  center: LocationPoint,
  durationMin: LoopDurationMinutes,
  corridors: StreetCorridor[],
  places: ScoredPlace[],
  selectedHour: ScoredHour | null,
  language: AppLanguage = 'en'
): DoorstepLoopPlan {
  const isZh = language === 'zh';
  const distanceKm =
    durationMin === 15 ? 1.1 : durationMin === 30 ? 2.2 : 3.4;

  // Approximate degree conversion around center.latitude
  const latRad = (center.latitude * Math.PI) / 180;
  const kmPerDegLat = 111.1;
  const kmPerDegLon = Math.max(25, 111.32 * Math.cos(latRad));

  // Find nearest 'easy' street corridor or open nearby spot to steer loop toward
  let bearingRad = Math.PI * 0.28; // Default NE gentle residential loop
  let anchorName = isZh
    ? '周边清静林荫街区'
    : 'Quiet residential tree-lined blocks';
  let avoidedName: string | null = null;

  const easyCorridors = corridors
    .filter((c) => c.baseConvenience === 'easy')
    .map((c) => {
      const mid = c.coordinates[Math.floor(c.coordinates.length / 2)];
      const dyKm = (mid[0] - center.latitude) * kmPerDegLat;
      const dxKm = (mid[1] - center.longitude) * kmPerDegLon;
      return { cor: c, dxKm, dyKm, dKm: Math.hypot(dxKm, dyKm) };
    })
    .sort((a, b) => a.dKm - b.dKm);

  const hardCorridors = corridors
    .filter((c) => c.baseConvenience === 'hard')
    .map((c) => {
      const mid = c.coordinates[Math.floor(c.coordinates.length / 2)];
      const dyKm = (mid[0] - center.latitude) * kmPerDegLat;
      const dxKm = (mid[1] - center.longitude) * kmPerDegLon;
      return { cor: c, dxKm, dyKm, dKm: Math.hypot(dxKm, dyKm) };
    })
    .sort((a, b) => a.dKm - b.dKm);

  if (easyCorridors.length > 0 && easyCorridors[0].dKm <= 4.5) {
    bearingRad = Math.atan2(easyCorridors[0].dyKm, easyCorridors[0].dxKm);
    anchorName = pickLocalizedSpotOrCorridorName(
      easyCorridors[0].cor.name,
      language
    );
  } else if (places.length > 0) {
    const topOpen =
      places.find((p) => p.openStatus.isOpen && p.place.distanceKm <= 3.5) ??
      places[0];
    const dyKm = (topOpen.place.latitude - center.latitude) * kmPerDegLat;
    const dxKm = (topOpen.place.longitude - center.longitude) * kmPerDegLon;
    if (Math.hypot(dxKm, dyKm) > 0.05) {
      bearingRad = Math.atan2(dyKm, dxKm);
    }
    anchorName = pickLocalizedSpotOrCorridorName(topOpen.place.name, language);
  }

  if (hardCorridors.length > 0 && hardCorridors[0].dKm <= 3.2) {
    avoidedName = pickLocalizedSpotOrCorridorName(
      hardCorridors[0].cor.name,
      language
    );
    const hardAngle = Math.atan2(hardCorridors[0].dyKm, hardCorridors[0].dxKm);
    // Deflect loop direction if it points directly into a narrow/crowded street
    if (Math.abs(Math.atan2(Math.sin(bearingRad - hardAngle), Math.cos(bearingRad - hardAngle))) < 0.45) {
      bearingRad = hardAngle + Math.PI * 0.65;
    }
  }

  // Loop major diameter D so perimeter of oval (~pi * 0.78 * D) matches distanceKm
  const majorKm = distanceKm / 2.45;
  const minorKm = majorKm * 0.56;
  const centerOffsetKm = majorKm * 0.5;

  const loopCenterX = Math.cos(bearingRad) * centerOffsetKm;
  const loopCenterY = Math.sin(bearingRad) * centerOffsetKm;
  const perpRad = bearingRad + Math.PI / 2;

  const steps = 8;
  const coordinates: Array<[number, number]> = [[center.latitude, center.longitude]];
  for (let i = 1; i < steps; i++) {
    // Parameter theta from -PI to +PI starting/ending at -PI (the user's doorstep)
    const theta = -Math.PI + (i / steps) * 2 * Math.PI;
    const along = Math.cos(theta) * (majorKm / 2);
    const across = Math.sin(theta) * (minorKm / 2);
    const xKm =
      loopCenterX +
      Math.cos(bearingRad) * along +
      Math.cos(perpRad) * across;
    const yKm =
      loopCenterY +
      Math.sin(bearingRad) * along +
      Math.sin(perpRad) * across;
    coordinates.push([
      Number((center.latitude + yKm / kmPerDegLat).toFixed(5)),
      Number((center.longitude + xKm / kmPerDegLon).toFixed(5)),
    ]);
  }
  coordinates.push([center.latitude, center.longitude]);

  const surfaceNote = selectedHour?.isPostRainWetTurf
    ? isZh
      ? '雨后优先干爽人行道，避开泥泞草地'
      : 'Dry paved sidewalks prioritized after rain'
    : selectedHour && !selectedHour.weather.isDay
      ? isZh
        ? '路灯充足的夜间安全环线'
        : 'Well-lit evening sidewalk loop'
      : isZh
        ? '宽敞树荫人行道 · 电瓶车和行人不拥挤'
        : 'Wide shaded sidewalks · Low scooter conflict';

  return {
    durationMin,
    distanceKm,
    coordinates,
    anchorName,
    avoidedName,
    surfaceNote,
  };
}
