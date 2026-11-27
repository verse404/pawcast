import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  daysUntilIsoDate,
  MAX_CARE_REMINDERS,
  MAX_CUSTOM_SPOTS,
  MAX_GEAR_ITEMS,
  MAX_PINNED_LOCATIONS,
} from '../constants/memberDefaults';
import { useAuth } from '../context/AuthContext';
import { useWalkPlanner } from '../context/WalkPlannerContext';
import { formatInteger } from '../i18n/formatters';
import { getLocaleTag, getStrings } from '../i18n/translations';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import {
  CareReminder,
  CareReminderType,
  DefaultMapFilters,
  GearTrigger,
  LoopDurationMinutes,
  PlaceCategory,
  PreferredMapsApp,
} from '../types/walk';
import { pickDogProfilePhoto } from '../utils/dogPhotoPicker';
import { UiIcon } from './UiIcons';

export type MemberHubTab = 'profile' | 'spots' | 'care' | 'household';

interface MemberHubModalProps {
  visible: boolean;
  initialTab?: MemberHubTab;
  onClose: () => void;
  onOpenAuthSignIn?: () => void;
  onShowSpotOnMap?: (placeId: string) => void;
}

function getDefaultFutureIsoDate(daysAhead = 30): string {
  const d = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const MemberHubModal: React.FC<MemberHubModalProps> = ({
  visible,
  initialTab = 'profile',
  onClose,
  onOpenAuthSignIn,
  onShowSpotOnMap,
}) => {
  const {
    language,
    units,
    location,
    setLocation,
    gpsFix,
    dog,
    memberProfile,
    updateMemberProfile,
    memberPreferences,
    updateMemberPreferences,
    pinLocation,
    unpinLocation,
    customSpots,
    addCustomSpot,
    removeCustomSpot,
    careReminders,
    addCareReminder,
    removeCareReminder,
    completeCareReminder,
    gearChecklist,
    toggleGearItem,
    addGearItem,
    removeGearItem,
    householdId,
    startHouseholdShare,
    joinHouseholdByCode,
    leaveCurrentHousehold,
    syncCloudNow,
  } = useWalkPlanner();
  const {
    user,
    household,
    regenerateHouseholdInvite,
  } = useAuth();
  const t = getStrings(language);
  const loc = getLocaleTag(language);

  const [activeTab, setActiveTab] = useState<MemberHubTab>(initialTab);
  const [nameDraft, setNameDraft] = useState(memberProfile.displayName);
  const [signatureDraft, setSignatureDraft] = useState(
    memberPreferences.inviteSignature
  );
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<string | null>(null);

  // Pin Suburb draft
  const [pinLabelDraft, setPinLabelDraft] = useState('');

  // Secret Spot drafts
  const [spotNameDraft, setSpotNameDraft] = useState('');
  const [spotNoteDraft, setSpotNoteDraft] = useState('');
  const [spotCategory, setSpotCategory] = useState<PlaceCategory>('park');
  const [spotTags, setSpotTags] = useState<string[]>(['shade']);

  // Care Reminder drafts
  const [remType, setRemType] = useState<CareReminderType>('rego');
  const [remTitleDraft, setRemTitleDraft] = useState('');
  const [remDateDraft, setRemDateDraft] = useState(() =>
    getDefaultFutureIsoDate(30)
  );
  const [remRepeat, setRemRepeat] = useState<CareReminder['repeatMonths']>(12);

  // Gear item drafts
  const [gearLabelDraft, setGearLabelDraft] = useState('');
  const [gearTrigger, setGearTrigger] = useState<GearTrigger>('always');

  // Household drafts
  const [joinCodeDraft, setJoinCodeDraft] = useState('');
  const [householdBusy, setHouseholdBusy] = useState(false);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setNameDraft(memberProfile.displayName);
      setSignatureDraft(memberPreferences.inviteSignature);
      setAvatarNotice(null);
      setHouseholdError(null);
      setCopiedInvite(false);
    }
  }, [
    visible,
    initialTab,
    memberProfile.displayName,
    memberPreferences.inviteSignature,
  ]);

  const handlePickMemberAvatar = async () => {
    if (isPickingAvatar) return;
    setIsPickingAvatar(true);
    setAvatarNotice(null);
    try {
      const res = await pickDogProfilePhoto('library');
      if (res.status === 'picked') {
        updateMemberProfile({ avatarUri: res.dataUri });
      } else if (res.status === 'error') {
        setAvatarNotice(res.message);
      }
    } finally {
      setIsPickingAvatar(false);
    }
  };

  const toggleDefaultFilter = (key: keyof DefaultMapFilters) => {
    updateMemberPreferences({
      defaultMapFilters: {
        ...memberPreferences.defaultMapFilters,
        [key]: !memberPreferences.defaultMapFilters[key],
      },
    });
  };

  const toggleSpotTag = (tag: string) => {
    setSpotTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag].slice(0, 4)
    );
  };

  const handleAddSecretSpot = () => {
    if (!spotNameDraft.trim()) return;
    const ok = addCustomSpot({
      name: spotNameDraft,
      category: spotCategory,
      latitude: gpsFix?.latitude ?? location.latitude,
      longitude: gpsFix?.longitude ?? location.longitude,
      suburbLabel: gpsFix?.name ?? location.name,
      note: spotNoteDraft,
      tags: spotTags,
    });
    if (ok) {
      setSpotNameDraft('');
      setSpotNoteDraft('');
    }
  };

  const handleAddReminder = () => {
    const title =
      remTitleDraft.trim() ||
      (remType === 'rego'
        ? t.memberReminderTypeRego
        : remType === 'rabies'
          ? t.memberReminderTypeRabies
          : remType === 'flea_tick'
            ? t.memberReminderTypeFlea
            : remType === 'grooming'
              ? t.memberReminderTypeGrooming
              : '');
    if (!title) return;
    const ok = addCareReminder({
      dogName: dog.name,
      type: remType,
      title,
      dueDateIso: remDateDraft,
      repeatMonths: remRepeat,
    });
    if (ok) {
      setRemTitleDraft('');
    }
  };

  const handleCopyInviteCode = async (code: string) => {
    if (Platform.OS === 'web') {
      const nav = (globalThis as Record<string, unknown>).navigator as
        | { clipboard?: { writeText: (text: string) => Promise<void> } }
        | undefined;
      await nav?.clipboard?.writeText(code).catch(() => {});
    }
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const triggerLabel = (tr: GearTrigger): string => {
    switch (tr) {
      case 'hot_paws':
        return t.gearTriggerHotPaws;
      case 'rain':
        return t.gearTriggerRain;
      case 'night':
        return t.gearTriggerNight;
      case 'license':
        return t.gearTriggerLicense;
      default:
        return t.gearTriggerAlways;
    }
  };

  const displayInitial = (
    memberProfile.displayName.trim() ||
    user?.displayName ||
    'P'
  )
    .slice(0, 1)
    .toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      aria-label={t.memberHubTitle}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={[styles.sheet, ELEVATION.floating]}>
          <View style={styles.grabHandle} />

          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconTile}>
                <UiIcon name="cloud" size={16} color={COLORS.brand} />
              </View>
              <Text style={styles.headerTitle}>{t.memberHubTitle}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>{t.doneBtn}</Text>
            </Pressable>
          </View>

          {/* 4-Tab Bar */}
          <View style={styles.tabRow}>
            {(
              [
                { key: 'profile', label: t.memberTabProfile },
                { key: 'spots', label: t.memberTabSpots },
                { key: 'care', label: t.memberTabCare },
                { key: 'household', label: t.memberTabHousehold },
              ] as Array<{ key: MemberHubTab; label: string }>
            ).map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      active && styles.tabPillTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* TAB 1: MEMBER PROFILE & TIER 1 ROUTINE PREFERENCES */}
            {activeTab === 'profile' ? (
              <>
                {/* User Name & Uploaded Photo */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>
                    {t.memberDisplayNameLabel}
                  </Text>
                  <View style={styles.avatarRow}>
                    <Pressable
                      onPress={handlePickMemberAvatar}
                      disabled={isPickingAvatar}
                      style={styles.memberAvatarCircle}
                    >
                      {memberProfile.avatarUri ? (
                        <Image
                          source={{ uri: memberProfile.avatarUri }}
                          style={styles.memberAvatarImg}
                        />
                      ) : (
                        <Text style={styles.memberAvatarInitial}>
                          {displayInitial}
                        </Text>
                      )}
                    </Pressable>
                    <View style={styles.avatarBtnCol}>
                      <View style={styles.inlineBtnsRow}>
                        <Pressable
                          onPress={handlePickMemberAvatar}
                          disabled={isPickingAvatar}
                          style={styles.smallPrimaryPill}
                        >
                          <UiIcon name="camera" size={13} color="#FFFFFF" />
                          <Text style={styles.smallPrimaryPillText}>
                            {isPickingAvatar
                              ? t.openingStatus
                              : memberProfile.avatarUri
                                ? t.memberChangeAvatar
                                : t.memberUploadAvatar}
                          </Text>
                        </Pressable>
                        {memberProfile.avatarUri ? (
                          <Pressable
                            onPress={() =>
                              updateMemberProfile({ avatarUri: null })
                            }
                            style={styles.smallOutlinePill}
                          >
                            <Text style={styles.smallOutlinePillText}>
                              {t.memberClearAvatar}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                      {avatarNotice ? (
                        <Text style={styles.errorInline}>{avatarNotice}</Text>
                      ) : null}
                    </View>
                  </View>

                  <TextInput
                    value={nameDraft}
                    onChangeText={(txt) => {
                      setNameDraft(txt);
                      updateMemberProfile({ displayName: txt });
                    }}
                    placeholder={t.memberDisplayNamePlaceholder}
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={40}
                    style={styles.textInput}
                  />
                </View>

                {/* Pinned Walk Areas (Home / Work / Weekend) */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>
                    {t.memberPinnedAreasTitle}
                  </Text>
                  {memberPreferences.pinnedLocations.length <
                  MAX_PINNED_LOCATIONS ? (
                    <View style={styles.inlineInputRow}>
                      <TextInput
                        value={pinLabelDraft}
                        onChangeText={setPinLabelDraft}
                        placeholder={t.memberPinLabelPlaceholder}
                        placeholderTextColor={COLORS.textMuted}
                        maxLength={24}
                        style={[styles.textInput, styles.flexInput]}
                      />
                      <Pressable
                        onPress={() => {
                          pinLocation(pinLabelDraft || location.name, location);
                          setPinLabelDraft('');
                        }}
                        style={styles.smallPrimaryPill}
                      >
                        <Text style={styles.smallPrimaryPillText}>
                          {t.memberPinCurrentBtn}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {memberPreferences.pinnedLocations.length > 0 ? (
                    <View style={styles.listGap}>
                      {memberPreferences.pinnedLocations.map((pin) => (
                        <View key={pin.id} style={styles.listItemRow}>
                          <Pressable
                            onPress={() => {
                              setLocation(pin.location);
                              onClose();
                            }}
                            style={styles.listItemMain}
                          >
                            <Text style={styles.listItemTitle} numberOfLines={1}>
                              {pin.label}
                            </Text>
                            <Text style={styles.listItemSub} numberOfLines={1}>
                              {pin.location.name}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => unpinLocation(pin.id)}
                            hitSlop={8}
                          >
                            <UiIcon
                              name="close"
                              size={14}
                              color={COLORS.textMuted}
                            />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.helperText}>{t.memberNoPinnedAreas}</Text>
                  )}
                </View>

                {/* Usual Walk Routine & Default Loop */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>{t.memberRoutineTitle}</Text>
                  <View style={styles.stepperGrid}>
                    <View style={styles.stepperCard}>
                      <Text style={styles.stepperLabel}>
                        {t.memberMorningHourLabel}
                      </Text>
                      <View style={styles.stepperControls}>
                        <Pressable
                          onPress={() => {
                            const cur = memberPreferences.morningWalkHour;
                            updateMemberPreferences({
                              morningWalkHour:
                                cur === null ? 7 : cur <= 5 ? null : cur - 1,
                            });
                          }}
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.stepValue}>
                          {memberPreferences.morningWalkHour === null
                            ? t.memberOffLabel
                            : `${String(memberPreferences.morningWalkHour).padStart(2, '0')}:00`}
                        </Text>
                        <Pressable
                          onPress={() => {
                            const cur = memberPreferences.morningWalkHour;
                            updateMemberPreferences({
                              morningWalkHour:
                                cur === null ? 7 : cur >= 12 ? 12 : cur + 1,
                            });
                          }}
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.stepperCard}>
                      <Text style={styles.stepperLabel}>
                        {t.memberEveningHourLabel}
                      </Text>
                      <View style={styles.stepperControls}>
                        <Pressable
                          onPress={() => {
                            const cur = memberPreferences.eveningWalkHour;
                            updateMemberPreferences({
                              eveningWalkHour:
                                cur === null ? 18 : cur <= 15 ? null : cur - 1,
                            });
                          }}
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.stepValue}>
                          {memberPreferences.eveningWalkHour === null
                            ? t.memberOffLabel
                            : `${String(memberPreferences.eveningWalkHour).padStart(2, '0')}:00`}
                        </Text>
                        <Pressable
                          onPress={() => {
                            const cur = memberPreferences.eveningWalkHour;
                            updateMemberPreferences({
                              eveningWalkHour:
                                cur === null ? 18 : cur >= 22 ? 22 : cur + 1,
                            });
                          }}
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.subFieldLabel}>
                    {t.memberDefaultLoopLabel}
                  </Text>
                  <View style={styles.chipWrap}>
                    {([15, 30, 45] as LoopDurationMinutes[]).map((mins) => {
                      const active =
                        memberPreferences.defaultLoopDuration === mins;
                      return (
                        <Pressable
                          key={mins}
                          onPress={() =>
                            updateMemberPreferences({
                              defaultLoopDuration: mins,
                            })
                          }
                          style={[
                            styles.choiceChip,
                            active && styles.choiceChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              active && styles.choiceChipTextActive,
                            ]}
                          >
                            {formatInteger(mins, loc)} {t.minShort}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.subFieldLabel}>
                    {t.memberPreferredMapsLabel}
                  </Text>
                  <View style={styles.chipWrap}>
                    {(
                      [
                        { key: 'auto', label: t.mapsAppAuto },
                        { key: 'apple', label: t.mapsAppApple },
                        { key: 'google', label: t.mapsAppGoogle },
                        { key: 'amap', label: t.mapsAppAmap },
                      ] as Array<{ key: PreferredMapsApp; label: string }>
                    ).map((opt) => {
                      const active =
                        memberPreferences.preferredMapsApp === opt.key;
                      return (
                        <Pressable
                          key={opt.key}
                          onPress={() =>
                            updateMemberPreferences({
                              preferredMapsApp: opt.key,
                            })
                          }
                          style={[
                            styles.choiceChip,
                            active && styles.choiceChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              active && styles.choiceChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.subFieldLabel}>
                    {t.memberDefaultFiltersLabel}
                  </Text>
                  <View style={styles.chipWrap}>
                    {(
                      [
                        { key: 'fencedOnly', label: t.filterFencedRun },
                        { key: 'offLeashOnly', label: t.filterAnyOffLeash },
                        { key: 'shadedOnly', label: t.filterShadedCanopy },
                        { key: 'beachesOnly', label: t.filterDogBeaches },
                        {
                          key: 'walkableOnly',
                          label:
                            units === 'imperial'
                              ? t.filterWalkableImperial
                              : t.filterWalkableMetric,
                        },
                        { key: 'pavedOnly', label: t.filterDryPaved },
                        { key: 'openOnly', label: t.filterOpenNow },
                      ] as Array<{
                        key: keyof DefaultMapFilters;
                        label: string;
                      }>
                    ).map((f) => {
                      const active = memberPreferences.defaultMapFilters[f.key];
                      return (
                        <Pressable
                          key={f.key}
                          onPress={() => toggleDefaultFilter(f.key)}
                          style={[
                            styles.choiceChip,
                            active && styles.choiceChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              active && styles.choiceChipTextActive,
                            ]}
                          >
                            {active ? '✓ ' : ''}
                            {f.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Weekly Walk Goals & Meet-Up Signature */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>
                    {t.memberWeeklyGoalsLabel}
                  </Text>
                  <View style={styles.stepperGrid}>
                    <View style={styles.stepperCard}>
                      <Text style={styles.stepperLabel}>
                        {t.memberGoalWalksUnit}
                      </Text>
                      <View style={styles.stepperControls}>
                        <Pressable
                          onPress={() =>
                            updateMemberPreferences({
                              weeklyWalkGoal:
                                memberPreferences.weeklyWalkGoal - 1,
                            })
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.stepValue}>
                          {formatInteger(memberPreferences.weeklyWalkGoal, loc)}
                        </Text>
                        <Pressable
                          onPress={() =>
                            updateMemberPreferences({
                              weeklyWalkGoal:
                                memberPreferences.weeklyWalkGoal + 1,
                            })
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.stepperCard}>
                      <Text style={styles.stepperLabel}>
                        {units === 'imperial'
                          ? t.memberGoalDistUnitImperial
                          : t.memberGoalDistUnitMetric}
                      </Text>
                      <View style={styles.stepperControls}>
                        <Pressable
                          onPress={() =>
                            updateMemberPreferences({
                              weeklyKmGoal: memberPreferences.weeklyKmGoal - 2,
                            })
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.stepValue}>
                          {formatInteger(
                            units === 'imperial'
                              ? Math.round(memberPreferences.weeklyKmGoal * 0.62)
                              : memberPreferences.weeklyKmGoal,
                            loc
                          )}
                        </Text>
                        <Pressable
                          onPress={() =>
                            updateMemberPreferences({
                              weeklyKmGoal: memberPreferences.weeklyKmGoal + 2,
                            })
                          }
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.subFieldLabel}>
                    {t.memberInviteSignatureLabel}
                  </Text>
                  <TextInput
                    value={signatureDraft}
                    onChangeText={(txt) => {
                      setSignatureDraft(txt);
                      updateMemberPreferences({ inviteSignature: txt });
                    }}
                    placeholder={t.memberInviteSignaturePlaceholder}
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={60}
                    style={styles.textInput}
                  />
                </View>
              </>
            ) : null}

            {/* TAB 2: MY SECRET SPOTS (TIER 2) */}
            {activeTab === 'spots' ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>
                  {t.memberSecretSpotsTitle} ({customSpots.length}/
                  {MAX_CUSTOM_SPOTS})
                </Text>
                <Text style={styles.helperText}>{t.memberSecretSpotsSub}</Text>

                {customSpots.length < MAX_CUSTOM_SPOTS ? (
                  <View style={styles.formStack}>
                    <TextInput
                      value={spotNameDraft}
                      onChangeText={setSpotNameDraft}
                      placeholder={t.memberSpotNamePlaceholder}
                      placeholderTextColor={COLORS.textMuted}
                      maxLength={50}
                      style={styles.textInput}
                    />
                    <View style={styles.chipWrap}>
                      {(
                        [
                          { key: 'park', label: t.memberSpotCatPark },
                          { key: 'dog_park', label: t.memberSpotCatDogPark },
                          { key: 'trail', label: t.memberSpotCatTrail },
                          { key: 'dog_beach', label: t.memberSpotCatBeach },
                        ] as Array<{ key: PlaceCategory; label: string }>
                      ).map((cat) => (
                        <Pressable
                          key={cat.key}
                          onPress={() => setSpotCategory(cat.key)}
                          style={[
                            styles.choiceChip,
                            spotCategory === cat.key && styles.choiceChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceChipText,
                              spotCategory === cat.key &&
                                styles.choiceChipTextActive,
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.chipWrap}>
                      {(
                        [
                          { key: 'shade', label: t.memberSpotTagShade },
                          { key: 'water', label: t.memberSpotTagWater },
                          { key: 'fenced', label: t.memberSpotTagFenced },
                          { key: 'quiet', label: t.memberSpotTagQuiet },
                        ] as const
                      ).map((tg) => {
                        const active = spotTags.includes(tg.key);
                        return (
                          <Pressable
                            key={tg.key}
                            onPress={() => toggleSpotTag(tg.key)}
                            style={[
                              styles.choiceChip,
                              active && styles.choiceChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceChipText,
                                active && styles.choiceChipTextActive,
                              ]}
                            >
                              {active ? '✓ ' : ''}
                              {tg.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <TextInput
                      value={spotNoteDraft}
                      onChangeText={setSpotNoteDraft}
                      placeholder={t.memberSpotNotePlaceholder}
                      placeholderTextColor={COLORS.textMuted}
                      maxLength={120}
                      style={styles.textInput}
                    />

                    <Pressable
                      onPress={handleAddSecretSpot}
                      style={styles.fullPrimaryBtn}
                    >
                      <Text style={styles.fullPrimaryBtnText}>
                        {t.memberAddSpotAtCurrentBtn} (
                        {(gpsFix?.name ?? location.name).split(' · ').pop()})
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {customSpots.length > 0 ? (
                  <View style={styles.listGap}>
                    {customSpots.map((spot) => (
                      <View key={spot.id} style={styles.listItemRow}>
                        <Pressable
                          onPress={() => {
                            setLocation({
                              name: spot.suburbLabel,
                              region: spot.suburbLabel,
                              latitude: spot.latitude,
                              longitude: spot.longitude,
                              timezone: location.timezone,
                            });
                            onClose();
                            onShowSpotOnMap?.(spot.id);
                          }}
                          style={styles.listItemMain}
                        >
                          <Text style={styles.listItemTitle} numberOfLines={1}>
                            ★ {spot.name}
                          </Text>
                          <Text style={styles.listItemSub} numberOfLines={2}>
                            {spot.suburbLabel}
                            {spot.note ? ` · ${spot.note}` : ''}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => removeCustomSpot(spot.id)}
                          hitSlop={8}
                        >
                          <UiIcon
                            name="close"
                            size={14}
                            color={COLORS.textMuted}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.helperText}>{t.memberEmptySpots}</Text>
                )}
              </View>
            ) : null}

            {/* TAB 3: CARE REMINDERS & WEATHER-TRIGGERED GEAR (TIER 2) */}
            {activeTab === 'care' ? (
              <>
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>
                    {t.memberRemindersTitle} ({careReminders.length}/
                    {MAX_CARE_REMINDERS})
                  </Text>
                  <Text style={styles.helperText}>{t.memberRemindersSub}</Text>

                  {careReminders.length < MAX_CARE_REMINDERS ? (
                    <View style={styles.formStack}>
                      <View style={styles.chipWrap}>
                        {(
                          [
                            { key: 'rego', label: t.memberReminderTypeRego },
                            {
                              key: 'rabies',
                              label: t.memberReminderTypeRabies,
                            },
                            {
                              key: 'flea_tick',
                              label: t.memberReminderTypeFlea,
                            },
                            {
                              key: 'grooming',
                              label: t.memberReminderTypeGrooming,
                            },
                            {
                              key: 'custom',
                              label: t.memberReminderTypeCustom,
                            },
                          ] as Array<{
                            key: CareReminderType;
                            label: string;
                          }>
                        ).map((rt) => (
                          <Pressable
                            key={rt.key}
                            onPress={() => setRemType(rt.key)}
                            style={[
                              styles.choiceChip,
                              remType === rt.key && styles.choiceChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceChipText,
                                remType === rt.key &&
                                  styles.choiceChipTextActive,
                              ]}
                            >
                              {rt.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <TextInput
                        value={remTitleDraft}
                        onChangeText={setRemTitleDraft}
                        placeholder={t.memberReminderTitlePlaceholder}
                        placeholderTextColor={COLORS.textMuted}
                        maxLength={50}
                        style={styles.textInput}
                      />

                      <View style={styles.inlineInputRow}>
                        <TextInput
                          value={remDateDraft}
                          onChangeText={setRemDateDraft}
                          placeholder={t.memberReminderDatePlaceholder}
                          placeholderTextColor={COLORS.textMuted}
                          maxLength={10}
                          style={[styles.textInput, styles.flexInput]}
                        />
                        <Pressable
                          onPress={handleAddReminder}
                          style={styles.smallPrimaryPill}
                        >
                          <Text style={styles.smallPrimaryPillText}>
                            {t.memberReminderAddBtn}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.chipWrap}>
                        {(
                          [
                            { key: 0, label: t.memberReminderRepeatOnce },
                            { key: 1, label: t.memberReminderRepeatMonthly },
                            { key: 3, label: t.memberReminderRepeatQuarterly },
                            { key: 12, label: t.memberReminderRepeatYearly },
                          ] as Array<{
                            key: CareReminder['repeatMonths'];
                            label: string;
                          }>
                        ).map((rp) => (
                          <Pressable
                            key={rp.key}
                            onPress={() => setRemRepeat(rp.key)}
                            style={[
                              styles.choiceChip,
                              remRepeat === rp.key && styles.choiceChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceChipText,
                                remRepeat === rp.key &&
                                  styles.choiceChipTextActive,
                              ]}
                            >
                              {rp.label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {careReminders.length > 0 ? (
                    <View style={styles.listGap}>
                      {careReminders.map((rem) => {
                        const days = daysUntilIsoDate(rem.dueDateIso);
                        const isOverdue = days < 0;
                        const isSoon = days >= 0 && days <= 14;
                        const badgeText = isOverdue
                          ? t.memberReminderOverdue
                          : days === 0
                            ? t.memberReminderDueToday
                            : t.memberReminderDueInDays(
                                formatInteger(days, loc)
                              );
                        return (
                          <View key={rem.id} style={styles.listItemRow}>
                            <View style={styles.listItemMain}>
                              <Text
                                style={styles.listItemTitle}
                                numberOfLines={1}
                              >
                                {rem.title}
                              </Text>
                              <Text style={styles.listItemSub}>
                                {rem.dogName} · {rem.dueDateIso}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.dueBadge,
                                isOverdue
                                  ? styles.dueBadgeOverdue
                                  : isSoon
                                    ? styles.dueBadgeSoon
                                    : null,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.dueBadgeText,
                                  isOverdue
                                    ? styles.dueBadgeTextOverdue
                                    : isSoon
                                      ? styles.dueBadgeTextSoon
                                      : null,
                                ]}
                              >
                                {badgeText}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => completeCareReminder(rem.id)}
                              style={styles.smallOutlinePill}
                            >
                              <Text style={styles.smallOutlinePillText}>
                                {t.memberReminderRenewDone}
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => removeCareReminder(rem.id)}
                              hitSlop={6}
                            >
                              <UiIcon
                                name="close"
                                size={14}
                                color={COLORS.textMuted}
                              />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.helperText}>
                      {t.memberEmptyReminders}
                    </Text>
                  )}
                </View>

                {/* Weather-Triggered Gear Checklist */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionLabel}>
                    {t.memberGearTitle} ({gearChecklist.length}/{MAX_GEAR_ITEMS}
                    )
                  </Text>
                  <Text style={styles.helperText}>{t.memberGearSub}</Text>

                  {gearChecklist.length < MAX_GEAR_ITEMS ? (
                    <View style={styles.formStack}>
                      <View style={styles.inlineInputRow}>
                        <TextInput
                          value={gearLabelDraft}
                          onChangeText={setGearLabelDraft}
                          placeholder={t.memberGearAddPlaceholder}
                          placeholderTextColor={COLORS.textMuted}
                          maxLength={40}
                          style={[styles.textInput, styles.flexInput]}
                        />
                        <Pressable
                          onPress={() => {
                            if (addGearItem(gearLabelDraft, gearTrigger)) {
                              setGearLabelDraft('');
                            }
                          }}
                          style={styles.smallPrimaryPill}
                        >
                          <Text style={styles.smallPrimaryPillText}>
                            {t.memberGearAddBtn}
                          </Text>
                        </Pressable>
                      </View>
                      <View style={styles.chipWrap}>
                        {(
                          [
                            'always',
                            'hot_paws',
                            'rain',
                            'night',
                            'license',
                          ] as GearTrigger[]
                        ).map((tr) => (
                          <Pressable
                            key={tr}
                            onPress={() => setGearTrigger(tr)}
                            style={[
                              styles.choiceChip,
                              gearTrigger === tr && styles.choiceChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceChipText,
                                gearTrigger === tr &&
                                  styles.choiceChipTextActive,
                              ]}
                            >
                              {triggerLabel(tr)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.listGap}>
                    {gearChecklist.map((item) => (
                      <View key={item.id} style={styles.listItemRow}>
                        <Pressable
                          onPress={() => toggleGearItem(item.id)}
                          style={styles.gearToggleMain}
                        >
                          <View
                            style={[
                              styles.checkboxBox,
                              item.checked && styles.checkboxBoxChecked,
                            ]}
                          >
                            {item.checked ? (
                              <UiIcon name="check" size={12} color="#FFFFFF" />
                            ) : null}
                          </View>
                          <Text
                            style={[
                              styles.listItemTitle,
                              item.checked && styles.gearCheckedText,
                            ]}
                            numberOfLines={1}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                        <View style={styles.triggerTag}>
                          <Text style={styles.triggerTagText}>
                            {triggerLabel(item.trigger)}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => removeGearItem(item.id)}
                          hitSlop={6}
                        >
                          <UiIcon
                            name="close"
                            size={14}
                            color={COLORS.textMuted}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : null}

            {/* TAB 4: HOUSEHOLD / CO-WALKER SHARING (TIER 2) */}
            {activeTab === 'household' ? (
              <View style={styles.sectionBox}>
                <Text style={styles.sectionLabel}>
                  {t.memberHouseholdTitle}
                </Text>
                <Text style={styles.helperText}>{t.memberHouseholdSub}</Text>

                {!user ? (
                  <View style={styles.formStack}>
                    <Text style={styles.helperText}>
                      {t.memberHouseholdSignInNeeded}
                    </Text>
                    {onOpenAuthSignIn ? (
                      <Pressable
                        onPress={() => {
                          onClose();
                          onOpenAuthSignIn();
                        }}
                        style={styles.fullPrimaryBtn}
                      >
                        <Text style={styles.fullPrimaryBtnText}>
                          {t.accountSignInCta}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : !householdId ? (
                  <View style={styles.formStack}>
                    <Pressable
                      disabled={householdBusy}
                      onPress={async () => {
                        setHouseholdBusy(true);
                        setHouseholdError(null);
                        try {
                          const res = await startHouseholdShare();
                          if (!res.ok) {
                            setHouseholdError(t.memberHouseholdActionFailed);
                          }
                        } finally {
                          setHouseholdBusy(false);
                        }
                      }}
                      style={styles.fullPrimaryBtn}
                    >
                      <Text style={styles.fullPrimaryBtnText}>
                        {householdBusy
                          ? t.authWorkingStatus
                          : t.memberHouseholdCreateBtn}
                      </Text>
                    </Pressable>

                    <Text style={styles.subFieldLabel}>
                      {t.memberHouseholdJoinLabel}
                    </Text>
                    <View style={styles.inlineInputRow}>
                      <TextInput
                        value={joinCodeDraft}
                        onChangeText={setJoinCodeDraft}
                        placeholder={t.memberHouseholdJoinPlaceholder}
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={80}
                        style={[styles.textInput, styles.flexInput]}
                      />
                      <Pressable
                        disabled={householdBusy || !joinCodeDraft.trim()}
                        onPress={async () => {
                          setHouseholdBusy(true);
                          setHouseholdError(null);
                          try {
                            const ok = await joinHouseholdByCode(joinCodeDraft);
                            if (ok) {
                              setJoinCodeDraft('');
                            } else {
                              setHouseholdError(t.memberHouseholdJoinFailed);
                            }
                          } finally {
                            setHouseholdBusy(false);
                          }
                        }}
                        style={styles.smallPrimaryPill}
                      >
                        <Text style={styles.smallPrimaryPillText}>
                          {t.memberHouseholdJoinBtn}
                        </Text>
                      </Pressable>
                    </View>
                    {householdError ? (
                      <Text style={styles.errorInline}>{householdError}</Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.formStack}>
                    <Text style={styles.subFieldLabel}>
                      {t.memberHouseholdMembersLabel}
                    </Text>
                    <View style={styles.listGap}>
                      {(household?.members || []).map((m) => (
                        <View key={m.uid} style={styles.listItemRow}>
                          <Text style={styles.listItemTitle}>
                            {m.displayName}
                          </Text>
                          {m.isOwner ? (
                            <View style={styles.triggerTag}>
                              <Text style={styles.triggerTagText}>
                                {t.memberHouseholdOwnerTag}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>

                    {household?.ownerUid === user.uid ? (
                      <View style={styles.inviteBox}>
                        <Text style={styles.subFieldLabel}>
                          {t.memberHouseholdInviteCodeLabel}
                        </Text>
                        {household.activeInviteToken ? (
                          <Text selectable style={styles.inviteCodeText}>
                            {household.activeInviteToken}
                          </Text>
                        ) : null}
                        <View style={styles.inlineBtnsRow}>
                          {household.activeInviteToken ? (
                            <Pressable
                              onPress={() =>
                                handleCopyInviteCode(
                                  household.activeInviteToken || ''
                                )
                              }
                              style={styles.smallPrimaryPill}
                            >
                              <Text style={styles.smallPrimaryPillText}>
                                {copiedInvite
                                  ? t.memberHouseholdCopiedCode
                                  : t.memberHouseholdCopyCode}
                              </Text>
                            </Pressable>
                          ) : null}
                          <Pressable
                            disabled={householdBusy}
                            onPress={async () => {
                              setHouseholdBusy(true);
                              setHouseholdError(null);
                              try {
                                const token = await regenerateHouseholdInvite(
                                  memberProfile.displayName ||
                                    user.displayName ||
                                    'Owner'
                                );
                                if (!token) {
                                  setHouseholdError(
                                    t.memberHouseholdActionFailed
                                  );
                                }
                              } finally {
                                setHouseholdBusy(false);
                              }
                            }}
                            style={styles.smallOutlinePill}
                          >
                            <Text style={styles.smallOutlinePillText}>
                              {t.memberHouseholdNewCode}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}

                    <View style={styles.inlineBtnsRow}>
                      <Pressable
                        onPress={() => {
                          syncCloudNow().catch(() => {});
                        }}
                        style={styles.smallPrimaryPill}
                      >
                        <Text style={styles.smallPrimaryPillText}>
                          {t.memberHouseholdSyncBtn}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={householdBusy}
                        onPress={async () => {
                          setHouseholdBusy(true);
                          setHouseholdError(null);
                          try {
                            const ok = await leaveCurrentHousehold();
                            if (!ok) {
                              setHouseholdError(t.memberHouseholdActionFailed);
                            }
                          } finally {
                            setHouseholdBusy(false);
                          }
                        }}
                        style={styles.smallDangerPill}
                      >
                        <Text style={styles.smallDangerPillText}>
                          {household?.ownerUid === user.uid
                            ? t.memberHouseholdDisbandBtn
                            : t.memberHouseholdLeaveBtn}
                        </Text>
                      </Pressable>
                    </View>

                    {householdError ? (
                      <Text style={styles.errorInline}>{householdError}</Text>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 28, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissArea: {
    width: '100%',
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
    maxHeight: '90%',
    gap: 11,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  doneBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 6.5,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  doneBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabPillActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabPillTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 14,
  },
  sectionBox: {
    backgroundColor: COLORS.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 13,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subFieldLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  helperText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    lineHeight: 17.5,
    color: COLORS.textSecondary,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  memberAvatarInitial: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  avatarBtnCol: {
    flex: 1,
    gap: 5,
  },
  inlineBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    alignItems: 'center',
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  flexInput: {
    flex: 1,
  },
  textInput: {
    fontFamily: UI_FONT_FAMILY,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  smallPrimaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallPrimaryPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  smallOutlinePill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  smallOutlinePillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  smallDangerPill: {
    backgroundColor: COLORS.avoidBg,
    borderWidth: 1,
    borderColor: COLORS.avoidBorder,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  smallDangerPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.avoidText,
  },
  fullPrimaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 13,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  fullPrimaryBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  formStack: {
    gap: 8,
  },
  listGap: {
    gap: 7,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  listItemMain: {
    flex: 1,
    gap: 2,
  },
  listItemTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  listItemSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  stepperGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 9,
    alignItems: 'center',
    gap: 6,
  },
  stepperLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  stepValue: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 44,
    textAlign: 'center',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  choiceChipActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  choiceChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  choiceChipTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  dueBadge: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dueBadgeSoon: {
    backgroundColor: COLORS.cautionBg,
  },
  dueBadgeOverdue: {
    backgroundColor: COLORS.avoidBg,
  },
  dueBadgeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  dueBadgeTextSoon: {
    color: COLORS.cautionText,
  },
  dueBadgeTextOverdue: {
    color: COLORS.avoidText,
  },
  gearToggleMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  gearCheckedText: {
    color: COLORS.textSecondary,
  },
  triggerTag: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  triggerTagText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  inviteBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    padding: 11,
    gap: 8,
  },
  inviteCodeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandDark,
    backgroundColor: COLORS.background,
    padding: 8,
    borderRadius: 8,
  },
  errorInline: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.avoidText,
  },
});
