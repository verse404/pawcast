import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { detectActiveRegion } from '../constants/auSuburbs';
import { useAuth } from '../context/AuthContext';
import { useWalkPlanner } from '../context/WalkPlannerContext';
import { buildDoorstepLoop } from '../engine/walkScoring';
import {
  formatClockTime,
  formatDistance,
  formatDriveMinutes,
  formatInteger,
  formatShortHour,
  formatTemperature,
  formatTimeWindow,
  formatWalkMinutes,
  formatWindSpeed,
  isWalkableSpotDistance,
} from '../i18n/formatters';
import { getLocaleTag, getStrings } from '../i18n/translations';
import { getCorridorsForLocation } from '../services/placesService';
import {
  COLORS,
  ELEVATION,
  getQualityColors,
  UI_FONT_FAMILY,
} from '../theme/colors';
import {
  AppLanguage,
  LoopDurationMinutes,
  ScoredHour,
  ScoredPlace,
  UnitSystem,
} from '../types/walk';
import { getSimpleSpotTag, splitSpotDisplayName } from '../utils/spotGuide';
import { buildSafeLoopUrl } from '../utils/validation';
import { AuthModal } from './AuthModal';
import { DogAvatar } from './DogAvatar';
import { ParkGuideSheet } from './ParkGuideSheet';
import {
  ParkScenicBadge,
  UiIcon,
  WeatherAtmosphereArt,
  WeatherMood,
} from './UiIcons';

type WalkIntentMode = 'parks' | 'door';

interface WalkNowScreenProps {
  onOpenMapSpot: (placeId: string) => void;
  onOpenFullMap: () => void;
  onPreviewLoopOnMap: (duration: LoopDurationMinutes) => void;
  onOpenGpsSuburbLocator?: () => void;
}

function buildVerdictCopy(
  selectedHour: ScoredHour | null,
  selectedHourIndex: number,
  bestNextTimeLabel: string | null,
  dogName: string,
  units: UnitSystem,
  isAustralia: boolean,
  language: AppLanguage,
  tz?: string
): {
  statusLabel: string;
  statusColor: string;
  headline: string;
  reason: string;
  cardBg: string;
  cardBorder: string;
  dotColor: string;
  mood: WeatherMood;
} {
  const isZh = language === 'zh';
  const loc = getLocaleTag(language);

  if (!selectedHour) {
    return {
      statusLabel: isZh ? '实时路况' : 'LIVE CHECK',
      statusColor: COLORS.brandDark,
      headline: isZh ? '正在评估遛狗舒适度…' : 'Checking Walk Conditions…',
      reason: isZh
        ? `正在为 ${dogName} 查看实时地面温度和体感舒适度。`
        : `Loading live pavement and air comfort for ${dogName}.`,
      cardBg: COLORS.surface,
      cardBorder: COLORS.border,
      dotColor: COLORS.brand,
      mood: 'sunny',
    };
  }

  const w = selectedHour.weather;
  const reasons = selectedHour.reasons;
  const tempStr = formatTemperature(w.tempC, units, loc);
  const asphaltStr = formatTemperature(selectedHour.asphaltTempC, units, loc);
  const timePrefix =
    selectedHourIndex === 0
      ? isZh
        ? '现在'
        : 'Now'
      : formatClockTime(w.epochMs, tz, loc);

  // 1. Active rain or light drizzle
  if (
    w.precipProb >= 40 ||
    w.precipMm >= 0.3 ||
    reasons.includes('heavy_rain_storm') ||
    reasons.includes('rain_likely')
  ) {
    const isLightDrizzle = w.precipProb < 40 && w.precipMm < 0.8;
    return {
      statusLabel: isLightDrizzle
        ? isZh
          ? '毛毛细雨'
          : 'LIGHT DRIZZLE'
        : isZh
          ? '雨天提醒'
          : 'WET WEATHER',
      statusColor: COLORS.rainText,
      headline: isLightDrizzle
        ? isZh
          ? `毛毛细雨 · ${tempStr}`
          : `Light Drizzle · ${tempStr}`
        : bestNextTimeLabel && selectedHourIndex === 0
          ? isZh
            ? `正在下雨 · 建议 ${bestNextTimeLabel}`
            : `Rainy Now · Best at ${bestNextTimeLabel}`
          : isZh
            ? `雨天湿滑 · ${tempStr}`
            : `Wet Weather · ${tempStr}`,
      reason: isLightDrizzle
        ? isZh
          ? `有零星小雨，走排水好的平路不容易弄脏 ${dogName} 的爪子${bestNextTimeLabel ? `（${bestNextTimeLabel} 雨势最小）` : ''}。`
          : `Passing light drizzle — fast-draining paved paths keep ${dogName}’s paws cleaner${bestNextTimeLabel ? ` (driest ${bestNextTimeLabel})` : ''}.`
        : isZh
          ? `降水概率 ${formatInteger(w.precipProb, loc)}%，建议在屋檐下简单解决或走干爽步道。`
          : `Rain chance is ${formatInteger(w.precipProb, loc)}% — stick to a quick sheltered break or paved path.`,
      cardBg: COLORS.rainBg,
      cardBorder: COLORS.rainBorder,
      dotColor: COLORS.rainAccent,
      mood: 'rain',
    };
  }

  // 2. Post-rain wet turf alert
  if (selectedHour.isPostRainWetTurf) {
    return {
      statusLabel: isZh ? '草地湿滑' : 'MUDDY LAWNS',
      statusColor: COLORS.cautionText,
      headline: isZh
        ? `建议走干爽步道 · ${tempStr}`
        : `Go Paved · Wet Grass · ${tempStr}`,
      reason: isZh
        ? `刚下过雨草地比较泥泞，已优先推荐干爽步道，帮 ${dogName} 保持爪子干净。`
        : `Earlier rain left lawns damp — dry-draining paved walks rank #1 to keep ${dogName}’s paws clean.`,
      cardBg: COLORS.cautionBg,
      cardBorder: COLORS.cautionBorder,
      dotColor: COLORS.cautionAccent,
      mood: 'shaded',
    };
  }

  // 3. Dangerous or hot sunlit pavement / hot beach sand
  if (selectedHour.pawTier === 'hot' || selectedHour.pawTier === 'danger') {
    const surfaceNoun = isAustralia
      ? isZh
        ? '地面烫爪'
        : 'Hot Bitumen'
      : isZh
        ? '地面过烫'
        : 'Hot Pavement';
    const surfaceDetail = isAustralia
      ? isZh
        ? `暴晒的柏油路和干沙滩已达 ${asphaltStr}。`
        : `Sunlit bitumen & dry beach sand reach ${asphaltStr}.`
      : isZh
        ? `暴晒地面已达 ${asphaltStr}。`
        : `Sunlit pavement reaches ${asphaltStr}.`;
    return {
      statusLabel: isZh ? '小心烫爪' : 'PAW HEAT ALERT',
      statusColor: COLORS.avoidText,
      headline:
        bestNextTimeLabel && selectedHourIndex === 0
          ? isZh
            ? `建议等到 ${bestNextTimeLabel} · ${surfaceNoun}`
            : `Wait for ${bestNextTimeLabel} · ${surfaceNoun}`
          : isZh
            ? `地面过烫（${asphaltStr}）`
            : `Hot Surface (${asphaltStr})`,
      reason: isZh
        ? `${surfaceDetail}尽量走在树荫下，或等傍晚凉快点再出门。`
        : `${surfaceDetail} Stick to dense tree canopy or wait for cooler evening air.`,
      cardBg: COLORS.avoidBg,
      cardBorder: COLORS.avoidBorder,
      dotColor: COLORS.avoidAccent,
      mood: 'hot',
    };
  }

  // 3B. Extreme UV (11+)
  const roundedUv = Math.round(w.uvIndex);
  if (reasons.includes('extreme_uv') || roundedUv >= 11) {
    const uvLead = isAustralia
      ? isZh
        ? '澳洲紫外线极强'
        : 'Australian UV is extreme'
      : isZh
        ? '当前紫外线极强'
        : 'UV index is extreme';
    return {
      statusLabel: isZh
        ? `极强紫外线 UV ${formatInteger(roundedUv, loc)}`
        : `EXTREME UV ${formatInteger(roundedUv, loc)}`,
      statusColor: COLORS.avoidText,
      headline:
        bestNextTimeLabel && selectedHourIndex === 0
          ? isZh
            ? `极强紫外线 · 建议 ${bestNextTimeLabel}`
            : `Extreme UV ${formatInteger(roundedUv, loc)} · Best ${bestNextTimeLabel}`
          : isZh
            ? `紫外线极强（${formatInteger(roundedUv, loc)}）· 走树荫`
            : `Extreme UV (${formatInteger(roundedUv, loc)}) · Seek Canopy`,
      reason: isZh
        ? `${uvLead}（${formatInteger(roundedUv, loc)}），暴晒地面约 ${asphaltStr}。注意保护鼻尖和耳朵，尽量走阴凉处或 17:00 后出门。`
        : `${uvLead} (${formatInteger(roundedUv, loc)}) and sunlit ground reaches ${asphaltStr}. Protect pink noses/ears and walk under deep shade or after 17:00.`,
      cardBg: COLORS.avoidBg,
      cardBorder: COLORS.avoidBorder,
      dotColor: COLORS.avoidAccent,
      mood: 'hot',
    };
  }

  // 4. Warm pavement, high UV, or warm air for thick-coated / flat-faced breeds
  if (
    selectedHour.pawTier === 'warm' ||
    reasons.includes('brachy_heat_risk') ||
    reasons.includes('thick_coat_warm') ||
    reasons.includes('high_uv')
  ) {
    const dayLead =
      roundedUv >= 8
        ? isZh
          ? `紫外线 ${formatInteger(roundedUv, loc)}，暴晒地面约 ${asphaltStr}`
          : `UV ${formatInteger(roundedUv, loc)} & sunlit ground reaches ${asphaltStr}`
        : isZh
          ? `暴晒地面约 ${asphaltStr}`
          : `Sunlit ground reaches ${asphaltStr}`;
    return {
      statusLabel:
        roundedUv >= 8
          ? isZh
            ? `强紫外线 UV ${formatInteger(roundedUv, loc)}`
            : `HIGH UV ${formatInteger(roundedUv, loc)}`
          : isZh
            ? '建议走树荫'
            : 'SHADED WALK',
      statusColor: COLORS.cautionText,
      headline:
        selectedHourIndex === 0
          ? isZh
            ? `适合树荫慢走 · ${tempStr}`
            : `Shaded Walk Best · ${tempStr}`
          : isZh
            ? `${timePrefix} · 树荫慢走 · ${tempStr}`
            : `${timePrefix} · Shaded Walk · ${tempStr}`,
      reason: w.isDay
        ? isZh
          ? `${dayLead}，树荫多的步道和有风的滨水路线对 ${dogName} 最舒服。`
          : `${dayLead} — tree-shaded trails and breezy foreshores feel best for ${dogName}.`
        : isZh
          ? `气温偏暖（${tempStr}），带 ${dogName} 沿风凉的水边慢慢散步就好。`
          : `Warm air (${tempStr}) — keep ${dogName}’s pace relaxed along breezy waterfronts.`,
      cardBg: COLORS.cautionBg,
      cardBorder: COLORS.cautionBorder,
      dotColor: COLORS.cautionAccent,
      mood: w.isDay ? 'shaded' : 'night',
    };
  }

  // 5. Elevated Air Quality (AQI >= 101)
  if (
    (w.usAqi !== null && w.usAqi >= 101) ||
    reasons.includes('poor_air_quality')
  ) {
    const aqiTag =
      w.usAqi !== null
        ? `AQI ${formatInteger(w.usAqi, loc)}`
        : isZh
          ? '空气轻度污染'
          : 'Hazy Air';
    return {
      statusLabel: isZh ? '空气质量欠佳' : 'ELEVATED AQI',
      statusColor: COLORS.cautionText,
      headline:
        selectedHourIndex === 0
          ? isZh
            ? `轻松慢走 · ${aqiTag} · ${tempStr}`
            : `Gentle Pace · ${aqiTag} · ${tempStr}`
          : `${timePrefix} · ${aqiTag} · ${tempStr}`,
      reason: isZh
        ? `地面温度安全（${asphaltStr}），但空气质量一般，建议林荫慢走、减少剧烈奔跑。`
        : `Ground is safe (${asphaltStr}), though air is hazy — keep zoomies light on tree-lined paths.`,
      cardBg: COLORS.cautionBg,
      cardBorder: COLORS.cautionBorder,
      dotColor: COLORS.cautionAccent,
      mood: w.isDay ? 'shaded' : 'night',
    };
  }

  // 6. Freezing or chilly air for short-coated / small dogs
  if (
    w.tempC <= 2 ||
    reasons.includes('freezing_alert') ||
    reasons.includes('chilly_short_coat')
  ) {
    return {
      statusLabel: isZh ? '天气寒冷' : 'CRISP & CHILLY',
      statusColor: COLORS.cautionText,
      headline:
        selectedHourIndex === 0
          ? isZh
            ? `注意保暖 · ${tempStr}`
            : `Brisk Walk · ${tempStr}`
          : isZh
            ? `${timePrefix} · 气温偏低 · ${tempStr}`
            : `${timePrefix} · Brisk Air · ${tempStr}`,
      reason:
        w.tempC <= 0
          ? isZh
            ? `室外已结冰（${tempStr}），注意防滑并及时擦干爪垫。`
            : `Freezing air (${tempStr}) — watch for icy curbs and keep paw pads dry.`
          : isZh
            ? `天气较凉（${tempStr}），给短毛或小型犬穿件小衣服会更暖和。`
            : `Crisp cool air (${tempStr}) — a light coat helps thin-coated pups stay cozy.`,
      cardBg: COLORS.cautionBg,
      cardBorder: COLORS.cautionBorder,
      dotColor: COLORS.cautionAccent,
      mood: w.isDay ? 'shaded' : 'night',
    };
  }

  // 7. Gusty winds
  if (w.windKph >= 30 || reasons.includes('strong_wind')) {
    return {
      statusLabel: isZh ? '风力较大' : 'BREEZY CONDITIONS',
      statusColor: COLORS.goodText,
      headline:
        selectedHourIndex === 0
          ? isZh
            ? `大风出行 · ${tempStr}`
            : `Breezy Walk · ${tempStr}`
          : isZh
            ? `${timePrefix} · 风较大 · ${tempStr}`
            : `${timePrefix} · Breezy · ${tempStr}`,
      reason: isZh
        ? `阵风较强（${formatWindSpeed(w.windKph, units, loc)}），避风的林荫路线走起来最舒服。`
        : `Gusty winds (${formatWindSpeed(w.windKph, units, loc)}) — sheltered neighborhood canopy loops feel calmest.`,
      cardBg: COLORS.goodBg,
      cardBorder: COLORS.goodBorder,
      dotColor: COLORS.goodAccent,
      mood: w.isDay ? 'shaded' : 'night',
    };
  }

  // 8. Ideal / Good conditions (daytime or calm evening)
  const isEveningNow = !w.isDay;
  return {
    statusLabel: isEveningNow
      ? isZh
        ? '适合夜遛'
        : 'CALM EVENING'
      : isZh
        ? '非常适合遛狗'
        : 'IDEAL COMFORT',
    statusColor: COLORS.idealText,
    headline:
      selectedHourIndex === 0
        ? isZh
          ? `${isEveningNow ? '很适合夜遛' : '现在很适合遛狗'} · ${tempStr}`
          : `${isEveningNow ? 'Great Evening Walk' : 'Great to Walk Now'} · ${tempStr}`
        : isZh
          ? `${timePrefix} 很适合出门 · ${tempStr}`
          : `Great at ${timePrefix} · ${tempStr}`,
    reason: isZh
      ? `地面 ${asphaltStr} 不冷不烫、微风习习，非常适合 ${dogName}${isEveningNow ? '（已优先推荐有路灯的路线）' : ''}。`
      : `Comfortable ${asphaltStr} ground & gentle breeze tailored for ${dogName}${
          isEveningNow ? ' · Well-lit paths rank #1' : ''
        }.`,
    cardBg: COLORS.idealBg,
    cardBorder: COLORS.idealBorder,
    dotColor: COLORS.idealAccent,
    mood: isEveningNow ? 'night' : 'sunny',
  };
}

function getSpotAccessAndStyleText(sp: ScoredPlace): string {
  const access =
    sp.place.accessRule === 'booking_license'
      ? '狗证 Required'
      : sp.place.accessRule === 'pet_ticket'
        ? 'Pet Ticket'
        : 'Free Entry';

  const style =
    sp.place.leashPolicy === 'off_leash_fenced'
      ? 'Fenced Off-Leash'
      : sp.place.amenities.includes('shade')
        ? 'Shaded Canopy'
        : 'Leashed Walk';

  return `${access} · ${style}`;
}

export const WalkNowScreen: React.FC<WalkNowScreenProps> = ({
  onOpenMapSpot,
  onOpenFullMap,
  onPreviewLoopOnMap,
  onOpenGpsSuburbLocator,
}) => {
  const { user } = useAuth();
  const [dismissedSignInBanner, setDismissedSignInBanner] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const {
    location,
    requestGpsLocation,
    isLocating,
    locationNotice,
    clearLocationNotice,
    units,
    language,
    dog,
    isPackMode,
    logWalk,
    isLoading,
    isOfflineForecast,
    errorBanner,
    refreshData,
    forecast,
    scoredHours,
    bestWindows,
    selectedHour,
    selectedHourIndex,
    setSelectedHourIndex,
    scoredPlaces,
    memberPreferences,
    gearChecklist,
    toggleGearItem,
  } = useWalkPlanner();
  const t = getStrings(language);
  const loc = getLocaleTag(language);

  const [intentMode, setIntentMode] = useState<WalkIntentMode>('parks');
  const [showTimeline, setShowTimeline] = useState(false);
  const [loopDuration, setLoopDuration] = useState<LoopDurationMinutes>(
    memberPreferences.defaultLoopDuration
  );

  useEffect(() => {
    setLoopDuration(memberPreferences.defaultLoopDuration);
  }, [memberPreferences.defaultLoopDuration]);
  const [activeGuideSpotId, setActiveGuideSpotId] = useState<string | null>(
    null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loopLoggedFeedback, setLoopLoggedFeedback] = useState(false);
  const loopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (loopTimerRef.current) {
        clearTimeout(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };
  }, []);

  const tz = location.timezone === 'auto' ? undefined : location.timezone;

  const handlePullRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  const activeRegion = useMemo(
    () => detectActiveRegion(location.latitude, location.longitude),
    [location.latitude, location.longitude]
  );

  const activeCorridors = useMemo(
    () => getCorridorsForLocation(location.latitude, location.longitude),
    [location.latitude, location.longitude]
  );

  // Pre-filter Top 3 open, license-compatible, size-compatible matches
  const topThreeMatches = useMemo<ScoredPlace[]>(() => {
    const strictOpen = scoredPlaces.filter(
      (sp) =>
        sp.openStatus.isOpen &&
        !sp.needsLicenseWarning &&
        sp.matchBadge !== 'small_dogs_only'
    );
    if (strictOpen.length >= 3) {
      return strictOpen.slice(0, 3);
    }
    const openAny = scoredPlaces.filter((sp) => sp.openStatus.isOpen);
    if (openAny.length >= 3) {
      return openAny.slice(0, 3);
    }
    return scoredPlaces.slice(0, 3);
  }, [scoredPlaces]);

  const activeLoopPlan = useMemo(
    () =>
      buildDoorstepLoop(
        location,
        loopDuration,
        activeCorridors,
        scoredPlaces,
        selectedHour,
        language
      ),
    [
      location,
      loopDuration,
      activeCorridors,
      scoredPlaces,
      selectedHour,
      language,
    ]
  );

  const bestNextWindowLabel = useMemo(() => {
    const topWin = bestWindows[0];
    if (!topWin) return null;
    if (selectedHour && selectedHour.qualityTier !== 'ideal') {
      return formatClockTime(topWin.startEpochMs, tz, loc);
    }
    return formatTimeWindow(topWin.startEpochMs, topWin.endEpochMs, tz, loc);
  }, [bestWindows, selectedHour, tz, loc]);

  const isAustralia = activeRegion === 'melbourne' || activeRegion === 'sydney';

  const verdict = useMemo(
    () =>
      buildVerdictCopy(
        selectedHour,
        selectedHourIndex,
        bestNextWindowLabel,
        dog.name,
        units,
        isAustralia,
        language,
        tz
      ),
    [
      selectedHour,
      selectedHourIndex,
      bestNextWindowLabel,
      dog.name,
      units,
      isAustralia,
      language,
      tz,
    ]
  );

  const activeGuideSpotIndex = useMemo(
    () =>
      activeGuideSpotId
        ? scoredPlaces.findIndex((s) => s.place.id === activeGuideSpotId)
        : -1,
    [activeGuideSpotId, scoredPlaces]
  );

  const activeGuideSpot =
    activeGuideSpotIndex >= 0 ? scoredPlaces[activeGuideSpotIndex] : null;

  const activeGearItems = useMemo(() => {
    if (!selectedHour || gearChecklist.length === 0) return [];
    const w = selectedHour.weather;
    const isHotPaws = selectedHour.pawTier !== 'safe';
    const isRain =
      w.precipProb >= 35 || w.precipMm >= 0.3 || selectedHour.isPostRainWetTurf;
    const isNight = !w.isDay;
    const needsLicense = activeRegion === 'shanghai' || dog.hasDogLicense;

    return gearChecklist.filter((item) => {
      if (item.trigger === 'always') return true;
      if (item.trigger === 'hot_paws') return isHotPaws;
      if (item.trigger === 'rain') return isRain;
      if (item.trigger === 'night') return isNight;
      if (item.trigger === 'license') return needsLicense;
      return false;
    });
  }, [gearChecklist, selectedHour, activeRegion, dog.hasDogLicense]);

  const handleStartLoopInMaps = () => {
    const url = buildSafeLoopUrl(
      activeLoopPlan.coordinates,
      memberPreferences.preferredMapsApp,
      Platform.OS === 'ios'
    );
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  if (isLoading && !selectedHour && scoredPlaces.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.brand} />
        <Text style={styles.loadingText}>{t.loadingForecast}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={COLORS.brand}
          />
        }
      >
        {/* Optional Network Retry Banner */}
        {errorBanner ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorBanner}</Text>
            <Pressable onPress={refreshData} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>{t.retryAction}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Optional GPS Permission Notice */}
        {locationNotice ? (
          <View style={[styles.gpsNoticeRow, ELEVATION.card]}>
            <Text style={styles.gpsNoticeText}>{locationNotice}</Text>
            <Pressable
              onPress={clearLocationNotice}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss location notice"
            >
              <UiIcon name="close" size={16} color={COLORS.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {/* 1. Atmospheric Hero Walk Verdict Card */}
        <View
          style={[
            styles.verdictCard,
            ELEVATION.cardHero,
            {
              backgroundColor: verdict.cardBg,
              borderColor: verdict.cardBorder,
            },
          ]}
        >
          <WeatherAtmosphereArt mood={verdict.mood} />

          <View style={styles.verdictHeaderRow}>
            <View style={styles.verdictCopyCol}>
              <View style={styles.verdictEyebrowRow}>
                <View style={styles.verdictBadgePill}>
                  <View
                    style={[
                      styles.verdictStatusDot,
                      { backgroundColor: verdict.dotColor },
                    ]}
                  />
                  <Text
                    style={[
                      styles.verdictBadgeText,
                      { color: verdict.statusColor },
                    ]}
                  >
                    {verdict.statusLabel}
                  </Text>
                </View>

                <Pressable
                  onPress={handlePullRefresh}
                  disabled={isLoading || isRefreshing}
                  accessibilityRole="button"
                  accessibilityLabel="Refresh live weather and park conditions"
                  style={({ pressed }) => [
                    styles.liveRefreshPill,
                    isOfflineForecast && styles.offlineRefreshPill,
                    pressed && styles.pressed,
                  ]}
                >
                  {isLoading || isRefreshing ? (
                    <ActivityIndicator size="small" color={COLORS.brandDark} />
                  ) : null}
                  <Text
                    style={[
                      styles.liveRefreshText,
                      isOfflineForecast && styles.offlineRefreshText,
                    ]}
                  >
                    {isLoading || isRefreshing
                      ? t.updatingStatus
                      : isOfflineForecast && forecast?.fetchedAtEpochMs
                        ? `${t.offlineCachedPrefix} ${formatClockTime(forecast.fetchedAtEpochMs, tz, loc)} ↻`
                        : forecast?.fetchedAtEpochMs
                          ? `${t.livePrefix} ${formatClockTime(forecast.fetchedAtEpochMs, tz, loc)} ↻`
                          : t.refreshShort}
                  </Text>
                </Pressable>

                {isPackMode ? (
                  <View style={styles.packModeChip}>
                    <UiIcon name="paw" size={10} color={COLORS.brandDark} />
                    <Text style={styles.packModeChipText}>
                      {t.packSafetyBadge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.verdictHeadline}>{verdict.headline}</Text>
              <Text style={styles.verdictReason}>{verdict.reason}</Text>
            </View>

            <View style={styles.verdictAvatarColumn}>
              <View style={styles.verdictAvatarHalo}>
                <DogAvatar
                  breedId={dog.breedId}
                  customUri={dog.customPhotoUri}
                  size={48}
                />
              </View>
              {selectedHour ? (
                <View style={styles.scoreMiniCapsule}>
                  <Text style={styles.scoreMiniValue}>
                    {formatInteger(selectedHour.walkScore, loc)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Glanceable 3-Stat Comfort Strip */}
          {selectedHour ? (
            <View style={styles.quickMetricsBar}>
              <View style={styles.quickMetricItem}>
                <UiIcon name="paw" size={14} color={COLORS.textSecondary} />
                <Text style={styles.quickMetricText}>
                  {t.groundLabel}{' '}
                  {formatTemperature(selectedHour.asphaltTempC, units, loc)}
                </Text>
              </View>

              <View style={styles.quickMetricDivider} />

              {selectedHour.weather.isDay && selectedHour.weather.uvIndex >= 3 ? (
                <View style={styles.quickMetricItem}>
                  <UiIcon
                    name="sun"
                    size={14}
                    color={
                      selectedHour.weather.uvIndex >= 8
                        ? COLORS.cautionText
                        : COLORS.textSecondary
                    }
                  />
                  <Text style={styles.quickMetricText}>
                    UV {formatInteger(selectedHour.weather.uvIndex, loc)}
                  </Text>
                </View>
              ) : (
                <View style={styles.quickMetricItem}>
                  <UiIcon name="wind" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.quickMetricText}>
                    {formatWindSpeed(selectedHour.weather.windKph, units, loc)}
                  </Text>
                </View>
              )}

              {bestNextWindowLabel ? (
                <>
                  <View style={styles.quickMetricDivider} />
                  <View style={styles.quickMetricItem}>
                    <UiIcon
                      name="sun"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.quickMetricText} numberOfLines={1}>
                      {t.bestLabel} {bestNextWindowLabel}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {/* Action Pills Row */}
          <View style={styles.verdictPillsRow}>
            <Pressable
              onPress={() => setShowTimeline((prev) => !prev)}
              style={({ pressed }) => [
                styles.timelineTogglePill,
                pressed && styles.pressed,
              ]}
            >
              <UiIcon name="clock" size={14} color={COLORS.textPrimary} />
              <Text style={styles.timelineToggleText}>
                {showTimeline ? t.hide24hForecast : t.check24hForecast}
              </Text>
              <UiIcon
                name="chevronDown"
                size={15}
                color={COLORS.textSecondary}
              />
            </Pressable>

            {selectedHourIndex > 0 ? (
              <Pressable
                onPress={() => setSelectedHourIndex(0)}
                style={({ pressed }) => [
                  styles.resetNowPill,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.resetNowText}>↩ {t.resetToNow}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  if (onOpenGpsSuburbLocator) {
                    onOpenGpsSuburbLocator();
                  } else {
                    requestGpsLocation();
                  }
                }}
                disabled={isLocating}
                style={({ pressed }) => [
                  styles.gpsQuickPill,
                  pressed && styles.pressed,
                ]}
              >
                <UiIcon name="gps" size={14} color={COLORS.brandDark} />
                <Text style={styles.gpsQuickText}>
                  {isLocating
                    ? t.locatingStatus
                    : location.isCurrentDeviceLocation
                      ? t.nearbySuburbsShort
                      : t.autoLocateSuburbShort}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Collapsible 24-Hour Scrubber, Extra Micro-Metrics & Top Windows */}
          {showTimeline ? (
            <View style={styles.expandedTimelineWrap}>
              {selectedHour ? (
                <View style={styles.microMetricsRow}>
                  <Text style={styles.microMetricChip}>
                    UV {formatInteger(selectedHour.weather.uvIndex, loc)}
                  </Text>
                  <Text style={styles.microMetricChip}>
                    {t.rainLabel}{' '}
                    {formatInteger(selectedHour.weather.precipProb, loc)}%
                  </Text>
                  {selectedHour.weather.usAqi !== null ? (
                    <Text style={styles.microMetricChip}>
                      AQI {formatInteger(selectedHour.weather.usAqi, loc)}
                    </Text>
                  ) : null}
                  {forecast?.sunsetEpochMs ? (
                    <Text style={styles.microMetricChip}>
                      {t.sunsetLabel}{' '}
                      {formatClockTime(forecast.sunsetEpochMs, tz, loc)}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {bestWindows.length > 0 ? (
                <View style={styles.windowChipsRow}>
                  {bestWindows.slice(0, 2).map((win) => {
                    const activeWin =
                      selectedHourIndex >= win.startIndex &&
                      selectedHourIndex <= win.endIndex;
                    return (
                      <Pressable
                        key={win.id}
                        onPress={() => setSelectedHourIndex(win.startIndex)}
                        style={[
                          styles.windowQuickChip,
                          activeWin && styles.windowQuickChipActive,
                        ]}
                      >
                        <UiIcon
                          name={win.isGoldenHour ? 'sun' : 'star'}
                          size={13}
                          color={activeWin ? '#FFFFFF' : COLORS.brand}
                        />
                        <Text
                          style={[
                            styles.windowQuickChipText,
                            activeWin && styles.windowQuickChipTextActive,
                          ]}
                        >
                          {formatTimeWindow(
                            win.startEpochMs,
                            win.endEpochMs,
                            tz,
                            loc
                          )}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourStripContent}
              >
                {scoredHours.slice(0, 24).map((hr, idx) => {
                  const isSel = idx === selectedHourIndex;
                  const qColors = getQualityColors(hr.qualityTier);
                  const hour24 = new Date(hr.weather.epochMs).getHours();
                  const isUsualHour =
                    (memberPreferences.morningWalkHour !== null &&
                      hour24 === memberPreferences.morningWalkHour) ||
                    (memberPreferences.eveningWalkHour !== null &&
                      hour24 === memberPreferences.eveningWalkHour);
                  const slotLabel =
                    idx === 0
                      ? t.nowShort
                      : `${isUsualHour ? '★ ' : ''}${formatShortHour(hr.weather.epochMs, tz, loc)}`;
                  const barHeight = Math.max(
                    8,
                    Math.round((hr.walkScore / 100) * 22)
                  );
                  return (
                    <Pressable
                      key={hr.weather.isoTime}
                      onPress={() => setSelectedHourIndex(idx)}
                      style={[
                        styles.hourSlotBtn,
                        isSel && styles.hourSlotBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.hourSlotTime,
                          isSel && styles.hourSlotTextActive,
                        ]}
                      >
                        {slotLabel}
                      </Text>
                      <View style={styles.hourBarTrack}>
                        <View
                          style={[
                            styles.hourBarFill,
                            {
                              height: barHeight,
                              backgroundColor: isSel
                                ? '#6EE7B7'
                                : qColors.accent,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.hourSlotTemp,
                          isSel && styles.hourSlotTextActive,
                        ]}
                      >
                        {formatTemperature(hr.weather.tempC, units, loc)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Prominent Dismissible Sign-In Callout Banner (Signed-Out Visitors Only) */}
        {!user && !dismissedSignInBanner ? (
          <View style={[styles.signInBanner, ELEVATION.card]}>
            <View style={styles.signInBannerIcon}>
              <UiIcon name="cloud" size={16} color={COLORS.brand} />
            </View>
            <Text style={styles.signInBannerText} numberOfLines={2}>
              {t.homeSignInBannerTitle}
            </Text>
            <Pressable
              onPress={() => setAuthModalOpen(true)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.signInBannerCta,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.signInBannerCtaText}>
                {t.homeSignInBannerCta}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDismissedSignInBanner(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t.closeBtn}
            >
              <UiIcon name="close" size={14} color={COLORS.textMuted} />
            </Pressable>
          </View>
        ) : null}

        {/* Weather-Triggered Gear Strip */}
        {activeGearItems.length > 0 ? (
          <View style={styles.gearStripWrap}>
            <Text style={styles.gearStripTitle}>{t.packForWalkTitle}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gearStripScroll}
            >
              {activeGearItems.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggleGearItem(item.id)}
                  style={[
                    styles.gearStripPill,
                    item.checked && styles.gearStripPillChecked,
                  ]}
                >
                  <Text
                    style={[
                      styles.gearStripPillText,
                      item.checked && styles.gearStripPillTextChecked,
                    ]}
                  >
                    {item.checked ? '✓ ' : '○ '}
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* 2. Sculpted Two-Way Intent Switch: Top Parks vs. Circular Walk From My Door */}
        <View style={styles.intentSegmentedBar}>
          <Pressable
            onPress={() => setIntentMode('parks')}
            style={[
              styles.intentSegmentBtn,
              intentMode === 'parks' && [
                styles.intentSegmentBtnActive,
                ELEVATION.card,
              ],
            ]}
          >
            <UiIcon
              name="forest"
              size={16}
              color={
                intentMode === 'parks' ? COLORS.brandDark : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.intentSegmentText,
                intentMode === 'parks' && styles.intentSegmentTextActive,
              ]}
            >
              {activeRegion === 'melbourne' || activeRegion === 'sydney'
                ? t.parksAndBeachesTab
                : t.topParksTab}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setIntentMode('door')}
            style={[
              styles.intentSegmentBtn,
              intentMode === 'door' && [
                styles.intentSegmentBtnActive,
                ELEVATION.card,
              ],
            ]}
          >
            <UiIcon
              name="route"
              size={16}
              color={
                intentMode === 'door' ? COLORS.brandDark : COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.intentSegmentText,
                intentMode === 'door' && styles.intentSegmentTextActive,
              ]}
            >
              {t.fromMyDoorTab}
            </Text>
          </Pressable>
        </View>

        {/* 3A. Top 3 Best Open Destination Cards with Scenic Illustrations */}
        {intentMode === 'parks' ? (
          <View style={styles.parksSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>
                {t.bestOpenMatchesTitle}
              </Text>
              <Pressable
                onPress={onOpenFullMap}
                hitSlop={6}
                style={styles.fullMapLinkWrap}
              >
                <Text style={styles.fullMapLink}>
                  {t.fullMapLabel} ({formatInteger(scoredPlaces.length, loc)})
                </Text>
                <UiIcon name="chevronRight" size={15} color={COLORS.brand} />
              </Pressable>
            </View>

            <View style={styles.cardsColumn}>
              {topThreeMatches.map((sp, idx) => {
                const { primary, secondary } = splitSpotDisplayName(
                  sp.place.name,
                  language
                );
                const simpleTag = getSimpleSpotTag(
                  sp,
                  idx,
                  selectedHour,
                  language
                );
                const isHero = idx === 0;
                const walkable = isWalkableSpotDistance(sp.place.distanceKm);
                const travelLabel = walkable
                  ? formatWalkMinutes(sp.place.distanceKm, loc)
                  : formatDriveMinutes(sp.place.distanceKm, loc);

                return (
                  <Pressable
                    key={sp.place.id}
                    onPress={() => setActiveGuideSpotId(sp.place.id)}
                    style={({ pressed }) => [
                      styles.spotCard,
                      isHero ? ELEVATION.cardHero : ELEVATION.card,
                      isHero && styles.spotCardHero,
                      pressed && styles.pressedCard,
                    ]}
                  >
                    <ParkScenicBadge
                      category={sp.place.category}
                      spotId={sp.place.id}
                      photoUrl={sp.place.photoUrl}
                      size={56}
                      rankBadge={isHero ? 1 : null}
                    />

                    <View style={styles.spotCardCenter}>
                      <View style={styles.spotTitleLine}>
                        <Text style={styles.spotCardTitle} numberOfLines={1}>
                          {primary}
                        </Text>
                        <UiIcon
                          name="chevronRight"
                          size={16}
                          color={COLORS.textMuted}
                        />
                      </View>

                      <View style={styles.spotMetaRow}>
                        <View
                          style={[
                            styles.simpleTagPill,
                            simpleTag.tone === 'hero'
                              ? styles.simpleTagHero
                              : simpleTag.tone === 'warn'
                                ? styles.simpleTagWarn
                                : simpleTag.tone === 'muted'
                                  ? styles.simpleTagMuted
                                  : styles.simpleTagGood,
                          ]}
                        >
                          <Text
                            style={[
                              styles.simpleTagText,
                              simpleTag.tone === 'hero'
                                ? styles.simpleTagTextHero
                                : simpleTag.tone === 'warn'
                                  ? styles.simpleTagTextWarn
                                  : simpleTag.tone === 'muted'
                                    ? styles.simpleTagTextMuted
                                    : styles.simpleTagTextGood,
                            ]}
                          >
                            {simpleTag.label}
                          </Text>
                        </View>

                        <View style={styles.travelMiniChip}>
                          <UiIcon
                            name={walkable ? 'walk' : 'car'}
                            size={12}
                            color={COLORS.brandDark}
                          />
                          <Text style={styles.travelMiniChipText}>
                            {travelLabel}
                          </Text>
                        </View>

                        <Text style={styles.spotCardMeta} numberOfLines={1}>
                          {sp.place.accessRule === 'booking_license'
                            ? '狗证'
                            : secondary ||
                              sp.place.subtitle.split(' · ')[0] ||
                              sp.place.district ||
                              (language === 'zh' ? '免费' : 'Free')}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={onOpenFullMap}
              style={({ pressed }) => [
                styles.exploreAllMapBtn,
                ELEVATION.card,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.exploreMapIconCircle}>
                <UiIcon name="map" size={16} color={COLORS.brand} />
              </View>
              <Text style={styles.exploreAllMapBtnText}>
                {t.browseAllSpotsCta(formatInteger(scoredPlaces.length, loc))}
              </Text>
              <UiIcon name="chevronRight" size={17} color={COLORS.brandDark} />
            </Pressable>
          </View>
        ) : (
          /* 3B. Circular Loop From My Door */
          <View style={[styles.doorLoopCard, ELEVATION.cardHero]}>
            <View style={styles.doorLoopHeader}>
              <View style={styles.doorIconBadge}>
                <UiIcon name="route" size={20} color={COLORS.brand} />
              </View>
              <View style={styles.doorLoopTitleCol}>
                <Text style={styles.doorLoopTitle}>{t.circularLoopTitle}</Text>
                <Text style={styles.doorLoopSubtitle} numberOfLines={1}>
                  {t.startsFinishesAt(location.name)}
                </Text>
              </View>
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  {formatDistance(activeLoopPlan.distanceKm, units, loc)}
                </Text>
              </View>
            </View>

            <View style={styles.durationRow}>
              {([15, 30, 45] as LoopDurationMinutes[]).map((mins) => {
                const active = loopDuration === mins;
                return (
                  <Pressable
                    key={mins}
                    onPress={() => setLoopDuration(mins)}
                    style={[
                      styles.durationPill,
                      active && styles.durationPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationPillText,
                        active && styles.durationPillTextActive,
                      ]}
                    >
                      {formatInteger(mins, loc)} {t.minShort}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.loopSummaryBox}>
              <View style={styles.loopSummaryRow}>
                <UiIcon name="forest" size={15} color={COLORS.brand} />
                <Text style={styles.loopSummaryLine}>
                  {t.steersVia}{' '}
                  <Text style={styles.loopSummaryStrong}>
                    {activeLoopPlan.anchorName}
                  </Text>
                  {activeLoopPlan.avoidedName
                    ? ` · ${t.skipsPrefix} ${activeLoopPlan.avoidedName}`
                    : ''}
                </Text>
              </View>
              <View style={styles.loopSummaryRow}>
                <UiIcon name="paw" size={14} color={COLORS.textSecondary} />
                <Text style={styles.loopSummarySub}>
                  {activeLoopPlan.surfaceNote}
                </Text>
              </View>
            </View>

            <View style={styles.loopActionCol}>
              <Pressable
                onPress={handleStartLoopInMaps}
                style={({ pressed }) => [
                  styles.startLoopPrimaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <UiIcon name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.startLoopPrimaryText}>
                  {t.startLoopInMaps(formatInteger(loopDuration, loc))}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onPreviewLoopOnMap(loopDuration)}
                style={({ pressed }) => [
                  styles.previewLoopBtn,
                  pressed && styles.pressed,
                ]}
              >
                <UiIcon name="map" size={15} color={COLORS.textPrimary} />
                <Text style={styles.previewLoopBtnText}>
                  {t.previewLoopOnMap}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  logWalk({
                    placeId: `loop-${loopDuration}m`,
                    placeName:
                      language === 'zh'
                        ? `${loopDuration} 分钟环线（${activeLoopPlan.anchorName}）`
                        : `${loopDuration}-Min Loop (${activeLoopPlan.anchorName})`,
                    cityLabel: location.name.split(' · ')[0] || 'Local',
                    durationMin: loopDuration,
                    distanceKm: activeLoopPlan.distanceKm,
                  });
                  setLoopLoggedFeedback(true);
                  if (loopTimerRef.current) {
                    clearTimeout(loopTimerRef.current);
                  }
                  loopTimerRef.current = setTimeout(() => {
                    setLoopLoggedFeedback(false);
                    loopTimerRef.current = null;
                  }, 2200);
                }}
                style={({ pressed }) => [
                  styles.logLoopBtn,
                  loopLoggedFeedback && styles.logLoopBtnDone,
                  pressed && styles.pressed,
                ]}
              >
                <UiIcon
                  name={loopLoggedFeedback ? 'check' : 'paw'}
                  size={14}
                  color={COLORS.brandDark}
                />
                <Text style={styles.logLoopBtnText}>
                  {loopLoggedFeedback
                    ? t.walkLoggedJournal
                    : t.logMinWalk(formatInteger(loopDuration, loc))}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* V3 Local Insider Park Sheet (Focused Exclusively on Current Selected Park) */}
      <ParkGuideSheet
        spot={activeGuideSpot}
        rankIndex={Math.max(0, activeGuideSpotIndex)}
        visible={Boolean(activeGuideSpot)}
        onClose={() => setActiveGuideSpotId(null)}
        onShowOnMap={(placeId) => {
          setActiveGuideSpotId(null);
          onOpenMapSpot(placeId);
        }}
      />

      {/* Email Sign-In Modal Triggered from Walk Now Banner */}
      <AuthModal
        visible={authModalOpen}
        initialMode="signin"
        onClose={() => setAuthModalOpen(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 15,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  loadingText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: COLORS.cautionBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cautionBorder,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  errorText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    color: COLORS.cautionText,
    fontWeight: '600',
  },
  retryBtn: {
    backgroundColor: COLORS.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  retryBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  gpsNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  gpsNoticeText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  verdictCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  verdictHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  verdictCopyCol: {
    flex: 1,
    gap: 6,
  },
  verdictEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  liveRefreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  liveRefreshText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  offlineRefreshPill: {
    backgroundColor: COLORS.cautionBg,
    borderWidth: 1,
    borderColor: COLORS.cautionBorder,
  },
  offlineRefreshText: {
    color: COLORS.cautionText,
  },
  packModeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    backgroundColor: COLORS.brandLight,
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  packModeChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  logLoopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.brandLight,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  logLoopBtnDone: {
    backgroundColor: COLORS.idealBg,
    borderWidth: 1,
    borderColor: COLORS.idealBorder,
  },
  logLoopBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  verdictBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  verdictStatusDot: {
    width: 7.5,
    height: 7.5,
    borderRadius: 4,
  },
  verdictBadgeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verdictHeadline: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  verdictReason: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  verdictAvatarColumn: {
    alignItems: 'center',
    marginTop: 2,
  },
  verdictAvatarHalo: {
    borderRadius: 999,
    padding: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
  },
  scoreMiniCapsule: {
    marginTop: -8,
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scoreMiniValue: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  quickMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  quickMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickMetricDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(16, 35, 28, 0.14)',
  },
  quickMetricText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  verdictPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  timelineTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.1)',
    borderRadius: 999,
    paddingVertical: 6.5,
    paddingStart: 11,
    paddingEnd: 9,
  },
  timelineToggleText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  resetNowPill: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 999,
    paddingVertical: 6.5,
    paddingHorizontal: 12,
  },
  resetNowText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  gpsQuickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.1)',
    borderRadius: 999,
    paddingVertical: 6.5,
    paddingHorizontal: 11,
  },
  gpsQuickText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  expandedTimelineWrap: {
    paddingTop: 4,
    gap: 9,
  },
  microMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  microMetricChip: {
    fontFamily: UI_FONT_FAMILY,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 999,
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  windowChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  windowQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.1)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  windowQuickChipActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  windowQuickChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  windowQuickChipTextActive: {
    color: '#FFFFFF',
  },
  hourStripContent: {
    gap: 6,
    paddingEnd: 4,
  },
  hourSlotBtn: {
    minWidth: 56,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.09)',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
  },
  hourSlotBtnActive: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  hourSlotTime: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  hourBarTrack: {
    width: 6,
    height: 22,
    borderRadius: 3,
    backgroundColor: 'rgba(16, 35, 28, 0.08)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  hourBarFill: {
    width: '100%',
    borderRadius: 3,
  },
  hourSlotTemp: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  hourSlotTextActive: {
    color: '#FFFFFF',
  },
  intentSegmentedBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  intentSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 9.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  intentSegmentBtnActive: {
    backgroundColor: COLORS.surface,
  },
  intentSegmentText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  intentSegmentTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  parksSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionHeaderTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
    letterSpacing: -0.1,
  },
  fullMapLinkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fullMapLink: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brand,
  },
  cardsColumn: {
    gap: 10,
  },
  spotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 12,
    paddingStart: 12,
    paddingEnd: 10,
  },
  spotCardHero: {
    borderColor: '#9EDCC1',
    borderWidth: 1.5,
  },
  spotCardCenter: {
    flex: 1,
    minWidth: 0,
    gap: 5.5,
  },
  spotTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  spotCardTitle: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  spotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  travelMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.brandSoft,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 999,
  },
  travelMiniChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  spotCardMeta: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  simpleTagPill: {
    paddingVertical: 2.5,
    paddingHorizontal: 8.5,
    borderRadius: 999,
  },
  simpleTagHero: {
    backgroundColor: COLORS.brand,
  },
  simpleTagGood: {
    backgroundColor: COLORS.brandLight,
  },
  simpleTagWarn: {
    backgroundColor: COLORS.cautionBg,
  },
  simpleTagMuted: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  simpleTagText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
  },
  simpleTagTextHero: {
    color: '#FFFFFF',
  },
  simpleTagTextGood: {
    color: COLORS.brandDark,
  },
  simpleTagTextWarn: {
    color: COLORS.cautionText,
  },
  simpleTagTextMuted: {
    color: COLORS.textSecondary,
  },
  exploreAllMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  exploreMapIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreAllMapBtnText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  doorLoopCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    gap: 13,
  },
  doorLoopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  doorIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorLoopTitleCol: {
    flex: 1,
    gap: 2,
  },
  doorLoopTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  doorLoopSubtitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  distanceBadge: {
    backgroundColor: COLORS.brandLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  distanceBadgeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationPill: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingVertical: 10,
    alignItems: 'center',
  },
  durationPillActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  durationPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  durationPillTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  loopSummaryBox: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 12,
    gap: 7,
  },
  loopSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  loopSummaryLine: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textPrimary,
  },
  loopSummaryStrong: {
    fontWeight: '800',
  },
  loopSummarySub: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  loopActionCol: {
    gap: 8,
  },
  startLoopPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 13,
  },
  startLoopPrimaryText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  previewLoopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 10.5,
  },
  previewLoopBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pressed: {
    opacity: 0.82,
  },
  pressedCard: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  gearStripWrap: {
    gap: 5,
  },
  gearStripTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
    paddingHorizontal: 2,
  },
  gearStripScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  gearStripPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  gearStripPillChecked: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  gearStripPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  gearStripPillTextChecked: {
    color: COLORS.brandDark,
  },
  signInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  signInBannerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBannerText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    lineHeight: 16.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  signInBannerCta: {
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    paddingVertical: 6.5,
    paddingHorizontal: 12,
  },
  signInBannerCtaText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
