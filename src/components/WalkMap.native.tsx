import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import {
  formatDistance,
  formatDriveMinutes,
  formatInteger,
  formatWalkMinutes,
  isWalkableSpotDistance,
} from '../i18n/formatters';
import { MESSAGES } from '../i18n/messages';
import { COLORS, getQualityColors } from '../theme/colors';
import { PlaceCategory } from '../types/walk';
import { wgs84ToGcj02 } from '../utils/chinaCoords';
import { WalkMapProps } from './WalkMap.types';

function getPinPrefix(category: PlaceCategory): string {
  if (category === 'dog_beach') return '🏖️ ';
  if (category === 'dog_park') return '🐕 ';
  if (category === 'trail') return '🌲 ';
  return '🌿 ';
}

function formatTravelText(distanceKm: number): string {
  return isWalkableSpotDistance(distanceKm)
    ? MESSAGES.walkTimeEstimate(formatWalkMinutes(distanceKm))
    : MESSAGES.driveTimeEstimate(formatDriveMinutes(distanceKm));
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
  const mapRef = useRef<MapView | null>(null);
  const [delta, setDelta] = useState(0.055);

  const mappedCenter = useMemo(
    () => wgs84ToGcj02(center.latitude, center.longitude),
    [center.latitude, center.longitude]
  );

  const selectedCorridor = useMemo(
    () => corridors.find((c) => c.id === selectedCorridorId) ?? null,
    [corridors, selectedCorridorId]
  );

  const selectedSpot =
    places.find((p) => p.place.id === selectedPlaceId) ?? places[0] ?? null;

  // Spatial clustering scaled to active MapKit region delta so pins never stack on top of each other
  const clusteredPins = useMemo(() => {
    const latThresh = delta * 0.14;
    const lonThresh = delta * 0.19;
    const placed: Array<{ sp: (typeof places)[number]; extraCount: number }> =
      [];
    const ordered: typeof places = [];
    if (selectedSpot) ordered.push(selectedSpot);
    for (const sp of places) {
      if (sp.place.id !== selectedSpot?.place.id) {
        ordered.push(sp);
      }
    }
    for (const sp of ordered) {
      const isSel = !selectedCorridor && sp.place.id === selectedSpot?.place.id;
      if (!isSel && delta > 0.009) {
        const anchor = placed.find(
          (item) =>
            Math.abs(item.sp.place.latitude - sp.place.latitude) < latThresh &&
            Math.abs(item.sp.place.longitude - sp.place.longitude) < lonThresh
        );
        if (anchor) {
          anchor.extraCount += 1;
          continue;
        }
      }
      placed.push({ sp, extraCount: 0 });
      if (placed.length >= 20) break;
    }
    return placed;
  }, [places, selectedSpot, selectedCorridor, delta]);

  useEffect(() => {
    const nextDelta = 0.055;
    setDelta(nextDelta);
    const region: Region = {
      latitude: mappedCenter.latitude,
      longitude: mappedCenter.longitude,
      latitudeDelta: nextDelta,
      longitudeDelta: nextDelta,
    };
    mapRef.current?.animateToRegion(region, 350);
  }, [mappedCenter.latitude, mappedCenter.longitude]);

  useEffect(() => {
    if (!customLoop || customLoop.coordinates.length < 3) return;
    const mid =
      customLoop.coordinates[Math.floor(customLoop.coordinates.length / 2)];
    const mappedMid = wgs84ToGcj02(
      (center.latitude + mid[0]) / 2,
      (center.longitude + mid[1]) / 2
    );
    const loopDelta = customLoop.durationMin <= 15 ? 0.018 : 0.028;
    setDelta(loopDelta);
    mapRef.current?.animateToRegion(
      {
        latitude: mappedMid.latitude,
        longitude: mappedMid.longitude,
        latitudeDelta: loopDelta,
        longitudeDelta: loopDelta,
      },
      300
    );
  }, [customLoop, center.latitude, center.longitude]);

  useEffect(() => {
    if (!selectedCorridor || selectedCorridor.coordinates.length === 0) return;
    const mid =
      selectedCorridor.coordinates[
        Math.floor(selectedCorridor.coordinates.length / 2)
      ];
    const mappedMid = wgs84ToGcj02(mid[0], mid[1]);
    mapRef.current?.animateToRegion(
      {
        latitude: mappedMid.latitude,
        longitude: mappedMid.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      },
      300
    );
  }, [selectedCorridor]);

  // Smoothly pan MapKit camera when selectedPlaceId changes externally (e.g. ‹ / › card switcher or Preview on Map)
  useEffect(() => {
    if (!selectedPlaceId || customLoop || selectedCorridor) return;
    const match = places.find((p) => p.place.id === selectedPlaceId);
    if (!match) return;
    const target = wgs84ToGcj02(match.place.latitude, match.place.longitude);
    mapRef.current?.animateToRegion(
      {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      280
    );
  }, [selectedPlaceId, customLoop, selectedCorridor, places, delta]);

  const handleZoom = (factor: number) => {
    const next = Math.max(0.006, Math.min(0.45, delta * factor));
    setDelta(next);
    const rawLat = selectedSpot?.place.latitude ?? center.latitude;
    const rawLon = selectedSpot?.place.longitude ?? center.longitude;
    const target = wgs84ToGcj02(rawLat, rawLon);
    mapRef.current?.animateToRegion(
      {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: next,
        longitudeDelta: next,
      },
      220
    );
  };

  const handleRecenter = () => {
    const next = 0.055;
    setDelta(next);
    mapRef.current?.animateToRegion(
      {
        latitude: mappedCenter.latitude,
        longitude: mappedCenter.longitude,
        latitudeDelta: next,
        longitudeDelta: next,
      },
      300
    );
    if (onLocateMe) {
      onLocateMe();
    }
  };

  const betterAlt = selectedCorridor?.betterAlternativeId
    ? corridors.find((c) => c.id === selectedCorridor.betterAlternativeId) ??
      null
    : null;

  return (
    <View style={[styles.mapFrame, fullScreen && styles.mapFrameFullScreen]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: mappedCenter.latitude,
          longitude: mappedCenter.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        showsCompass
        showsScale
      >
        {/* User Location Pin */}
        <Marker coordinate={mappedCenter} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.userHalo}>
            <View style={styles.userDot} />
          </View>
        </Marker>

        {/* Street Convenience Corridors */}
        {showStreetsOverlay
          ? corridors.map((cor) => {
              const strokeColor =
                cor.baseConvenience === 'easy'
                  ? '#10B981'
                  : cor.baseConvenience === 'moderate'
                    ? '#F59E0B'
                    : '#EF4444';
              const isSel = cor.id === selectedCorridorId;
              return (
                <Polyline
                  key={cor.id}
                  coordinates={cor.coordinates.map(([lat, lon]) =>
                    wgs84ToGcj02(lat, lon)
                  )}
                  strokeColor={strokeColor}
                  strokeWidth={isSel ? 6 : 4}
                  lineDashPattern={
                    cor.baseConvenience === 'hard' ? [6, 6] : undefined
                  }
                  tappable
                  onPress={() => onSelectCorridor?.(cor.id)}
                />
              );
            })
          : null}

        {/* Doorstep Circular Loop OR Selected Spot Trail Route Polyline */}
        {customLoop ? (
          <Polyline
            coordinates={customLoop.coordinates.map(([lat, lon]) =>
              wgs84ToGcj02(lat, lon)
            )}
            strokeColor="#0D9488"
            strokeWidth={5}
            lineDashPattern={[8, 5]}
          />
        ) : selectedSpot?.place.routePath ? (
          <Polyline
            coordinates={selectedSpot.place.routePath.map(([lat, lon]) =>
              wgs84ToGcj02(lat, lon)
            )}
            strokeColor={COLORS.brand}
            strokeWidth={4}
          />
        ) : null}

        {/* Dashed Approach Line */}
        {!customLoop && !selectedCorridor && selectedSpot ? (
          <Polyline
            coordinates={[
              mappedCenter,
              wgs84ToGcj02(
                selectedSpot.place.latitude,
                selectedSpot.place.longitude
              ),
            ]}
            strokeColor={COLORS.brand}
            strokeWidth={2.5}
            lineDashPattern={[6, 5]}
          />
        ) : null}

        {/* De-cluttered Park & Trail Pins with Category Glyphs + Cluster Badges */}
        {clusteredPins.map(({ sp, extraCount }) => {
          const isSelected =
            !selectedCorridor && sp.place.id === selectedSpot?.place.id;
          const tier =
            sp.placeScore >= 82
              ? 'ideal'
              : sp.placeScore >= 65
                ? 'good'
                : 'caution';
          const pinColors = getQualityColors(tier);
          const coord = wgs84ToGcj02(sp.place.latitude, sp.place.longitude);
          return (
            <Marker
              key={sp.place.id}
              coordinate={coord}
              onPress={() => onSelectPlace(sp.place.id)}
              zIndex={isSelected ? 30 : 10}
            >
              <View style={styles.pinClusterRow}>
                <View
                  style={[
                    styles.pinPill,
                    {
                      backgroundColor: isSelected
                        ? COLORS.textPrimary
                        : pinColors.accent,
                    },
                    isSelected && styles.pinPillSelected,
                  ]}
                >
                  <Text style={styles.pinScoreText} numberOfLines={1}>
                    {getPinPrefix(sp.place.category)}
                    {pinLabelFormatter
                      ? pinLabelFormatter(
                          sp,
                          Math.max(
                            0,
                            places.findIndex((x) => x.place.id === sp.place.id)
                          )
                        )
                      : formatInteger(sp.placeScore)}
                  </Text>
                </View>
                {extraCount > 0 ? (
                  <View style={styles.clusterCountPill}>
                    <Text style={styles.clusterCountText}>
                      +{formatInteger(extraCount)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Street Guide Legend Toggle */}
      {!hideBuiltInStreetPill && corridors.length > 0 && onToggleStreetsOverlay ? (
        <Pressable
          onPress={onToggleStreetsOverlay}
          style={[
            styles.streetTogglePill,
            topControlsOffset > 0 ? { top: 12 + topControlsOffset } : null,
          ]}
        >
          <Text style={styles.streetToggleText}>
            {showStreetsOverlay
              ? '🟢 Easy · 🟡 Peak · 🔴 Narrow'
              : '🛣️ Show Street Lines'}
          </Text>
        </Pressable>
      ) : null}

      {/* Map Controls */}
      <View
        style={[
          styles.controlsCol,
          topControlsOffset > 0 ? { top: 12 + topControlsOffset } : null,
        ]}
      >
        <Pressable onPress={() => handleZoom(0.6)} style={styles.mapCtrlBtn}>
          <Text style={styles.mapCtrlText}>+</Text>
        </Pressable>
        <Pressable onPress={() => handleZoom(1.65)} style={styles.mapCtrlBtn}>
          <Text style={styles.mapCtrlText}>−</Text>
        </Pressable>
        <Pressable
          onPress={handleRecenter}
          style={[
            styles.mapCtrlBtn,
            center.isCurrentDeviceLocation && styles.mapCtrlBtnGpsActive,
          ]}
        >
          <Text
            style={[
              styles.mapCtrlText,
              center.isCurrentDeviceLocation && styles.mapCtrlTextGpsActive,
            ]}
          >
            {isLocating ? '…' : '◎'}
          </Text>
        </Pressable>
      </View>

      {/* Floating Bottom Bar */}
      {hideBuiltInBottomBar ? null : customLoop ? (
        <View style={styles.floatingSpotBar}>
          <View style={styles.floatingTextCol}>
            <Text style={styles.floatingSpotName} numberOfLines={1}>
              🔁 {formatInteger(customLoop.durationMin)} min Doorstep Loop ·{' '}
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
        <View style={styles.floatingSpotBar}>
          <View style={styles.floatingTextCol}>
            <Text style={styles.floatingSpotName} numberOfLines={1}>
              {selectedCorridor.baseConvenience === 'easy'
                ? '🟢 '
                : selectedCorridor.baseConvenience === 'moderate'
                  ? '🟡 '
                  : '🔴 '}
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
        <View style={styles.floatingSpotBar}>
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
  userHalo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  pinClusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clusterCountPill: {
    backgroundColor: '#1E293B',
    paddingVertical: 3,
    paddingHorizontal: 5.5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginStart: -6,
  },
  clusterCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  pinPillSelected: {
    transform: [{ scale: 1.15 }],
  },
  pinScoreText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  streetTogglePill: {
    position: 'absolute',
    top: 12,
    start: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streetToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  controlsCol: {
    position: 'absolute',
    top: 12,
    end: 12,
    gap: 6,
  },
  mapCtrlBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCtrlBtnGpsActive: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandLight,
  },
  mapCtrlText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mapCtrlTextGpsActive: {
    color: COLORS.brandDark,
  },
  floatingSpotBar: {
    position: 'absolute',
    bottom: 10,
    start: 10,
    end: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  floatingTextCol: {
    flex: 1,
  },
  floatingSpotName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  floatingSpotSub: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  floatingGoBtn: {
    backgroundColor: COLORS.textPrimary,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 10,
  },
  floatingGoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
