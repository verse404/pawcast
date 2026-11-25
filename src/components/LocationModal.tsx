import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ActiveMetroRegion,
  AuSuburbEntry,
  computeSuburbDistanceKm,
  detectActiveRegion,
  findNearestAuSuburbs,
  formatSuburbDistance,
  getAuSuburbsForCity,
  MELBOURNE_AREAS,
  SHANGHAI_AREAS,
  suburbToLocationPoint,
  SYDNEY_AREAS,
} from '../constants/auSuburbs';
import { PRESET_LOCATIONS } from '../constants/presets';
import { GpsFixInfo, useWalkPlanner } from '../context/WalkPlannerContext';
import { formatInteger } from '../i18n/formatters';
import { getLocaleTag, getStrings } from '../i18n/translations';
import { searchLocations } from '../services/placesService';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import { LocationPoint } from '../types/walk';
import { UiIcon } from './UiIcons';

const NEAREST_CHIP = '📍 Nearest';
const POSTAL_ONLY_RE =
  /(?:\b(?:po|lpo|bc|dc|mc|university|hospital|centre)\b|^north pole$)/i;

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  autoTriggerGps?: boolean;
  onAutoTriggerConsumed?: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  autoTriggerGps = false,
  onAutoTriggerConsumed,
}) => {
  const {
    location,
    setLocation,
    language,
    gpsFix,
    locateGpsCoordinates,
    applyDemoGpsFix,
    isLocating,
    locationNotice,
    clearLocationNotice,
  } = useWalkPlanner();
  const t = getStrings(language);
  const loc = getLocaleTag(language);

  const formatAreaChipLabel = (areaName: string): string => {
    if (areaName === 'All') return t.areaAll;
    if (areaName === '★ Popular') return t.areaPopular;
    if (areaName === NEAREST_CHIP) return t.areaNearest;
    return areaName;
  };

  const [cityTab, setCityTab] = useState<ActiveMetroRegion>(() =>
    detectActiveRegion(location.latitude, location.longitude)
  );
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<LocationPoint[]>([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  const melbourneSuburbs = useMemo(
    () => getAuSuburbsForCity('melbourne'),
    []
  );
  const sydneySuburbs = useMemo(() => getAuSuburbsForCity('sydney'), []);
  const shanghaiSuburbs = useMemo(() => getAuSuburbsForCity('shanghai'), []);

  const applyGpsFixToView = useCallback((fix: GpsFixInfo) => {
    const nearest = findNearestAuSuburbs(fix.latitude, fix.longitude, 6, 110);
    if (nearest.length > 0) {
      setCityTab(nearest[0].suburb.city);
      setSelectedArea(NEAREST_CHIP);
      setQuery('');
      return;
    }
    const region = detectActiveRegion(fix.latitude, fix.longitude);
    if (region !== 'global') {
      setCityTab(region);
      setQuery('');
    }
  }, []);

  const handleAutoLocateSuburbs = useCallback(async () => {
    const fix = await locateGpsCoordinates();
    if (fix) {
      applyGpsFixToView(fix);
    }
  }, [locateGpsCoordinates, applyGpsFixToView]);

  const handleDemoGps = useCallback(
    (lat: number, lon: number) => {
      const fix = applyDemoGpsFix(lat, lon);
      applyGpsFixToView(fix);
    },
    [applyDemoGpsFix, applyGpsFixToView]
  );

  const wasVisibleRef = useRef(false);

  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (!visible) return;

    if (autoTriggerGps) {
      onAutoTriggerConsumed?.();
      handleAutoLocateSuburbs();
      return;
    }

    if (!justOpened) return;

    const detected = detectActiveRegion(location.latitude, location.longitude);
    setCityTab(detected);
    if (gpsFix) {
      const gpsRegion = detectActiveRegion(gpsFix.latitude, gpsFix.longitude);
      if (gpsRegion === detected && detected !== 'global') {
        setSelectedArea(NEAREST_CHIP);
        return;
      }
    }
    setSelectedArea('All');
  }, [
    visible,
    autoTriggerGps,
    onAutoTriggerConsumed,
    handleAutoLocateSuburbs,
    location.latitude,
    location.longitude,
    gpsFix,
  ]);

  const isSuburbTab =
    cityTab === 'melbourne' ||
    cityTab === 'sydney' ||
    cityTab === 'shanghai';

  // Nearest official Melbourne / Sydney / Shanghai suburbs when gpsFix is within 110 km
  const nearestAuMatches = useMemo(() => {
    if (!gpsFix) return [];
    return findNearestAuSuburbs(gpsFix.latitude, gpsFix.longitude, 8, 110);
  }, [gpsFix]);

  const gpsInActiveCity = useMemo(() => {
    if (!gpsFix || !isSuburbTab || nearestAuMatches.length === 0) return false;
    return nearestAuMatches[0].suburb.city === cityTab;
  }, [gpsFix, isSuburbTab, nearestAuMatches, cityTab]);

  const gpsOutsideMetroHubs = useMemo(() => {
    if (!gpsFix) return false;
    const reg = detectActiveRegion(gpsFix.latitude, gpsFix.longitude);
    return reg === 'global';
  }, [gpsFix]);

  const areaOptions = useMemo<string[]>(() => {
    const prefix = gpsInActiveCity
      ? [NEAREST_CHIP, 'All', '★ Popular']
      : ['All', '★ Popular'];
    if (cityTab === 'melbourne') {
      return [...prefix, ...MELBOURNE_AREAS];
    }
    if (cityTab === 'sydney') {
      return [...prefix, ...SYDNEY_AREAS];
    }
    if (cityTab === 'shanghai') {
      return [...prefix, ...SHANGHAI_AREAS];
    }
    return [];
  }, [cityTab, gpsInActiveCity]);

  // Precompute distance map for active metro city when GPS fix is available
  const suburbDistanceMap = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    if (!gpsFix || !gpsInActiveCity) return map;
    const pool =
      cityTab === 'melbourne'
        ? melbourneSuburbs
        : cityTab === 'sydney'
          ? sydneySuburbs
          : shanghaiSuburbs;
    for (const sub of pool) {
      map.set(
        sub.id,
        computeSuburbDistanceKm(
          gpsFix.latitude,
          gpsFix.longitude,
          sub.latitude,
          sub.longitude
        )
      );
    }
    return map;
  }, [
    gpsFix,
    gpsInActiveCity,
    cityTab,
    melbourneSuburbs,
    sydneySuburbs,
    shanghaiSuburbs,
  ]);

  // Filter & rank all 800 Melbourne + 1,161 Sydney + 222 Shanghai suburbs by GPS, name, postcode, or district
  const filteredAuSuburbs = useMemo<AuSuburbEntry[]>(() => {
    if (!isSuburbTab) return [];
    const activePool =
      cityTab === 'melbourne'
        ? melbourneSuburbs
        : cityTab === 'sydney'
          ? sydneySuburbs
          : shanghaiSuburbs;
    const otherPool = [
      ...(cityTab !== 'melbourne' ? melbourneSuburbs : []),
      ...(cityTab !== 'sydney' ? sydneySuburbs : []),
      ...(cityTab !== 'shanghai' ? shanghaiSuburbs : []),
    ];
    const q = query.trim().toLowerCase();

    const filterPool = (
      pool: AuSuburbEntry[],
      respectArea: boolean
    ): AuSuburbEntry[] => {
      let base = pool;
      if (respectArea && selectedArea === NEAREST_CHIP && gpsInActiveCity) {
        const cleanResidential = base.filter(
          (s) => !POSTAL_ONLY_RE.test(s.name)
        );
        const sortedByGps = [...cleanResidential].sort(
          (a, b) =>
            (suburbDistanceMap.get(a.id) ?? 999) -
            (suburbDistanceMap.get(b.id) ?? 999)
        );
        // Deduplicate identical postcode centroids within 150m in Nearest view (AU postal aliases)
        const deduped: AuSuburbEntry[] = [];
        for (const s of sortedByGps) {
          const dKm = suburbDistanceMap.get(s.id) ?? 999;
          const dup =
            s.city !== 'shanghai' &&
            deduped.some(
              (prev) =>
                prev.postcode === s.postcode &&
                Math.abs((suburbDistanceMap.get(prev.id) ?? 999) - dKm) < 0.15
            );
          if (!dup) deduped.push(s);
        }
        base = deduped;
      } else if (respectArea && selectedArea === '★ Popular') {
        base = base.filter((s) => s.featured);
      } else if (
        respectArea &&
        selectedArea !== 'All' &&
        selectedArea !== NEAREST_CHIP
      ) {
        base = base.filter((s) => s.area === selectedArea);
      }

      if (!q) {
        if (selectedArea === 'All') {
          const featuredList = base.filter((s) => s.featured);
          const restList = base.filter((s) => !s.featured);
          return [...featuredList, ...restList];
        }
        return base;
      }

      const exactOrPrefix: AuSuburbEntry[] = [];
      const substringMatches: AuSuburbEntry[] = [];

      for (const sub of base) {
        const nameLower = sub.name.toLowerCase();
        const councilLower = sub.council.toLowerCase();
        const areaLower = sub.area.toLowerCase();
        const zhPart = nameLower.split(' · ')[1] ?? '';
        if (
          sub.postcode.startsWith(q) ||
          nameLower.startsWith(q) ||
          zhPart.startsWith(q)
        ) {
          exactOrPrefix.push(sub);
        } else if (
          nameLower.includes(q) ||
          councilLower.includes(q) ||
          areaLower.includes(q)
        ) {
          substringMatches.push(sub);
        }
      }
      return [...exactOrPrefix, ...substringMatches];
    };

    const primaryMatches = filterPool(activePool, true);
    if (primaryMatches.length > 0 || !q) {
      return primaryMatches;
    }
    return filterPool(otherPool, false);
  }, [
    isSuburbTab,
    cityTab,
    melbourneSuburbs,
    sydneySuburbs,
    shanghaiSuburbs,
    selectedArea,
    gpsInActiveCity,
    suburbDistanceMap,
    query,
  ]);

  const handleGlobalSearch = async () => {
    if (query.trim().length < 2) return;
    setSearchingGlobal(true);
    try {
      const found = await searchLocations(query);
      setGlobalResults(found);
    } catch {
      setGlobalResults([]);
    } finally {
      setSearchingGlobal(false);
    }
  };

  const handleSubmitSearch = () => {
    if (!isSuburbTab || filteredAuSuburbs.length === 0) {
      handleGlobalSearch();
    }
  };

  const handleSelectPoint = (loc: LocationPoint) => {
    setLocation(loc);
    setQuery('');
    setGlobalResults([]);
    clearLocationNotice();
    onClose();
  };

  const handleSelectSuburb = (sub: AuSuburbEntry, useExactGps = false) => {
    if (useExactGps && gpsFix) {
      handleSelectPoint(
        suburbToLocationPoint(sub, {
          latitude: gpsFix.latitude,
          longitude: gpsFix.longitude,
        })
      );
      return;
    }
    handleSelectPoint(suburbToLocationPoint(sub));
  };

  const switchCityTab = (nextTab: ActiveMetroRegion) => {
    setCityTab(nextTab);
    if (
      gpsFix &&
      nextTab !== 'global' &&
      detectActiveRegion(gpsFix.latitude, gpsFix.longitude) === nextTab
    ) {
      setSelectedArea(NEAREST_CHIP);
    } else {
      setSelectedArea('All');
    }
    setGlobalResults([]);
  };

  const renderSuburbRow = ({
    item,
    index,
  }: {
    item: AuSuburbEntry;
    index: number;
  }) => {
    const isActive =
      Math.abs(item.latitude - location.latitude) < 0.004 &&
      Math.abs(item.longitude - location.longitude) < 0.004;
    const crossCityTag =
      item.city !== cityTab
        ? item.city === 'melbourne'
          ? `${t.cityMelbourne} · `
          : item.city === 'sydney'
            ? `${t.citySydney} · `
            : `${t.cityShanghai} · `
        : '';

    const distKm = suburbDistanceMap.get(item.id);
    const isClosestHero =
      selectedArea === NEAREST_CHIP &&
      !query.trim() &&
      index === 0 &&
      distKm !== undefined;

    return (
      <Pressable
        onPress={() => handleSelectSuburb(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, postcode ${item.postcode}, ${item.area}${
          distKm !== undefined ? `, ${formatSuburbDistance(distKm)} away` : ''
        }`}
        style={({ pressed }) => [
          styles.suburbRow,
          isClosestHero && styles.suburbRowClosest,
          isActive && styles.suburbRowActive,
          pressed && styles.resultItemPressed,
        ]}
      >
        <View style={styles.suburbMainCol}>
          <View style={styles.suburbNameLine}>
            <Text
              style={[
                styles.suburbNameText,
                (isActive || isClosestHero) && styles.suburbNameTextActive,
              ]}
              numberOfLines={1}
            >
              {crossCityTag}
              {item.name}
            </Text>

            {isClosestHero ? (
              <View style={styles.closestHeroBadge}>
                <Text style={styles.closestHeroBadgeText}>
                  {t.closestBadge(formatSuburbDistance(distKm))}
                </Text>
              </View>
            ) : distKm !== undefined && selectedArea === NEAREST_CHIP ? (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceBadgeText}>
                  {formatSuburbDistance(distKm)}
                </Text>
              </View>
            ) : item.featured ? (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>{t.popularBadge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.suburbMetaText} numberOfLines={1}>
            {item.area}
            {item.council ? ` · ${item.council}` : ''}
          </Text>
        </View>

        <View style={styles.suburbRightGroup}>
          <View
            style={[
              styles.postcodePill,
              isActive && styles.postcodePillActive,
            ]}
          >
            <Text
              style={[
                styles.postcodeText,
                isActive && styles.postcodeTextActive,
              ]}
            >
              {item.postcode}
            </Text>
          </View>
          <UiIcon
            name={isActive ? 'check' : 'chevronRight'}
            size={16}
            color={isActive ? COLORS.brandDark : COLORS.textMuted}
          />
        </View>
      </Pressable>
    );
  };

  const topNearestMatch = gpsInActiveCity ? nearestAuMatches[0] : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      aria-label={t.chooseWalkArea}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropDismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close location picker"
        />
        <View style={[styles.sheet, ELEVATION.floating]}>
          <View style={styles.grabHandle} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>{t.chooseWalkArea}</Text>
              <Text style={styles.headerSub}>
                {t.cityMelbourne} ({formatInteger(melbourneSuburbs.length, loc)}) ·{' '}
                {t.citySydney} ({formatInteger(sydneySuburbs.length, loc)}) ·{' '}
                {t.cityShanghai} ({formatInteger(shanghaiSuburbs.length, loc)}) ·{' '}
                {t.cityGlobal}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.doneBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.doneBtnText}>{t.doneBtn}</Text>
            </Pressable>
          </View>

          {/* Primary GPS Nearest-Suburb Auto-Locate Button */}
          <Pressable
            onPress={handleAutoLocateSuburbs}
            disabled={isLocating}
            style={({ pressed }) => [
              styles.gpsButton,
              pressed && styles.pressed,
            ]}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <UiIcon name="gps" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.gpsButtonText}>
              {isLocating
                ? t.locatingNearestSuburbs
                : gpsFix
                  ? t.refreshNearestSuburbsGps
                  : t.autoLocateNearestSuburbGps}
            </Text>
          </Pressable>

          {/* Notice + Instant Demo GPS Pins when Browser Geolocation is Blocked / Unavailable */}
          {locationNotice ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{locationNotice}</Text>
              <View style={styles.demoGpsRow}>
                <Pressable
                  onPress={() => handleDemoGps(-37.7992, 144.9845)}
                  style={styles.demoGpsPill}
                >
                  <UiIcon name="pin" size={12} color={COLORS.brandDark} />
                  <Text style={styles.demoGpsPillText}>{t.demoGpsMel}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDemoGps(-33.8895, 151.2715)}
                  style={styles.demoGpsPill}
                >
                  <UiIcon name="pin" size={12} color={COLORS.brandDark} />
                  <Text style={styles.demoGpsPillText}>{t.demoGpsSyd}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDemoGps(31.2115, 121.4425)}
                  style={styles.demoGpsPill}
                >
                  <UiIcon name="pin" size={12} color={COLORS.brandDark} />
                  <Text style={styles.demoGpsPillText}>{t.demoGpsSh}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* If User's Real GPS Is Outside Australia & Shanghai, Offer Both Current GPS + Metro Demo */}
          {gpsFix && gpsOutsideMetroHubs ? (
            <View style={styles.globalGpsBox}>
              <View style={styles.globalGpsTopRow}>
                <View style={styles.globalGpsCopy}>
                  <Text style={styles.globalGpsTitle}>
                    {t.gpsLocatedPrefix} {gpsFix.name}
                  </Text>
                  <Text style={styles.globalGpsSub}>
                    {gpsFix.region ? `${gpsFix.region} · ` : ''}
                    {t.globalGpsSub}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    handleSelectPoint({
                      name: gpsFix.name,
                      region: gpsFix.region,
                      latitude: gpsFix.latitude,
                      longitude: gpsFix.longitude,
                      timezone: gpsFix.timezone,
                      isCurrentDeviceLocation: true,
                    })
                  }
                  style={styles.useGlobalGpsBtn}
                >
                  <Text style={styles.useGlobalGpsBtnText}>{t.useHereBtn}</Text>
                </Pressable>
              </View>
              <View style={styles.demoGpsRow}>
                <Pressable
                  onPress={() => handleDemoGps(-37.7992, 144.9845)}
                  style={styles.demoGpsPill}
                >
                  <UiIcon name="gps" size={12} color={COLORS.brandDark} />
                  <Text style={styles.demoGpsPillText}>{t.testSuburbsMel}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDemoGps(-33.8895, 151.2715)}
                  style={styles.demoGpsPill}
                >
                  <UiIcon name="gps" size={12} color={COLORS.brandDark} />
                  <Text style={styles.demoGpsPillText}>{t.testSuburbsSyd}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDemoGps(31.2115, 121.4425)}
                  style={styles.demoGpsPill}
                >
                  <UiIcon name="gps" size={12} color={COLORS.brandDark} />
                  <Text style={styles.demoGpsPillText}>{t.testSuburbsSh}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* 4-Way Metro Hub Switcher */}
          <View style={styles.cityTabsBar}>
            {(
              [
                {
                  key: 'melbourne',
                  label: t.cityMelbourne,
                  count: formatInteger(melbourneSuburbs.length, loc),
                },
                {
                  key: 'sydney',
                  label: t.citySydney,
                  count: formatInteger(sydneySuburbs.length, loc),
                },
                {
                  key: 'shanghai',
                  label: t.cityShanghai,
                  count: formatInteger(shanghaiSuburbs.length, loc),
                },
                { key: 'global', label: t.cityGlobal, count: null },
              ] as Array<{
                key: ActiveMetroRegion;
                label: string;
                count: string | null;
              }>
            ).map((tab) => {
              const active = cityTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => switchCityTab(tab.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.cityTabBtn,
                    active && [styles.cityTabBtnActive, ELEVATION.card],
                  ]}
                >
                  <Text
                    style={[
                      styles.cityTabLabel,
                      active && styles.cityTabLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                  {tab.count ? (
                    <Text
                      style={[
                        styles.cityTabCount,
                        active && styles.cityTabCountActive,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Instant Suburb / Postcode / City Search Bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <UiIcon name="search" size={16} color={COLORS.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSubmitSearch}
                placeholder={
                  cityTab === 'shanghai'
                    ? t.searchSuburbPlaceholderSh
                    : isSuburbTab
                      ? t.searchSuburbPlaceholderAu(
                          cityTab === 'melbourne'
                            ? t.cityMelbourne
                            : t.citySydney
                        )
                      : t.searchCityPlaceholder
                }
                placeholderTextColor={COLORS.textMuted}
                returnKeyType="search"
                maxLength={80}
                style={styles.searchInput}
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setQuery('');
                    setGlobalResults([]);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <UiIcon name="close" size={15} color={COLORS.textMuted} />
                </Pressable>
              ) : null}
            </View>
            {!isSuburbTab ? (
              <Pressable
                onPress={handleGlobalSearch}
                style={({ pressed }) => [
                  styles.searchBtn,
                  pressed && styles.pressed,
                ]}
              >
                {searchingGlobal ? (
                  <ActivityIndicator size="small" color={COLORS.brand} />
                ) : (
                  <Text style={styles.searchBtnText}>{t.searchAction}</Text>
                )}
              </Pressable>
            ) : null}
          </View>

          {/* Unified Suburb Directory (800 Melbourne + 1,161 Sydney + 222 Shanghai Suburbs) */}
          {isSuburbTab ? (
            <View style={styles.auDirectoryWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.areaChipsRow}
                style={styles.areaChipsScroll}
              >
                {areaOptions.map((areaName) => {
                  const active = selectedArea === areaName;
                  return (
                    <Pressable
                      key={areaName}
                      onPress={() => setSelectedArea(areaName)}
                      style={[
                        styles.areaChip,
                        active && styles.areaChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.areaChipText,
                          active && styles.areaChipTextActive,
                        ]}
                      >
                        {formatAreaChipLabel(areaName)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* GPS Nearest-Suburb Quick Pin Banner */}
              {topNearestMatch && selectedArea === NEAREST_CHIP && !query ? (
                <View style={styles.nearestBanner}>
                  <View style={styles.nearestBannerTextCol}>
                    <Text style={styles.nearestBannerTitle}>
                      {gpsFix?.isDemo ? t.demoGpsPin : t.gpsPinLocated} ·{' '}
                      {t.chooseNearestBelow}
                    </Text>
                    <Text style={styles.nearestBannerSub} numberOfLines={1}>
                      {t.closestPrefix} {topNearestMatch.suburb.name} (
                      {topNearestMatch.suburb.postcode}) ·{' '}
                      {formatSuburbDistance(topNearestMatch.distanceKm)}
                      {t.awaySuffix ? ` ${t.awaySuffix}` : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      handleSelectSuburb(topNearestMatch.suburb, true)
                    }
                    style={styles.exactPinBtn}
                  >
                    <UiIcon name="gps" size={12} color="#FFFFFF" />
                    <Text style={styles.exactPinBtnText}>{t.exactGpsBtn}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.suburbCountRow}>
                  <Text style={styles.sectionLabel}>
                    {formatInteger(filteredAuSuburbs.length, loc)}{' '}
                    {filteredAuSuburbs.length === 1
                      ? t.suburbUnitSingular
                      : t.suburbUnitPlural}
                    {selectedArea !== 'All'
                      ? ` · ${formatAreaChipLabel(selectedArea)}`
                      : ''}
                  </Text>
                  <Text style={styles.suburbHintText}>
                    {cityTab === 'shanghai' ? t.tapHintSh : t.tapHintAu}
                  </Text>
                </View>
              )}

              {filteredAuSuburbs.length > 0 ? (
                <FlatList
                  data={filteredAuSuburbs}
                  keyExtractor={(item) => item.id}
                  renderItem={renderSuburbRow}
                  initialNumToRender={16}
                  maxToRenderPerBatch={24}
                  windowSize={7}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={styles.suburbFlatList}
                  contentContainerStyle={styles.suburbListContent}
                />
              ) : (
                <View style={styles.emptySuburbBox}>
                  <Text style={styles.emptySuburbText}>
                    {t.noSuburbMatched(query.trim())}
                  </Text>
                  <Pressable
                    onPress={() => {
                      setCityTab('global');
                      handleGlobalSearch();
                    }}
                    style={styles.searchWorldFallbackBtn}
                  >
                    <UiIcon name="search" size={14} color={COLORS.brandDark} />
                    <Text style={styles.searchWorldFallbackText}>
                      {t.searchWorldFallback(query.trim())}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            /* Worldwide City Search */
            <ScrollView
              style={styles.scrollArea}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {globalResults.length > 0 ? (
                <View style={styles.resultsList}>
                  {globalResults.map((item, idx) => (
                    <Pressable
                      key={`${item.name}-${item.latitude}-${idx}`}
                      onPress={() => handleSelectPoint(item)}
                      style={({ pressed }) => [
                        styles.resultItem,
                        pressed && styles.resultItemPressed,
                      ]}
                    >
                      <View style={styles.resultTextGroup}>
                        <Text style={styles.resultName}>{item.name}</Text>
                        {item.region ? (
                          <Text style={styles.resultRegion}>{item.region}</Text>
                        ) : null}
                      </View>
                      <UiIcon
                        name="chevronRight"
                        size={18}
                        color={COLORS.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text style={styles.sectionLabel}>{t.popularCitiesLabel}</Text>
              <View style={styles.presetGrid}>
                {PRESET_LOCATIONS.map((preset) => {
                  const isActive =
                    Math.abs(preset.latitude - location.latitude) < 0.02 &&
                    Math.abs(preset.longitude - location.longitude) < 0.02;
                  return (
                    <Pressable
                      key={preset.name}
                      onPress={() => handleSelectPoint(preset)}
                      style={({ pressed }) => [
                        styles.presetChip,
                        isActive && styles.presetChipActive,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.presetHeaderRow}>
                        <UiIcon
                          name="pin"
                          size={13}
                          color={isActive ? COLORS.brand : COLORS.textMuted}
                        />
                        <Text
                          style={[
                            styles.presetName,
                            isActive && styles.presetNameActive,
                          ]}
                          numberOfLines={1}
                        >
                          {preset.name}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.presetRegion,
                          isActive && styles.presetRegionActive,
                        ]}
                        numberOfLines={1}
                      >
                        {preset.region}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 28, 0.46)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropDismissArea: {
    width: '100%',
    flex: 1,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    height: '86%',
    backgroundColor: COLORS.surface,
    borderTopStartRadius: 28,
    borderTopEndRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  doneBtn: {
    paddingVertical: 6.5,
    paddingHorizontal: 13,
    backgroundColor: COLORS.brandLight,
    borderRadius: 999,
  },
  doneBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.brand,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  gpsButtonText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  noticeBox: {
    backgroundColor: COLORS.cautionBg,
    borderWidth: 1,
    borderColor: COLORS.cautionBorder,
    borderRadius: 13,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  noticeText: {
    fontFamily: UI_FONT_FAMILY,
    color: COLORS.cautionText,
    fontSize: 12,
    lineHeight: 16.5,
  },
  demoGpsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  demoGpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  demoGpsPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  globalGpsBox: {
    backgroundColor: COLORS.brandLight,
    borderWidth: 1,
    borderColor: '#B3E3CD',
    borderRadius: 14,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  globalGpsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  globalGpsCopy: {
    flex: 1,
    gap: 1,
  },
  globalGpsTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  globalGpsSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  useGlobalGpsBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 6.5,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  useGlobalGpsBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cityTabsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    padding: 3.5,
    gap: 3,
    marginBottom: 10,
  },
  cityTabBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityTabBtnActive: {
    backgroundColor: COLORS.surface,
  },
  cityTabLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  cityTabLabelActive: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  cityTabCount: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: 0.5,
  },
  cityTabCountActive: {
    color: COLORS.brandDark,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 11,
  },
  searchInput: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    paddingVertical: 9.5,
    fontSize: 13.5,
    color: COLORS.textPrimary,
  },
  searchBtn: {
    backgroundColor: COLORS.brandLight,
    paddingHorizontal: 14,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 74,
  },
  searchBtnText: {
    fontFamily: UI_FONT_FAMILY,
    color: COLORS.brandDark,
    fontWeight: '800',
    fontSize: 13.5,
  },
  auDirectoryWrap: {
    flex: 1,
    minHeight: 0,
  },
  areaChipsScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  areaChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingEnd: 8,
  },
  areaChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 999,
    paddingVertical: 5.5,
    paddingHorizontal: 11,
  },
  areaChipActive: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  areaChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  areaChipTextActive: {
    color: '#FFFFFF',
  },
  nearestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1,
    borderColor: '#B3E3CD',
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 11,
    marginBottom: 8,
  },
  nearestBannerTextCol: {
    flex: 1,
    gap: 1,
  },
  nearestBannerTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  nearestBannerSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  exactPinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.brand,
    paddingVertical: 6.5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  exactPinBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  suburbCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  suburbHintText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  suburbFlatList: {
    flex: 1,
  },
  suburbListContent: {
    gap: 6,
    paddingBottom: 14,
  },
  suburbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    paddingVertical: 9.5,
    paddingHorizontal: 12,
    gap: 8,
  },
  suburbRowClosest: {
    borderColor: COLORS.brand,
    backgroundColor: '#F2FAF6',
  },
  suburbRowActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  suburbMainCol: {
    flex: 1,
    gap: 2,
  },
  suburbNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suburbNameText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  suburbNameTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  closestHeroBadge: {
    backgroundColor: COLORS.brand,
    paddingVertical: 2,
    paddingHorizontal: 7.5,
    borderRadius: 999,
  },
  closestHeroBadgeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  distanceBadge: {
    backgroundColor: COLORS.brandLight,
    paddingVertical: 1.5,
    paddingHorizontal: 6.5,
    borderRadius: 999,
  },
  distanceBadgeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  popularBadge: {
    backgroundColor: COLORS.brandLight,
    paddingVertical: 1.5,
    paddingHorizontal: 6.5,
    borderRadius: 999,
  },
  popularBadgeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  suburbMetaText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  suburbRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postcodePill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  postcodePillActive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.brand,
  },
  postcodeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  postcodeTextActive: {
    color: COLORS.brandDark,
  },
  emptySuburbBox: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  emptySuburbText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  searchWorldFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brandLight,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  searchWorldFallbackText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  scrollArea: {
    flex: 1,
  },
  resultsList: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 14,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  resultItemPressed: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  resultTextGroup: {
    flex: 1,
    marginEnd: 8,
  },
  resultName: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  resultRegion: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingBottom: 12,
  },
  presetChip: {
    width: '48.5%',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  presetChipActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  presetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  presetName: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  presetNameActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  presetRegion: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    color: COLORS.textSecondary,
    paddingStart: 18,
  },
  presetRegionActive: {
    color: COLORS.brandDark,
  },
  pressed: {
    opacity: 0.82,
  },
});
