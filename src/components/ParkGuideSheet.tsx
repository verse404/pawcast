import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Linking,
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
import { detectActiveRegion } from '../constants/auSuburbs';
import { useWalkPlanner } from '../context/WalkPlannerContext';
import {
  formatClockTime,
  formatDistance,
  formatDriveMinutes,
  formatInteger,
  formatTemperature,
  formatWalkMinutes,
  isWalkableSpotDistance,
} from '../i18n/formatters';
import { QUALITY_TIER_LABELS } from '../i18n/messages';
import {
  getLocaleTag,
  getQualityTierLabel,
  getStrings,
} from '../i18n/translations';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import { ScoredPlace } from '../types/walk';
import { buildShareableSpotUrl } from '../utils/deepLinks';
import { getSimpleSpotTag, getSpotInsiderGuide } from '../utils/spotGuide';
import { buildSafeDirectionsUrl } from '../utils/validation';
import { ParkScenicBadge, UiIcon } from './UiIcons';

interface ParkGuideSheetProps {
  spot: ScoredPlace | null;
  rankIndex?: number;
  visible: boolean;
  onClose: () => void;
  onShowOnMap?: (placeId: string) => void;
}

export const ParkGuideSheet: React.FC<ParkGuideSheetProps> = ({
  spot,
  rankIndex = 0,
  visible,
  onClose,
  onShowOnMap,
}) => {
  const {
    dog,
    units,
    language,
    location,
    selectedHour,
    selectedHourIndex,
    savedPlaceIds,
    toggleSavedPlace,
    spotNotes,
    setSpotNote,
    logWalk,
    memberPreferences,
  } = useWalkPlanner();
  const t = getStrings(language);
  const loc = getLocaleTag(language);

  const [showInvitePreview, setShowInvitePreview] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [loggedHere, setLoggedHere] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setShowInvitePreview(false);
    setCopiedInvite(false);
    setLoggedHere(false);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, [spot?.place.id, visible]);

  const tz = location.timezone === 'auto' ? undefined : location.timezone;

  const guide = useMemo(() => {
    if (!spot) return null;
    return getSpotInsiderGuide(spot, selectedHour, dog, units, language);
  }, [spot, selectedHour, dog, units, language]);

  if (!spot || !guide) {
    return null;
  }

  const tag = getSimpleSpotTag(spot, rankIndex, selectedHour, language);
  const isSaved = savedPlaceIds.includes(spot.place.id);
  const walkable = isWalkableSpotDistance(spot.place.distanceKm);
  const travelMode: 'walking' | 'driving' = walkable ? 'walking' : 'driving';
  const travelEstimate = walkable
    ? formatWalkMinutes(spot.place.distanceKm, loc)
    : `~${formatDriveMinutes(spot.place.distanceKm, loc)}`;

  const resolvedMapsApp =
    memberPreferences.preferredMapsApp === 'auto'
      ? Platform.OS === 'ios'
        ? 'apple'
        : 'google'
      : memberPreferences.preferredMapsApp;

  const mapsProviderLabel =
    resolvedMapsApp === 'amap'
      ? `${t.mapsAppAmap} ↗`
      : resolvedMapsApp === 'apple'
        ? `${t.mapsAppApple} ↗`
        : `${t.mapsAppGoogle} ↗`;

  const handleOpenGateDirections = () => {
    const url = buildSafeDirectionsUrl(
      guide.gateLatitude,
      guide.gateLongitude,
      `${guide.englishTitle} (${guide.gateLabel})`,
      memberPreferences.preferredMapsApp,
      travelMode,
      Platform.OS === 'ios'
    );
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const activeTimeText =
    selectedHour && selectedHourIndex > 0
      ? formatClockTime(selectedHour.weather.epochMs, tz, loc)
      : t.rightNowLabel;

  const activeRegion = detectActiveRegion(location.latitude, location.longitude);
  const isShanghai = activeRegion === 'shanghai';
  const shareableUrl = buildShareableSpotUrl(spot.place.id);

  const customSignatureLine = memberPreferences.inviteSignature.trim()
    ? [`💬 ${memberPreferences.inviteSignature.trim()}`]
    : [];

  const inviteCardText =
    language === 'zh'
      ? [
          '🐾 PawCast 约遛邀请',
          `📍 地点：${guide.englishTitle}`,
          `🚪 入口：${guide.gateLabel}`,
          `🕒 时间：${activeTimeText}${
            selectedHour
              ? `（${formatTemperature(selectedHour.weather.tempC, units, loc)} · ${getQualityTierLabel(selectedHour.qualityTier, QUALITY_TIER_LABELS[selectedHour.qualityTier], language)}）`
              : ''
          }`,
          `🐕 狗狗：${dog.name} · ${
            spot.place.category === 'dog_beach'
              ? '狗狗海滩'
              : spot.place.leashPolicy === 'off_leash_fenced'
                ? '围栏狗公园'
                : spot.place.leashPolicy === 'off_leash_unfenced'
                  ? '开放式可松绳草坪'
                  : '牵绳漫步'
          }`,
          ...customSignatureLine,
          ...(shareableUrl ? [`🔗 ${shareableUrl}`] : []),
        ].join('\n')
      : isShanghai
        ? [
            '🐾 PawCast 约遛邀请 · Dog Walk Meet-Up',
            `📍 ${spot.place.name}`,
            `🚪 Gate: ${guide.gateLabel}`,
            `🕒 ${activeTimeText}${
              selectedHour
                ? ` (${formatTemperature(selectedHour.weather.tempC, units)} · ${QUALITY_TIER_LABELS[selectedHour.qualityTier]})`
                : ''
            }`,
            `🐕 Buddy: ${dog.name} · ${
              spot.place.leashPolicy === 'off_leash_fenced'
                ? 'Fenced Off-Leash'
                : 'Leashed Walk'
            }`,
            ...customSignatureLine,
            ...(shareableUrl ? [`🔗 ${shareableUrl}`] : []),
          ].join('\n')
        : [
            `🐾 PawCast Walk Meet-Up (${
              activeRegion === 'melbourne'
                ? 'Melbourne'
                : activeRegion === 'sydney'
                  ? 'Sydney'
                  : location.name
            })`,
            `📍 ${guide.englishTitle}`,
            `🅿️ Entry: ${guide.gateLabel}`,
            `🕒 ${activeTimeText}${
              selectedHour
                ? ` (${formatTemperature(selectedHour.weather.tempC, units)} · UV ${formatInteger(selectedHour.weather.uvIndex)} · ${QUALITY_TIER_LABELS[selectedHour.qualityTier]})`
                : ''
            }`,
            `🐕 Mate: ${dog.name} · ${
              spot.place.category === 'dog_beach'
                ? 'Off-Leash Dog Beach'
                : spot.place.leashPolicy === 'off_leash_fenced'
                  ? 'Fenced Dog Park'
                  : spot.place.leashPolicy === 'off_leash_unfenced'
                    ? 'Council Off-Leash Reserve'
                    : 'On-Leash Walk'
            }`,
            ...customSignatureLine,
            ...(shareableUrl ? [`🔗 ${shareableUrl}`] : []),
          ].join('\n');

  const handleShareWeChat = async () => {
    setShowInvitePreview(true);
    if (Platform.OS === 'web') {
      const nav = (globalThis as Record<string, unknown>).navigator as
        | { clipboard?: { writeText: (t: string) => Promise<void> } }
        | undefined;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(inviteCardText).catch(() => {});
      }
      setCopiedInvite(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedInvite(false);
        copyTimerRef.current = null;
      }, 2000);
      return;
    }
    try {
      await Share.share({ message: inviteCardText });
    } catch {
      // User dismissed native share sheet safely
    }
  };

  const tagToneStyle =
    tag.tone === 'hero'
      ? styles.tagHero
      : tag.tone === 'warn'
        ? styles.tagWarn
        : tag.tone === 'muted'
          ? styles.tagMuted
          : styles.tagGood;

  const tagTextStyle =
    tag.tone === 'hero'
      ? styles.tagTextHero
      : tag.tone === 'warn'
        ? styles.tagTextWarn
        : tag.tone === 'muted'
          ? styles.tagTextMuted
          : styles.tagTextGood;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      aria-label={`${guide.englishTitle} local guide`}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismissArea} onPress={onClose} />

        <View style={[styles.sheetContainer, ELEVATION.floating]}>
          <View style={styles.grabHandle} />

          {/* 1. Header: Scenic Emblem + Park Title + Save & Close */}
          <View style={styles.headerRow}>
            <ParkScenicBadge
              category={spot.place.category}
              spotId={spot.place.id}
              photoUrl={spot.place.photoUrl}
              size={60}
              rankBadge={rankIndex === 0 ? 1 : null}
            />

            <View style={styles.headerTitleCol}>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.titleText}>{guide.englishTitle}</Text>
                <View style={[styles.tagPill, tagToneStyle]}>
                  <Text style={[styles.tagText, tagTextStyle]}>{tag.label}</Text>
                </View>
              </View>
              <View style={styles.subtitleRow}>
                <UiIcon
                  name={walkable ? 'walk' : 'car'}
                  size={13}
                  color={COLORS.brand}
                />
                <Text style={styles.subtitleText} numberOfLines={1}>
                  {guide.localSubtitle} · {travelEstimate} (
                  {formatDistance(spot.place.distanceKm, units, loc)})
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  if (loggedHere) return;
                  const cityLabel =
                    activeRegion === 'melbourne'
                      ? 'Melbourne'
                      : activeRegion === 'sydney'
                        ? 'Sydney'
                        : activeRegion === 'shanghai'
                          ? 'Shanghai'
                          : location.name.split(' · ')[0] || 'Local';
                  const estKm = walkable
                    ? Math.max(1.0, Math.round(spot.place.distanceKm * 2 * 10) / 10)
                    : 2.0;
                  logWalk({
                    placeId: spot.place.id,
                    placeName: guide.englishTitle,
                    cityLabel,
                    durationMin: walkable
                      ? Math.max(15, Math.round((estKm / 4.5) * 60))
                      : 30,
                    distanceKm: estKm,
                  });
                  setLoggedHere(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  loggedHere
                    ? `Walk logged at ${guide.englishTitle}`
                    : `Log a walk at ${guide.englishTitle}`
                }
                style={[
                  styles.iconCircleBtn,
                  loggedHere && styles.iconCircleLogged,
                ]}
              >
                <UiIcon
                  name={loggedHere ? 'check' : 'paw'}
                  size={16}
                  color={loggedHere ? COLORS.brandDark : COLORS.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={() => toggleSavedPlace(spot.place.id)}
                accessibilityRole="button"
                accessibilityLabel={isSaved ? 'Remove from saved' : 'Save park'}
                style={[styles.iconCircleBtn, isSaved && styles.iconCircleSaved]}
              >
                <UiIcon
                  name={isSaved ? 'heart' : 'heartOutline'}
                  size={17}
                  color={isSaved ? COLORS.heartAccent : COLORS.textSecondary}
                />
              </Pressable>

              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close park guide"
                style={styles.iconCircleBtn}
              >
                <UiIcon name="close" size={17} color={COLORS.textSecondary} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 2. Direct Gate & Map Action Buttons */}
            <View style={styles.gateActionGroup}>
              <Pressable
                onPress={handleOpenGateDirections}
                style={({ pressed }) => [
                  styles.directGateBtn,
                  ELEVATION.cardHero,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.directGateIconBadge}>
                  <UiIcon name="pin" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.directGateTextCol}>
                  <Text style={styles.directGateEyebrow}>
                    {t.exactDogEntrance}
                  </Text>
                  <Text style={styles.directGateLabel} numberOfLines={2}>
                    {guide.gateLabel}
                  </Text>
                </View>
                <View style={styles.mapsCtaChip}>
                  <Text style={styles.mapsCtaChipText}>
                    {mapsProviderLabel}
                  </Text>
                </View>
              </Pressable>

              {onShowOnMap ? (
                <Pressable
                  onPress={() => {
                    onClose();
                    onShowOnMap(spot.place.id);
                  }}
                  style={({ pressed }) => [
                    styles.previewOnMapBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.previewMapLeft}>
                    <UiIcon name="map" size={16} color={COLORS.brand} />
                    <Text style={styles.previewOnMapText}>
                      {t.previewTrailOnMap}
                    </Text>
                  </View>
                  <UiIcon
                    name="chevronRight"
                    size={16}
                    color={COLORS.brandDark}
                  />
                </Pressable>
              ) : null}
            </View>

            {/* 3. Unified Local Insider Guide Panel with Tinted Icon Badges */}
            <View style={styles.insiderPanel}>
              <View style={styles.insiderRow}>
                <View
                  style={[
                    styles.insiderIconTile,
                    { backgroundColor: COLORS.brandLight },
                  ]}
                >
                  <UiIcon name="paw" size={16} color={COLORS.brandDark} />
                </View>
                <View style={styles.insiderTextCol}>
                  <Text style={styles.insiderCardTitle}>
                    {t.groundAndRulesNow}
                  </Text>
                  <Text style={styles.insiderCardBody}>
                    {guide.footingAndRulesNow}
                  </Text>
                </View>
              </View>

              <View style={styles.insiderDivider} />

              <View style={styles.insiderRow}>
                <View
                  style={[
                    styles.insiderIconTile,
                    { backgroundColor: COLORS.goldenBg },
                  ]}
                >
                  <UiIcon name="cafe" size={16} color={COLORS.goldenText} />
                </View>
                <View style={styles.insiderTextCol}>
                  <Text style={styles.insiderCardTitle}>
                    {t.dogPerksNearby}
                  </Text>
                  <Text style={styles.insiderCardBody}>
                    {guide.perksNearby}
                  </Text>
                </View>
              </View>

              <View style={styles.insiderDivider} />

              <View style={styles.insiderRow}>
                <View
                  style={[
                    styles.insiderIconTile,
                    { backgroundColor: COLORS.cautionBg },
                  ]}
                >
                  <UiIcon name="warning" size={16} color={COLORS.cautionText} />
                </View>
                <View style={styles.insiderTextCol}>
                  <Text style={styles.insiderCardTitle}>{t.localHeadsUp}</Text>
                  <Text style={styles.insiderCardBody}>
                    {guide.localHeadsUp}
                  </Text>
                </View>
              </View>
            </View>

            {/* 4. Editable Personal Note */}
            <View style={styles.noteInputRow}>
              <UiIcon name="edit" size={15} color={COLORS.brand} />
              <TextInput
                value={spotNotes[spot.place.id] ?? ''}
                onChangeText={(txt) => setSpotNote(spot.place.id, txt)}
                placeholder={t.addPrivateNotePlaceholder(dog.name)}
                placeholderTextColor={COLORS.textMuted}
                maxLength={100}
                style={styles.noteInput}
              />
            </View>

            {/* Optional Expandable Walk Invite Card Preview */}
            {showInvitePreview ? (
              <View style={styles.wechatCardBox}>
                <View style={styles.wechatCardHeader}>
                  <Text style={styles.wechatCardHeaderTitle}>
                    {isShanghai || language === 'zh'
                      ? t.inviteCardReadyZh
                      : t.inviteCardReadyEn}
                  </Text>
                  <Pressable onPress={() => setShowInvitePreview(false)}>
                    <Text style={styles.wechatCardClose}>{t.hideBtn}</Text>
                  </Pressable>
                </View>
                <Text selectable style={styles.wechatCardText}>
                  {inviteCardText}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* 5. Sticky Bottom Action Row */}
          <View style={styles.bottomCtaRow}>
            <Pressable
              onPress={handleOpenGateDirections}
              style={({ pressed }) => [
                styles.primaryGateCta,
                pressed && styles.pressed,
              ]}
            >
              <UiIcon name="navigate" size={15} color="#FFFFFF" />
              <Text style={styles.primaryGateCtaText}>
                {walkable ? t.walkToGate : t.driveToGate}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleShareWeChat}
              style={({ pressed }) => [
                styles.wechatCta,
                pressed && styles.pressed,
              ]}
            >
              <UiIcon
                name={copiedInvite ? 'check' : 'chat'}
                size={15}
                color={COLORS.brandDark}
              />
              <Text style={styles.wechatCtaText}>
                {copiedInvite
                  ? t.copiedInvite
                  : isShanghai || language === 'zh'
                    ? t.wechatMeetUp
                    : t.shareWalkInvite}
              </Text>
            </Pressable>
          </View>
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
  sheetContainer: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 13,
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
    gap: 11,
  },
  headerTitleCol: {
    flex: 1,
    gap: 4,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  titleText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subtitleText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tagPill: {
    paddingVertical: 3,
    paddingHorizontal: 8.5,
    borderRadius: 999,
  },
  tagHero: {
    backgroundColor: COLORS.brand,
  },
  tagGood: {
    backgroundColor: COLORS.brandLight,
  },
  tagWarn: {
    backgroundColor: COLORS.cautionBg,
  },
  tagMuted: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  tagText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
  },
  tagTextHero: {
    color: '#FFFFFF',
  },
  tagTextGood: {
    color: COLORS.brandDark,
  },
  tagTextWarn: {
    color: COLORS.cautionText,
  },
  tagTextMuted: {
    color: COLORS.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircleBtn: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSaved: {
    backgroundColor: COLORS.heartBg,
    borderColor: '#F9B4C0',
  },
  iconCircleLogged: {
    backgroundColor: COLORS.brandLight,
    borderColor: '#A7DEC4',
  },
  scrollBody: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 11,
    paddingBottom: 4,
  },
  gateActionGroup: {
    gap: 8,
  },
  directGateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.brand,
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 13,
  },
  directGateIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directGateTextCol: {
    flex: 1,
    gap: 2,
  },
  directGateEyebrow: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#BCEBD6',
  },
  directGateLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapsCtaChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 11,
  },
  mapsCtaChipText: {
    fontFamily: UI_FONT_FAMILY,
    color: COLORS.brandDark,
    fontSize: 12,
    fontWeight: '800',
  },
  previewOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },
  previewMapLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  previewOnMapText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  insiderPanel: {
    backgroundColor: COLORS.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  insiderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
  },
  insiderDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  insiderIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  insiderTextCol: {
    flex: 1,
    gap: 2,
  },
  insiderCardTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  insiderCardBody: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    lineHeight: 17.5,
    color: COLORS.textSecondary,
  },
  noteInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  noteInput: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    paddingVertical: 2,
  },
  wechatCardBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 11,
    gap: 5,
  },
  wechatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wechatCardHeaderTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  wechatCardClose: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  wechatCardText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textPrimary,
  },
  bottomCtaRow: {
    flexDirection: 'row',
    gap: 9,
    paddingTop: 2,
  },
  primaryGateCta: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 14,
    paddingVertical: 12.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryGateCtaText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  wechatCta: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1,
    borderColor: '#B3E3CD',
    borderRadius: 14,
    paddingVertical: 12.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wechatCtaText: {
    fontFamily: UI_FONT_FAMILY,
    color: COLORS.brandDark,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
});
