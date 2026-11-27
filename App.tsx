import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { DogAvatar } from './src/components/DogAvatar';
import { DogProfileScreen } from './src/components/DogProfileScreen';
import { ExploreMapScreen } from './src/components/ExploreMapScreen';
import { LocationModal } from './src/components/LocationModal';
import { PhotoMapScreen } from './src/components/PhotoMapScreen';
import { UiIcon } from './src/components/UiIcons';
import { WalkNowScreen } from './src/components/WalkNowScreen';
import { AuthProvider } from './src/context/AuthContext';
import {
  useWalkPlanner,
  WalkPlannerProvider,
} from './src/context/WalkPlannerContext';
import { MESSAGES } from './src/i18n/messages';
import { getStrings } from './src/i18n/translations';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from './src/theme/colors';
import { LoopDurationMinutes } from './src/types/walk';

type TabKey = 'walk' | 'map' | 'photos' | 'dog';

const MainShell: React.FC = () => {
  const {
    location,
    dog,
    units,
    toggleUnits,
    language,
    toggleLanguage,
    pendingDeepLinkSpotId,
    clearPendingDeepLinkSpot,
  } = useWalkPlanner();
  const t = getStrings(language);
  const { width, height } = useWindowDimensions();

  const [activeTab, setActiveTab] = useState<TabKey>('walk');
  const [focusedMapPlaceId, setFocusedMapPlaceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!pendingDeepLinkSpotId) return;
    setPreviewLoopDuration(null);
    setFocusedMapPlaceId(pendingDeepLinkSpotId);
    setActiveTab('map');
    clearPendingDeepLinkSpot();
  }, [pendingDeepLinkSpotId, clearPendingDeepLinkSpot]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const doc = (globalThis as {
      document?: {
        title?: string;
        documentElement?: { lang?: string };
      };
    }).document;
    if (!doc) return;
    if (doc.documentElement) {
      doc.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    }
    doc.title = `${MESSAGES.appTitle} · ${t.appSubtitle}`;
  }, [language, t.appSubtitle]);
  const [previewLoopDuration, setPreviewLoopDuration] =
    useState<LoopDurationMinutes | null>(null);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [autoLocateOnModalOpen, setAutoLocateOnModalOpen] = useState(false);
  const [usePhoneFrame, setUsePhoneFrame] = useState(true);

  const isWideWeb = Platform.OS === 'web' && width >= 640;
  const framedOnDesktop = isWideWeb && usePhoneFrame;

  const shellContent = (
    <SafeAreaView style={styles.appSurface} edges={['top', 'bottom']}>
      {/* Refined Botanical Header */}
      <View role="banner" style={styles.topHeader}>
        <View style={styles.brandBlock}>
          <View style={styles.brandTitleGroup}>
            <View style={styles.brandMarkSquircle}>
              <UiIcon name="paw" size={16} color="#FFFFFF" />
            </View>
            <Text
              accessibilityRole="header"
              aria-level={1}
              style={styles.appTitle}
            >
              {MESSAGES.appTitle}
            </Text>
          </View>

          <Pressable
            onPress={() => setLocationModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Walk area: ${location.name}`}
            style={({ pressed }) => [
              styles.locationPill,
              !framedOnDesktop && isWideWeb && styles.locationPillWide,
              pressed && styles.pressed,
            ]}
          >
            <UiIcon
              name={location.isCurrentDeviceLocation ? 'gps' : 'pin'}
              size={14}
              color={COLORS.brand}
            />
            <Text style={styles.locationPillText} numberOfLines={1}>
              {location.name}
            </Text>
            <UiIcon
              name="chevronDown"
              size={15}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.headerRightGroup}>
          <Pressable
            onPress={toggleLanguage}
            accessibilityRole="button"
            accessibilityLabel={
              language === 'zh'
                ? 'Switch language to English'
                : '切换语言为简体中文'
            }
            style={({ pressed }) => [
              styles.langHeaderPill,
              language === 'zh' && styles.langHeaderPillActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.langHeaderText,
                language === 'zh' && styles.langHeaderTextActive,
              ]}
            >
              {language === 'zh' ? 'EN' : '中文'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('dog')}
            accessibilityRole="button"
            accessibilityLabel={`Open ${dog.name} profile`}
            style={({ pressed }) => [
              styles.dogHeaderChip,
              activeTab === 'dog' && styles.dogHeaderChipActive,
              pressed && styles.pressed,
            ]}
          >
            <DogAvatar
              breedId={dog.breedId}
              customUri={dog.customPhotoUri}
              size={24}
            />
            <Text style={styles.dogHeaderName} numberOfLines={1}>
              {dog.name}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Active Version 2 Tab Body */}
      <View role="main" style={styles.screenBody}>
        {activeTab === 'walk' ? (
          <WalkNowScreen
            onOpenMapSpot={(placeId) => {
              setPreviewLoopDuration(null);
              setFocusedMapPlaceId(placeId);
              setActiveTab('map');
            }}
            onOpenFullMap={() => {
              setPreviewLoopDuration(null);
              setActiveTab('map');
            }}
            onPreviewLoopOnMap={(duration) => {
              setPreviewLoopDuration(duration);
              setActiveTab('map');
            }}
            onOpenGpsSuburbLocator={() => {
              setAutoLocateOnModalOpen(true);
              setLocationModalOpen(true);
            }}
          />
        ) : null}

        {activeTab === 'map' ? (
          <ExploreMapScreen
            focusedPlaceId={focusedMapPlaceId}
            previewLoopDuration={previewLoopDuration}
            onClearLoopPreview={() => setPreviewLoopDuration(null)}
            onOpenLocationPicker={() => setLocationModalOpen(true)}
          />
        ) : null}

        {activeTab === 'photos' ? <PhotoMapScreen /> : null}

        {activeTab === 'dog' ? (
          <DogProfileScreen
            onShowSpotOnMap={(placeId) => {
              setPreviewLoopDuration(null);
              setFocusedMapPlaceId(placeId);
              setActiveTab('map');
            }}
          />
        ) : null}
      </View>

      {/* Sculpted Bottom Tab Dock (Walk Now · Map · Pudding) */}
      <View
        role="navigation"
        aria-label="Primary navigation"
        style={[styles.tabBar, ELEVATION.tabBar]}
      >
        <Pressable
          onPress={() => setActiveTab('walk')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'walk' }}
          style={({ pressed }) => [
            styles.tabItem,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.tabIconCapsule,
              activeTab === 'walk' && styles.tabIconCapsuleActive,
            ]}
          >
            <UiIcon
              name="paw"
              size={19}
              color={
                activeTab === 'walk' ? COLORS.brandDark : COLORS.textSecondary
              }
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'walk' && styles.tabLabelActive,
            ]}
          >
            {t.tabWalkNow}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('map')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'map' }}
          style={({ pressed }) => [
            styles.tabItem,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.tabIconCapsule,
              activeTab === 'map' && styles.tabIconCapsuleActive,
            ]}
          >
            <UiIcon
              name="map"
              size={19}
              color={
                activeTab === 'map' ? COLORS.brandDark : COLORS.textSecondary
              }
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'map' && styles.tabLabelActive,
            ]}
          >
            {t.tabExploreMap}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('photos')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'photos' }}
          style={({ pressed }) => [
            styles.tabItem,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.tabIconCapsule,
              activeTab === 'photos' && styles.tabIconCapsuleActive,
            ]}
          >
            <UiIcon
              name="camera"
              size={19}
              color={
                activeTab === 'photos' ? COLORS.brandDark : COLORS.textSecondary
              }
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'photos' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            {t.tabPhotoMap}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('dog')}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === 'dog' }}
          style={({ pressed }) => [
            styles.tabItem,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.tabIconCapsule,
              activeTab === 'dog' && styles.tabIconCapsuleActive,
            ]}
          >
            <View
              style={[
                styles.dogTabAvatarRing,
                activeTab === 'dog' && styles.dogTabAvatarRingActive,
              ]}
            >
              <DogAvatar
                breedId={dog.breedId}
                customUri={dog.customPhotoUri}
                size={24}
              />
            </View>
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'dog' && styles.tabLabelActive,
            ]}
            numberOfLines={1}
          >
            {dog.name || MESSAGES.tabMyDog}
          </Text>
        </Pressable>
      </View>

      <LocationModal
        visible={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        autoTriggerGps={autoLocateOnModalOpen}
        onAutoTriggerConsumed={() => setAutoLocateOnModalOpen(false)}
      />
    </SafeAreaView>
  );

  if (!isWideWeb) {
    return (
      <View style={styles.fullScreenRoot}>
        <StatusBar style="dark" />
        {shellContent}
      </View>
    );
  }

  return (
    <View style={styles.desktopBackdrop}>
      <StatusBar style="dark" />
      <View
        role="region"
        aria-label="Preview layout controls"
        style={styles.desktopToolbar}
      >
        <View style={styles.desktopStudioBrand}>
          <View style={styles.desktopStudioDot} />
          <Text style={styles.desktopToolbarLabel}>
            {MESSAGES.appTitle} v2.5 · {t.appSubtitle}
          </Text>
        </View>
        <View style={styles.desktopToolbarActions}>
          <Pressable
            onPress={toggleLanguage}
            accessibilityRole="button"
            accessibilityLabel={
              language === 'zh'
                ? 'Switch language to English'
                : '切换语言为简体中文'
            }
            style={({ pressed }) => [
              styles.frameToggleBtn,
              language === 'zh' && styles.frameToggleBtnActive,
              ELEVATION.card,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.frameToggleText,
                language === 'zh' && styles.frameToggleTextActive,
              ]}
            >
              {language === 'zh' ? '中文 · EN' : 'EN · 中文'}
            </Text>
          </Pressable>

          <Pressable
            onPress={toggleUnits}
            accessibilityRole="button"
            accessibilityLabel={`Switch units, currently ${
              units === 'imperial' ? MESSAGES.unitsImperial : MESSAGES.unitsMetric
            }`}
            style={({ pressed }) => [
              styles.frameToggleBtn,
              ELEVATION.card,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.frameToggleText}>
              {units === 'imperial'
                ? MESSAGES.unitsImperial
                : MESSAGES.unitsMetric}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setUsePhoneFrame((prev) => !prev)}
            style={({ pressed }) => [
              styles.frameToggleBtn,
              ELEVATION.card,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.frameToggleText}>
              {usePhoneFrame ? t.fullWidthToggle : t.iphoneFrameToggle}
            </Text>
          </Pressable>
        </View>
      </View>

      {framedOnDesktop ? (
        <View
          style={[
            styles.iphoneBezel,
            ELEVATION.phoneFrame,
            { maxHeight: Math.max(640, height - 64) },
          ]}
        >
          <View style={styles.dynamicIslandRow}>
            <View style={styles.dynamicIsland} />
          </View>
          {shellContent}
        </View>
      ) : (
        <View style={[styles.desktopFullWrapper, ELEVATION.phoneFrame]}>
          {shellContent}
        </View>
      )}
    </View>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorBoundaryWrap}>
          <View style={[styles.errorBoundaryCard, ELEVATION.cardHero]}>
            <View style={styles.brandMarkSquircle}>
              <UiIcon name="paw" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.errorBoundaryTitle}>
              PawCast hit a quick snag · 页面遇到一点小问题
            </Text>
            <Text style={styles.errorBoundarySub}>
              Tap below to restore your live walk forecast and saved parks. /
              点击下方恢复实时天气和收藏公园。
            </Text>
            <Pressable
              onPress={this.handleReset}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.errorBoundaryBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.errorBoundaryBtnText}>
                Reload · 重新加载
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <WalkPlannerProvider>
            <MainShell />
          </WalkPlannerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fullScreenRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  desktopBackdrop: {
    flex: 1,
    backgroundColor: COLORS.desktopBackdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  desktopToolbar: {
    width: '100%',
    maxWidth: 960,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  desktopStudioBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopStudioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
  },
  desktopToolbarLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: -0.1,
  },
  desktopToolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  frameToggleBtn: {
    backgroundColor: COLORS.surface,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  frameToggleBtnActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  frameToggleText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  frameToggleTextActive: {
    color: COLORS.brandDark,
  },
  iphoneBezel: {
    width: 412,
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 46,
    borderWidth: 10,
    borderColor: '#19221E',
    overflow: 'hidden',
  },
  dynamicIslandRow: {
    backgroundColor: COLORS.background,
    paddingTop: 7,
    paddingBottom: 2,
    alignItems: 'center',
  },
  dynamicIsland: {
    width: 96,
    height: 22,
    borderRadius: 12,
    backgroundColor: '#19221E',
  },
  desktopFullWrapper: {
    width: '100%',
    maxWidth: 780,
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  appSurface: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 9,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    gap: 8,
  },
  brandBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  brandMarkSquircle: {
    width: 27,
    height: 27,
    borderRadius: 8.5,
    backgroundColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 17.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  locationPill: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 5,
    paddingStart: 8,
    paddingEnd: 6,
    borderRadius: 999,
    maxWidth: 176,
    gap: 3.5,
  },
  locationPillWide: {
    maxWidth: 320,
  },
  locationPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brandDark,
    flexShrink: 1,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  langHeaderPill: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 6,
    paddingHorizontal: 8.5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langHeaderPillActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  langHeaderText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  langHeaderTextActive: {
    color: COLORS.brandDark,
  },
  dogHeaderChip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5.5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    paddingStart: 4.5,
    paddingEnd: 10,
    borderRadius: 999,
    maxWidth: 108,
  },
  dogHeaderChipActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  dogHeaderName: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  screenBody: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 7,
    paddingBottom: 9,
    paddingHorizontal: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconCapsule: {
    width: 54,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconCapsuleActive: {
    backgroundColor: COLORS.brandLight,
  },
  dogTabAvatarRing: {
    borderRadius: 15,
    padding: 1,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dogTabAvatarRingActive: {
    borderColor: COLORS.brand,
  },
  tabLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  errorBoundaryWrap: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorBoundaryCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  errorBoundaryTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  errorBoundarySub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorBoundaryBtn: {
    marginTop: 6,
    backgroundColor: COLORS.brand,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  errorBoundaryBtnText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
