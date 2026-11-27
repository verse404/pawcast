import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MESSAGES } from '../i18n/messages';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import { LocationPoint, PhotoMemory } from '../types/walk';
import { UiIcon } from './UiIcons';

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 17;

function lonToWorldX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * TILE_SIZE * Math.pow(2, zoom);
}

function latToWorldY(lat: number, zoom: number): number {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clampedLat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    TILE_SIZE *
    Math.pow(2, zoom)
  );
}

function worldXToLon(wx: number, zoom: number): number {
  return (wx / (TILE_SIZE * Math.pow(2, zoom))) * 360 - 180;
}

function worldYToLat(wy: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * wy) / (TILE_SIZE * Math.pow(2, zoom));
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export interface PhotoMapCluster {
  key: string;
  lead: PhotoMemory;
  items: PhotoMemory[];
  px: number;
  py: number;
}

interface PhotoMemoryMapProps {
  center: LocationPoint;
  photos: PhotoMemory[];
  selectedPhotoId: string | null;
  pickLocationMode?: boolean;
  fitAllSignal?: number;
  fitAllLabel: string;
  onSelectPhoto: (photoId: string, clusterIds: string[]) => void;
  onOpenLightbox: (photoId: string) => void;
  onPickCoordinate?: (latitude: number, longitude: number) => void;
}

export const PhotoMemoryMap: React.FC<PhotoMemoryMapProps> = ({
  center,
  photos,
  selectedPhotoId,
  pickLocationMode = false,
  fitAllSignal = 0,
  fitAllLabel,
  onSelectPhoto,
  onOpenLightbox,
  onPickCoordinate,
}) => {
  const [zoom, setZoom] = useState(13);
  const [viewLat, setViewLat] = useState(center.latitude);
  const [viewLon, setViewLon] = useState(center.longitude);
  const [size, setSize] = useState({ width: 380, height: 520 });
  const [fallbackTileKeys, setFallbackTileKeys] = useState<
    Record<string, boolean>
  >({});

  const mapHostRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const lastWheelTsRef = useRef(0);
  const isPinchingRef = useRef(false);
  const pinchStartDistRef = useRef(0);
  const viewStateRef = useRef({ lat: viewLat, lon: viewLon, zoom });
  viewStateRef.current = { lat: viewLat, lon: viewLon, zoom };
  const dragStartRef = useRef({ worldX: 0, worldY: 0, zoom: 13 });
  const didDragRef = useRef(false);

  useEffect(() => {
    if (photos.length === 0) {
      setViewLat(center.latitude);
      setViewLon(center.longitude);
      setZoom(13);
    }
  }, [center.latitude, center.longitude, photos.length]);

  const fitAllPhotosInView = (list: PhotoMemory[]) => {
    if (list.length === 0) {
      setViewLat(center.latitude);
      setViewLon(center.longitude);
      setZoom(13);
      return;
    }
    if (list.length === 1) {
      setViewLat(list[0].latitude);
      setViewLon(list[0].longitude);
      setZoom(14);
      return;
    }
    let minLat = 90;
    let maxLat = -90;
    let minLon = 180;
    let maxLon = -180;
    for (const p of list) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLon) minLon = p.longitude;
      if (p.longitude > maxLon) maxLon = p.longitude;
    }
    setViewLat((minLat + maxLat) / 2);
    setViewLon((minLon + maxLon) / 2);

    const usableW = Math.max(180, size.width - 110);
    const usableH = Math.max(180, size.height - 230);
    let bestZ = 14;
    for (let z = 15; z >= MIN_ZOOM; z--) {
      const dx = Math.abs(lonToWorldX(maxLon, z) - lonToWorldX(minLon, z));
      const dy = Math.abs(latToWorldY(minLat, z) - latToWorldY(maxLat, z));
      if (dx <= usableW && dy <= usableH) {
        bestZ = z;
        break;
      }
      bestZ = z;
    }
    setZoom(bestZ);
  };

  useEffect(() => {
    if (fitAllSignal > 0) {
      fitAllPhotosInView(photos);
    }
  }, [fitAllSignal]);

  // Smoothly pan to newly selected photo
  useEffect(() => {
    if (!selectedPhotoId) return;
    const match = photos.find((p) => p.id === selectedPhotoId);
    if (match) {
      setViewLat(match.latitude);
      setViewLon(match.longitude);
    }
  }, [selectedPhotoId]);

  // Web wheel & pinch zoom
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    type WebTouch = { clientX: number; clientY: number };
    type WebTouchEvent = {
      touches: { length: number; [idx: number]: WebTouch };
      preventDefault: () => void;
    };
    const node = mapHostRef.current as unknown as {
      addEventListener?: (
        type: string,
        fn: (e: unknown) => void,
        opts?: { passive: boolean }
      ) => void;
      removeEventListener?: (type: string, fn: (e: unknown) => void) => void;
    } | null;
    if (!node?.addEventListener) return;

    const handleWheel = (rawEv: unknown) => {
      const ev = rawEv as { deltaY: number; preventDefault: () => void };
      ev.preventDefault();
      const now = Date.now();
      if (now - lastWheelTsRef.current < 150) return;
      if (Math.abs(ev.deltaY) < 4) return;
      lastWheelTsRef.current = now;
      setZoom((z) =>
        ev.deltaY < 0 ? Math.min(MAX_ZOOM, z + 1) : Math.max(MIN_ZOOM, z - 1)
      );
    };

    const touchDist = (t1: WebTouch, t2: WebTouch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const handleTouchStart = (rawEv: unknown) => {
      const ev = rawEv as WebTouchEvent;
      if (ev.touches.length === 2) {
        isPinchingRef.current = true;
        pinchStartDistRef.current = Math.max(
          10,
          touchDist(ev.touches[0], ev.touches[1])
        );
      }
    };

    const handleTouchMove = (rawEv: unknown) => {
      const ev = rawEv as WebTouchEvent;
      if (ev.touches.length === 2 && isPinchingRef.current) {
        ev.preventDefault();
        const curDist = touchDist(ev.touches[0], ev.touches[1]);
        const ratio = curDist / Math.max(10, pinchStartDistRef.current);
        if (ratio >= 1.25) {
          pinchStartDistRef.current = curDist;
          setZoom((z) => Math.min(MAX_ZOOM, z + 1));
        } else if (ratio <= 0.8) {
          pinchStartDistRef.current = curDist;
          setZoom((z) => Math.max(MIN_ZOOM, z - 1));
        }
      }
    };

    const handleTouchEnd = (rawEv: unknown) => {
      const ev = rawEv as WebTouchEvent;
      if (ev.touches.length < 2) {
        isPinchingRef.current = false;
        pinchStartDistRef.current = 0;
      }
    };

    node.addEventListener('wheel', handleWheel, { passive: false });
    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });
    node.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    return () => {
      node.removeEventListener?.('wheel', handleWheel);
      node.removeEventListener?.('touchstart', handleTouchStart);
      node.removeEventListener?.('touchmove', handleTouchMove);
      node.removeEventListener?.('touchend', handleTouchEnd);
      node.removeEventListener?.('touchcancel', handleTouchEnd);
    };
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gs) =>
          !isPinchingRef.current && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4),
        onPanResponderGrant: () => {
          if (isPinchingRef.current) return;
          didDragRef.current = false;
          const cur = viewStateRef.current;
          dragStartRef.current = {
            worldX: lonToWorldX(cur.lon, cur.zoom),
            worldY: latToWorldY(cur.lat, cur.zoom),
            zoom: cur.zoom,
          };
        },
        onPanResponderMove: (_evt, gs) => {
          if (isPinchingRef.current) return;
          if (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4) {
            didDragRef.current = true;
          }
          const z = dragStartRef.current.zoom;
          const nextWx = dragStartRef.current.worldX - gs.dx;
          const nextWy = dragStartRef.current.worldY - gs.dy;
          setViewLon(worldXToLon(nextWx, z));
          setViewLat(worldYToLat(nextWy, z));
        },
        onPanResponderRelease: () => {
          setTimeout(() => {
            didDragRef.current = false;
          }, 60);
        },
        onPanResponderTerminate: () => {
          didDragRef.current = false;
        },
      }),
    []
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 20 && height > 20) {
      setSize({ width, height });
    }
  };

  const centerWx = lonToWorldX(viewLon, zoom);
  const centerWy = latToWorldY(viewLat, zoom);
  const topLeftWx = centerWx - size.width / 2;
  const topLeftWy = centerWy - size.height / 2;

  const numTiles = Math.pow(2, zoom);
  const minTx = Math.floor(topLeftWx / TILE_SIZE);
  const maxTx = Math.floor((topLeftWx + size.width) / TILE_SIZE);
  const minTy = Math.max(0, Math.floor(topLeftWy / TILE_SIZE));
  const maxTy = Math.min(
    numTiles - 1,
    Math.floor((topLeftWy + size.height) / TILE_SIZE)
  );

  const tiles: Array<{
    key: string;
    url: string;
    fallbackUrl: string;
    left: number;
    top: number;
  }> = [];
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const wrappedTx = ((tx % numTiles) + numTiles) % numTiles;
      tiles.push({
        key: `${zoom}-${wrappedTx}-${ty}-${tx}`,
        url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${zoom}/${ty}/${wrappedTx}`,
        fallbackUrl: `https://a.tile.openstreetmap.fr/hot/${zoom}/${wrappedTx}/${ty}.png`,
        left: tx * TILE_SIZE - topLeftWx,
        top: ty * TILE_SIZE - topLeftWy,
      });
    }
  }

  // Group nearby photo thumbnails into crisp stacked Polaroid pins
  const clusters = useMemo<PhotoMapCluster[]>(() => {
    const out: PhotoMapCluster[] = [];
    // Ensure selected photo leads its cluster for visual clarity
    const ordered: PhotoMemory[] = [];
    if (selectedPhotoId) {
      const sel = photos.find((p) => p.id === selectedPhotoId);
      if (sel) ordered.push(sel);
    }
    for (const p of photos) {
      if (p.id !== selectedPhotoId) ordered.push(p);
    }

    const clusterPx = zoom >= 16 ? 34 : 56;
    for (const photo of ordered) {
      const px = lonToWorldX(photo.longitude, zoom) - topLeftWx;
      const py = latToWorldY(photo.latitude, zoom) - topLeftWy;
      if (
        px < -30 ||
        px > size.width + 30 ||
        py < -30 ||
        py > size.height + 30
      ) {
        continue;
      }
      const existing = out.find(
        (c) => Math.hypot(c.px - px, c.py - py) < clusterPx
      );
      if (existing) {
        existing.items.push(photo);
      } else {
        out.push({
          key: photo.id,
          lead: photo,
          items: [photo],
          px,
          py,
        });
      }
    }
    return out;
  }, [photos, selectedPhotoId, zoom, topLeftWx, topLeftWy, size.width, size.height]);

  const userPx = {
    x: lonToWorldX(center.longitude, zoom) - topLeftWx,
    y: latToWorldY(center.latitude, zoom) - topLeftWy,
  };

  const handleMapTap = (e: GestureResponderEvent) => {
    if (!pickLocationMode || !onPickCoordinate || didDragRef.current) return;
    const { locationX, locationY } = e.nativeEvent;
    const tapWx = topLeftWx + locationX;
    const tapWy = topLeftWy + locationY;
    const lat = Math.round(worldYToLat(tapWy, zoom) * 1_000_000) / 1_000_000;
    const lon = Math.round(worldXToLon(tapWx, zoom) * 1_000_000) / 1_000_000;
    onPickCoordinate(lat, lon);
  };

  return (
    <View
      ref={mapHostRef}
      style={styles.mapHost}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {/* Slippy Base Map Tiles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={{
              uri: fallbackTileKeys[tile.key] ? tile.fallbackUrl : tile.url,
            }}
            onError={() => {
              if (!fallbackTileKeys[tile.key]) {
                setFallbackTileKeys((prev) => ({ ...prev, [tile.key]: true }));
              }
            }}
            style={[
              styles.tileImage,
              {
                left: Math.round(tile.left),
                top: Math.round(tile.top),
              },
            ]}
          />
        ))}
      </View>

      {/* Tap-to-Drop-Pin Overlay when User Places a Photo Manually */}
      {pickLocationMode ? (
        <Pressable
          onPress={handleMapTap}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Tap map to drop photo pin"
        />
      ) : null}

      {/* Active Area Pulse Dot */}
      {userPx.x >= -10 &&
      userPx.x <= size.width + 10 &&
      userPx.y >= -10 &&
      userPx.y <= size.height + 10 ? (
        <View
          pointerEvents="none"
          style={[
            styles.areaDotOuter,
            { left: userPx.x - 9, top: userPx.y - 9 },
          ]}
        >
          <View style={styles.areaDotInner} />
        </View>
      ) : null}

      {/* Photo Thumbnail Pins */}
      {clusters.map((cluster) => {
        const isSelected = cluster.items.some((p) => p.id === selectedPhotoId);
        const count = cluster.items.length;
        const pinSize = isSelected ? 60 : 52;
        return (
          <Pressable
            key={cluster.key}
            onPress={() => {
              if (pickLocationMode) return;
              if (isSelected && count === 1) {
                onOpenLightbox(cluster.lead.id);
                return;
              }
              if (count > 1 && zoom < 15 && isSelected) {
                setViewLat(cluster.lead.latitude);
                setViewLon(cluster.lead.longitude);
                setZoom((z) => Math.min(MAX_ZOOM, z + 2));
                return;
              }
              onSelectPhoto(
                cluster.lead.id,
                cluster.items.map((i) => i.id)
              );
            }}
            accessibilityRole="button"
            accessibilityLabel={`${cluster.lead.placeName}, ${count} photo${count > 1 ? 's' : ''}`}
            style={[
              styles.pinAnchor,
              {
                left: cluster.px - pinSize / 2,
                top: cluster.py - pinSize - 10,
                zIndex: isSelected ? 40 : 12,
              },
            ]}
          >
            {/* Subtle stacked card effect when multiple photos share this spot */}
            {count > 1 ? (
              <View
                style={[
                  styles.stackBackCard,
                  { width: pinSize - 4, height: pinSize - 4 },
                ]}
              />
            ) : null}

            <View
              style={[
                styles.photoFrame,
                ELEVATION.pin,
                { width: pinSize, height: pinSize },
                isSelected && styles.photoFrameSelected,
              ]}
            >
              <Image
                source={{ uri: cluster.lead.thumbnailUri }}
                style={styles.photoThumbImg}
              />
              {count > 1 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{count}</Text>
                </View>
              ) : null}
            </View>
            <View
              style={[
                styles.pinPointer,
                isSelected && styles.pinPointerSelected,
              ]}
            />
          </Pressable>
        );
      })}

      {/* Right-Edge Map Controls (+ / - / Fit All / Area) */}
      <View style={styles.controlsColumn}>
        <Pressable
          onPress={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          style={[styles.controlBtn, ELEVATION.card]}
        >
          <Text style={styles.controlGlyph}>+</Text>
        </Pressable>
        <Pressable
          onPress={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          style={[styles.controlBtn, ELEVATION.card]}
        >
          <Text style={styles.controlGlyph}>−</Text>
        </Pressable>
        {photos.length > 0 ? (
          <Pressable
            onPress={() => fitAllPhotosInView(photos)}
            accessibilityRole="button"
            accessibilityLabel={fitAllLabel}
            style={[styles.controlFitBtn, ELEVATION.card]}
          >
            <Text style={styles.controlFitText}>{fitAllLabel}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => {
            setViewLat(center.latitude);
            setViewLon(center.longitude);
            setZoom(13);
          }}
          accessibilityRole="button"
          accessibilityLabel="Center on current walk area"
          style={[styles.controlBtn, ELEVATION.card]}
        >
          <UiIcon name="gps" size={16} color={COLORS.brandDark} />
        </Pressable>
      </View>

      {/* Attribution */}
      <View pointerEvents="none" style={styles.attributionBadge}>
        <Text style={styles.attributionText}>{MESSAGES.osmAttribution}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapHost: {
    flex: 1,
    backgroundColor: '#E8EFEA',
    overflow: 'hidden',
    position: 'relative',
  },
  tileImage: {
    position: 'absolute',
    width: TILE_SIZE + 1,
    height: TILE_SIZE + 1,
  },
  areaDotOuter: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(20, 128, 92, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  areaDotInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.brand,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  pinAnchor: {
    position: 'absolute',
    alignItems: 'center',
  },
  stackBackCard: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  photoFrame: {
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'relative',
  },
  photoFrameSelected: {
    borderColor: COLORS.brand,
    borderWidth: 2.5,
    borderRadius: 16,
  },
  photoThumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: COLORS.brandDark,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pinPointer: {
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    marginTop: -6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.14)',
  },
  pinPointerSelected: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  controlsColumn: {
    position: 'absolute',
    right: 12,
    top: 66,
    gap: 7,
    zIndex: 30,
    alignItems: 'flex-end',
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlGlyph: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  controlFitBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  controlFitText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  attributionBadge: {
    position: 'absolute',
    left: 10,
    bottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 5,
  },
  attributionText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 9.5,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
