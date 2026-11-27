import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  MELBOURNE_PILOT_SPOTS,
  SYDNEY_PILOT_SPOTS,
} from '../constants/auPresets';
import { detectActiveRegion } from '../constants/auSuburbs';
import {
  buildWalkLogsCsv,
  buildWalkLogsJson,
  daysUntilIsoDate,
  WALK_LOG_TAG_KEYS,
} from '../constants/memberDefaults';
import { resolveParkPhotoUri } from '../constants/parkPhotos';
import { BREED_PRESETS, SHANGHAI_PILOT_SPOTS } from '../constants/presets';
import { useAuth } from '../context/AuthContext';
import { useWalkPlanner } from '../context/WalkPlannerContext';
import {
  formatDistance,
  formatDriveMinutes,
  formatInteger,
  formatTemperature,
  formatWalkMinutes,
  isWalkableSpotDistance,
} from '../i18n/formatters';
import {
  getAuthErrorMessage,
  getBreedLabel,
  getLocaleTag,
  getStrings,
} from '../i18n/translations';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import {
  AppLanguage,
  CoatType,
  DogAgeGroup,
  DogProfile,
  DogSize,
  PawSensitivity,
  UnitSystem,
  WalkLogTag,
  WalkPlace,
} from '../types/walk';
import {
  pickDogProfilePhoto,
  recropWebDogPhoto,
} from '../utils/dogPhotoPicker';
import { splitSpotDisplayName } from '../utils/spotGuide';
import { AuthModal, AuthModalMode } from './AuthModal';
import { DogAvatar } from './DogAvatar';
import { MemberHubModal, MemberHubTab } from './MemberHubModal';
import { ParkGuideSheet } from './ParkGuideSheet';
import {
  ParkScenicBadge,
  PassportBotanicalBanner,
  UiIcon,
} from './UiIcons';

const ZOOM_STEPS = [1, 1.35, 1.7] as const;

interface DogProfileScreenProps {
  onShowSpotOnMap?: (placeId: string) => void;
}

function getSweetSpotRangeC(dog: DogProfile): { lowC: number; highC: number } {
  let lowC = 10;
  let highC = 21.5;
  if (dog.coat === 'thick') {
    lowC = 2;
    highC = 17;
  } else if (dog.coat === 'short') {
    lowC = 13;
    highC = 23;
  }
  if (dog.brachycephalic) {
    highC = Math.min(highC, 18.5);
  }
  if (dog.ageGroup === 'senior' || dog.ageGroup === 'puppy') {
    lowC += 1.5;
    highC -= 1;
  }
  if (
    typeof dog.customMaxTempC === 'number' &&
    Number.isFinite(dog.customMaxTempC)
  ) {
    highC = dog.customMaxTempC;
  }
  return { lowC: Math.round(lowC), highC: Math.round(highC) };
}

function computeWalkStreakStats(
  logs: Array<{ timestampMs: number; distanceKm: number }>
): { dayStreak: number; walksThisWeek: number; totalKm: number } {
  if (logs.length === 0) {
    return { dayStreak: 0, walksThisWeek: 0, totalKm: 0 };
  }
  const now = new Date();
  const weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let walksThisWeek = 0;
  let totalKm = 0;
  const dayKeys = new Set<string>();

  const toDayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  for (const log of logs) {
    totalKm += log.distanceKm;
    if (log.timestampMs >= weekCutoff) {
      walksThisWeek += 1;
    }
    dayKeys.add(toDayKey(new Date(log.timestampMs)));
  }

  let dayStreak = 0;
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!dayKeys.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dayKeys.has(toDayKey(cursor))) {
    dayStreak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    dayStreak,
    walksThisWeek,
    totalKm: Math.round(totalKm * 10) / 10,
  };
}

export const DogProfileScreen: React.FC<DogProfileScreenProps> = ({
  onShowSpotOnMap,
}) => {
  const {
    dog,
    dogs,
    activeDogIds,
    activeDogs,
    isPackMode,
    updateDog,
    selectSingleDog,
    toggleWalkDog,
    addDog,
    removeDog,
    walkLogs,
    logWalk,
    deleteWalkLog,
    units,
    setUnits,
    language,
    setLanguage,
    location,
    setLocation,
    selectedHour,
    scoredPlaces,
    savedPlaceIds,
    toggleSavedPlace,
    memberProfile,
    memberPreferences,
    careReminders,
    syncCloudNow,
  } = useWalkPlanner();
  const {
    user,
    isFirebaseConfigured,
    syncStatus,
    resendVerification,
    signOut,
  } = useAuth();
  const t = getStrings(language);
  const loc = getLocaleTag(language);

  const activeRegion = useMemo(
    () => detectActiveRegion(location.latitude, location.longitude),
    [location.latitude, location.longitude]
  );
  const isShanghai = activeRegion === 'shanghai';

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDogId, setEditingDogId] = useState<string>(
    activeDogs[0]?.id || dogs[0]?.id || 'dog-primary'
  );
  const [guideSpotId, setGuideSpotId] = useState<string | null>(null);

  const editingDog = useMemo(
    () =>
      dogs.find((d) => (d.id || 'dog-primary') === editingDogId) ||
      activeDogs[0] ||
      dogs[0] ||
      dog,
    [dogs, editingDogId, activeDogs, dog]
  );

  const [nameDraft, setNameDraft] = useState(editingDog.name);
  const [showAllWalkLogs, setShowAllWalkLogs] = useState(false);
  const [selectedWalkTags, setSelectedWalkTags] = useState<WalkLogTag[]>([]);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [memberHubOpen, setMemberHubOpen] = useState(false);
  const [memberHubTab, setMemberHubTab] = useState<MemberHubTab>('profile');
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [isSendingVerify, setIsSendingVerify] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);
  const [basePhotoUri, setBasePhotoUri] = useState<string | null>(
    editingDog.customPhotoUri ?? null
  );
  const [zoomStepIdx, setZoomStepIdx] = useState(0);

  // Keep nameDraft synced whenever switching which pup is being edited (including newly added pups)
  useEffect(() => {
    setNameDraft(editingDog.name);
    setBasePhotoUri(editingDog.customPhotoUri ?? null);
  }, [editingDog.id]);

  const openEditForDog = (target: DogProfile) => {
    const id = target.id || 'dog-primary';
    setEditingDogId(id);
    setNameDraft(target.name);
    setBasePhotoUri(target.customPhotoUri ?? null);
    setZoomStepIdx(0);
    setPhotoNotice(null);
    setEditModalOpen(true);
  };

  const handleNameChange = (text: string) => {
    setNameDraft(text);
    updateDog({ name: text }, editingDog.id || 'dog-primary');
  };

  const handlePickPhoto = async (source: 'library' | 'camera') => {
    if (isPickingPhoto) return;
    setIsPickingPhoto(true);
    setPhotoNotice(null);
    const targetId = editingDog.id || 'dog-primary';
    try {
      const result = await pickDogProfilePhoto(source);
      if (result.status === 'picked') {
        setBasePhotoUri(result.baseCropUri);
        setZoomStepIdx(0);
        updateDog({ customPhotoUri: result.dataUri }, targetId);
      } else if (result.status === 'error') {
        setPhotoNotice(result.message);
      }
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const handleCycleZoom = async () => {
    const sourceUri = basePhotoUri || editingDog.customPhotoUri;
    if (!sourceUri) return;
    const nextIdx = (zoomStepIdx + 1) % ZOOM_STEPS.length;
    const recropped = await recropWebDogPhoto(sourceUri, ZOOM_STEPS[nextIdx]);
    if (recropped) {
      setZoomStepIdx(nextIdx);
      updateDog({ customPhotoUri: recropped }, editingDog.id || 'dog-primary');
    }
  };

  const handleResetIllustration = () => {
    setPhotoNotice(null);
    setBasePhotoUri(null);
    setZoomStepIdx(0);
    updateDog({ customPhotoUri: null }, editingDog.id || 'dog-primary');
  };

  const streakStats = useMemo(
    () => computeWalkStreakStats(walkLogs),
    [walkLogs]
  );

  const upcomingReminder = useMemo(() => {
    if (careReminders.length === 0) return null;
    const soonest = careReminders[0];
    const days = daysUntilIsoDate(soonest.dueDateIso);
    return days <= 45 ? { reminder: soonest, days } : null;
  }, [careReminders]);

  const walkTagLabel = (tag: WalkLogTag): string => {
    switch (tag) {
      case 'hydrated':
        return t.walkTagHydrated;
      case 'good_recall':
        return t.walkTagRecall;
      case 'potty':
        return t.walkTagPotty;
      case 'paw_check':
        return t.walkTagPaws;
      case 'hot':
        return t.walkTagHot;
      default:
        return t.walkTagSocial;
    }
  };

  const handleExportWalkLogs = async (fmt: 'csv' | 'json') => {
    if (walkLogs.length === 0) return;
    const content =
      fmt === 'csv' ? buildWalkLogsCsv(walkLogs) : buildWalkLogsJson(walkLogs);
    if (Platform.OS === 'web') {
      const g = globalThis as unknown as {
        Blob?: new (parts: unknown[], opts?: { type?: string }) => unknown;
        URL?: {
          createObjectURL: (b: unknown) => string;
          revokeObjectURL: (u: string) => void;
        };
        document?: {
          createElement: (tag: string) => {
            href: string;
            download: string;
            click: () => void;
          };
        };
      };
      if (g.Blob && g.URL && g.document) {
        const mime =
          fmt === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/json;charset=utf-8';
        const blob = new g.Blob([content], { type: mime });
        const url = g.URL.createObjectURL(blob);
        const link = g.document.createElement('a');
        link.href = url;
        link.download = `pawcast-walks.${fmt}`;
        link.click();
        g.URL.revokeObjectURL(url);
      }
    } else {
      await Share.share({ message: content }).catch(() => {});
    }
    setExportNotice(t.walkExportedToast);
    setTimeout(() => setExportNotice(null), 2000);
  };

  const { lowC, highC } = useMemo(() => getSweetSpotRangeC(dog), [dog]);

  const barLeftPct = Math.max(2, Math.min(80, Math.round((lowC / 34) * 100)));
  const barWidthPct = Math.max(
    14,
    Math.min(96 - barLeftPct, Math.round(((highC - lowC) / 34) * 100))
  );
  const currentTempC = selectedHour?.weather.tempC ?? 18;
  const currentPinPct = Math.max(
    4,
    Math.min(96, Math.round((currentTempC / 34) * 100))
  );

  const activeBreedLabel = useMemo(() => {
    const preset = BREED_PRESETS.find((b) => b.id === dog.breedId);
    return getBreedLabel(
      dog.breedId,
      preset?.label ?? (language === 'zh' ? '混血陪伴犬' : 'Mixed Companion'),
      language
    );
  }, [dog.breedId, language]);

  const traitChips = useMemo(() => {
    const sizeText =
      dog.size === 'small'
        ? t.sizeSmall
        : dog.size === 'medium'
          ? t.sizeMedium
          : dog.size === 'large'
            ? t.sizeLarge
            : t.sizeXL;
    const ageText =
      dog.ageGroup === 'puppy'
        ? t.stagePuppy
        : dog.ageGroup === 'senior'
          ? t.stageSenior
          : t.stageAdult;
    const coatText =
      dog.coat === 'thick'
        ? t.coatThick
        : dog.coat === 'short'
          ? t.coatShort
          : t.coatMedium;
    const licenseText = isShanghai
      ? dog.hasDogLicense
        ? t.traitRegoShReady
        : t.traitRegoShFree
      : dog.hasDogLicense
        ? t.traitRegoAuReady
        : t.traitRegoAuFenced;
    return [sizeText, ageText, coatText, licenseText];
  }, [dog.size, dog.ageGroup, dog.coat, dog.hasDogLicense, isShanghai, t]);

  const moodBubble = useMemo(() => {
    if (!selectedHour) return t.moodDefault;
    if (selectedHour.weather.precipProb >= 40) {
      return t.moodRain;
    }
    if (selectedHour.isPostRainWetTurf) {
      return t.moodWetGrass;
    }
    if ((selectedHour.weather.uvIndex ?? 0) >= 11) {
      return t.moodExtremeUv;
    }
    if (
      selectedHour.pawTier !== 'safe' ||
      selectedHour.weather.tempC > highC + 2
    ) {
      return t.moodWarm;
    }
    if (selectedHour.walkScore >= 80) {
      return t.moodIdeal;
    }
    return t.moodCozy;
  }, [selectedHour, highC, t]);

  const savedSpots = useMemo(
    () => scoredPlaces.filter((sp) => savedPlaceIds.includes(sp.place.id)),
    [scoredPlaces, savedPlaceIds]
  );

  const otherCitySavedSpots = useMemo(() => {
    const localIds = new Set(scoredPlaces.map((sp) => sp.place.id));
    type CatalogSpot = Omit<WalkPlace, 'distanceKm'>;
    const catalog: Array<{
      place: CatalogSpot;
      cityLabel: string;
      timezone: string;
    }> = [
      ...MELBOURNE_PILOT_SPOTS.map((place) => ({
        place,
        cityLabel: t.cityMelbourne,
        timezone: 'Australia/Melbourne',
      })),
      ...SYDNEY_PILOT_SPOTS.map((place) => ({
        place,
        cityLabel: t.citySydney,
        timezone: 'Australia/Sydney',
      })),
      ...SHANGHAI_PILOT_SPOTS.map((place) => ({
        place,
        cityLabel: t.cityShanghai,
        timezone: 'Asia/Shanghai',
      })),
    ];
    return savedPlaceIds
      .filter((id) => !localIds.has(id))
      .map((id) => catalog.find((entry) => entry.place.id === id))
      .filter(
        (
          entry
        ): entry is {
          place: CatalogSpot;
          cityLabel: string;
          timezone: string;
        } => Boolean(entry)
      );
  }, [scoredPlaces, savedPlaceIds, t.cityMelbourne, t.citySydney, t.cityShanghai]);

  const totalSavedCount = savedSpots.length + otherCitySavedSpots.length;

  const guideSpotIndex = useMemo(
    () =>
      guideSpotId
        ? scoredPlaces.findIndex((s) => s.place.id === guideSpotId)
        : -1,
    [guideSpotId, scoredPlaces]
  );

  const activeGuideSpot =
    guideSpotIndex >= 0 ? scoredPlaces[guideSpotIndex] : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 0. Household Multi-Dog Pack Switcher + Far-Right Sign-In / Account Icon */}
        <View style={styles.packBarOuterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.packBarScroll}
            contentContainerStyle={styles.packBarContent}
          >
            {dogs.map((pup) => {
              const pupId = pup.id || 'dog-primary';
              const isActive = activeDogIds.includes(pupId);
              return (
                <Pressable
                  key={pupId}
                  onPress={() => {
                    if (isPackMode) {
                      toggleWalkDog(pupId);
                    } else {
                      selectSingleDog(pupId);
                      setEditingDogId(pupId);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={[
                    styles.packChip,
                    isActive && styles.packChipActive,
                  ]}
                >
                  <DogAvatar
                    breedId={pup.breedId}
                    customUri={pup.customPhotoUri}
                    size={22}
                  />
                  <Text
                    style={[
                      styles.packChipText,
                      isActive && styles.packChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {pup.name}
                  </Text>
                  {isPackMode && isActive ? (
                    <UiIcon name="check" size={12} color={COLORS.brandDark} />
                  ) : null}
                </Pressable>
              );
            })}

            {dogs.length > 1 ? (
              <Pressable
                onPress={() => {
                  if (isPackMode) {
                    selectSingleDog(activeDogs[0]?.id || dogs[0]?.id || 'dog-primary');
                  } else {
                    dogs.forEach((d) => {
                      const id = d.id || 'dog-primary';
                      if (!activeDogIds.includes(id)) {
                        toggleWalkDog(id);
                      }
                    });
                  }
                }}
                style={[
                  styles.packActionPill,
                  isPackMode && styles.packActionPillActive,
                ]}
              >
                <UiIcon
                  name="paw"
                  size={12}
                  color={isPackMode ? '#FFFFFF' : COLORS.brandDark}
                />
                <Text
                  style={[
                    styles.packActionPillText,
                    isPackMode && styles.packActionPillTextActive,
                  ]}
                >
                  {isPackMode ? t.walkingPackActive : t.walkTogetherBtn}
                </Text>
              </Pressable>
            ) : null}

            {dogs.length < 5 ? (
              <Pressable
                onPress={() => {
                  const createdId = addDog(
                    dogs.length === 1 ? 'frenchie' : 'golden'
                  );
                  setEditingDogId(createdId);
                  setBasePhotoUri(null);
                  setZoomStepIdx(0);
                  setPhotoNotice(null);
                  setEditModalOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Add another dog to household"
                style={styles.addPupPill}
              >
                <Text style={styles.addPupPillText}>{t.addPupBtn}</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          {user ? (
            <Pressable
              onPress={() => {
                setMemberHubTab('profile');
                setMemberHubOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={
                memberProfile.displayName.trim() ||
                user.displayName ||
                t.memberHubTitle
              }
              style={({ pressed }) => [
                styles.packAccountAvatarBtn,
                pressed && styles.pressed,
              ]}
            >
              {memberProfile.avatarUri ? (
                <Image
                  source={{ uri: memberProfile.avatarUri }}
                  style={styles.packAccountAvatarImg}
                />
              ) : (
                <Text style={styles.packAccountAvatarInitial}>
                  {(
                    memberProfile.displayName.trim() ||
                    user.displayName ||
                    'P'
                  )
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              )}
              <View style={styles.packAccountOnlineDot} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setAuthModalMode('signin');
                setAuthModalOpen(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t.profileSignInShort}
              style={({ pressed }) => [
                styles.packSignInBtn,
                pressed && styles.pressed,
              ]}
            >
              <UiIcon name="signIn" size={14} color="#FFFFFF" />
              <Text style={styles.packSignInBtnText}>
                {t.profileSignInShort}
              </Text>
            </Pressable>
          )}
        </View>

        {/* 1. Botanical Pet Passport Card */}
        <View style={[styles.passportCard, ELEVATION.cardHero]}>
          <View style={styles.passportBannerWrap}>
            <PassportBotanicalBanner />
            <View style={styles.speechBubble}>
              <Text style={styles.speechText}>“{moodBubble}”</Text>
            </View>
          </View>

          <View style={styles.passportBody}>
            <Pressable
              onPress={() => {
                setEditingDogId(activeDogs[0]?.id || 'dog-primary');
                handlePickPhoto('library');
              }}
              disabled={isPickingPhoto}
              accessibilityRole="button"
              accessibilityLabel={`Change ${dog.name} photo`}
              style={({ pressed }) => [
                styles.avatarPressable,
                ELEVATION.card,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatarHalo}>
                <DogAvatar
                  breedId={dog.breedId}
                  customUri={dog.customPhotoUri}
                  size={92}
                />
              </View>
              <View style={styles.cameraCornerBadge}>
                <UiIcon name="camera" size={14} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.passportHeadline}>{dog.name}</Text>
            <Text style={styles.passportBreedSub}>
              {isPackMode
                ? t.packSafetySubtitle(activeDogs.length)
                : activeBreedLabel}
            </Text>

            <View style={styles.traitChipsRow}>
              {traitChips.map((chip) => (
                <View key={chip} style={styles.traitChip}>
                  <Text style={styles.traitChipText}>{chip}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => openEditForDog(activeDogs[0] || dogs[0] || dog)}
              style={({ pressed }) => [
                styles.editPassportBtn,
                pressed && styles.pressed,
              ]}
            >
              <UiIcon name="edit" size={14} color={COLORS.brandDark} />
              <Text style={styles.editPassportBtnText}>
                {t.editProfileAndPhoto((activeDogs[0] || dog).name)}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Happy Temperature Zone Card */}
        <View style={[styles.infoCard, ELEVATION.card]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardIconTile}>
                <UiIcon name="thermostat" size={16} color={COLORS.brand} />
              </View>
              <Text style={styles.cardTitle}>
                {t.happyTempZoneTitle(dog.name)}
              </Text>
            </View>
            <View style={styles.sweetSpotPill}>
              <Text style={styles.sweetSpotHighlight}>
                {formatTemperature(lowC, units, loc)} –{' '}
                {formatTemperature(highC, units, loc)}
              </Text>
            </View>
          </View>

          <View style={styles.spectrumOuter}>
            <View style={styles.spectrumTrack}>
              <View
                style={[
                  styles.sweetSpotBand,
                  { left: `${barLeftPct}%`, width: `${barWidthPct}%` },
                ]}
              />
            </View>
            <View
              style={[
                styles.nowTempPin,
                ELEVATION.pin,
                { left: `${currentPinPct}%` },
              ]}
            />
          </View>

          <View style={styles.spectrumLabels}>
            <Text style={styles.spectrumEndLabel}>
              {formatTemperature(0, units, loc)} {t.chillyLabel}
            </Text>
            <Text style={styles.spectrumNowLabel}>
              {t.nowLabel} {formatTemperature(currentTempC, units, loc)}
            </Text>
            <Text style={styles.spectrumEndLabel}>
              {formatTemperature(34, units, loc)} {t.hotLabel}
            </Text>
          </View>
        </View>

        {/* 3. Saved Regulars Quick List */}
        <View style={[styles.infoCard, ELEVATION.card]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View
                style={[
                  styles.cardIconTile,
                  { backgroundColor: COLORS.heartBg },
                ]}
              >
                <UiIcon name="heart" size={15} color={COLORS.heartAccent} />
              </View>
              <Text style={styles.cardTitle}>
                {t.savedRegularsTitle(dog.name)}
              </Text>
            </View>
            <Text style={styles.savedCountBadge}>
              {totalSavedCount > 0
                ? t.savedCountLabel(totalSavedCount)
                : t.tapHeartPrompt}
            </Text>
          </View>

          {totalSavedCount > 0 ? (
            <View style={styles.savedRowsWrap}>
              {savedSpots.map((sp) => {
                const { primary } = splitSpotDisplayName(
                  sp.place.name,
                  language
                );
                const walkable = isWalkableSpotDistance(sp.place.distanceKm);
                const travel = walkable
                  ? formatWalkMinutes(sp.place.distanceKm, loc)
                  : formatDriveMinutes(sp.place.distanceKm, loc);
                return (
                  <Pressable
                    key={sp.place.id}
                    onPress={() => setGuideSpotId(sp.place.id)}
                    style={({ pressed }) => [
                      styles.savedSpotRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ParkScenicBadge
                      category={sp.place.category}
                      spotId={sp.place.id}
                      photoUrl={sp.place.photoUrl}
                      size={44}
                    />
                    <View style={styles.savedSpotLeft}>
                      <Text style={styles.savedSpotName} numberOfLines={1}>
                        {primary}
                      </Text>
                      <Text style={styles.savedSpotMeta} numberOfLines={1}>
                        {travel} · {sp.openStatus.hoursSummary}
                      </Text>
                    </View>
                    <UiIcon
                      name="chevronRight"
                      size={16}
                      color={COLORS.brand}
                    />
                  </Pressable>
                );
              })}

              {otherCitySavedSpots.map(({ place, cityLabel, timezone }) => {
                const { primary } = splitSpotDisplayName(place.name, language);
                return (
                  <View key={place.id} style={styles.savedSpotRow}>
                    <Pressable
                      onPress={() => {
                        setLocation({
                          name: `${cityLabel} · ${primary}`,
                          region: place.district || place.subtitle,
                          latitude: place.latitude,
                          longitude: place.longitude,
                          timezone,
                        });
                        onShowSpotOnMap?.(place.id);
                      }}
                      style={({ pressed }) => [
                        styles.otherCitySpotTouch,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ParkScenicBadge
                        category={place.category}
                        spotId={place.id}
                        photoUrl={
                          resolveParkPhotoUri(place.id, place.photoUrl) ??
                          undefined
                        }
                        size={44}
                      />
                      <View style={styles.savedSpotLeft}>
                        <Text style={styles.savedSpotName} numberOfLines={1}>
                          {primary}
                        </Text>
                        <Text style={styles.savedSpotMeta} numberOfLines={1}>
                          {cityLabel} · {t.switchAndViewMap}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleSavedPlace(place.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${primary} from saved`}
                    >
                      <UiIcon
                        name="heart"
                        size={16}
                        color={COLORS.heartAccent}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptySavedBox}>
              <Text style={styles.emptySavedText}>{t.emptySavedHint}</Text>
              {scoredPlaces.length > 0 ? (
                <View style={styles.quickStarRow}>
                  {scoredPlaces.slice(0, 2).map((sp) => {
                    const { primary } = splitSpotDisplayName(
                      sp.place.name,
                      language
                    );
                    return (
                      <Pressable
                        key={sp.place.id}
                        onPress={() => toggleSavedPlace(sp.place.id)}
                        style={styles.quickStarPill}
                      >
                        <UiIcon
                          name="heartOutline"
                          size={13}
                          color={COLORS.brandDark}
                        />
                        <Text style={styles.quickStarText} numberOfLines={1}>
                          {t.savePrefix} {primary}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          )}
        </View>

        {/* 4. Walk Streak & Local Walk Journal */}
        <View style={[styles.infoCard, ELEVATION.card]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardIconTile}>
                <UiIcon name="star" size={15} color={COLORS.brand} />
              </View>
              <Text style={styles.cardTitle}>{t.walkStreakJournalTitle}</Text>
            </View>
            <Pressable
              onPress={() => {
                logWalk({
                  placeId: scoredPlaces[0]?.place.id || 'quick-stroll',
                  placeName: scoredPlaces[0]
                    ? splitSpotDisplayName(scoredPlaces[0].place.name, language)
                        .primary
                    : language === 'zh'
                      ? `${location.name} 遛狗`
                      : `${location.name} Walk`,
                  cityLabel: location.name.split(' · ')[0] || 'Local',
                  durationMin: memberPreferences.defaultLoopDuration || 25,
                  distanceKm: 1.8,
                  tags: selectedWalkTags,
                });
                setSelectedWalkTags([]);
              }}
              style={({ pressed }) => [
                styles.quickLogPill,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.quickLogPillText}>{t.logWalkShort}</Text>
            </Pressable>
          </View>

          <View style={styles.streakStatsRow}>
            <View style={styles.streakStatBox}>
              <Text style={styles.streakStatValue}>
                {formatInteger(streakStats.dayStreak, loc)}
              </Text>
              <Text style={styles.streakStatLabel}>{t.dayStreakLabel}</Text>
            </View>
            <View style={styles.streakStatBox}>
              <Text style={styles.streakStatValue}>
                {formatInteger(streakStats.walksThisWeek, loc)}
              </Text>
              <Text style={styles.streakStatLabel}>{t.thisWeekLabel}</Text>
            </View>
            <View style={styles.streakStatBox}>
              <Text style={styles.streakStatValue}>
                {formatDistance(streakStats.totalKm, units, loc)}
              </Text>
              <Text style={styles.streakStatLabel}>{t.loggedDistLabel}</Text>
            </View>
          </View>

          {/* Weekly Walk Goal Progress */}
          <View style={styles.goalWrap}>
            <View style={styles.goalHeaderRow}>
              <Text style={styles.goalLabel}>
                {t.walkGoalProgressLabel(
                  formatInteger(streakStats.walksThisWeek, loc),
                  formatInteger(memberPreferences.weeklyWalkGoal, loc)
                )}
              </Text>
              {walkLogs.length > 0 ? (
                <View style={styles.exportBtnsRow}>
                  {exportNotice ? (
                    <Text style={styles.exportNoticeText}>{exportNotice}</Text>
                  ) : null}
                  <Pressable
                    onPress={() => handleExportWalkLogs('csv')}
                    style={styles.exportTinyPill}
                  >
                    <Text style={styles.exportTinyPillText}>
                      {t.walkExportCsvBtn}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleExportWalkLogs('json')}
                    style={styles.exportTinyPill}
                  >
                    <Text style={styles.exportTinyPillText}>
                      {t.walkExportJsonBtn}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <View style={styles.goalTrack}>
              <View
                style={[
                  styles.goalFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.round(
                        (streakStats.walksThisWeek /
                          Math.max(1, memberPreferences.weeklyWalkGoal)) *
                          100
                      )
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Quick Post-Walk Tag Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.walkTagStrip}
          >
            {WALK_LOG_TAG_KEYS.map((tg) => {
              const active = selectedWalkTags.includes(tg);
              return (
                <Pressable
                  key={tg}
                  onPress={() =>
                    setSelectedWalkTags((prev) =>
                      prev.includes(tg)
                        ? prev.filter((x) => x !== tg)
                        : [...prev, tg]
                    )
                  }
                  style={[
                    styles.walkTagChip,
                    active && styles.walkTagChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.walkTagChipText,
                      active && styles.walkTagChipTextActive,
                    ]}
                  >
                    {walkTagLabel(tg)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {walkLogs.length > 0 ? (
            <View style={styles.walkLogsList}>
              {(showAllWalkLogs ? walkLogs.slice(0, 20) : walkLogs.slice(0, 3)).map(
                (entry) => {
                  const whenStr = new Intl.DateTimeFormat(loc, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(entry.timestampMs));
                  return (
                    <View key={entry.id} style={styles.walkLogRow}>
                      <View style={styles.walkLogTextCol}>
                        <Text style={styles.walkLogTitle} numberOfLines={1}>
                          {entry.placeName}
                        </Text>
                        <Text style={styles.walkLogMeta} numberOfLines={2}>
                          {whenStr} · {formatInteger(entry.durationMin, loc)}{' '}
                          {t.minShort} ·{' '}
                          {formatDistance(entry.distanceKm, units, loc)} ·{' '}
                          {entry.dogNames.join(language === 'zh' ? '、' : ' & ')}
                          {entry.loggedBy
                            ? ` · ${t.walkLoggedByPrefix} ${entry.loggedBy}`
                            : ''}
                        </Text>
                        {entry.tags && entry.tags.length > 0 ? (
                          <View style={styles.loggedTagsRow}>
                            {entry.tags.map((tg) => (
                              <Text key={tg} style={styles.loggedTagPill}>
                                {walkTagLabel(tg)}
                              </Text>
                            ))}
                          </View>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => deleteWalkLog(entry.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove walk log at ${entry.placeName}`}
                      >
                        <UiIcon
                          name="close"
                          size={14}
                          color={COLORS.textMuted}
                        />
                      </Pressable>
                    </View>
                  );
                }
              )}
              {walkLogs.length > 3 ? (
                <Pressable
                  onPress={() => setShowAllWalkLogs((prev) => !prev)}
                  style={({ pressed }) => [
                    styles.expandLogsBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.expandLogsBtnText}>
                    {showAllWalkLogs
                      ? t.showFewerWalks
                      : t.showAllWalks(formatInteger(walkLogs.length, loc))}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptySavedText}>{t.emptyJournalHint}</Text>
          )}
        </View>

        {/* 5. Optional Firebase Email Account & Cloud Sync */}
        <View style={[styles.infoCard, ELEVATION.card]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={styles.cardIconTile}>
                <UiIcon name="cloud" size={16} color={COLORS.brand} />
              </View>
              <Text style={styles.cardTitle}>{t.accountCardTitle}</Text>
            </View>
            <View
              style={[
                styles.accountStatusPill,
                user
                  ? syncStatus === 'error'
                    ? styles.accountStatusPillWarn
                    : styles.accountStatusPillActive
                  : !isFirebaseConfigured
                    ? styles.accountStatusPillWarn
                    : null,
              ]}
            >
              <Text
                style={[
                  styles.accountStatusPillText,
                  user
                    ? syncStatus === 'error'
                      ? styles.accountStatusPillTextWarn
                      : styles.accountStatusPillTextActive
                    : !isFirebaseConfigured
                      ? styles.accountStatusPillTextWarn
                      : null,
                ]}
              >
                {user
                  ? syncStatus === 'syncing'
                    ? t.accountSyncSyncing
                    : syncStatus === 'synced'
                      ? t.accountSyncSynced
                      : syncStatus === 'error'
                        ? t.accountSyncError
                        : t.accountSyncIdle
                  : isFirebaseConfigured
                    ? t.accountGuestBadge
                    : t.accountSetupBadge}
              </Text>
            </View>
          </View>

          {/* Member Identity Row (Display Name + Uploaded Photo) */}
          <Pressable
            onPress={() => {
              setMemberHubTab('profile');
              setMemberHubOpen(true);
            }}
            style={({ pressed }) => [
              styles.memberIdentityBanner,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.memberMiniAvatar}>
              {memberProfile.avatarUri ? (
                <Image
                  source={{ uri: memberProfile.avatarUri }}
                  style={styles.memberMiniAvatarImg}
                />
              ) : (
                <Text style={styles.memberMiniAvatarInitial}>
                  {(memberProfile.displayName.trim() || user?.displayName || 'P')
                    .slice(0, 1)
                    .toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.memberIdentityCol}>
              <Text style={styles.memberIdentityName} numberOfLines={1}>
                {memberProfile.displayName.trim() ||
                  user?.displayName ||
                  t.accountGuestName}
              </Text>
              <Text style={styles.memberIdentityMeta} numberOfLines={1}>
                {t.accountOpenHubBtn}
              </Text>
            </View>
            <UiIcon name="chevronRight" size={16} color={COLORS.brandDark} />
          </Pressable>

          {upcomingReminder ? (
            <Pressable
              onPress={() => {
                setMemberHubTab('care');
                setMemberHubOpen(true);
              }}
              style={styles.reminderCalloutPill}
            >
              <UiIcon name="clock" size={14} color={COLORS.cautionText} />
              <Text style={styles.reminderCalloutText} numberOfLines={1}>
                {upcomingReminder.reminder.title} ·{' '}
                {upcomingReminder.days < 0
                  ? t.memberReminderOverdue
                  : upcomingReminder.days === 0
                    ? t.memberReminderDueToday
                    : t.memberReminderDueInDays(
                        formatInteger(upcomingReminder.days, loc)
                      )}
              </Text>
            </Pressable>
          ) : null}

          {user ? (
            <View style={styles.accountSignedInBody}>
              <View style={styles.accountEmailRow}>
                <UiIcon name="mail" size={15} color={COLORS.brandDark} />
                <Text style={styles.accountEmailText} numberOfLines={1}>
                  {user.maskedEmail}
                </Text>
                <View
                  style={[
                    styles.verifyPill,
                    user.emailVerified
                      ? styles.verifyPillOk
                      : styles.verifyPillPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.verifyPillText,
                      user.emailVerified
                        ? styles.verifyPillTextOk
                        : styles.verifyPillTextPending,
                    ]}
                  >
                    {user.emailVerified
                      ? t.accountVerifiedBadge
                      : t.accountUnverifiedBadge}
                  </Text>
                </View>
              </View>

              {verifyNotice ? (
                <Text style={styles.verifyNoticeText}>{verifyNotice}</Text>
              ) : null}

              <View style={styles.accountActionsRow}>
                <Pressable
                  onPress={() => {
                    syncCloudNow().catch(() => {});
                  }}
                  disabled={syncStatus === 'syncing'}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.accountActionPillPrimary,
                    syncStatus === 'syncing' && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.accountActionPillPrimaryText}>
                    {syncStatus === 'syncing'
                      ? t.accountSyncSyncing
                      : t.accountSyncNowBtn}
                  </Text>
                </Pressable>

                {!user.emailVerified ? (
                  <Pressable
                    onPress={async () => {
                      if (isSendingVerify) return;
                      setIsSendingVerify(true);
                      setVerifyNotice(null);
                      try {
                        const res = await resendVerification();
                        setVerifyNotice(
                          res.ok
                            ? t.accountVerifySent
                            : getAuthErrorMessage(res.errorKey, language)
                        );
                      } finally {
                        setIsSendingVerify(false);
                      }
                    }}
                    disabled={isSendingVerify}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.accountActionPill,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.accountActionPillText}>
                      {t.accountResendVerify}
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={async () => {
                    if (isSigningOut) return;
                    setIsSigningOut(true);
                    try {
                      await signOut();
                    } finally {
                      setIsSigningOut(false);
                    }
                  }}
                  disabled={isSigningOut}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.accountActionPill,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.accountActionPillText}>
                    {t.accountSignOutBtn}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setAuthModalMode('delete');
                    setAuthModalOpen(true);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.accountDeletePill,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.accountDeletePillText}>
                    {t.accountDeleteBtn}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.emptySavedBox}>
              <Text style={styles.emptySavedText}>
                {isFirebaseConfigured
                  ? t.accountGuestSubtitle
                  : t.accountSetupNotice}
              </Text>
              <Pressable
                onPress={() => {
                  setAuthModalMode('signin');
                  setAuthModalOpen(true);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.accountCtaBtn,
                  !isFirebaseConfigured && styles.accountCtaBtnSubtle,
                  pressed && styles.pressed,
                ]}
              >
                <UiIcon
                  name={isFirebaseConfigured ? 'mail' : 'lock'}
                  size={15}
                  color={isFirebaseConfigured ? '#FFFFFF' : COLORS.brandDark}
                />
                <Text
                  style={[
                    styles.accountCtaBtnText,
                    !isFirebaseConfigured && styles.accountCtaBtnTextSubtle,
                  ]}
                >
                  {isFirebaseConfigured
                    ? t.accountSignInCta
                    : t.accountSetupGuideCta}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* V3 Local Insider Sheet when Tapping Any Saved Spot */}
      <ParkGuideSheet
        spot={activeGuideSpot}
        rankIndex={Math.max(0, guideSpotIndex)}
        visible={Boolean(activeGuideSpot)}
        onClose={() => setGuideSpotId(null)}
        onShowOnMap={
          onShowSpotOnMap
            ? (placeId) => {
                setGuideSpotId(null);
                onShowSpotOnMap(placeId);
              }
            : undefined
        }
      />

      {/* Optional Firebase Email Sign-In / Account Management Sheet */}
      <AuthModal
        visible={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Member Hub: User Name/Photo, Tier 1 Preferences & Tier 2 Features */}
      <MemberHubModal
        visible={memberHubOpen}
        initialTab={memberHubTab}
        onClose={() => setMemberHubOpen(false)}
        onOpenAuthSignIn={() => {
          setAuthModalMode('signin');
          setAuthModalOpen(true);
        }}
        onShowSpotOnMap={onShowSpotOnMap}
      />

      {/* Slide-Up Edit Profile & Photo Sheet */}
      <Modal
        visible={editModalOpen}
        transparent
        animationType="slide"
        aria-label={`Edit ${dog.name} profile`}
        onRequestClose={() => setEditModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setEditModalOpen(false)}
          />
          <View style={[styles.editSheet, ELEVATION.floating]}>
            <View style={styles.grabHandle} />
            <View style={styles.editHeaderRow}>
              <Text style={styles.editHeaderTitle}>
                {t.editProfileAndPhoto(editingDog.name)}
              </Text>
              <Pressable
                onPress={() => setEditModalOpen(false)}
                style={styles.saveDoneBtn}
              >
                <Text style={styles.saveDoneBtnText}>{t.doneBtn}</Text>
              </Pressable>
            </View>

            <ScrollView
              style={styles.editScroll}
              contentContainerStyle={styles.editScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Photo Controls */}
              <View style={styles.editPhotoSection}>
                <DogAvatar
                  breedId={editingDog.breedId}
                  customUri={editingDog.customPhotoUri}
                  size={84}
                />
                <View style={styles.photoActionRow}>
                  <Pressable
                    onPress={() => handlePickPhoto('library')}
                    disabled={isPickingPhoto}
                    style={[
                      styles.photoActionPill,
                      styles.photoActionPillPrimary,
                    ]}
                  >
                    <UiIcon name="camera" size={14} color="#FFFFFF" />
                    <Text style={styles.photoActionPrimaryText}>
                      {isPickingPhoto
                        ? t.openingStatus
                        : editingDog.customPhotoUri
                          ? t.changePhoto
                          : t.uploadPhoto}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handlePickPhoto('camera')}
                    disabled={isPickingPhoto}
                    style={styles.photoActionPill}
                  >
                    <Text style={styles.photoActionText}>{t.snapCamera}</Text>
                  </Pressable>

                  {editingDog.customPhotoUri && Platform.OS === 'web' ? (
                    <Pressable
                      onPress={handleCycleZoom}
                      style={styles.photoActionPill}
                    >
                      <Text style={styles.photoActionText}>
                        {t.zoomLabel(ZOOM_STEPS[zoomStepIdx])}
                      </Text>
                    </Pressable>
                  ) : null}

                  {editingDog.customPhotoUri ? (
                    <Pressable
                      onPress={handleResetIllustration}
                      style={styles.photoActionPill}
                    >
                      <Text style={styles.photoActionText}>
                        {t.breedAvatar}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {photoNotice ? (
                  <View style={styles.photoNoticePill}>
                    <Text style={styles.photoNoticeText}>{photoNotice}</Text>
                    <Pressable onPress={() => setPhotoNotice(null)}>
                      <UiIcon
                        name="close"
                        size={14}
                        color={COLORS.cautionText}
                      />
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {/* Name Input */}
              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>{t.dogNameLabel}</Text>
                <View style={styles.nameInputBox}>
                  <UiIcon name="paw" size={16} color={COLORS.brand} />
                  <TextInput
                    value={nameDraft}
                    onChangeText={handleNameChange}
                    placeholder={t.pupNamePlaceholder}
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={24}
                    style={styles.nameInput}
                  />
                </View>
              </View>

              {/* Regional Council Recall / Shanghai 狗证 Toggle */}
              <Pressable
                onPress={() =>
                  updateDog(
                    { hasDogLicense: !editingDog.hasDogLicense },
                    editingDog.id || 'dog-primary'
                  )
                }
                style={[
                  styles.toggleBannerCard,
                  editingDog.hasDogLicense
                    ? styles.toggleBannerGreen
                    : styles.toggleBannerWarn,
                ]}
              >
                <UiIcon
                  name={editingDog.hasDogLicense ? 'check' : 'warning'}
                  size={18}
                  color={
                    editingDog.hasDogLicense
                      ? COLORS.brandDark
                      : COLORS.cautionText
                  }
                />
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>
                    {isShanghai
                      ? editingDog.hasDogLicense
                        ? t.regoReadySh
                        : t.regoMissingSh
                      : editingDog.hasDogLicense
                        ? t.regoReadyAu
                        : t.regoMissingAu}
                  </Text>
                  <Text style={styles.toggleSubtitle}>
                    {isShanghai
                      ? editingDog.hasDogLicense
                        ? t.regoReadyShSub
                        : t.regoMissingShSub
                      : editingDog.hasDogLicense
                        ? t.regoReadyAuSub
                        : t.regoMissingAuSub}
                  </Text>
                </View>
              </Pressable>

              {/* Breed Presets */}
              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>{t.breedLookVibe}</Text>
                <View style={styles.breedGrid}>
                  {BREED_PRESETS.map((preset) => {
                    const active = editingDog.breedId === preset.id;
                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() =>
                          updateDog(
                            {
                              breedId: preset.id,
                              ...preset.defaults,
                            },
                            editingDog.id || 'dog-primary'
                          )
                        }
                        style={[
                          styles.breedCard,
                          active && styles.breedCardActive,
                        ]}
                      >
                        <DogAvatar breedId={preset.id} size={46} />
                        <Text
                          style={[
                            styles.breedTitle,
                            active && styles.breedTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {getBreedLabel(preset.id, preset.label, language)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Body Size */}
              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>{t.bodySizeLabel}</Text>
                <View style={styles.optionRow}>
                  {(
                    [
                      {
                        key: 'small',
                        label: t.sizeSmall,
                        sub: units === 'imperial' ? '<22 lb' : '<10 kg',
                      },
                      {
                        key: 'medium',
                        label: t.sizeMedium,
                        sub: units === 'imperial' ? '22–55 lb' : '10–25 kg',
                      },
                      {
                        key: 'large',
                        label: t.sizeLarge,
                        sub: units === 'imperial' ? '55–90 lb' : '25–40 kg',
                      },
                      {
                        key: 'giant',
                        label: t.sizeXL,
                        sub: units === 'imperial' ? '90+ lb' : '40+ kg',
                      },
                    ] as Array<{ key: DogSize; label: string; sub: string }>
                  ).map((sz) => {
                    const active = editingDog.size === sz.key;
                    return (
                      <Pressable
                        key={sz.key}
                        onPress={() =>
                          updateDog(
                            { size: sz.key },
                            editingDog.id || 'dog-primary'
                          )
                        }
                        style={[
                          styles.optionTile,
                          active && styles.optionTileActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionTileTitle,
                            active && styles.optionTileTitleActive,
                          ]}
                        >
                          {sz.label}
                        </Text>
                        <Text style={styles.optionTileSub}>{sz.sub}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Life Stage & Coat */}
              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>{t.lifeStageLabel}</Text>
                <View style={styles.optionRow}>
                  {(
                    [
                      { key: 'puppy', label: t.stagePuppy },
                      { key: 'adult', label: t.stageAdult },
                      { key: 'senior', label: t.stageSenior },
                    ] as Array<{ key: DogAgeGroup; label: string }>
                  ).map((st) => {
                    const active = editingDog.ageGroup === st.key;
                    return (
                      <Pressable
                        key={st.key}
                        onPress={() =>
                          updateDog(
                            { ageGroup: st.key },
                            editingDog.id || 'dog-primary'
                          )
                        }
                        style={[
                          styles.optionTile,
                          active && styles.optionTileActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionTileTitle,
                            active && styles.optionTileTitleActive,
                          ]}
                        >
                          {st.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>
                  {t.coatAndPawsLabel}
                </Text>
                <View style={styles.optionRow}>
                  {(
                    [
                      { key: 'short', label: t.coatShort },
                      { key: 'medium', label: t.coatMedium },
                      { key: 'thick', label: t.coatThick },
                    ] as Array<{ key: CoatType; label: string }>
                  ).map((ct) => {
                    const active = editingDog.coat === ct.key;
                    return (
                      <Pressable
                        key={ct.key}
                        onPress={() =>
                          updateDog(
                            { coat: ct.key },
                            editingDog.id || 'dog-primary'
                          )
                        }
                        style={[
                          styles.optionTile,
                          active && styles.optionTileActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionTileTitle,
                            active && styles.optionTileTitleActive,
                          ]}
                        >
                          {ct.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.optionRow}>
                  {(
                    [
                      { key: 'sensitive', label: t.pawsSoft },
                      { key: 'normal', label: t.pawsNormal },
                      { key: 'tough', label: t.pawsTough },
                    ] as Array<{ key: PawSensitivity; label: string }>
                  ).map((pw) => {
                    const active = editingDog.pawSensitivity === pw.key;
                    return (
                      <Pressable
                        key={pw.key}
                        onPress={() =>
                          updateDog(
                            { pawSensitivity: pw.key },
                            editingDog.id || 'dog-primary'
                          )
                        }
                        style={[
                          styles.optionTile,
                          active && styles.optionTileActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionTileTitle,
                            active && styles.optionTileTitleActive,
                          ]}
                        >
                          {pw.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Flat Snoot Toggle */}
              <Pressable
                onPress={() =>
                  updateDog(
                    { brachycephalic: !editingDog.brachycephalic },
                    editingDog.id || 'dog-primary'
                  )
                }
                style={[
                  styles.toggleBannerCard,
                  editingDog.brachycephalic && styles.toggleBannerWarn,
                ]}
              >
                <UiIcon
                  name="thermostat"
                  size={18}
                  color={
                    editingDog.brachycephalic
                      ? COLORS.cautionText
                      : COLORS.textSecondary
                  }
                />
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>
                    {editingDog.brachycephalic
                      ? t.flatSnootActive
                      : t.flatSnootInactive}
                  </Text>
                  <Text style={styles.toggleSubtitle}>
                    {t.flatSnootSub(
                      formatTemperature(18, units, loc),
                      formatTemperature(19, units, loc)
                    )}
                  </Text>
                </View>
                <Text style={styles.toggleCheck}>
                  {editingDog.brachycephalic ? '✓' : '○'}
                </Text>
              </Pressable>

              {/* Tier 1 Dog Temperament, Weather Quirks & Custom Ceiling */}
              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>
                  {t.dogQuirksSectionLabel}
                </Text>

                <Pressable
                  onPress={() =>
                    updateDog(
                      { quietMode: !editingDog.quietMode },
                      editingDog.id || 'dog-primary'
                    )
                  }
                  style={[
                    styles.toggleBannerCard,
                    editingDog.quietMode && styles.toggleBannerGreen,
                  ]}
                >
                  <UiIcon
                    name="forest"
                    size={17}
                    color={
                      editingDog.quietMode
                        ? COLORS.brandDark
                        : COLORS.textSecondary
                    }
                  />
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>{t.dogQuietModeTitle}</Text>
                    <Text style={styles.toggleSubtitle}>
                      {t.dogQuietModeSub}
                    </Text>
                  </View>
                  <Text style={styles.toggleCheck}>
                    {editingDog.quietMode ? '✓' : '○'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    updateDog(
                      { hatesRain: !editingDog.hatesRain },
                      editingDog.id || 'dog-primary'
                    )
                  }
                  style={[
                    styles.toggleBannerCard,
                    editingDog.hatesRain && styles.toggleBannerGreen,
                  ]}
                >
                  <UiIcon
                    name="water"
                    size={17}
                    color={
                      editingDog.hatesRain
                        ? COLORS.brandDark
                        : COLORS.textSecondary
                    }
                  />
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>{t.dogHatesRainTitle}</Text>
                    <Text style={styles.toggleSubtitle}>
                      {t.dogHatesRainSub}
                    </Text>
                  </View>
                  <Text style={styles.toggleCheck}>
                    {editingDog.hatesRain ? '✓' : '○'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    updateDog(
                      { lovesWater: !editingDog.lovesWater },
                      editingDog.id || 'dog-primary'
                    )
                  }
                  style={[
                    styles.toggleBannerCard,
                    editingDog.lovesWater && styles.toggleBannerGreen,
                  ]}
                >
                  <UiIcon
                    name="sun"
                    size={17}
                    color={
                      editingDog.lovesWater
                        ? COLORS.brandDark
                        : COLORS.textSecondary
                    }
                  />
                  <View style={styles.toggleTextCol}>
                    <Text style={styles.toggleTitle}>
                      {t.dogLovesWaterTitle}
                    </Text>
                    <Text style={styles.toggleSubtitle}>
                      {t.dogLovesWaterSub}
                    </Text>
                  </View>
                  <Text style={styles.toggleCheck}>
                    {editingDog.lovesWater ? '✓' : '○'}
                  </Text>
                </Pressable>

                <View style={styles.customTempRow}>
                  <Text style={styles.customTempLabel}>
                    {t.dogCustomMaxTempLabel}
                  </Text>
                  <View style={styles.customTempControls}>
                    <Pressable
                      onPress={() => {
                        const cur = editingDog.customMaxTempC;
                        updateDog(
                          {
                            customMaxTempC:
                              cur == null ? 21 : cur <= 15 ? null : cur - 1,
                          },
                          editingDog.id || 'dog-primary'
                        );
                      }}
                      style={styles.customTempBtn}
                    >
                      <Text style={styles.customTempBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.customTempValue}>
                      {editingDog.customMaxTempC == null
                        ? t.dogCustomMaxTempAuto
                        : formatTemperature(editingDog.customMaxTempC, units, loc)}
                    </Text>
                    <Pressable
                      onPress={() => {
                        const cur = editingDog.customMaxTempC;
                        updateDog(
                          {
                            customMaxTempC:
                              cur == null ? 22 : cur >= 30 ? 30 : cur + 1,
                          },
                          editingDog.id || 'dog-primary'
                        );
                      }}
                      style={styles.customTempBtn}
                    >
                      <Text style={styles.customTempBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* App Language Selector (English / Mandarin) */}
              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>
                  {t.languageSectionLabel}
                </Text>
                <View style={styles.optionRow}>
                  {(
                    [
                      {
                        key: 'en',
                        label: 'English',
                        sub: 'AU / Global',
                      },
                      {
                        key: 'zh',
                        label: '简体中文',
                        sub: 'Mandarin · 普通话',
                      },
                    ] as Array<{
                      key: AppLanguage;
                      label: string;
                      sub: string;
                    }>
                  ).map((langOpt) => {
                    const active = language === langOpt.key;
                    return (
                      <Pressable
                        key={langOpt.key}
                        onPress={() => setLanguage(langOpt.key)}
                        style={[
                          styles.optionTile,
                          active && styles.optionTileActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionTileTitle,
                            active && styles.optionTileTitleActive,
                          ]}
                        >
                          {langOpt.label}
                        </Text>
                        <Text style={styles.optionTileSub}>{langOpt.sub}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Display Units Selector */}
              <View style={styles.editBlock}>
                <Text style={styles.editSectionLabel}>
                  {t.unitsSectionLabel}
                </Text>
                <View style={styles.optionRow}>
                  {(
                    [
                      {
                        key: 'metric',
                        label: t.metricTitle,
                        sub: t.metricSub,
                      },
                      {
                        key: 'imperial',
                        label: t.imperialTitle,
                        sub: t.imperialSub,
                      },
                    ] as Array<{ key: UnitSystem; label: string; sub: string }>
                  ).map((u) => {
                    const active = units === u.key;
                    return (
                      <Pressable
                        key={u.key}
                        onPress={() => setUnits(u.key)}
                        style={[
                          styles.optionTile,
                          active && styles.optionTileActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionTileTitle,
                            active && styles.optionTileTitleActive,
                          ]}
                        >
                          {u.label}
                        </Text>
                        <Text style={styles.optionTileSub}>{u.sub}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {dogs.length > 1 ? (
                <Pressable
                  onPress={() => {
                    removeDog(editingDog.id || 'dog-primary');
                    setEditModalOpen(false);
                  }}
                  style={styles.removePupBtn}
                >
                  <Text style={styles.removePupBtnText}>
                    {t.removePupFromHousehold(editingDog.name)}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
    gap: 13,
  },
  packBarOuterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  packBarScroll: {
    flex: 1,
  },
  packBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 2,
    paddingEnd: 4,
  },
  packSignInBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    paddingVertical: 6.5,
    paddingHorizontal: 11,
  },
  packSignInBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  packAccountAvatarBtn: {
    flexShrink: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  packAccountAvatarImg: {
    width: 31,
    height: 31,
    borderRadius: 15.5,
  },
  packAccountAvatarInitial: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  packAccountOnlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.brand,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  packChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingStart: 6,
    paddingEnd: 11,
  },
  packChipActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  packChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    maxWidth: 96,
  },
  packChipTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  packActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1,
    borderColor: '#B3E3CD',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  packActionPillActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  packActionPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  packActionPillTextActive: {
    color: '#FFFFFF',
  },
  addPupPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.brand,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  addPupPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  quickLogPill: {
    backgroundColor: COLORS.brandLight,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  quickLogPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  streakStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  streakStatBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  streakStatValue: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  streakStatLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  walkLogsList: {
    gap: 7,
  },
  walkLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  walkLogTextCol: {
    flex: 1,
    gap: 2,
  },
  walkLogTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  walkLogMeta: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  removePupBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: COLORS.avoidBg,
    borderWidth: 1,
    borderColor: COLORS.avoidBorder,
  },
  removePupBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.avoidText,
  },
  passportCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  passportBannerWrap: {
    height: 98,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 11,
    paddingHorizontal: 14,
  },
  speechBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: 999,
  },
  speechText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  passportBody: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 18,
    marginTop: -40,
    gap: 6,
  },
  avatarPressable: {
    position: 'relative',
    borderRadius: 68,
  },
  avatarHalo: {
    padding: 5,
    borderRadius: 68,
    backgroundColor: COLORS.surface,
  },
  cameraCornerBadge: {
    position: 'absolute',
    bottom: 2,
    end: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.brand,
    borderWidth: 2.5,
    borderColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passportHeadline: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginTop: 2,
  },
  passportBreedSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: -2,
  },
  traitChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  traitChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  traitChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  editPassportBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.brandLight,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  editPassportBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 11,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardIconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  sweetSpotPill: {
    backgroundColor: COLORS.brandLight,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  sweetSpotHighlight: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  spectrumOuter: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  spectrumTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceSubtle,
    position: 'relative',
    overflow: 'hidden',
  },
  sweetSpotBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#24996B',
    borderRadius: 6,
  },
  nowTempPin: {
    position: 'absolute',
    top: 2,
    width: 16,
    height: 16,
    marginStart: -8,
    borderRadius: 8,
    backgroundColor: COLORS.textPrimary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  spectrumLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spectrumEndLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  spectrumNowLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  savedCountBadge: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  savedRowsWrap: {
    gap: 8,
  },
  savedSpotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  otherCitySpotTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedSpotLeft: {
    flex: 1,
    gap: 2,
  },
  savedSpotName: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  savedSpotMeta: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySavedBox: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 13,
    gap: 10,
  },
  emptySavedText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  quickStarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  quickStarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  quickStarText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  expandLogsBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.brandLight,
    marginTop: 2,
  },
  expandLogsBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 28, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalDismiss: {
    width: '100%',
    flex: 1,
  },
  editSheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '88%',
    gap: 12,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  editHeaderTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  saveDoneBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 6.5,
    paddingHorizontal: 15,
    borderRadius: 999,
  },
  saveDoneBtnText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  editScroll: {
    flexGrow: 0,
  },
  editScrollContent: {
    gap: 14,
    paddingBottom: 12,
  },
  editPhotoSection: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  photoActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7,
  },
  photoActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  photoActionPillPrimary: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  photoActionPrimaryText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  photoActionText: {
    fontFamily: UI_FONT_FAMILY,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  photoNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.cautionBg,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  photoNoticeText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    color: COLORS.cautionText,
  },
  editBlock: {
    gap: 7,
  },
  editSectionLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  nameInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  nameInput: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  toggleBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
  },
  toggleBannerGreen: {
    backgroundColor: COLORS.idealBg,
    borderColor: COLORS.idealBorder,
  },
  toggleBannerWarn: {
    backgroundColor: COLORS.cautionBg,
    borderColor: COLORS.cautionBorder,
  },
  toggleTextCol: {
    flex: 1,
    gap: 2,
  },
  toggleTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  toggleCheck: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  breedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  breedCard: {
    width: '31%',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 5,
  },
  breedCardActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  breedTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  breedTitleActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 7,
  },
  optionTile: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  optionTileActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  optionTileTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  optionTileTitleActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  optionTileSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  accountStatusPill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  accountStatusPillActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  accountStatusPillWarn: {
    backgroundColor: COLORS.cautionBg,
    borderColor: COLORS.cautionBorder,
  },
  accountStatusPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  accountStatusPillTextActive: {
    color: COLORS.brandDark,
  },
  accountStatusPillTextWarn: {
    color: COLORS.cautionText,
  },
  accountSignedInBody: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  accountEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountEmailText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  verifyPill: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  verifyPillOk: {
    backgroundColor: COLORS.idealBg,
  },
  verifyPillPending: {
    backgroundColor: COLORS.cautionBg,
  },
  verifyPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '800',
  },
  verifyPillTextOk: {
    color: COLORS.brandDark,
  },
  verifyPillTextPending: {
    color: COLORS.cautionText,
  },
  verifyNoticeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.brandDark,
  },
  accountActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  accountActionPillPrimary: {
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  accountActionPillPrimaryText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  accountActionPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  accountActionPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  accountDeletePill: {
    backgroundColor: COLORS.avoidBg,
    borderWidth: 1,
    borderColor: COLORS.avoidBorder,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  accountDeletePillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.avoidText,
  },
  accountCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  accountCtaBtnSubtle: {
    backgroundColor: COLORS.brandLight,
    borderWidth: 1,
    borderColor: COLORS.brand,
  },
  accountCtaBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  accountCtaBtnTextSubtle: {
    color: COLORS.brandDark,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  goalWrap: {
    gap: 5,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  goalLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  goalTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  goalFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },
  exportBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  exportNoticeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  exportTinyPill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  exportTinyPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  walkTagStrip: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  walkTagChip: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  walkTagChipActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  walkTagChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  walkTagChipTextActive: {
    color: COLORS.brandDark,
  },
  loggedTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  loggedTagPill: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.brandDark,
    backgroundColor: COLORS.brandLight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  memberIdentityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 15,
    padding: 10,
  },
  memberMiniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberMiniAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  memberMiniAvatarInitial: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  memberIdentityCol: {
    flex: 1,
    gap: 1,
  },
  memberIdentityName: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  memberIdentityMeta: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  reminderCalloutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.cautionBg,
    borderWidth: 1,
    borderColor: COLORS.cautionBorder,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  reminderCalloutText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cautionText,
  },
  customTempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  customTempLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  customTempControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customTempBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTempBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  customTempValue: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.brandDark,
    minWidth: 58,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});
