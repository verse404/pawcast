import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWalkPlanner } from '../context/WalkPlannerContext';
import { buildDoorstepLoop } from '../engine/walkScoring';
import {
  formatDistance,
  formatDriveMinutes,
  formatInteger,
  formatWalkMinutes,
  isWalkableSpotDistance,
} from '../i18n/formatters';
import { getLocaleTag, getStrings } from '../i18n/translations';
import { getCorridorsForLocation } from '../services/placesService';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import {
  DoorstepLoopPlan,
  LoopDurationMinutes,
  ScoredPlace,
  StreetCorridor,
} from '../types/walk';
import {
  getSimpleSpotTag,
  getSpotInsiderGuide,
  splitSpotDisplayName,
} from '../utils/spotGuide';
import {
  buildSafeDirectionsUrl,
  buildSafeLoopUrl,
} from '../utils/validation';
import { ParkGuideSheet } from './ParkGuideSheet';
import { ParkScenicBadge, UiIcon, UiIconName } from './UiIcons';
import { WalkMap } from './WalkMap';

interface ExploreMapScreenProps {
  focusedPlaceId?: string | null;
  previewLoopDuration?: LoopDurationMinutes | null;
  onClearLoopPreview?: () => void;
  onOpenLocationPicker: () => void;
}

type ListModalTab = 'parks' | 'streets';

export const ExploreMapScreen: React.FC<ExploreMapScreenProps> = ({
  focusedPlaceId = null,
  previewLoopDuration = null,
  onClearLoopPreview,
  onOpenLocationPicker,
}) => {
  const {
    location,
    requestGpsLocation,
    isLocating,
    units,
    language,
    dog,
    savedPlaceIds,
    selectedHour,
    scoredPlaces,
  } = useWalkPlanner();
  const t = getStrings(language);
  const loc = getLocaleTag(language);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    focusedPlaceId
  );
  const [selectedCorridorId, setSelectedCorridorId] = useState<string | null>(
    null
  );
  const [showStreetsOverlay, setShowStreetsOverlay] = useState(true);

  const [beachesOnly, setBeachesOnly] = useState(false);
  const [fencedOnly, setFencedOnly] = useState(false);
  const [offLeashOnly, setOffLeashOnly] = useState(false);
  const [shadedOnly, setShadedOnly] = useState(false);
  const [walkableOnly, setWalkableOnly] = useState(false);
  const [pavedOnly, setPavedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [listSheetOpen, setListSheetOpen] = useState(false);
  const [listTab, setListTab] = useState<ListModalTab>('parks');
  const [guideSheetOpen, setGuideSheetOpen] = useState(false);

  useEffect(() => {
    if (!focusedPlaceId) return;
    setSelectedCorridorId(null);
    setSelectedPlaceId(focusedPlaceId);
  }, [focusedPlaceId]);

  const activeCorridors = useMemo<StreetCorridor[]>(
    () => getCorridorsForLocation(location.latitude, location.longitude),
    [location.latitude, location.longitude]
  );
  const hasCorridors = activeCorridors.length > 0;

  const activeLoopPlan = useMemo<DoorstepLoopPlan | null>(() => {
    if (!previewLoopDuration) return null;
    return buildDoorstepLoop(
      location,
      previewLoopDuration,
      activeCorridors,
      scoredPlaces,
      selectedHour,
      language
    );
  }, [
    previewLoopDuration,
    location,
    activeCorridors,
    scoredPlaces,
    selectedHour,
    language,
  ]);

  const filteredPlaces = useMemo<ScoredPlace[]>(() => {
    return scoredPlaces.filter((sp) => {
      if (beachesOnly && sp.place.category !== 'dog_beach') {
        return false;
      }
      if (fencedOnly && sp.place.leashPolicy !== 'off_leash_fenced') {
        return false;
      }
      if (offLeashOnly && !sp.place.amenities.includes('off_leash')) {
        return false;
      }
      if (shadedOnly && !sp.place.amenities.includes('shade')) {
        return false;
      }
      if (walkableOnly && !isWalkableSpotDistance(sp.place.distanceKm)) {
        return false;
      }
      if (pavedOnly && !sp.place.amenities.includes('paved')) {
        return false;
      }
      if (savedOnly && !savedPlaceIds.includes(sp.place.id)) {
        return false;
      }
      if (openOnly && !sp.openStatus.isOpen) {
        return false;
      }
      return true;
    });
  }, [
    scoredPlaces,
    beachesOnly,
    fencedOnly,
    offLeashOnly,
    shadedOnly,
    walkableOnly,
    pavedOnly,
    savedOnly,
    savedPlaceIds,
    openOnly,
  ]);

  const activeFilterCount = [
    beachesOnly,
    fencedOnly,
    offLeashOnly,
    shadedOnly,
    walkableOnly,
    pavedOnly,
    savedOnly,
    openOnly,
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setBeachesOnly(false);
    setFencedOnly(false);
    setOffLeashOnly(false);
    setShadedOnly(false);
    setWalkableOnly(false);
    setPavedOnly(false);
    setSavedOnly(false);
    setOpenOnly(false);
  };

  const activeSpotIndex = useMemo(() => {
    if (filteredPlaces.length === 0) return -1;
    const idx = selectedPlaceId
      ? filteredPlaces.findIndex((s) => s.place.id === selectedPlaceId)
      : 0;
    return idx >= 0 ? idx : 0;
  }, [filteredPlaces, selectedPlaceId]);

  const activeSpot =
    activeSpotIndex >= 0 ? filteredPlaces[activeSpotIndex] : null;

  const activeSpotGuide = useMemo(() => {
    if (!activeSpot) return null;
    return getSpotInsiderGuide(activeSpot, selectedHour, dog, units, language);
  }, [activeSpot, selectedHour, dog, units, language]);

  const selectedCorridor = useMemo(
    () => activeCorridors.find((c) => c.id === selectedCorridorId) ?? null,
    [activeCorridors, selectedCorridorId]
  );

  const betterCorridorSwap = useMemo(
    () =>
      selectedCorridor?.betterAlternativeId
        ? activeCorridors.find(
            (c) => c.id === selectedCorridor.betterAlternativeId
          ) ?? null
        : null,
    [activeCorridors, selectedCorridor]
  );

  const handleStepSpot = (deltaStep: -1 | 1) => {
    if (filteredPlaces.length === 0) return;
    if (previewLoopDuration && onClearLoopPreview) {
      onClearLoopPreview();
    }
    setSelectedCorridorId(null);
    const nextIdx =
      (activeSpotIndex + deltaStep + filteredPlaces.length) %
      filteredPlaces.length;
    setSelectedPlaceId(filteredPlaces[nextIdx].place.id);
  };

  const handleOpenGateMaps = (sp: ScoredPlace) => {
    const guide = getSpotInsiderGuide(sp, selectedHour, dog, units, language);
    const travelMode = isWalkableSpotDistance(sp.place.distanceKm)
      ? 'walking'
      : 'driving';
    const url = buildSafeDirectionsUrl(
      guide.gateLatitude,
      guide.gateLongitude,
      `${guide.englishTitle} (${guide.gateLabel})`,
      Platform.OS === 'ios',
      travelMode
    );
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleOpenLoopDirections = (loop: DoorstepLoopPlan) => {
    const url = buildSafeLoopUrl(loop.coordinates, Platform.OS === 'ios');
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const hasDogBeaches = useMemo(
    () => scoredPlaces.some((sp) => sp.place.category === 'dog_beach'),
    [scoredPlaces]
  );

  useEffect(() => {
    if (!hasDogBeaches && beachesOnly) {
      setBeachesOnly(false);
    }
  }, [hasDogBeaches, beachesOnly]);

  const filterItems: Array<{
    key: string;
    label: string;
    icon: UiIconName;
    active: boolean;
    toggle: () => void;
  }> = [
    ...(hasDogBeaches
      ? [
          {
            key: 'beaches',
            label: t.filterDogBeaches,
            icon: 'water' as UiIconName,
            active: beachesOnly,
            toggle: () => setBeachesOnly((v) => !v),
          },
        ]
      : []),
    {
      key: 'fenced',
      label: t.filterFencedRun,
      icon: 'paw',
      active: fencedOnly,
      toggle: () => setFencedOnly((v) => !v),
    },
    {
      key: 'offleash',
      label: t.filterAnyOffLeash,
      icon: 'bolt',
      active: offLeashOnly,
      toggle: () => setOffLeashOnly((v) => !v),
    },
    {
      key: 'shaded',
      label: t.filterShadedCanopy,
      icon: 'forest',
      active: shadedOnly,
      toggle: () => setShadedOnly((v) => !v),
    },
    {
      key: 'walkable',
      label:
        units === 'imperial'
          ? t.filterWalkableImperial
          : t.filterWalkableMetric,
      icon: 'walk',
      active: walkableOnly,
      toggle: () => setWalkableOnly((v) => !v),
    },
    {
      key: 'paved',
      label: t.filterDryPaved,
      icon: 'route',
      active: pavedOnly,
      toggle: () => setPavedOnly((v) => !v),
    },
    {
      key: 'open',
      label: t.filterOpenNow,
      icon: 'clock',
      active: openOnly,
      toggle: () => setOpenOnly((v) => !v),
    },
    {
      key: 'saved',
      label: t.filterSavedRegulars,
      icon: 'heart',
      active: savedOnly,
      toggle: () => setSavedOnly((v) => !v),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Full-Screen Interactive Map with Simple Tag Pins */}
      <WalkMap
        center={location}
        places={filteredPlaces}
        selectedPlaceId={activeSpot?.place.id ?? null}
        corridors={activeCorridors}
        selectedCorridorId={selectedCorridorId}
        showStreetsOverlay={hasCorridors && showStreetsOverlay}
        customLoop={activeLoopPlan}
        isLocating={isLocating}
        units={units}
        fullScreen
        hideBuiltInBottomBar
        hideBuiltInStreetPill
        topControlsOffset={48}
        pinLabelFormatter={(sp, rankIdx) =>
          getSimpleSpotTag(sp, rankIdx, selectedHour, language).label
        }
        onSelectPlace={(id) => {
          if (previewLoopDuration && onClearLoopPreview) {
            onClearLoopPreview();
          }
          setSelectedCorridorId(null);
          setSelectedPlaceId(id);
        }}
        onInspectSelectedPlace={(id) => {
          setSelectedCorridorId(null);
          setSelectedPlaceId(id);
          setGuideSheetOpen(true);
        }}
        onSelectCorridor={(id) => {
          if (previewLoopDuration && onClearLoopPreview) {
            onClearLoopPreview();
          }
          setSelectedCorridorId(id);
        }}
        onToggleStreetsOverlay={
          hasCorridors
            ? () => setShowStreetsOverlay((prev) => !prev)
            : undefined
        }
        onLocateMe={async () => {
          const ok = await requestGpsLocation();
          if (!ok) {
            onOpenLocationPicker();
          }
        }}
        onOpenDirections={handleOpenGateMaps}
        onOpenLoopDirections={handleOpenLoopDirections}
      />

      {/* Unified Floating Top HUD: Street Legend Toggle + List + Filters */}
      <View style={styles.topFloatingHud} pointerEvents="box-none">
        {hasCorridors ? (
          <Pressable
            onPress={() => setShowStreetsOverlay((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle street convenience lines"
            style={({ pressed }) => [
              styles.searchAreaPill,
              ELEVATION.floating,
              pressed && styles.pressed,
            ]}
          >
            {showStreetsOverlay ? (
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendLabel}>{t.easyLegend}</Text>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendLabel}>{t.peakLegend}</Text>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendLabel}>{t.narrowLegend}</Text>
              </View>
            ) : (
              <View style={styles.legendRow}>
                <UiIcon name="layers" size={14} color={COLORS.brand} />
                <Text style={styles.searchAreaText} numberOfLines={1}>
                  {t.showStreetLines}
                </Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={onOpenLocationPicker}
            accessibilityRole="button"
            accessibilityLabel="Choose walk area"
            style={({ pressed }) => [
              styles.searchAreaPill,
              ELEVATION.floating,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.legendRow}>
              <UiIcon name="pin" size={14} color={COLORS.brand} />
              <Text style={styles.searchAreaText} numberOfLines={1}>
                {location.name}
              </Text>
            </View>
          </Pressable>
        )}

        <Pressable
          onPress={() => setListSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open list of nearby parks and streets"
          style={({ pressed }) => [
            styles.hudBtn,
            ELEVATION.floating,
            pressed && styles.pressed,
          ]}
        >
          <UiIcon name="list" size={15} color={COLORS.textPrimary} />
          <Text style={styles.hudBtnText}>
            {formatInteger(filteredPlaces.length)}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFiltersSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open map filters"
          style={({ pressed }) => [
            styles.hudBtn,
            ELEVATION.floating,
            activeFilterCount > 0 && styles.hudBtnActive,
            pressed && styles.pressed,
          ]}
        >
          <UiIcon
            name="tune"
            size={15}
            color={activeFilterCount > 0 ? '#FFFFFF' : COLORS.textPrimary}
          />
          <Text
            style={[
              styles.hudBtnText,
              activeFilterCount > 0 && styles.hudBtnTextActive,
            ]}
          >
            {t.filtersBtn}
            {activeFilterCount > 0
              ? ` (${formatInteger(activeFilterCount, loc)})`
              : ''}
          </Text>
        </Pressable>
      </View>

      {/* Bottom Floating Card: Loop Preview OR Street Corridor OR Choice #1 Park Switcher Card */}
      <View style={styles.bottomCardHost} pointerEvents="box-none">
        {activeLoopPlan ? (
          <View style={[styles.bottomCard, ELEVATION.floating]}>
            <View style={styles.cardTopRow}>
              <View style={styles.loopIconBox}>
                <UiIcon name="route" size={20} color={COLORS.brand} />
              </View>
              <View style={styles.cardTitleCol}>
                <Text style={styles.cardTitleText} numberOfLines={1}>
                  {t.minCircularLoop(
                    formatInteger(activeLoopPlan.durationMin, loc)
                  )}
                </Text>
                <Text style={styles.cardSubtitleText} numberOfLines={1}>
                  {formatDistance(activeLoopPlan.distanceKm, units, loc)} ·{' '}
                  {t.viaPrefix} {activeLoopPlan.anchorName}
                </Text>
              </View>
            </View>

            <View style={styles.cardActionsRow}>
              <Pressable
                onPress={() => onClearLoopPreview?.()}
                style={styles.secondaryCardBtn}
              >
                <UiIcon name="close" size={14} color={COLORS.textPrimary} />
                <Text style={styles.secondaryCardBtnText}>{t.backToParks}</Text>
              </Pressable>

              <Pressable
                onPress={() => handleOpenLoopDirections(activeLoopPlan)}
                style={styles.primaryCardBtn}
              >
                <UiIcon name="navigate" size={14} color="#FFFFFF" />
                <Text style={styles.primaryCardBtnText}>
                  {t.startLoopShort}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : selectedCorridor ? (
          <View style={[styles.bottomCard, ELEVATION.floating]}>
            <View style={styles.cardTopRow}>
              <View
                style={[
                  styles.corridorToneBadge,
                  {
                    backgroundColor:
                      selectedCorridor.baseConvenience === 'easy'
                        ? COLORS.idealBg
                        : selectedCorridor.baseConvenience === 'moderate'
                          ? COLORS.cautionBg
                          : COLORS.avoidBg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.corridorToneDot,
                    {
                      backgroundColor:
                        selectedCorridor.baseConvenience === 'easy'
                          ? '#10B981'
                          : selectedCorridor.baseConvenience === 'moderate'
                            ? '#F59E0B'
                            : '#EF4444',
                    },
                  ]}
                />
              </View>
              <View style={styles.cardTitleCol}>
                <Text style={styles.cardTitleText} numberOfLines={1}>
                  {selectedCorridor.name}
                </Text>
                <Text style={styles.cardSubtitleText} numberOfLines={1}>
                  {selectedCorridor.sidewalkWidth} ·{' '}
                  {selectedCorridor.crowdSummary}
                </Text>
              </View>
            </View>

            <View style={styles.cardActionsRow}>
              <Pressable
                onPress={() => setSelectedCorridorId(null)}
                style={styles.secondaryCardBtn}
              >
                <UiIcon name="close" size={14} color={COLORS.textPrimary} />
                <Text style={styles.secondaryCardBtnText}>{t.backToParks}</Text>
              </Pressable>

              {betterCorridorSwap ? (
                <Pressable
                  onPress={() => setSelectedCorridorId(betterCorridorSwap.id)}
                  style={styles.primaryCardBtn}
                >
                  <UiIcon name="forest" size={15} color="#FFFFFF" />
                  <Text style={styles.primaryCardBtnText}>{t.calmSwap}</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => {
                    const start = selectedCorridor.coordinates[0];
                    const url = buildSafeDirectionsUrl(
                      start[0],
                      start[1],
                      selectedCorridor.name,
                      Platform.OS === 'ios',
                      'walking'
                    );
                    if (url) Linking.openURL(url).catch(() => {});
                  }}
                  style={styles.primaryCardBtn}
                >
                  <UiIcon name="navigate" size={14} color="#FFFFFF" />
                  <Text style={styles.primaryCardBtnText}>{t.startCorner}</Text>
                </Pressable>
              )}
            </View>
          </View>
        ) : activeSpot && activeSpotGuide ? (
          <View style={[styles.bottomCard, ELEVATION.floating]}>
            <View style={styles.cardTopRow}>
              <ParkScenicBadge
                category={activeSpot.place.category}
                spotId={activeSpot.place.id}
                photoUrl={activeSpot.place.photoUrl}
                size={48}
                rankBadge={activeSpotIndex === 0 ? 1 : null}
              />

              <View style={styles.cardTitleCol}>
                <Text style={styles.cardTitleText} numberOfLines={1}>
                  {activeSpotGuide.englishTitle}
                </Text>
                <View style={styles.cardSubMetaRow}>
                  <UiIcon
                    name={
                      isWalkableSpotDistance(activeSpot.place.distanceKm)
                        ? 'walk'
                        : 'car'
                    }
                    size={13}
                    color={COLORS.brand}
                  />
                  <Text style={styles.cardSubtitleText} numberOfLines={1}>
                    {isWalkableSpotDistance(activeSpot.place.distanceKm)
                      ? formatWalkMinutes(activeSpot.place.distanceKm, loc)
                      : formatDriveMinutes(activeSpot.place.distanceKm, loc)}{' '}
                    · {activeSpotGuide.gateLabel}
                  </Text>
                </View>
              </View>

              {/* Choice #1: ‹ 1 / N › Quick Park Switcher Right on the Map Card */}
              {filteredPlaces.length > 1 ? (
                <View style={styles.stepperPill}>
                  <Pressable
                    onPress={() => handleStepSpot(-1)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Previous park"
                    style={styles.stepperArrowBtn}
                  >
                    <UiIcon
                      name="chevronLeft"
                      size={16}
                      color={COLORS.textPrimary}
                    />
                  </Pressable>
                  <Text style={styles.stepperCountText}>
                    {formatInteger(activeSpotIndex + 1, loc)}/
                    {formatInteger(filteredPlaces.length, loc)}
                  </Text>
                  <Pressable
                    onPress={() => handleStepSpot(1)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="Next park"
                    style={styles.stepperArrowBtn}
                  >
                    <UiIcon
                      name="chevronRight"
                      size={16}
                      color={COLORS.textPrimary}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>

            <View style={styles.cardActionsRow}>
              <Pressable
                onPress={() => setGuideSheetOpen(true)}
                style={({ pressed }) => [
                  styles.secondaryCardBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.secondaryCardBtnText}>
                  {t.localGuideAndGate}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleOpenGateMaps(activeSpot)}
                style={({ pressed }) => [
                  styles.primaryCardBtn,
                  pressed && styles.pressed,
                ]}
              >
                <UiIcon name="navigate" size={14} color="#FFFFFF" />
                <Text style={styles.primaryCardBtnText}>{t.dogGateMaps}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.bottomCard, ELEVATION.floating]}>
            <Text style={styles.cardTitleText}>{t.noParksMatchFilters}</Text>
            <Pressable
              onPress={resetAllFilters}
              style={[styles.primaryCardBtn, { marginTop: 4 }]}
            >
              <Text style={styles.primaryCardBtnText}>
                {t.resetMapFilters}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* V3 Local Insider Sheet — Exclusively Shows the Current Selected Park */}
      <ParkGuideSheet
        spot={activeSpot}
        rankIndex={Math.max(0, activeSpotIndex)}
        visible={guideSheetOpen && Boolean(activeSpot)}
        onClose={() => setGuideSheetOpen(false)}
      />

      {/* Slide-Up Map Filters Sheet */}
      <Modal
        visible={filtersSheetOpen}
        transparent
        animationType="slide"
        aria-label={t.mapFiltersTitle}
        onRequestClose={() => setFiltersSheetOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismissSpace}
            onPress={() => setFiltersSheetOpen(false)}
          />
          <View style={styles.sheetBox}>
            <View style={styles.grabHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>{t.mapFiltersTitle}</Text>
              <View style={styles.sheetHeaderBtns}>
                {activeFilterCount > 0 ? (
                  <Pressable onPress={resetAllFilters} style={styles.resetPill}>
                    <Text style={styles.resetPillText}>{t.resetBtn}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => setFiltersSheetOpen(false)}
                  style={styles.donePill}
                >
                  <Text style={styles.donePillText}>
                    {t.showCount(formatInteger(filteredPlaces.length, loc))}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.filterGrid}>
              {filterItems.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={f.toggle}
                  style={[
                    styles.filterOptionBtn,
                    f.active && styles.filterOptionBtnActive,
                  ]}
                >
                  <UiIcon
                    name={f.active ? 'check' : f.icon}
                    size={15}
                    color={f.active ? COLORS.brandDark : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      f.active && styles.filterOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Slide-Up Quick List Sheet (All Matching Spots + 12 Street Corridors) */}
      <Modal
        visible={listSheetOpen}
        transparent
        animationType="slide"
        aria-label={t.browseNearbyTitle}
        onRequestClose={() => setListSheetOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismissSpace}
            onPress={() => setListSheetOpen(false)}
          />
          <View style={[styles.sheetBox, styles.listSheetBox]}>
            <View style={styles.grabHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>{t.browseNearbyTitle}</Text>
              <Pressable
                onPress={() => setListSheetOpen(false)}
                style={styles.donePill}
              >
                <Text style={styles.donePillText}>{t.closeBtn}</Text>
              </Pressable>
            </View>

            {hasCorridors ? (
              <View style={styles.listTabBar}>
                <Pressable
                  onPress={() => setListTab('parks')}
                  style={[
                    styles.listTabBtn,
                    listTab === 'parks' && [
                      styles.listTabBtnActive,
                      ELEVATION.card,
                    ],
                  ]}
                >
                  <UiIcon
                    name="forest"
                    size={15}
                    color={
                      listTab === 'parks'
                        ? COLORS.brandDark
                        : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.listTabText,
                      listTab === 'parks' && styles.listTabTextActive,
                    ]}
                  >
                    {t.spotsTab(formatInteger(filteredPlaces.length, loc))}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setListTab('streets')}
                  style={[
                    styles.listTabBtn,
                    listTab === 'streets' && [
                      styles.listTabBtnActive,
                      ELEVATION.card,
                    ],
                  ]}
                >
                  <UiIcon
                    name="layers"
                    size={15}
                    color={
                      listTab === 'streets'
                        ? COLORS.brandDark
                        : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.listTabText,
                      listTab === 'streets' && styles.listTabTextActive,
                    ]}
                  >
                    {t.trailsAndStreetsTab(
                      formatInteger(activeCorridors.length, loc)
                    )}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {listTab === 'parks' || !hasCorridors
                ? filteredPlaces.map((sp, idx) => {
                    const { primary } = splitSpotDisplayName(
                      sp.place.name,
                      language
                    );
                    const tag = getSimpleSpotTag(
                      sp,
                      idx,
                      selectedHour,
                      language
                    );
                    const isSel = sp.place.id === activeSpot?.place.id;
                    return (
                      <Pressable
                        key={sp.place.id}
                        onPress={() => {
                          setSelectedCorridorId(null);
                          setSelectedPlaceId(sp.place.id);
                          setListSheetOpen(false);
                        }}
                        style={[
                          styles.listSpotRow,
                          isSel && styles.listSpotRowActive,
                        ]}
                      >
                        <ParkScenicBadge
                          category={sp.place.category}
                          spotId={sp.place.id}
                          photoUrl={sp.place.photoUrl}
                          size={42}
                        />
                        <View style={styles.listSpotLeft}>
                          <Text style={styles.listSpotName} numberOfLines={1}>
                            {primary}
                          </Text>
                          <Text style={styles.listSpotSub} numberOfLines={1}>
                            {isWalkableSpotDistance(sp.place.distanceKm)
                              ? formatWalkMinutes(sp.place.distanceKm, loc)
                              : formatDriveMinutes(sp.place.distanceKm, loc)}{' '}
                            · {sp.openStatus.hoursSummary}
                          </Text>
                        </View>
                        <View style={styles.listTagBadge}>
                          <Text style={styles.listTagText}>{tag.label}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                : activeCorridors.map((cor) => (
                    <Pressable
                      key={cor.id}
                      onPress={() => {
                        setShowStreetsOverlay(true);
                        setSelectedCorridorId(cor.id);
                        setListSheetOpen(false);
                      }}
                      style={styles.listSpotRow}
                    >
                      <View
                        style={[
                          styles.corridorListDotWrap,
                          {
                            backgroundColor:
                              cor.baseConvenience === 'easy'
                                ? COLORS.idealBg
                                : cor.baseConvenience === 'moderate'
                                  ? COLORS.cautionBg
                                  : COLORS.avoidBg,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.corridorToneDot,
                            {
                              backgroundColor:
                                cor.baseConvenience === 'easy'
                                  ? '#10B981'
                                  : cor.baseConvenience === 'moderate'
                                    ? '#F59E0B'
                                    : '#EF4444',
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.listSpotLeft}>
                        <Text style={styles.listSpotName} numberOfLines={1}>
                          {cor.name}
                        </Text>
                        <Text style={styles.listSpotSub} numberOfLines={1}>
                          {cor.sidewalkWidth} · {cor.crowdSummary}
                        </Text>
                      </View>
                      <Text style={styles.listCorridorJump}>Map ›</Text>
                    </Pressable>
                  ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E5ECE8',
  },
  topFloatingHud: {
    position: 'absolute',
    top: 10,
    start: 10,
    end: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: 50,
  },
  searchAreaPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.08)',
    paddingVertical: 8.5,
    paddingHorizontal: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginEnd: 4,
  },
  searchAreaText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  hudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.08)',
    paddingVertical: 8.5,
    paddingHorizontal: 11,
  },
  hudBtnActive: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  hudBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  hudBtnTextActive: {
    color: '#FFFFFF',
  },
  bottomCardHost: {
    position: 'absolute',
    bottom: 12,
    start: 12,
    end: 12,
    zIndex: 50,
  },
  bottomCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.08)',
    padding: 13,
    gap: 11,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loopIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corridorToneBadge: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corridorToneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cardTitleCol: {
    flex: 1,
    gap: 3,
  },
  cardTitleText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  cardSubMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardSubtitleText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 3,
    paddingHorizontal: 4,
    gap: 3,
  },
  stepperArrowBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCountText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
    paddingHorizontal: 3,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryCardBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    paddingVertical: 10.5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCardBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  primaryCardBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 10.5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCardBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 28, 0.44)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalDismissSpace: {
    width: '100%',
    flex: 1,
  },
  sheetBox: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 13,
  },
  listSheetBox: {
    maxHeight: '82%',
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  sheetHeaderBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetPill: {
    paddingVertical: 6.5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  donePill: {
    paddingVertical: 6.5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.brand,
  },
  donePillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOptionBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  filterOptionBtnActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  filterOptionText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  filterOptionTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  listTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: 14,
    padding: 3.5,
    gap: 4,
  },
  listTabBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTabBtnActive: {
    backgroundColor: COLORS.surface,
  },
  listTabText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  listTabTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  listScroll: {
    flexGrow: 0,
  },
  listScrollContent: {
    gap: 8,
    paddingBottom: 8,
  },
  listSpotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  listSpotRowActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  corridorListDotWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listSpotLeft: {
    flex: 1,
    gap: 2,
  },
  listSpotName: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  listSpotSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  listTagBadge: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  listTagText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  listCorridorJump: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brand,
  },
  pressed: {
    opacity: 0.82,
  },
});
