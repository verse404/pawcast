import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Polyline as SvgPolyline } from 'react-native-svg';
import {
  formatDistance,
  formatDriveMinutes,
  formatInteger,
  formatWalkMinutes,
  isWalkableSpotDistance,
} from '../i18n/formatters';
import { MESSAGES } from '../i18n/messages';
import {
  COLORS,
  ELEVATION,
  getQualityColors,
  UI_FONT_FAMILY,
} from '../theme/colors';
import {
  PlaceCategory,
  ScoredPlace,
  StreetConvenienceLevel,
} from '../types/walk';
import { UiIcon, UiIconName } from './UiIcons';
import { WalkMapProps } from './WalkMap.types';

const TILE_SIZE = 256;

function getPinIconName(category: PlaceCategory): UiIconName {
  if (category === 'dog_beach') return 'water';
  if (category === 'dog_park') return 'paw';
  if (category === 'trail') return 'forest';
  return 'park';
}

function formatTravelText(distanceKm: number): string {
  return isWalkableSpotDistance(distanceKm)
    ? MESSAGES.walkTimeEstimate(formatWalkMinutes(distanceKm))
    : MESSAGES.driveTimeEstimate(formatDriveMinutes(distanceKm));
}

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

function getStreetStroke(level: StreetConvenienceLevel): {
  color: string;
  dash?: string;
} {
  switch (level) {
    case 'easy':
      return { color: '#10B981' };
    case 'moderate':
      return { color: '#F59E0B' };
    case 'hard':
      return { color: '#EF4444', dash: '5,5' };
  }
}

export const WalkMap: React.FC<WalkMapProps> = ({
  center,
  places,
  selectedPlaceId,
  corridors = [],
  selectedCorridorId = null,
  showStreetsOverlay = true,
  customLoop = null,
  isLocating = false,
  units,
  fullScreen = false,
  hideBuiltInBottomBar = false,
  hideBuiltInStreetPill = false,
  topControlsOffset = 0,
  pinLabelFormatter,
  onSelectPlace,
  onInspectSelectedPlace,
  onSelectCorridor,
  onToggleStreetsOverlay,
  onLocateMe,
  onOpenDirections,
  onOpenLoopDirections,
}) => {
  const [zoom, setZoom] = useState(13);
  const [viewLat, setViewLat] = useState(center.latitude);
  const [viewLon, setViewLon] = useState(center.longitude);
  const [size, setSize] = useState({ width: 360, height: 312 });
  const [isDragging, setIsDragging] = useState(false);

  const mapHostRef = useRef<React.ComponentRef<typeof View> | null>(null);
  const lastWheelTsRef = useRef(0);
  const isPinchingRef = useRef(false);
  const pinchStartDistRef = useRef(0);
  const viewStateRef = useRef({ lat: viewLat, lon: viewLon, zoom });
  viewStateRef.current = { lat: viewLat, lon: viewLon, zoom };
  const dragStartRef = useRef({ worldX: 0, worldY: 0, zoom: 13 });

  useEffect(() => {
    setViewLat(center.latitude);
    setViewLon(center.longitude);
    setZoom(13);
  }, [center.latitude, center.longitude]);

  // Smooth mouse-wheel zoom & two-finger touch pinch-to-zoom on Web
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
        ev.deltaY < 0 ? Math.min(16, z + 1) : Math.max(10, z - 1)
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
        if (ratio >= 1.26) {
          pinchStartDistRef.current = curDist;
          setZoom((z) => Math.min(16, z + 1));
        } else if (ratio <= 0.79) {
          pinchStartDistRef.current = curDist;
          setZoom((z) => Math.max(10, z - 1));
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

  const selectedCorridor = useMemo(
    () => corridors.find((c) => c.id === selectedCorridorId) ?? null,
    [corridors, selectedCorridorId]
  );

  useEffect(() => {
    if (!customLoop || customLoop.coordinates.length < 3) return;
    const mid =
      customLoop.coordinates[Math.floor(customLoop.coordinates.length / 2)];
    setViewLat((center.latitude + mid[0]) / 2);
    setViewLon((center.longitude + mid[1]) / 2);
    setZoom(customLoop.durationMin <= 15 ? 15 : 14);
  }, [customLoop, center.latitude, center.longitude]);

  useEffect(() => {
    if (!selectedCorridor || selectedCorridor.coordinates.length === 0) return;
    const mid =
      selectedCorridor.coordinates[
        Math.floor(selectedCorridor.coordinates.length / 2)
      ];
    setViewLat(mid[0]);
    setViewLon(mid[1]);
    setZoom((z) => Math.max(z, 14));
  }, [selectedCorridor]);

  const selectedSpot =
    places.find((p) => p.place.id === selectedPlaceId) ?? places[0] ?? null;

  useEffect(() => {
    if (!selectedPlaceId || customLoop || selectedCorridor) return;
    const match = places.find((p) => p.place.id === selectedPlaceId);
    if (match) {
      setViewLat(match.place.latitude);
      setViewLon(match.place.longitude);
    }
  }, [selectedPlaceId, customLoop, selectedCorridor, places]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gs) =>
          !isPinchingRef.current && (Math.abs(gs.dx) > 4 || Math.abs(gs.dy) > 4),
        onPanResponderGrant: () => {
          if (isPinchingRef.current) return;
          const cur = viewStateRef.current;
          setIsDragging(true);
          dragStartRef.current = {
            worldX: lonToWorldX(cur.lon, cur.zoom),
            worldY: latToWorldY(cur.lat, cur.zoom),
            zoom: cur.zoom,
          };
        },
        onPanResponderMove: (_evt, gs) => {
          if (isPinchingRef.current) return;
          const z = dragStartRef.current.zoom;
          const nextWx = dragStartRef.current.worldX - gs.dx;
          const nextWy = dragStartRef.current.worldY - gs.dy;
          setViewLon(worldXToLon(nextWx, z));
          setViewLat(worldYToLat(nextWy, z));
        },
        onPanResponderRelease: () => setIsDragging(false),
        onPanResponderTerminate: () => setIsDragging(false),
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

  const [fallbackTileKeys, setFallbackTileKeys] = useState<
    Record<string, boolean>
  >({});

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

  const toScreenPts = (coords: Array<[number, number]>): string =>
    coords
      .map(([lat, lon]) => {
        const x = Math.round(lonToWorldX(lon, zoom) - topLeftWx);
        const y = Math.round(latToWorldY(lat, zoom) - topLeftWy);
        return `${x},${y}`;
      })
      .join(' ');

  const userPx = {
    x: lonToWorldX(center.longitude, zoom) - topLeftWx,
    y: latToWorldY(center.latitude, zoom) - topLeftWy,
  };

  const selectedPx = selectedSpot
    ? {
        x: lonToWorldX(selectedSpot.place.longitude, zoom) - topLeftWx,
        y: latToWorldY(selectedSpot.place.latitude, zoom) - topLeftWy,
      }
    : null;

  const handleRecenter = () => {
    setViewLat(center.latitude);
    setViewLon(center.longitude);
    setZoom(13);
    if (onLocateMe) {
      onLocateMe();
    }
  };

  const handleFocusPlace = (
    id: string,
    lat: number,
    lon: number,
    alreadySelected: boolean
  ) => {
    if (alreadySelected && onInspectSelectedPlace) {
      onInspectSelectedPlace(id);
      return;
    }
    onSelectPlace(id);
    setViewLat((center.latitude + lat) / 2);
    setViewLon((center.longitude + lon) / 2);
  };

  const visiblePins = useMemo(() => {
    const placed: Array<{
      sp: ScoredPlace;
      px: number;
      py: number;
      extraCount: number;
    }> = [];
    const ordered: ScoredPlace[] = [];
    if (selectedSpot) ordered.push(selectedSpot);
    for (const sp of places) {
      if (sp.place.id !== selectedSpot?.place.id) {
        ordered.push(sp);
      }
    }
    for (const sp of ordered) {
      const px = lonToWorldX(sp.place.longitude, zoom) - topLeftWx;
      const py = latToWorldY(sp.place.latitude, zoom) - topLeftWy;
      const isSel = !selectedCorridor && sp.place.id === selectedSpot?.place.id;

      const topSafe = isSel ? 12 : 46 + topControlsOffset;
      const bottomSafe = isSel ? 94 : hideBuiltInBottomBar ? 150 : 62;
      if (
        px < 18 ||
        px > size.width - 18 ||
        py < topSafe ||
        py > size.height - bottomSafe
      ) {
        continue;
      }
      if (!isSel && px > size.width - 118 && py < 192 + topControlsOffset) {
        continue;
      }

      const clusterXThresh = pinLabelFormatter ? 102 : 54;
      const clusterYThresh = pinLabelFormatter ? 34 : 28;
      if (!isSel && zoom < 16) {
        const anchor = placed.find(
          (item) =>
            Math.abs(item.px - px) < clusterXThresh &&
            Math.abs(item.py - py) < clusterYThresh
        );
        if (anchor) {
          anchor.extraCount += 1;
          continue;
        }
      }
      placed.push({ sp, px, py, extraCount: 0 });
      if (placed.length >= 18) break;
    }
    return placed;
  }, [
    places,
    selectedSpot,
    selectedCorridor,
    zoom,
    topLeftWx,
    topLeftWy,
    size.width,
    size.height,
    topControlsOffset,
    hideBuiltInBottomBar,
    pinLabelFormatter,
  ]);

  const betterAlt = selectedCorridor?.betterAlternativeId
    ? corridors.find((c) => c.id === selectedCorridor.betterAlternativeId) ??
      null
    : null;

  return (
    <View
      ref={mapHostRef}
      style={[
        styles.mapFrame,
        fullScreen && styles.mapFrameFullScreen,
        Platform.OS === 'web'
          ? ({ cursor: isDragging ? 'grabbing' : 'grab' } as object)
          : null,
      ]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {/* Street & Park Slippy Tiles (Zero-Referer Compatible + Automatic Failover) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {tiles.map((tile) => {
          const useFallback = Boolean(fallbackTileKeys[tile.key]);
          return (
            <Image
              key={tile.key}
              source={{ uri: useFallback ? tile.fallbackUrl : tile.url }}
              onError={() => {
                if (!useFallback) {
                  setFallbackTileKeys((prev) => {
                    const keys = Object.keys(prev);
                    if (keys.length >= 60) {
                      return { [tile.key]: true };
                    }
                    return { ...prev, [tile.key]: true };
                  });
                }
              }}
              style={[
                styles.tileImg,
                { left: Math.round(tile.left), top: Math.round(tile.top) },
              ]}
            />
          );
        })}
      </View>

      {/* Street Convenience Corridors + Trail Loops + Approach Line */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={size.width} height={size.height}>
          {showStreetsOverlay
            ? corridors.map((cor) => {
                const isCorSel = cor.id === selectedCorridorId;
                const stroke = getStreetStroke(cor.baseConvenience);
                return (
                  <React.Fragment key={cor.id}>
                    <SvgPolyline
                      points={toScreenPts(cor.coordinates)}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth={isCorSel ? 9 : 6.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.92}
                    />
                    <SvgPolyline
                      points={toScreenPts(cor.coordinates)}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={isCorSel ? 6 : 4}
                      strokeDasharray={stroke.dash}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </React.Fragment>
                );
              })
            : null}

          {customLoop ? (
            <>
              <SvgPolyline
                points={toScreenPts(customLoop.coordinates)}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.94}
              />
              <SvgPolyline
                points={toScreenPts(customLoop.coordinates)}
                fill="none"
                stroke="#0D9488"
                strokeWidth={5}
                strokeDasharray="8,5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : selectedSpot?.place.routePath ? (
            <SvgPolyline
              points={toScreenPts(selectedSpot.place.routePath)}
              fill="none"
              stroke={COLORS.brand}
              strokeWidth={4.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {!customLoop && !selectedCorridor && selectedPx ? (
            <Line
              x1={userPx.x}
              y1={userPx.y}
              x2={selectedPx.x}
              y2={selectedPx.y}
              stroke={COLORS.brand}
              strokeWidth={2.5}
              strokeDasharray="5,5"
            />
          ) : null}
        </Svg>
      </View>

      {/* Tappable Midpoint Badges for Street Corridors */}
      {showStreetsOverlay && onSelectCorridor
        ? corridors.map((cor) => {
            const isSel = cor.id === selectedCorridorId;
            if (!isSel && zoom < 13) {
              return null;
            }
            const mid =
              cor.coordinates[Math.floor(cor.coordinates.length / 2)];
            const mx = lonToWorldX(mid[1], zoom) - topLeftWx;
            const my = latToWorldY(mid[0], zoom) - topLeftWy;
            if (
              mx < 16 ||
              mx > size.width - 16 ||
              my < 48 + topControlsOffset ||
              my > size.height - (hideBuiltInBottomBar ? 156 : 70)
            ) {
              return null;
            }
            const dotBg =
              cor.baseConvenience === 'easy'
                ? '#10B981'
                : cor.baseConvenience === 'moderate'
                  ? '#F59E0B'
                  : '#EF4444';
            return (
              <Pressable
                key={`badge-${cor.id}`}
                onPress={() => onSelectCorridor(cor.id)}
                accessibilityRole="button"
                accessibilityLabel={`Inspect walking corridor: ${cor.name}`}
                style={[
                  styles.corridorMidDot,
                  ELEVATION.pin,
                  {
                    left: mx - 11,
                    top: my - 11,
                    backgroundColor: dotBg,
                    zIndex: isSel ? 34 : 18,
                  },
                  isSel && styles.pinPillSelected,
                ]}
              >
                <Text style={styles.corridorMidSymbol}>
                  {cor.baseConvenience === 'hard' ? '!' : '≈'}
                </Text>
              </Pressable>
            );
          })
        : null}

      {/* User GPS Dot */}
      <View
        pointerEvents="none"
        style={[
          styles.userHalo,
          { left: userPx.x - 15, top: userPx.y - 15 },
        ]}
      >
        <View style={styles.userDot} />
      </View>

      {/* Interactive Park & Trail Pins with Vector Glyphs + Drop Shadow */}
      {visiblePins.map(({ sp, px, py, extraCount }) => {
        const isSelected =
          !selectedCorridor && sp.place.id === selectedSpot?.place.id;
        const tier =
          sp.placeScore >= 82
            ? 'ideal'
            : sp.placeScore >= 65
              ? 'good'
              : 'caution';
        const pinColors = getQualityColors(tier);

        const rankIdx = Math.max(
          0,
          places.findIndex((x) => x.place.id === sp.place.id)
        );
        const labelStr = pinLabelFormatter
          ? pinLabelFormatter(sp, rankIdx)
          : formatInteger(sp.placeScore);
        // Count CJK wide glyphs (~12.5px) vs ASCII (~6.8px) so Chinese pins never clip
        let visualTextPx = 0;
        for (let i = 0; i < labelStr.length; i++) {
          visualTextPx += labelStr.charCodeAt(i) > 0x2e7f ? 12.5 : 6.8;
        }
        const estPillW = pinLabelFormatter
          ? Math.min(168, Math.max(76, Math.round(visualTextPx) + 34)) +
            (extraCount > 0 ? 22 : 0)
          : 50 + (extraCount > 0 ? 22 : 0);
        const clampedLeft = Math.max(
          8,
          Math.min(size.width - estPillW - 8, Math.round(px - estPillW / 2))
        );

        return (
          <View
            key={sp.place.id}
            style={[
              styles.pinClusterGroup,
              {
                left: clampedLeft,
                top: Math.round(py - 26),
                zIndex: isSelected ? 32 : 16,
              },
              isSelected && styles.pinPillSelected,
            ]}
          >
            <Pressable
              onPress={() =>
                handleFocusPlace(
                  sp.place.id,
                  sp.place.latitude,
                  sp.place.longitude,
                  isSelected
                )
              }
              accessibilityRole="button"
              accessibilityLabel={`${sp.place.name}, ${labelStr}`}
              style={[
                styles.pinPill,
                ELEVATION.pin,
                {
                  backgroundColor: isSelected
                    ? COLORS.textPrimary
                    : !sp.openStatus.isOpen
                      ? '#475569'
                      : pinColors.accent,
                },
              ]}
            >
              <UiIcon
                name={getPinIconName(sp.place.category)}
                size={12}
                color="#FFFFFF"
              />
              <Text style={styles.pinScoreText} numberOfLines={1}>
                {labelStr}
              </Text>
            </Pressable>

            {extraCount > 0 ? (
              <Pressable
                onPress={() => {
                  setViewLat(sp.place.latitude);
                  setViewLon(sp.place.longitude);
                  setZoom((z) => Math.min(16, z + 2));
                }}
                style={[styles.clusterCountPill, ELEVATION.pin]}
              >
                <Text style={styles.clusterCountText}>
                  +{formatInteger(extraCount)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}

      {hideBuiltInStreetPill ? null : (
        <View
          style={[
            styles.topLeftGroup,
            topControlsOffset > 0 ? { top: 10 + topControlsOffset } : null,
          ]}
        >
          {corridors.length > 0 && onToggleStreetsOverlay ? (
            <Pressable
              onPress={onToggleStreetsOverlay}
              accessibilityRole="button"
              accessibilityLabel="Toggle street convenience lines"
              style={[styles.streetTogglePill, ELEVATION.floating]}
            >
              <Text style={styles.streetToggleText}>
                {showStreetsOverlay
                  ? 'Easy · Peak · Narrow'
                  : 'Show Street Lines'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.attributionPill} pointerEvents="none">
              <Text style={styles.attributionText}>
                {MESSAGES.osmAttribution}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Subtle Map Tile Attribution Pill (Required by Esri & OSM Terms) */}
      {hideBuiltInStreetPill ? (
        <View
          style={[
            styles.attributionCorner,
            { bottom: hideBuiltInBottomBar ? 148 : 66 },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.attributionText}>{MESSAGES.osmAttribution}</Text>
        </View>
      ) : null}

      {/* Sculpted Zoom & Locate Me Controls */}
      <View
        style={[
          styles.controlsCol,
          ELEVATION.floating,
          topControlsOffset > 0 ? { top: 10 + topControlsOffset } : null,
        ]}
      >
        <Pressable
          onPress={() => setZoom((z) => Math.min(16, z + 1))}
          accessibilityRole="button"
          accessibilityLabel="Zoom in"
          style={styles.mapCtrlBtn}
        >
          <Text style={styles.mapCtrlText}>+</Text>
        </Pressable>
        <View style={styles.mapCtrlDivider} />
        <Pressable
          onPress={() => setZoom((z) => Math.max(10, z - 1))}
          accessibilityRole="button"
          accessibilityLabel="Zoom out"
          style={styles.mapCtrlBtn}
        >
          <Text style={styles.mapCtrlText}>−</Text>
        </Pressable>
        <View style={styles.mapCtrlDivider} />
        <Pressable
          onPress={handleRecenter}
          disabled={isLocating}
          accessibilityRole="button"
          accessibilityLabel="Recenter to my location"
          style={[
            styles.mapCtrlBtn,
            center.isCurrentDeviceLocation && styles.mapCtrlBtnGpsActive,
          ]}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={COLORS.brandDark} />
          ) : (
            <UiIcon
              name="gps"
              size={16}
              color={
                center.isCurrentDeviceLocation
                  ? COLORS.brandDark
                  : COLORS.textPrimary
              }
            />
          )}
        </Pressable>
      </View>

      {hideBuiltInBottomBar ? null : customLoop ? (
        <View style={[styles.floatingSpotBar, ELEVATION.floating]}>
          <View style={styles.floatingTextCol}>
            <Text style={styles.floatingSpotName} numberOfLines={1}>
              {formatInteger(customLoop.durationMin)} min Doorstep Loop ·{' '}
              {formatDistance(customLoop.distanceKm, units)}
            </Text>
            <Text style={styles.floatingSpotSub} numberOfLines={1}>
              Via {customLoop.anchorName}
              {customLoop.avoidedName
                ? ` · Skips ${customLoop.avoidedName}`
                : ''}
            </Text>
          </View>
          {onOpenLoopDirections ? (
            <Pressable
              onPress={() => onOpenLoopDirections(customLoop)}
              style={styles.floatingGoBtn}
            >
              <Text style={styles.floatingGoText}>Start Loop ›</Text>
            </Pressable>
          ) : null}
        </View>
      ) : selectedCorridor ? (
        <View style={[styles.floatingSpotBar, ELEVATION.floating]}>
          <View style={styles.floatingTextCol}>
            <Text style={styles.floatingSpotName} numberOfLines={1}>
              {selectedCorridor.name}
            </Text>
            <Text style={styles.floatingSpotSub} numberOfLines={1}>
              {selectedCorridor.sidewalkWidth} · {selectedCorridor.crowdSummary}
            </Text>
          </View>
          {betterAlt && onSelectCorridor ? (
            <Pressable
              onPress={() => onSelectCorridor(betterAlt.id)}
              style={styles.floatingGoBtn}
            >
              <Text style={styles.floatingGoText}>Better Trail ›</Text>
            </Pressable>
          ) : null}
        </View>
      ) : selectedSpot ? (
        <View style={[styles.floatingSpotBar, ELEVATION.floating]}>
          <Pressable
            onPress={() => onInspectSelectedPlace?.(selectedSpot.place.id)}
            style={styles.floatingTextCol}
          >
            <Text style={styles.floatingSpotName} numberOfLines={1}>
              {selectedSpot.place.name}
            </Text>
            <Text style={styles.floatingSpotSub} numberOfLines={1}>
              {formatTravelText(selectedSpot.place.distanceKm)} ·{' '}
              {formatDistance(selectedSpot.place.distanceKm, units)} · Details ↓
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onOpenDirections(selectedSpot)}
            style={styles.floatingGoBtn}
          >
            <Text style={styles.floatingGoText}>
              {MESSAGES.goDirectionsShort}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  mapFrame: {
    height: 312,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#E5ECE8',
    position: 'relative',
  },
  mapFrameFullScreen: {
    flex: 1,
    height: '100%',
    borderRadius: 0,
    borderWidth: 0,
  },
  tileImg: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  userHalo: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  corridorMidDot: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corridorMidSymbol: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  pinClusterGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pinPill: {
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8.5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clusterCountPill: {
    backgroundColor: '#1E293B',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginStart: -6,
  },
  clusterCountText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  pinPillSelected: {
    transform: [{ scale: 1.12 }],
  },
  pinScoreText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  topLeftGroup: {
    position: 'absolute',
    top: 10,
    start: 10,
    zIndex: 40,
  },
  streetTogglePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  streetToggleText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  attributionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  attributionCorner: {
    position: 'absolute',
    start: 10,
    zIndex: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    paddingVertical: 2.5,
    paddingHorizontal: 6.5,
    borderRadius: 6,
  },
  attributionText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  controlsCol: {
    position: 'absolute',
    top: 10,
    end: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.08)',
    overflow: 'hidden',
    zIndex: 40,
  },
  mapCtrlBtn: {
    width: 36,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtrlDivider: {
    height: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  mapCtrlBtnGpsActive: {
    backgroundColor: COLORS.brandLight,
  },
  mapCtrlText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  floatingSpotBar: {
    position: 'absolute',
    bottom: 10,
    start: 10,
    end: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 35, 28, 0.08)',
    zIndex: 40,
  },
  floatingTextCol: {
    flex: 1,
  },
  floatingSpotName: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  floatingSpotSub: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  floatingGoBtn: {
    backgroundColor: COLORS.brand,
    paddingVertical: 7.5,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  floatingGoText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
