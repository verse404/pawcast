import React, { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { findNearestAuSuburbs } from '../constants/auSuburbs';
import { useWalkPlanner } from '../context/WalkPlannerContext';
import { formatInteger } from '../i18n/formatters';
import { getLocaleTag, getStrings } from '../i18n/translations';
import { haversineDistanceKm } from '../services/placesService';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import { PhotoMemory } from '../types/walk';
import {
  ExtractedExifMeta,
  pickWalkMemoryPhoto,
} from '../utils/photoMemoryPicker';
import { splitSpotDisplayName } from '../utils/spotGuide';
import { buildSafeDirectionsUrl } from '../utils/validation';
import { PhotoMemoryMap } from './PhotoMemoryMap';
import { UiIcon } from './UiIcons';

type PhotoViewMode = 'map' | 'wall';
type WallGroupMode = 'all' | 'folders' | 'months';

interface PendingPhotoDraft {
  thumbnailUri: string;
  photoUri: string;
  exif: ExtractedExifMeta;
  latitude: number;
  longitude: number;
  placeName: string;
  suburbLabel: string;
  caption: string;
  takenDateIso: string;
  sourceKind: 'exif' | 'park' | 'area' | 'manual_pin';
}

export const PhotoMapScreen: React.FC = () => {
  const {
    location,
    gpsFix,
    language,
    scoredPlaces,
    activeDogs,
    memberPreferences,
    photoMemories,
    addPhotoMemory,
    deletePhotoMemory,
  } = useWalkPlanner();
  const t = getStrings(language);
  const loc = getLocaleTag(language);

  const [viewMode, setViewMode] = useState<PhotoViewMode>('map');
  const [wallGroupMode, setWallGroupMode] = useState<WallGroupMode>('all');
  const [openedFolderKey, setOpenedFolderKey] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(
    photoMemories[0]?.id ?? null
  );
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [fitAllSignal, setFitAllSignal] = useState(0);

  const [isPicking, setIsPicking] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PendingPhotoDraft | null>(null);
  const [pickLocationMode, setPickLocationMode] = useState(false);

  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const activePhotoIndex = useMemo(() => {
    if (photoMemories.length === 0) return -1;
    const idx = selectedPhotoId
      ? photoMemories.findIndex((p) => p.id === selectedPhotoId)
      : 0;
    return idx >= 0 ? idx : 0;
  }, [photoMemories, selectedPhotoId]);

  const activePhoto: PhotoMemory | null =
    activePhotoIndex >= 0 ? photoMemories[activePhotoIndex] : null;

  const clusterPhotos = useMemo(() => {
    if (selectedClusterIds.length <= 1) return [];
    const byId = new Map(photoMemories.map((p) => [p.id, p]));
    return selectedClusterIds
      .map((id) => byId.get(id))
      .filter((p): p is PhotoMemory => Boolean(p));
  }, [selectedClusterIds, photoMemories]);

  const uniquePlacesCount = useMemo(() => {
    const keys = new Set(
      photoMemories.map((p) => `${p.latitude.toFixed(3)},${p.longitude.toFixed(3)}`)
    );
    return keys.size;
  }, [photoMemories]);

  const lightboxPhoto = useMemo(
    () =>
      lightboxPhotoId
        ? photoMemories.find((p) => p.id === lightboxPhotoId) ?? null
        : null,
    [lightboxPhotoId, photoMemories]
  );

  const placeFolders = useMemo(() => {
    const map = new Map<
      string,
      { key: string; title: string; subtitle: string; items: PhotoMemory[] }
    >();
    for (const p of photoMemories) {
      const key = p.placeName.trim().toLowerCase() || 'walk-spot';
      const existing = map.get(key);
      if (existing) {
        existing.items.push(p);
      } else {
        map.set(key, {
          key,
          title: p.placeName,
          subtitle: p.suburbLabel || p.takenDateIso,
          items: [p],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => b.items[0].createdAtMs - a.items[0].createdAtMs
    );
  }, [photoMemories]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, PhotoMemory[]>();
    for (const p of photoMemories) {
      const monthKey = p.takenDateIso.slice(0, 7) || 'Unknown';
      const list = map.get(monthKey) || [];
      list.push(p);
      map.set(monthKey, list);
    }
    return Array.from(map.entries())
      .map(([month, items]) => ({ month, items }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [photoMemories]);

  const activeFolder = useMemo(
    () =>
      openedFolderKey
        ? placeFolders.find((f) => f.key === openedFolderKey) ?? null
        : null,
    [openedFolderKey, placeFolders]
  );

  const activeLightboxIndex = useMemo(() => {
    if (!lightboxPhoto) return -1;
    return photoMemories.findIndex((p) => p.id === lightboxPhoto.id);
  }, [lightboxPhoto, photoMemories]);

  const stepLightboxPhoto = (delta: -1 | 1) => {
    if (photoMemories.length <= 1 || activeLightboxIndex < 0) return;
    const nextIdx =
      (activeLightboxIndex + delta + photoMemories.length) %
      photoMemories.length;
    setConfirmDeleteId(null);
    setLightboxPhotoId(photoMemories[nextIdx].id);
  };

  const resolveSuggestedPlace = (lat: number, lon: number): {
    placeName: string;
    suburbLabel: string;
  } => {
    // 1. Check if within 1.2 km of any known nearby park
    let nearestPark: { name: string; dist: number } | null = null;
    for (const sp of scoredPlaces) {
      const d = haversineDistanceKm(
        lat,
        lon,
        sp.place.latitude,
        sp.place.longitude
      );
      if (d <= 1.2 && (!nearestPark || d < nearestPark.dist)) {
        nearestPark = {
          name: splitSpotDisplayName(sp.place.name, language).primary,
          dist: d,
        };
      }
    }
    const nearestSub = findNearestAuSuburbs(lat, lon, 1, 50)[0]?.suburb;
    const suburbLabel = nearestSub
      ? `${
          nearestSub.city === 'sydney'
            ? t.citySydney
            : nearestSub.city === 'shanghai'
              ? t.cityShanghai
              : t.cityMelbourne
        } · ${nearestSub.name}`
      : location.name;

    if (nearestPark) {
      return { placeName: nearestPark.name, suburbLabel };
    }
    return {
      placeName: nearestSub?.name || location.name.split(' · ').pop() || location.name,
      suburbLabel,
    };
  };

  const handleStartAddPhoto = async (source: 'library' | 'camera' = 'library') => {
    if (isPicking) return;
    setIsPicking(true);
    setPickError(null);
    try {
      const res = await pickWalkMemoryPhoto(source);
      if (res.status === 'error') {
        setPickError(res.message);
        return;
      }
      if (res.status !== 'picked') return;

      const todayIso = new Date().toISOString().slice(0, 10);
      const hasExifGps =
        res.exif.latitude !== null && res.exif.longitude !== null;
      const lat = hasExifGps
        ? (res.exif.latitude as number)
        : gpsFix?.latitude ?? location.latitude;
      const lon = hasExifGps
        ? (res.exif.longitude as number)
        : gpsFix?.longitude ?? location.longitude;

      const suggested = resolveSuggestedPlace(lat, lon);
      setDraft({
        thumbnailUri: res.thumbnailUri,
        photoUri: res.photoUri,
        exif: res.exif,
        latitude: lat,
        longitude: lon,
        placeName: suggested.placeName,
        suburbLabel: suggested.suburbLabel,
        caption: '',
        takenDateIso: res.exif.takenDateIso || todayIso,
        sourceKind: hasExifGps ? 'exif' : 'area',
      });
    } finally {
      setIsPicking(false);
    }
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    const created = addPhotoMemory({
      thumbnailUri: draft.thumbnailUri,
      photoUri: draft.photoUri,
      latitude: draft.latitude,
      longitude: draft.longitude,
      placeName: draft.placeName,
      suburbLabel: draft.suburbLabel,
      caption: draft.caption,
      takenDateIso: draft.takenDateIso,
      dogNames: activeDogs.map((d) => d.name),
    });
    if (created) {
      setSelectedPhotoId(created.id);
      setSelectedClusterIds([created.id]);
      setViewMode('map');
      setDraft(null);
      setPickLocationMode(false);
    }
  };

  const handleStepPhoto = (delta: -1 | 1) => {
    if (photoMemories.length === 0) return;
    const nextIdx =
      (activePhotoIndex + delta + photoMemories.length) % photoMemories.length;
    const next = photoMemories[nextIdx];
    setSelectedPhotoId(next.id);
    setSelectedClusterIds([next.id]);
  };

  const handleOpenPhotoMaps = (photo: PhotoMemory) => {
    const url = buildSafeDirectionsUrl(
      photo.latitude,
      photo.longitude,
      photo.placeName,
      memberPreferences.preferredMapsApp,
      'walking',
      Platform.OS === 'ios'
    );
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const handleConfirmDelete = (photoId: string) => {
    if (confirmDeleteId !== photoId) {
      setConfirmDeleteId(photoId);
      return;
    }
    deletePhotoMemory(photoId);
    setConfirmDeleteId(null);
    setLightboxPhotoId(null);
    if (selectedPhotoId === photoId) {
      const remaining = photoMemories.filter((p) => p.id !== photoId);
      setSelectedPhotoId(remaining[0]?.id ?? null);
      setSelectedClusterIds(remaining[0] ? [remaining[0].id] : []);
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Floating Bar */}
      <View style={styles.topOverlayBar}>
        <View style={styles.topLeftGroup}>
          <View style={[styles.countChip, ELEVATION.card]}>
            <UiIcon name="camera" size={14} color={COLORS.brandDark} />
            <Text style={styles.countChipText} numberOfLines={1}>
              {t.photosCountSummary(
                formatInteger(photoMemories.length, loc),
                formatInteger(uniquePlacesCount, loc)
              )}
            </Text>
          </View>

          <View style={[styles.modeSwitch, ELEVATION.card]}>
            <Pressable
              onPress={() => {
                setViewMode('map');
                setOpenedFolderKey(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'map' }}
              style={[
                styles.modeBtn,
                viewMode === 'map' && styles.modeBtnActive,
              ]}
            >
              <UiIcon
                name="map"
                size={12}
                color={
                  viewMode === 'map' ? COLORS.brandDark : COLORS.textSecondary
                }
              />
              <Text
                style={[
                  styles.modeBtnText,
                  viewMode === 'map' && styles.modeBtnTextActive,
                ]}
              >
                {t.photosViewMap}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('wall')}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === 'wall' }}
              style={[
                styles.modeBtn,
                viewMode === 'wall' && styles.modeBtnActive,
              ]}
            >
              <UiIcon
                name="layers"
                size={12}
                color={
                  viewMode === 'wall' ? COLORS.brandDark : COLORS.textSecondary
                }
              />
              <Text
                style={[
                  styles.modeBtnText,
                  viewMode === 'wall' && styles.modeBtnTextActive,
                ]}
              >
                {t.photosWallBtn}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => handleStartAddPhoto('library')}
          disabled={isPicking}
          accessibilityRole="button"
          accessibilityLabel={t.photosAddBtn}
          style={({ pressed }) => [
            styles.addPhotoBtn,
            ELEVATION.card,
            pressed && styles.pressed,
          ]}
        >
          <UiIcon name="camera" size={14} color="#FFFFFF" />
          <Text style={styles.addPhotoBtnText}>
            {isPicking ? t.openingStatus : t.photosAddBtn}
          </Text>
        </Pressable>
      </View>

      {pickError ? (
        <View style={[styles.errorToast, ELEVATION.card]}>
          <Text style={styles.errorToastText}>{pickError}</Text>
          <Pressable onPress={() => setPickError(null)} hitSlop={8}>
            <UiIcon name="close" size={14} color={COLORS.avoidText} />
          </Pressable>
        </View>
      ) : null}

      {/* Manual Map Pin-Drop Banner */}
      {pickLocationMode && draft ? (
        <View style={[styles.dropPinBanner, ELEVATION.floating]}>
          <UiIcon name="pin" size={16} color="#FFFFFF" />
          <Text style={styles.dropPinBannerText}>{t.photosTapMapPrompt}</Text>
          <Pressable
            onPress={() => setPickLocationMode(false)}
            style={styles.dropPinCancelBtn}
          >
            <Text style={styles.dropPinCancelText}>{t.authCancelBtn}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Main Content: Map vs. Grid */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <PhotoMemoryMap
            center={location}
            photos={photoMemories}
            selectedPhotoId={activePhoto?.id ?? null}
            pickLocationMode={pickLocationMode}
            fitAllSignal={fitAllSignal}
            fitAllLabel={t.photosFitAllBtn}
            onSelectPhoto={(photoId, clusterIds) => {
              setSelectedPhotoId(photoId);
              setSelectedClusterIds(clusterIds);
            }}
            onOpenLightbox={(photoId) => {
              setConfirmDeleteId(null);
              setLightboxPhotoId(photoId);
            }}
            onPickCoordinate={(lat, lon) => {
              if (!draft) return;
              const suggested = resolveSuggestedPlace(lat, lon);
              setDraft((prev) =>
                prev
                  ? {
                      ...prev,
                      latitude: lat,
                      longitude: lon,
                      placeName: prev.placeName || suggested.placeName,
                      suburbLabel: suggested.suburbLabel,
                      sourceKind: 'manual_pin',
                    }
                  : prev
              );
              setPickLocationMode(false);
            }}
          />

          {/* Floating Empty State or Selected Memory Card */}
          {!pickLocationMode ? (
            <View style={styles.bottomCardDock} pointerEvents="box-none">
              {activePhoto ? (
                <View style={[styles.memoryCard, ELEVATION.floating]}>
                  <View style={styles.memoryCardTopRow}>
                    <Pressable
                      onPress={() => {
                        setConfirmDeleteId(null);
                        setLightboxPhotoId(activePhoto.id);
                      }}
                      style={styles.cardThumbWrap}
                    >
                      <Image
                        source={{ uri: activePhoto.thumbnailUri }}
                        style={styles.cardThumbImg}
                      />
                    </Pressable>

                    <View style={styles.memoryCardInfoCol}>
                      <Text style={styles.memoryPlaceTitle} numberOfLines={1}>
                        {activePhoto.placeName}
                      </Text>
                      <Text style={styles.memoryMetaLine} numberOfLines={1}>
                        {activePhoto.takenDateIso} ·{' '}
                        {activePhoto.dogNames.join(
                          language === 'zh' ? '、' : ' & '
                        )}
                      </Text>
                      {activePhoto.caption ? (
                        <Text style={styles.memoryCaption} numberOfLines={2}>
                          {activePhoto.caption}
                        </Text>
                      ) : null}
                    </View>

                    {photoMemories.length > 1 ? (
                      <View style={styles.stepperPill}>
                        <Pressable
                          onPress={() => handleStepPhoto(-1)}
                          hitSlop={6}
                          style={styles.stepperArrowBtn}
                        >
                          <UiIcon
                            name="chevronLeft"
                            size={15}
                            color={COLORS.textPrimary}
                          />
                        </Pressable>
                        <Text style={styles.stepperText}>
                          {formatInteger(activePhotoIndex + 1, loc)}/
                          {formatInteger(photoMemories.length, loc)}
                        </Text>
                        <Pressable
                          onPress={() => handleStepPhoto(1)}
                          hitSlop={6}
                          style={styles.stepperArrowBtn}
                        >
                          <UiIcon
                            name="chevronRight"
                            size={15}
                            color={COLORS.textPrimary}
                          />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>

                  {/* Filmstrip when multiple photos are stacked at this location */}
                  {clusterPhotos.length > 1 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.filmstripRow}
                    >
                      {clusterPhotos.map((item) => {
                        const isCur = item.id === activePhoto.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => setSelectedPhotoId(item.id)}
                            style={[
                              styles.filmstripItem,
                              isCur && styles.filmstripItemActive,
                            ]}
                          >
                            <Image
                              source={{ uri: item.thumbnailUri }}
                              style={styles.filmstripImg}
                            />
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : null}

                  <View style={styles.cardActionsRow}>
                    <Pressable
                      onPress={() => {
                        setConfirmDeleteId(null);
                        setLightboxPhotoId(activePhoto.id);
                      }}
                      style={({ pressed }) => [
                        styles.secondaryActionBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.secondaryActionText}>
                        {t.photosViewFullBtn}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setViewMode('wall')}
                      style={({ pressed }) => [
                        styles.secondaryActionBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <UiIcon name="layers" size={13} color={COLORS.brandDark} />
                      <Text style={styles.secondaryActionText}>
                        {t.photosWallBtn}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenPhotoMaps(activePhoto)}
                      style={({ pressed }) => [
                        styles.primaryActionBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <UiIcon name="navigate" size={14} color="#FFFFFF" />
                      <Text style={styles.primaryActionText}>
                        {t.photosOpenSpotMaps}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={[styles.emptyCard, ELEVATION.floating]}>
                  <View style={styles.emptyIconCircle}>
                    <UiIcon name="camera" size={22} color={COLORS.brand} />
                  </View>
                  <Text style={styles.emptyTitle}>{t.photosEmptyTitle}</Text>
                  <Text style={styles.emptySubtitle}>{t.photosEmptySub}</Text>
                  <View style={styles.emptyActionsRow}>
                    <Pressable
                      onPress={() => handleStartAddPhoto('library')}
                      disabled={isPicking}
                      style={({ pressed }) => [
                        styles.primaryActionBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <UiIcon name="camera" size={14} color="#FFFFFF" />
                      <Text style={styles.primaryActionText}>
                        {t.photosAddFirstBtn}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleStartAddPhoto('camera')}
                      disabled={isPicking}
                      style={({ pressed }) => [
                        styles.secondaryActionBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.secondaryActionText}>
                        {t.snapCamera}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </View>
      ) : (
        /* Photo Wall & Place Folder Gallery View */
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Wall Grouping Sub-Bar (All Photos · Place Folders · By Month) */}
          {photoMemories.length > 0 ? (
            <View style={styles.wallSubBar}>
              {(
                [
                  { key: 'all', label: t.photosWallModeAll },
                  { key: 'folders', label: t.photosWallModeFolders },
                  { key: 'months', label: t.photosWallModeMonths },
                ] as Array<{ key: WallGroupMode; label: string }>
              ).map((m) => {
                const active = wallGroupMode === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      setWallGroupMode(m.key);
                      setOpenedFolderKey(null);
                    }}
                    style={[
                      styles.wallFilterChip,
                      active && styles.wallFilterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.wallFilterChipText,
                        active && styles.wallFilterChipTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {photoMemories.length === 0 ? (
            <View style={[styles.emptyCard, ELEVATION.card, { marginTop: 24 }]}>
              <View style={styles.emptyIconCircle}>
                <UiIcon name="camera" size={22} color={COLORS.brand} />
              </View>
              <Text style={styles.emptyTitle}>{t.photosEmptyTitle}</Text>
              <Text style={styles.emptySubtitle}>{t.photosEmptySub}</Text>
              <Pressable
                onPress={() => handleStartAddPhoto('library')}
                style={[styles.primaryActionBtn, { width: '100%' }]}
              >
                <Text style={styles.primaryActionText}>
                  {t.photosAddFirstBtn}
                </Text>
              </Pressable>
            </View>
          ) : wallGroupMode === 'folders' && !activeFolder ? (
            /* Folder Cards Grouped by Place */
            <View style={styles.folderGridWrap}>
              {placeFolders.map((folder) => {
                const cover = folder.items[0];
                const second = folder.items[1];
                return (
                  <Pressable
                    key={folder.key}
                    onPress={() => setOpenedFolderKey(folder.key)}
                    style={({ pressed }) => [
                      styles.folderCard,
                      ELEVATION.card,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.folderCoverWrap}>
                      {second ? (
                        <Image
                          source={{ uri: second.thumbnailUri }}
                          style={styles.folderBackPreview}
                        />
                      ) : null}
                      <Image
                        source={{ uri: cover.thumbnailUri }}
                        style={styles.folderCoverImg}
                      />
                      <View style={styles.folderCountPill}>
                        <Text style={styles.folderCountPillText}>
                          {formatInteger(folder.items.length, loc)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.folderMetaBox}>
                      <Text style={styles.folderTitle} numberOfLines={1}>
                        {folder.title}
                      </Text>
                      <Text style={styles.folderSub} numberOfLines={1}>
                        {t.photosFolderCount(
                          formatInteger(folder.items.length, loc)
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : wallGroupMode === 'folders' && activeFolder ? (
            /* Opened Single Place Folder */
            <View style={styles.folderOpenWrap}>
              <View style={styles.folderBreadcrumbRow}>
                <Pressable
                  onPress={() => setOpenedFolderKey(null)}
                  style={styles.backFolderPill}
                >
                  <Text style={styles.backFolderText}>
                    {t.photosAllFoldersBack}
                  </Text>
                </Pressable>
                <Text style={styles.folderOpenTitle} numberOfLines={1}>
                  {activeFolder.title}
                </Text>
              </View>
              <View style={styles.gridWrap}>
                {activeFolder.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setConfirmDeleteId(null);
                      setLightboxPhotoId(item.id);
                    }}
                    style={[styles.gridTile, ELEVATION.card]}
                  >
                    <Image
                      source={{ uri: item.thumbnailUri }}
                      style={styles.gridTileImg}
                    />
                    <View style={styles.gridTileCaptionBar}>
                      <Text style={styles.gridTilePlace} numberOfLines={1}>
                        {item.caption || item.placeName}
                      </Text>
                      <Text style={styles.gridTileDate} numberOfLines={1}>
                        {item.takenDateIso}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : wallGroupMode === 'months' ? (
            /* Photos Grouped by Month */
            <View style={styles.monthSectionsWrap}>
              {monthGroups.map((group) => (
                <View key={group.month} style={styles.monthBlock}>
                  <View style={styles.monthHeaderRow}>
                    <Text style={styles.monthHeading}>{group.month}</Text>
                    <Text style={styles.monthCountText}>
                      {t.photosFolderCount(
                        formatInteger(group.items.length, loc)
                      )}
                    </Text>
                  </View>
                  <View style={styles.gridWrap}>
                    {group.items.map((item) => (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          setConfirmDeleteId(null);
                          setLightboxPhotoId(item.id);
                        }}
                        style={[styles.gridTile, ELEVATION.card]}
                      >
                        <Image
                          source={{ uri: item.thumbnailUri }}
                          style={styles.gridTileImg}
                        />
                        <View style={styles.gridTileCaptionBar}>
                          <Text style={styles.gridTilePlace} numberOfLines={1}>
                            {item.placeName}
                          </Text>
                          <Text style={styles.gridTileDate} numberOfLines={1}>
                            {item.takenDateIso}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* All Photos Wall */
            <View style={styles.gridWrap}>
              <Pressable
                onPress={() => handleStartAddPhoto('library')}
                disabled={isPicking}
                style={[styles.gridAddTile, ELEVATION.card]}
              >
                <View style={styles.gridAddIconCircle}>
                  <UiIcon name="camera" size={20} color={COLORS.brandDark} />
                </View>
                <Text style={styles.gridAddLabel}>{t.photosAddCardLabel}</Text>
              </Pressable>
              {photoMemories.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setConfirmDeleteId(null);
                    setLightboxPhotoId(item.id);
                  }}
                  style={[styles.gridTile, ELEVATION.card]}
                >
                  <Image
                    source={{ uri: item.thumbnailUri }}
                    style={styles.gridTileImg}
                  />
                  <View style={styles.gridTileCaptionBar}>
                    <Text style={styles.gridTilePlace} numberOfLines={1}>
                      {item.placeName}
                    </Text>
                    <Text style={styles.gridTileDate} numberOfLines={1}>
                      {item.takenDateIso}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Photo Location & Caption Composer Modal */}
      <Modal
        visible={Boolean(draft) && !pickLocationMode}
        transparent
        animationType="slide"
        aria-label={t.photosComposerTitle}
        onRequestClose={() => setDraft(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => setDraft(null)}
          />
          {draft ? (
            <View style={[styles.composerSheet, ELEVATION.floating]}>
              <View style={styles.grabHandle} />
              <View style={styles.composerHeader}>
                <Text style={styles.composerTitle}>
                  {t.photosComposerTitle}
                </Text>
                <Pressable
                  onPress={() => setDraft(null)}
                  hitSlop={8}
                  style={styles.closeIconBtn}
                >
                  <UiIcon name="close" size={16} color={COLORS.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={styles.composerScroll}
                contentContainerStyle={styles.composerScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.previewRow}>
                  <Image
                    source={{ uri: draft.thumbnailUri }}
                    style={styles.previewThumb}
                  />
                  <View style={styles.previewMetaCol}>
                    <View
                      style={[
                        styles.gpsStatusPill,
                        draft.sourceKind === 'exif' && styles.gpsStatusPillGreen,
                      ]}
                    >
                      <UiIcon
                        name={draft.sourceKind === 'exif' ? 'check' : 'pin'}
                        size={12}
                        color={COLORS.brandDark}
                      />
                      <Text style={styles.gpsStatusText} numberOfLines={2}>
                        {draft.sourceKind === 'exif'
                          ? t.photosExifGpsFound
                          : draft.sourceKind === 'manual_pin'
                            ? t.photosPinnedOnMap
                            : t.photosNoExifFallback}
                      </Text>
                    </View>
                    <Text style={styles.coordsCaption}>
                      {draft.suburbLabel} ({draft.latitude.toFixed(4)},{' '}
                      {draft.longitude.toFixed(4)})
                    </Text>
                  </View>
                </View>

                {/* Pin Location Selector Chips */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {t.photosChoosePinSpotLabel}
                  </Text>
                  <View style={styles.chipWrap}>
                    <Pressable
                      onPress={() => {
                        setViewMode('map');
                        setPickLocationMode(true);
                      }}
                      style={[styles.spotChip, styles.spotChipHighlight]}
                    >
                      <UiIcon name="pin" size={12} color={COLORS.brandDark} />
                      <Text style={styles.spotChipTextActive}>
                        {t.photosDropPinBtn}
                      </Text>
                    </Pressable>

                    {scoredPlaces.slice(0, 6).map((sp) => {
                      const title = splitSpotDisplayName(
                        sp.place.name,
                        language
                      ).primary;
                      const isSel =
                        Math.abs(draft.latitude - sp.place.latitude) < 0.0008 &&
                        Math.abs(draft.longitude - sp.place.longitude) < 0.0008;
                      return (
                        <Pressable
                          key={sp.place.id}
                          onPress={() =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    latitude: sp.place.latitude,
                                    longitude: sp.place.longitude,
                                    placeName: title,
                                    suburbLabel: location.name,
                                    sourceKind: 'park',
                                  }
                                : prev
                            )
                          }
                          style={[
                            styles.spotChip,
                            isSel && styles.spotChipHighlight,
                          ]}
                        >
                          <Text
                            style={[
                              styles.spotChipText,
                              isSel && styles.spotChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {title}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t.photosPlaceLabel}</Text>
                  <TextInput
                    value={draft.placeName}
                    onChangeText={(txt) =>
                      setDraft((prev) => (prev ? { ...prev, placeName: txt } : prev))
                    }
                    placeholder={t.photosPlacePlaceholder}
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={60}
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t.photosCaptionLabel}</Text>
                  <TextInput
                    value={draft.caption}
                    onChangeText={(txt) =>
                      setDraft((prev) => (prev ? { ...prev, caption: txt } : prev))
                    }
                    placeholder={t.photosCaptionPlaceholder}
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={120}
                    style={styles.textInput}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{t.photosDateLabel}</Text>
                  <TextInput
                    value={draft.takenDateIso}
                    onChangeText={(txt) =>
                      setDraft((prev) =>
                        prev ? { ...prev, takenDateIso: txt } : prev
                      )
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={10}
                    style={styles.textInput}
                  />
                </View>

                <Pressable
                  onPress={handleSaveDraft}
                  style={({ pressed }) => [
                    styles.saveMemoryBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.saveMemoryBtnText}>
                    {t.photosSaveToMapBtn}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Full-Screen Photo Lightbox Modal */}
      <Modal
        visible={Boolean(lightboxPhoto)}
        transparent
        animationType="fade"
        aria-label={lightboxPhoto?.placeName || 'Photo memory'}
        onRequestClose={() => setLightboxPhotoId(null)}
      >
        <View style={styles.lightboxBackdrop}>
          {lightboxPhoto ? (
            <View style={[styles.lightboxCard, ELEVATION.floating]}>
              <View style={styles.lightboxHeader}>
                <View style={styles.lightboxTitleCol}>
                  <Text style={styles.lightboxTitle} numberOfLines={1}>
                    {lightboxPhoto.placeName}
                  </Text>
                  <Text style={styles.lightboxSub} numberOfLines={1}>
                    {lightboxPhoto.takenDateIso} ·{' '}
                    {lightboxPhoto.dogNames.join(
                      language === 'zh' ? '、' : ' & '
                    )}
                    {lightboxPhoto.suburbLabel
                      ? ` · ${lightboxPhoto.suburbLabel}`
                      : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setLightboxPhotoId(null)}
                  hitSlop={8}
                  style={styles.closeIconBtn}
                >
                  <UiIcon name="close" size={16} color={COLORS.textPrimary} />
                </Pressable>
              </View>

              <Image
                source={{ uri: lightboxPhoto.photoUri }}
                resizeMode="contain"
                style={styles.lightboxImage}
              />

              {lightboxPhoto.caption ? (
                <Text style={styles.lightboxCaption}>
                  “{lightboxPhoto.caption}”
                </Text>
              ) : null}

              {photoMemories.length > 1 ? (
                <View style={styles.lightboxNavRow}>
                  <Pressable
                    onPress={() => stepLightboxPhoto(-1)}
                    style={styles.lightboxNavPill}
                  >
                    <Text style={styles.lightboxNavText}>{t.photosPrevBtn}</Text>
                  </Pressable>
                  <Text style={styles.lightboxCounter}>
                    {formatInteger(activeLightboxIndex + 1, loc)} /{' '}
                    {formatInteger(photoMemories.length, loc)}
                  </Text>
                  <Pressable
                    onPress={() => stepLightboxPhoto(1)}
                    style={styles.lightboxNavPill}
                  >
                    <Text style={styles.lightboxNavText}>{t.photosNextBtn}</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.lightboxActions}>
                <Pressable
                  onPress={() => {
                    setSelectedPhotoId(lightboxPhoto.id);
                    setSelectedClusterIds([lightboxPhoto.id]);
                    setLightboxPhotoId(null);
                    setViewMode('map');
                  }}
                  style={styles.secondaryActionBtn}
                >
                  <UiIcon name="pin" size={14} color={COLORS.brandDark} />
                  <Text style={styles.secondaryActionText}>
                    {t.photosShowPinOnMap}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleOpenPhotoMaps(lightboxPhoto)}
                  style={styles.primaryActionBtn}
                >
                  <UiIcon name="navigate" size={14} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>
                    {t.photosOpenSpotMaps}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={() => handleConfirmDelete(lightboxPhoto.id)}
                style={styles.deletePhotoBtn}
              >
                <Text style={styles.deletePhotoBtnText}>
                  {confirmDeleteId === lightboxPhoto.id
                    ? t.photosConfirmDeleteBtn
                    : t.photosDeleteBtn}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: 'relative',
  },
  topOverlayBar: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexShrink: 1,
  },
  countChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    padding: 2.5,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
  },
  modeBtnActive: {
    backgroundColor: COLORS.brandLight,
  },
  modeBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeBtnTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.brand,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addPhotoBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  errorToast: {
    position: 'absolute',
    top: 56,
    left: 14,
    right: 14,
    zIndex: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.avoidBg,
    borderWidth: 1,
    borderColor: COLORS.avoidBorder,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  errorToastText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.avoidText,
  },
  dropPinBanner: {
    position: 'absolute',
    top: 58,
    left: 14,
    right: 14,
    zIndex: 45,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.brandDark,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropPinBannerText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dropPinCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  dropPinCancelText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  bottomCardDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 14,
    zIndex: 30,
  },
  memoryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 13,
    gap: 10,
  },
  memoryCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardThumbWrap: {
    width: 58,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cardThumbImg: {
    width: 58,
    height: 58,
  },
  memoryCardInfoCol: {
    flex: 1,
    gap: 2,
  },
  memoryPlaceTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  memoryMetaLine: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  memoryCaption: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 1,
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
    gap: 2,
  },
  stepperArrowBtn: {
    padding: 3,
  },
  stepperText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 26,
    textAlign: 'center',
  },
  filmstripRow: {
    flexDirection: 'row',
    gap: 7,
  },
  filmstripItem: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filmstripItemActive: {
    borderColor: COLORS.brand,
  },
  filmstripImg: {
    width: 44,
    height: 44,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.brand,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  primaryActionText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.brandLight,
    borderRadius: 13,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryActionText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 15.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 4,
  },
  gridScroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gridContent: {
    paddingTop: 62,
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridTile: {
    width: '31.5%',
    aspectRatio: 0.9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  gridTileImg: {
    flex: 1,
    width: '100%',
  },
  gridTileCaptionBar: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    backgroundColor: COLORS.surface,
  },
  gridTilePlace: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  gridTileDate: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 9.5,
    color: COLORS.textMuted,
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
  composerSheet: {
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
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  composerTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerScroll: {
    flexGrow: 0,
  },
  composerScrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 10,
  },
  previewThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  previewMetaCol: {
    flex: 1,
    gap: 6,
  },
  gpsStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  gpsStatusPillGreen: {
    backgroundColor: COLORS.idealBg,
    borderColor: COLORS.idealBorder,
  },
  gpsStatusText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  coordsCaption: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  spotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: '48%',
  },
  spotChipHighlight: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  spotChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  spotChipTextActive: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  textInput: {
    fontFamily: UI_FONT_FAMILY,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9.5,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveMemoryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveMemoryBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 18, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 14,
    gap: 11,
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lightboxTitleCol: {
    flex: 1,
    gap: 2,
  },
  lightboxTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  lightboxSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lightboxImage: {
    width: '100%',
    height: 310,
    borderRadius: 16,
    backgroundColor: COLORS.background,
  },
  lightboxCaption: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  lightboxActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deletePhotoBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.avoidBg,
    borderWidth: 1,
    borderColor: COLORS.avoidBorder,
  },
  deletePhotoBtnText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.avoidText,
  },
  wallSubBar: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 12,
  },
  wallFilterChip: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6.5,
    paddingHorizontal: 12,
  },
  wallFilterChipActive: {
    backgroundColor: COLORS.brandLight,
    borderColor: COLORS.brand,
  },
  wallFilterChipText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  wallFilterChipTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  folderGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  folderCard: {
    width: '48.2%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  folderCoverWrap: {
    height: 126,
    backgroundColor: COLORS.background,
    position: 'relative',
    padding: 6,
  },
  folderBackPreview: {
    position: 'absolute',
    top: 3,
    left: 12,
    right: 12,
    height: 112,
    borderRadius: 12,
    opacity: 0.45,
  },
  folderCoverImg: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  folderCountPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(16, 35, 28, 0.78)',
    borderRadius: 999,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
  },
  folderCountPillText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  folderMetaBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  folderTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  folderSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  folderOpenWrap: {
    gap: 10,
  },
  folderBreadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backFolderPill: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  backFolderText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  folderOpenTitle: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  monthSectionsWrap: {
    gap: 16,
  },
  monthBlock: {
    gap: 8,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  monthHeading: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  monthCountText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  gridAddTile: {
    width: '31.5%',
    aspectRatio: 0.9,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridAddIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridAddLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  lightboxNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lightboxNavPill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  lightboxNavText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  lightboxCounter: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  pressed: {
    opacity: 0.84,
  },
});
