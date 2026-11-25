import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { findNearestAuSuburbs } from '../constants/auSuburbs';
import {
  BREED_PRESETS,
  DEFAULT_DOG_PROFILE,
  PRESET_LOCATIONS,
} from '../constants/presets';
import {
  findBestWalkWindows,
  mergePackDogProfile,
  scorePlacesForHour,
  scoreWeatherHourForPack,
} from '../engine/walkScoring';
import { getStrings } from '../i18n/translations';
import {
  fetchNearbyWalkPlaces,
  haversineDistanceKm,
  reverseGeocodeCoordinates,
} from '../services/placesService';
import { fetchWalkForecast } from '../services/weatherService';
import {
  AppLanguage,
  DogProfile,
  ForecastBundle,
  HourlyWeatherPoint,
  LocationPoint,
  ScoredHour,
  ScoredPlace,
  ScoreVizMode,
  UnitSystem,
  WalkLogEntry,
  WalkPlace,
  WalkWindow,
} from '../types/walk';
import {
  parseDeepLinkParams,
  readInitialWebDeepLink,
} from '../utils/deepLinks';
import {
  isValidCoordinate,
  sanitizeAvatarDataUri,
  sanitizeDogName,
  sanitizeText,
} from '../utils/validation';

/**
 * Note on client storage security:
 * Only non-sensitive UI preferences (unit system, dog traits, city name/coords,
 * local walk logs, and cached public weather forecasts) are stored in AsyncStorage.
 * TODO(security): Never store authentication tokens, session IDs, or sensitive PII
 * in AsyncStorage/localStorage; use HttpOnly/Secure server cookies or OS Keychain
 * when adding user accounts.
 */
const STORAGE_KEY_PREFS = '@pawcast/multi-region/v2.2';
const STORAGE_KEY_OFFLINE_FORECAST = '@pawcast/offline-forecast/v1';
const OFFLINE_CACHE_MAX_AGE_MS = 18 * 60 * 60 * 1000;
const OFFLINE_CACHE_MAX_ITEMS = 3;
const MAX_HOUSEHOLD_DOGS = 5;
const MAX_WALK_LOGS = 100;

export interface GpsFixInfo {
  latitude: number;
  longitude: number;
  name: string;
  region: string;
  timezone: string;
  isDemo?: boolean;
}

interface WalkPlannerContextValue {
  location: LocationPoint;
  setLocation: (loc: LocationPoint) => void;
  gpsFix: GpsFixInfo | null;
  locateGpsCoordinates: () => Promise<GpsFixInfo | null>;
  applyDemoGpsFix: (latitude: number, longitude: number) => GpsFixInfo;
  requestGpsLocation: () => Promise<boolean>;
  isLocating: boolean;
  locationNotice: string | null;
  clearLocationNotice: () => void;

  units: UnitSystem;
  setUnits: (next: UnitSystem) => void;
  toggleUnits: () => void;

  language: AppLanguage;
  setLanguage: (next: AppLanguage) => void;
  toggleLanguage: () => void;

  scoreVizMode: ScoreVizMode;
  setScoreVizMode: (mode: ScoreVizMode) => void;

  savedPlaceIds: string[];
  toggleSavedPlace: (id: string) => void;

  spotNotes: Record<string, string>;
  setSpotNote: (placeId: string, note: string) => void;

  dog: DogProfile;
  dogs: DogProfile[];
  activeDogIds: string[];
  activeDogs: DogProfile[];
  isPackMode: boolean;
  updateDog: (patch: Partial<DogProfile>, targetDogId?: string) => void;
  selectSingleDog: (dogId: string) => void;
  toggleWalkDog: (dogId: string) => void;
  addDog: (breedId?: string) => string;
  removeDog: (dogId: string) => void;

  walkLogs: WalkLogEntry[];
  logWalk: (entry: {
    placeId: string;
    placeName: string;
    cityLabel: string;
    durationMin: number;
    distanceKm: number;
  }) => void;
  deleteWalkLog: (logId: string) => void;

  pendingDeepLinkSpotId: string | null;
  clearPendingDeepLinkSpot: () => void;

  isLoading: boolean;
  isOfflineForecast: boolean;
  errorBanner: string | null;
  refreshData: () => Promise<void>;

  forecast: ForecastBundle | null;
  scoredHours: ScoredHour[];
  bestWindows: WalkWindow[];
  selectedHourIndex: number;
  setSelectedHourIndex: (idx: number) => void;
  selectedHour: ScoredHour | null;

  scoredPlaces: ScoredPlace[];
  hasCuratedPlacesFallback: boolean;
}

const WalkPlannerContext = createContext<WalkPlannerContextValue | undefined>(
  undefined
);

function parseStoredDog(raw: unknown, fallbackId = 'dog-primary'): DogProfile {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_DOG_PROFILE, id: fallbackId };
  }
  const obj = raw as Record<string, unknown>;
  const sizes = ['small', 'medium', 'large', 'giant'] as const;
  const ages = ['puppy', 'adult', 'senior'] as const;
  const coats = ['short', 'medium', 'thick'] as const;
  const paws = ['tough', 'normal', 'sensitive'] as const;

  return {
    id: sanitizeText(obj.id, 32) || fallbackId,
    name: sanitizeDogName(obj.name) || DEFAULT_DOG_PROFILE.name,
    breedId: sanitizeText(obj.breedId, 24) || DEFAULT_DOG_PROFILE.breedId,
    size: sizes.includes(obj.size as (typeof sizes)[number])
      ? (obj.size as DogProfile['size'])
      : DEFAULT_DOG_PROFILE.size,
    ageGroup: ages.includes(obj.ageGroup as (typeof ages)[number])
      ? (obj.ageGroup as DogProfile['ageGroup'])
      : DEFAULT_DOG_PROFILE.ageGroup,
    coat: coats.includes(obj.coat as (typeof coats)[number])
      ? (obj.coat as DogProfile['coat'])
      : DEFAULT_DOG_PROFILE.coat,
    brachycephalic: Boolean(obj.brachycephalic),
    pawSensitivity: paws.includes(obj.pawSensitivity as (typeof paws)[number])
      ? (obj.pawSensitivity as DogProfile['pawSensitivity'])
      : DEFAULT_DOG_PROFILE.pawSensitivity,
    hasDogLicense:
      obj.hasDogLicense === undefined ? true : Boolean(obj.hasDogLicense),
    customPhotoUri: sanitizeAvatarDataUri(obj.customPhotoUri),
  };
}

function parseStoredWalkLogs(raw: unknown): WalkLogEntry[] {
  if (!Array.isArray(raw)) return [];
  const clean: WalkLogEntry[] = [];
  for (const item of raw.slice(0, MAX_WALK_LOGS)) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const id = sanitizeText(rec.id, 40);
    const placeId = sanitizeText(rec.placeId, 48);
    const placeName = sanitizeText(rec.placeName, 70);
    const cityLabel = sanitizeText(rec.cityLabel, 40);
    const ts = Number(rec.timestampMs);
    const durationMin = Number(rec.durationMin);
    const distanceKm = Number(rec.distanceKm);
    if (
      !id ||
      !placeName ||
      !Number.isFinite(ts) ||
      ts < 1_600_000_000_000 ||
      !Number.isFinite(durationMin) ||
      !Number.isFinite(distanceKm)
    ) {
      continue;
    }
    const dogNames = Array.isArray(rec.dogNames)
      ? rec.dogNames
          .filter((x): x is string => typeof x === 'string')
          .map((x) => sanitizeDogName(x))
          .filter(Boolean)
          .slice(0, MAX_HOUSEHOLD_DOGS)
      : [DEFAULT_DOG_PROFILE.name];
    clean.push({
      id,
      timestampMs: Math.round(ts),
      placeId: placeId || 'custom-walk',
      placeName,
      cityLabel: cityLabel || 'Local',
      durationMin: Math.max(5, Math.min(180, Math.round(durationMin))),
      distanceKm: Math.max(0.2, Math.min(30, Math.round(distanceKm * 10) / 10)),
      dogNames: dogNames.length > 0 ? dogNames : [DEFAULT_DOG_PROFILE.name],
    });
  }
  return clean.sort((a, b) => b.timestampMs - a.timestampMs);
}

interface OfflineForecastRecord {
  latitude: number;
  longitude: number;
  bundle: ForecastBundle;
}

function isValidCachedHour(raw: unknown): raw is HourlyWeatherPoint {
  if (!raw || typeof raw !== 'object') return false;
  const h = raw as Record<string, unknown>;
  return (
    typeof h.isoTime === 'string' &&
    typeof h.epochMs === 'number' &&
    Number.isFinite(h.epochMs) &&
    typeof h.tempC === 'number' &&
    Number.isFinite(h.tempC) &&
    typeof h.feelsLikeC === 'number' &&
    Number.isFinite(h.feelsLikeC) &&
    typeof h.precipProb === 'number' &&
    Number.isFinite(h.precipProb) &&
    typeof h.windKph === 'number' &&
    Number.isFinite(h.windKph) &&
    typeof h.uvIndex === 'number' &&
    Number.isFinite(h.uvIndex) &&
    typeof h.isDay === 'boolean'
  );
}

async function saveOfflineForecastCache(
  latitude: number,
  longitude: number,
  bundle: ForecastBundle
): Promise<void> {
  try {
    const existingRaw = await AsyncStorage.getItem(STORAGE_KEY_OFFLINE_FORECAST);
    const existing: OfflineForecastRecord[] = existingRaw
      ? (JSON.parse(existingRaw) as OfflineForecastRecord[])
      : [];
    const filtered = Array.isArray(existing)
      ? existing.filter(
          (item) =>
            item &&
            isValidCoordinate(item.latitude, item.longitude) &&
            haversineDistanceKm(latitude, longitude, item.latitude, item.longitude) >
              6
        )
      : [];
    const next: OfflineForecastRecord[] = [
      { latitude, longitude, bundle },
      ...filtered,
    ].slice(0, OFFLINE_CACHE_MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY_OFFLINE_FORECAST, JSON.stringify(next));
  } catch {
    // Non-fatal cache write failure
  }
}

async function loadOfflineForecastCache(
  latitude: number,
  longitude: number
): Promise<ForecastBundle | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_OFFLINE_FORECAST);
    if (!raw) return null;
    const records = JSON.parse(raw) as unknown;
    if (!Array.isArray(records)) return null;

    const nowMs = Date.now();
    let best: { dist: number; bundle: ForecastBundle } | null = null;
    for (const item of records) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as Record<string, unknown>;
      if (!isValidCoordinate(rec.latitude, rec.longitude)) continue;
      const bundle = rec.bundle as Record<string, unknown> | undefined;
      if (
        !bundle ||
        !Array.isArray(bundle.hours) ||
        typeof bundle.fetchedAtEpochMs !== 'number' ||
        !Number.isFinite(bundle.fetchedAtEpochMs)
      ) {
        continue;
      }
      if (nowMs - bundle.fetchedAtEpochMs > OFFLINE_CACHE_MAX_AGE_MS) {
        continue;
      }
      const dist = haversineDistanceKm(
        latitude,
        longitude,
        rec.latitude as number,
        rec.longitude as number
      );
      if (dist > 15) continue;

      const validHours = bundle.hours.filter(isValidCachedHour);
      const upcomingHours = validHours.filter(
        (h) => h.epochMs >= nowMs - 45 * 60 * 1000
      );
      const usableHours =
        upcomingHours.length >= 2 ? upcomingHours : validHours.slice(-6);
      if (usableHours.length === 0) continue;

      const normalized: ForecastBundle = {
        hours: usableHours,
        sunriseEpochMs:
          typeof bundle.sunriseEpochMs === 'number' &&
          Number.isFinite(bundle.sunriseEpochMs)
            ? bundle.sunriseEpochMs
            : null,
        sunsetEpochMs:
          typeof bundle.sunsetEpochMs === 'number' &&
          Number.isFinite(bundle.sunsetEpochMs)
            ? bundle.sunsetEpochMs
            : null,
        fetchedAtEpochMs: bundle.fetchedAtEpochMs,
      };
      if (!best || dist < best.dist) {
        best = { dist, bundle: normalized };
      }
    }
    return best ? best.bundle : null;
  } catch {
    return null;
  }
}

function parseStoredLocation(raw: unknown): LocationPoint {
  const fallback = PRESET_LOCATIONS[0];
  if (!raw || typeof raw !== 'object') return fallback;
  const obj = raw as Record<string, unknown>;
  if (!isValidCoordinate(obj.latitude, obj.longitude)) {
    return fallback;
  }
  const name = sanitizeText(obj.name, 60);
  if (!name) return fallback;
  return {
    name,
    region: sanitizeText(obj.region, 60),
    latitude: obj.latitude as number,
    longitude: obj.longitude as number,
    timezone: sanitizeText(obj.timezone, 60) || 'auto',
    isCurrentDeviceLocation: Boolean(obj.isCurrentDeviceLocation),
  };
}

export const WalkPlannerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [location, setLocationState] = useState<LocationPoint>(
    PRESET_LOCATIONS[0]
  );
  const [units, setUnits] = useState<UnitSystem>('metric');
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [scoreVizMode, setScoreVizMode] = useState<ScoreVizMode>('A');
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>([]);
  const [spotNotes, setSpotNotes] = useState<Record<string, string>>({});
  const [dogs, setDogs] = useState<DogProfile[]>([DEFAULT_DOG_PROFILE]);
  const [activeDogIds, setActiveDogIds] = useState<string[]>([
    DEFAULT_DOG_PROFILE.id || 'dog-primary',
  ]);
  const [walkLogs, setWalkLogs] = useState<WalkLogEntry[]>([]);
  const [pendingDeepLinkSpotId, setPendingDeepLinkSpotId] = useState<
    string | null
  >(null);
  const [hydrated, setHydrated] = useState(false);

  const [forecast, setForecast] = useState<ForecastBundle | null>(null);
  const [isOfflineForecast, setIsOfflineForecast] = useState(false);
  const [rawPlaces, setRawPlaces] = useState<WalkPlace[]>([]);
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [errorBannerKey, setErrorBannerKey] = useState<'weather_fetch' | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locationNoticeKey, setLocationNoticeKey] = useState<
    'location_denied' | null
  >(null);
  const [gpsFix, setGpsFix] = useState<GpsFixInfo | null>(null);

  const t = useMemo(() => getStrings(language), [language]);
  const errorBanner = errorBannerKey === 'weather_fetch' ? t.weatherFetchError : null;
  const locationNotice =
    locationNoticeKey === 'location_denied' ? t.locationPermissionDenied : null;

  // Hydrate non-sensitive local preferences & optional allow-listed web deep link on mount
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY_PREFS);
        if (saved && active) {
          const parsed = JSON.parse(saved) as Record<string, unknown>;
          if (parsed.units === 'metric' || parsed.units === 'imperial') {
            setUnits(parsed.units);
          }
          if (parsed.language === 'en' || parsed.language === 'zh') {
            setLanguage(parsed.language);
          }
          if (parsed.scoreVizMode === 'A' || parsed.scoreVizMode === 'D') {
            setScoreVizMode(parsed.scoreVizMode);
          }
          if (Array.isArray(parsed.savedPlaceIds)) {
            setSavedPlaceIds(
              parsed.savedPlaceIds
                .filter((x): x is string => typeof x === 'string')
                .map((x) => sanitizeText(x, 48))
                .filter(Boolean)
                .slice(0, 50)
            );
          }
          if (parsed.spotNotes && typeof parsed.spotNotes === 'object') {
            const rawNotes = parsed.spotNotes as Record<string, unknown>;
            const cleanNotes: Record<string, string> = {};
            Object.keys(rawNotes)
              .slice(0, 60)
              .forEach((k) => {
                const safeKey = sanitizeText(k, 48);
                const safeVal = sanitizeText(rawNotes[k], 100);
                if (safeKey && safeVal) {
                  cleanNotes[safeKey] = safeVal;
                }
              });
            setSpotNotes(cleanNotes);
          }
          if (Array.isArray(parsed.dogs) && parsed.dogs.length > 0) {
            const parsedDogs = parsed.dogs
              .slice(0, MAX_HOUSEHOLD_DOGS)
              .map((d, idx) => {
                const parsedDog = parseStoredDog(
                  d,
                  idx === 0 ? 'dog-primary' : `dog-${idx + 1}`
                );
                // Seamlessly migrate untouched legacy default (Mochi/cavoodle) to Pudding (white maltipoo)
                if (
                  idx === 0 &&
                  parsedDog.name === 'Mochi' &&
                  parsedDog.breedId === 'cavoodle' &&
                  !parsedDog.customPhotoUri
                ) {
                  return {
                    ...parsedDog,
                    name: DEFAULT_DOG_PROFILE.name,
                    breedId: DEFAULT_DOG_PROFILE.breedId,
                    size: DEFAULT_DOG_PROFILE.size,
                    pawSensitivity: DEFAULT_DOG_PROFILE.pawSensitivity,
                  };
                }
                return parsedDog;
              });
            setDogs(parsedDogs);
            const validIds = new Set(parsedDogs.map((d) => d.id || 'dog-primary'));
            if (Array.isArray(parsed.activeDogIds)) {
              const cleanActive = parsed.activeDogIds
                .filter((x): x is string => typeof x === 'string' && validIds.has(x));
              setActiveDogIds(
                cleanActive.length > 0
                  ? cleanActive
                  : [parsedDogs[0].id || 'dog-primary']
              );
            } else {
              setActiveDogIds([parsedDogs[0].id || 'dog-primary']);
            }
          } else if (parsed.dog) {
            const singleDog = parseStoredDog(parsed.dog, 'dog-primary');
            const migrated =
              singleDog.name === 'Mochi' &&
              singleDog.breedId === 'cavoodle' &&
              !singleDog.customPhotoUri
                ? {
                    ...singleDog,
                    name: DEFAULT_DOG_PROFILE.name,
                    breedId: DEFAULT_DOG_PROFILE.breedId,
                    size: DEFAULT_DOG_PROFILE.size,
                    pawSensitivity: DEFAULT_DOG_PROFILE.pawSensitivity,
                  }
                : singleDog;
            setDogs([migrated]);
            setActiveDogIds([migrated.id || 'dog-primary']);
          }
          if (Array.isArray(parsed.walkLogs)) {
            setWalkLogs(parseStoredWalkLogs(parsed.walkLogs));
          }
          if (parsed.location) {
            setLocationState(parseStoredLocation(parsed.location));
          }
        }

        // Apply allow-listed web URL deep link (#spot=<id> / #suburb=<id> / #city=<name>)
        const deepLink = readInitialWebDeepLink();
        if (deepLink && active) {
          setLocationState(deepLink.location);
          if (deepLink.focusSpotId) {
            setPendingDeepLinkSpotId(deepLink.focusSpotId);
          }
        }
      } catch {
        // Ignore corrupted preference payloads safely
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Support live hashchange deep-linking on Web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const win = globalThis as {
      addEventListener?: (t: string, fn: () => void) => void;
      removeEventListener?: (t: string, fn: () => void) => void;
      location?: { hash?: string };
    };
    if (!win.addEventListener) return;
    const onHashChange = () => {
      const resolved = parseDeepLinkParams(win.location?.hash || '');
      if (resolved) {
        setLocationState(resolved.location);
        if (resolved.focusSpotId) {
          setPendingDeepLinkSpotId(resolved.focusSpotId);
        }
      }
    };
    win.addEventListener('hashchange', onHashChange);
    return () => win.removeEventListener?.('hashchange', onHashChange);
  }, []);

  // Persist non-sensitive preferences when updated
  useEffect(() => {
    if (!hydrated) return;
    const payload = JSON.stringify({
      units,
      language,
      scoreVizMode,
      savedPlaceIds,
      spotNotes,
      dog: dogs[0] ?? DEFAULT_DOG_PROFILE,
      dogs,
      activeDogIds,
      walkLogs,
      location,
    });
    AsyncStorage.setItem(STORAGE_KEY_PREFS, payload).catch(() => {});
  }, [
    hydrated,
    units,
    language,
    scoreVizMode,
    savedPlaceIds,
    spotNotes,
    dogs,
    activeDogIds,
    walkLogs,
    location,
  ]);

  const fetchSeqRef = useRef(0);

  const loadForLocation = useCallback(
    async (target: LocationPoint, forceRefresh = false) => {
      const requestId = ++fetchSeqRef.current;
      setIsLoading(true);
      setErrorBannerKey(null);
      try {
        const [forecastData, nearbySpots] = await Promise.all([
          fetchWalkForecast(
            target.latitude,
            target.longitude,
            target.timezone,
            forceRefresh
          ),
          fetchNearbyWalkPlaces(target.latitude, target.longitude, target.name),
        ]);
        if (requestId !== fetchSeqRef.current) {
          return;
        }
        setForecast(forecastData);
        setIsOfflineForecast(false);
        setRawPlaces(nearbySpots);
        setSelectedHourIndex(0);
        saveOfflineForecastCache(
          target.latitude,
          target.longitude,
          forecastData
        );
      } catch {
        if (requestId !== fetchSeqRef.current) {
          return;
        }
        const [cachedForecast, fallbackSpots] = await Promise.all([
          loadOfflineForecastCache(target.latitude, target.longitude),
          fetchNearbyWalkPlaces(target.latitude, target.longitude, target.name).catch(
            () => null
          ),
        ]);
        if (requestId !== fetchSeqRef.current) {
          return;
        }
        if (fallbackSpots && fallbackSpots.length > 0) {
          setRawPlaces(fallbackSpots);
        }
        if (cachedForecast) {
          setForecast(cachedForecast);
          setIsOfflineForecast(true);
          setSelectedHourIndex(0);
          setErrorBannerKey(null);
        } else {
          setErrorBannerKey('weather_fetch');
        }
      } finally {
        if (requestId === fetchSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!hydrated) return;
    loadForLocation(location, false);
  }, [hydrated, location, loadForLocation]);

  const setLocation = useCallback((loc: LocationPoint) => {
    setLocationNoticeKey(null);
    setLocationState(loc);
  }, []);

  const refreshData = useCallback(async () => {
    await loadForLocation(location, true);
  }, [loadForLocation, location]);

  const toggleUnits = useCallback(() => {
    setUnits((prev) => (prev === 'imperial' ? 'metric' : 'imperial'));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'zh' ? 'en' : 'zh'));
  }, []);

  const toggleSavedPlace = useCallback((id: string) => {
    const cleanId = sanitizeText(id, 48);
    if (!cleanId) return;
    setSavedPlaceIds((prev) =>
      prev.includes(cleanId)
        ? prev.filter((item) => item !== cleanId)
        : [...prev, cleanId]
    );
  }, []);

  const setSpotNote = useCallback((placeId: string, note: string) => {
    const cleanId = sanitizeText(placeId, 48);
    if (!cleanId) return;
    const cleanNote =
      typeof note === 'string'
        ? note.replace(/[\u0000-\u001F\u007F<>]/g, '').slice(0, 100)
        : '';
    setSpotNotes((prev) => {
      const next = { ...prev };
      if (!cleanNote.trim()) {
        delete next[cleanId];
      } else {
        next[cleanId] = cleanNote;
      }
      return next;
    });
  }, []);

  const updateDog = useCallback(
    (patch: Partial<DogProfile>, targetDogId?: string) => {
      setDogs((prev) => {
        const targetId =
          targetDogId || activeDogIds[0] || prev[0]?.id || 'dog-primary';
        return prev.map((d) => {
          if ((d.id || 'dog-primary') !== targetId) return d;
          const next = { ...d, ...patch };
          if (patch.name !== undefined) {
            next.name = sanitizeDogName(patch.name);
          }
          if (patch.customPhotoUri !== undefined) {
            next.customPhotoUri = sanitizeAvatarDataUri(patch.customPhotoUri);
          }
          return next;
        });
      });
    },
    [activeDogIds]
  );

  const selectSingleDog = useCallback((dogId: string) => {
    const cleanId = sanitizeText(dogId, 32);
    if (!cleanId) return;
    setActiveDogIds([cleanId]);
  }, []);

  const toggleWalkDog = useCallback((dogId: string) => {
    const cleanId = sanitizeText(dogId, 32);
    if (!cleanId) return;
    setActiveDogIds((prev) => {
      if (prev.includes(cleanId)) {
        return prev.length > 1 ? prev.filter((id) => id !== cleanId) : prev;
      }
      return [...prev, cleanId];
    });
  }, []);

  const addDog = useCallback(
    (breedId = 'frenchie'): string => {
      const existingCount = dogs.length;
      if (existingCount >= MAX_HOUSEHOLD_DOGS) {
        return dogs[existingCount - 1].id || 'dog-primary';
      }
      const preset =
        BREED_PRESETS.find((b) => b.id === breedId) || BREED_PRESETS[1];
      const defaultNames = ['Barnaby', 'Lulu', 'Biscuit', 'Ziggy', 'Pippa'];
      const usedNames = new Set(dogs.map((d) => d.name.toLowerCase()));
      const pickedName =
        defaultNames.find((n) => !usedNames.has(n.toLowerCase())) ||
        `Pup ${existingCount + 1}`;
      const newId = `dog-${Date.now().toString(36)}`;
      const newDog: DogProfile = {
        id: newId,
        name: pickedName,
        breedId: preset.id,
        ...preset.defaults,
        hasDogLicense: true,
        customPhotoUri: null,
      };
      setDogs((prev) => [...prev, newDog].slice(0, MAX_HOUSEHOLD_DOGS));
      setActiveDogIds([newId]);
      return newId;
    },
    [dogs]
  );

  const removeDog = useCallback(
    (dogId: string) => {
      if (dogs.length <= 1) return;
      const nextDogs = dogs.filter((d) => (d.id || 'dog-primary') !== dogId);
      if (nextDogs.length === 0) return;
      setDogs(nextDogs);
      setActiveDogIds((currActive) => {
        const remaining = currActive.filter((id) => id !== dogId);
        return remaining.length > 0
          ? remaining
          : [nextDogs[0].id || 'dog-primary'];
      });
    },
    [dogs]
  );

  const activeDogs = useMemo<DogProfile[]>(() => {
    const selected = dogs
      .filter((d) => activeDogIds.includes(d.id || 'dog-primary'))
      .map((d) => ({
        ...d,
        name: d.name.trim() || DEFAULT_DOG_PROFILE.name,
      }));
    if (selected.length > 0) return selected;
    const first = dogs[0] ?? DEFAULT_DOG_PROFILE;
    return [{ ...first, name: first.name.trim() || DEFAULT_DOG_PROFILE.name }];
  }, [dogs, activeDogIds]);

  const isPackMode = activeDogs.length > 1;

  const logWalk = useCallback(
    (entry: {
      placeId: string;
      placeName: string;
      cityLabel: string;
      durationMin: number;
      distanceKm: number;
    }) => {
      const cleanName = sanitizeText(entry.placeName, 70);
      if (!cleanName) return;
      const record: WalkLogEntry = {
        id: `walk-${Date.now().toString(36)}`,
        timestampMs: Date.now(),
        placeId: sanitizeText(entry.placeId, 48) || 'custom-walk',
        placeName: cleanName,
        cityLabel: sanitizeText(entry.cityLabel, 40) || 'Local',
        durationMin: Math.max(
          5,
          Math.min(180, Math.round(entry.durationMin || 25))
        ),
        distanceKm: Math.max(
          0.2,
          Math.min(30, Math.round((entry.distanceKm || 1.5) * 10) / 10)
        ),
        dogNames: activeDogs.map((d) => d.name),
      };
      setWalkLogs((prev) => [record, ...prev].slice(0, MAX_WALK_LOGS));
    },
    [activeDogs]
  );

  const deleteWalkLog = useCallback((logId: string) => {
    setWalkLogs((prev) => prev.filter((item) => item.id !== logId));
  }, []);

  const clearPendingDeepLinkSpot = useCallback(() => {
    setPendingDeepLinkSpotId(null);
  }, []);

  const locateGpsCoordinates = useCallback(async (): Promise<GpsFixInfo | null> => {
    setIsLocating(true);
    setLocationNoticeKey(null);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        }
      } catch {
        // Fall through to browser Geolocation fallback on Web if available
      }

      // Direct browser Geolocation fallback for mobile Safari / Chrome Web
      if ((latitude === null || longitude === null) && Platform.OS === 'web') {
        const nav = (globalThis as Record<string, unknown>).navigator as
          | {
              geolocation?: {
                getCurrentPosition: (
                  success: (p: {
                    coords: { latitude: number; longitude: number };
                  }) => void,
                  error: () => void,
                  opts?: {
                    enableHighAccuracy?: boolean;
                    timeout?: number;
                    maximumAge?: number;
                  }
                ) => void;
              };
            }
          | undefined;

        if (nav?.geolocation) {
          const webCoords = await new Promise<{
            latitude: number;
            longitude: number;
          } | null>((resolve) => {
            nav.geolocation?.getCurrentPosition(
              (p) =>
                resolve({
                  latitude: p.coords.latitude,
                  longitude: p.coords.longitude,
                }),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 }
            );
          });
          if (webCoords) {
            latitude = webCoords.latitude;
            longitude = webCoords.longitude;
          }
        }
      }

      if (
        latitude === null ||
        longitude === null ||
        !isValidCoordinate(latitude, longitude)
      ) {
        setLocationNoticeKey('location_denied');
        return null;
      }

      // First check if coordinates fall within Greater Melbourne, Greater Sydney, or Greater Shanghai
      const nearestAu = findNearestAuSuburbs(latitude, longitude, 1, 110);
      if (nearestAu.length > 0) {
        const topSub = nearestAu[0].suburb;
        const cityPrefix =
          topSub.city === 'sydney'
            ? 'Sydney'
            : topSub.city === 'shanghai'
              ? 'Shanghai'
              : 'Melbourne';
        const fix: GpsFixInfo = {
          latitude,
          longitude,
          name: `${cityPrefix} · ${topSub.name}`,
          region: `${topSub.postcode} · ${topSub.area}${
            topSub.council ? ` (${topSub.council})` : ''
          }`,
          timezone: topSub.timezone,
        };
        setGpsFix(fix);
        return fix;
      }

      let name = 'Current Location';
      let region = '';
      try {
        const geocoded = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (geocoded.length > 0) {
          const first = geocoded[0];
          const area = sanitizeText(
            first.district || first.street || first.subregion,
            34
          );
          const city = sanitizeText(first.city, 34);
          name =
            [city, area]
              .filter(Boolean)
              .filter((v, idx, arr) => arr.indexOf(v) === idx)
              .join(' · ') ||
            city ||
            area ||
            name;
          region = sanitizeText(first.region || first.country, 50);
        }
      } catch {
        // Native reverseGeocodeAsync is unavailable on Web; fall back to Photon HTTPS below
      }

      if (name === 'Current Location') {
        const httpsGeo = await reverseGeocodeCoordinates(latitude, longitude);
        if (httpsGeo) {
          name = httpsGeo.name;
          region = httpsGeo.region;
        }
      }

      const resolvedTz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto';
      const fix: GpsFixInfo = {
        latitude,
        longitude,
        name,
        region,
        timezone: resolvedTz,
      };
      setGpsFix(fix);
      return fix;
    } catch {
      setLocationNoticeKey('location_denied');
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  const applyDemoGpsFix = useCallback(
    (latitude: number, longitude: number): GpsFixInfo => {
      setLocationNoticeKey(null);
      const nearestAu = findNearestAuSuburbs(latitude, longitude, 1, 110);
      const topSub = nearestAu[0]?.suburb;
      const cityPrefix =
        topSub?.city === 'sydney'
          ? 'Sydney'
          : topSub?.city === 'shanghai'
            ? 'Shanghai'
            : 'Melbourne';
      const fix: GpsFixInfo = {
        latitude,
        longitude,
        name: topSub ? `${cityPrefix} · ${topSub.name}` : 'GPS Pin',
        region: topSub
          ? `${topSub.postcode} · ${topSub.area}${
              topSub.council ? ` (${topSub.council})` : ''
            }`
          : '',
        timezone: topSub?.timezone || 'Australia/Melbourne',
        isDemo: true,
      };
      setGpsFix(fix);
      return fix;
    },
    []
  );

  const requestGpsLocation = useCallback(async (): Promise<boolean> => {
    const fix = await locateGpsCoordinates();
    if (!fix) return false;
    setLocationState({
      name: fix.name,
      region: fix.region,
      latitude: fix.latitude,
      longitude: fix.longitude,
      timezone: fix.timezone,
      isCurrentDeviceLocation: true,
    });
    return true;
  }, [locateGpsCoordinates]);

  const clearLocationNotice = useCallback(() => {
    setLocationNoticeKey(null);
  }, []);

  const effectiveDog = useMemo<DogProfile>(
    () => mergePackDogProfile(activeDogs, language),
    [activeDogs, language]
  );

  const scoredHours = useMemo<ScoredHour[]>(() => {
    if (!forecast) return [];
    return forecast.hours.map((h, idx) =>
      scoreWeatherHourForPack(h, idx, activeDogs)
    );
  }, [forecast, activeDogs]);

  const bestWindows = useMemo<WalkWindow[]>(() => {
    if (scoredHours.length === 0) return [];
    return findBestWalkWindows(
      scoredHours,
      forecast?.sunsetEpochMs ?? null,
      location.timezone === 'auto' ? undefined : location.timezone
    );
  }, [scoredHours, forecast?.sunsetEpochMs, location.timezone]);

  const safeSelectedIndex =
    scoredHours.length === 0
      ? 0
      : Math.min(selectedHourIndex, scoredHours.length - 1);

  const selectedHour =
    scoredHours.length > 0 ? scoredHours[safeSelectedIndex] : null;

  const scoredPlaces = useMemo<ScoredPlace[]>(
    () =>
      scorePlacesForHour(
        rawPlaces,
        selectedHour,
        effectiveDog,
        location.timezone === 'auto' ? undefined : location.timezone,
        language
      ),
    [rawPlaces, selectedHour, effectiveDog, location.timezone, language]
  );

  const hasCuratedPlacesFallback = useMemo(
    () => rawPlaces.some((p) => p.isCuratedFallback),
    [rawPlaces]
  );

  const value = useMemo<WalkPlannerContextValue>(
    () => ({
      location,
      setLocation,
      gpsFix,
      locateGpsCoordinates,
      applyDemoGpsFix,
      requestGpsLocation,
      isLocating,
      locationNotice,
      clearLocationNotice,
      units,
      setUnits,
      toggleUnits,
      language,
      setLanguage,
      toggleLanguage,
      scoreVizMode,
      setScoreVizMode,
      savedPlaceIds,
      toggleSavedPlace,
      spotNotes,
      setSpotNote,
      dog: effectiveDog,
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
      pendingDeepLinkSpotId,
      clearPendingDeepLinkSpot,
      isLoading,
      isOfflineForecast,
      errorBanner,
      refreshData,
      forecast,
      scoredHours,
      bestWindows,
      selectedHourIndex: safeSelectedIndex,
      setSelectedHourIndex,
      selectedHour,
      scoredPlaces,
      hasCuratedPlacesFallback,
    }),
    [
      location,
      setLocation,
      gpsFix,
      locateGpsCoordinates,
      applyDemoGpsFix,
      requestGpsLocation,
      isLocating,
      locationNotice,
      clearLocationNotice,
      units,
      setUnits,
      toggleUnits,
      language,
      setLanguage,
      toggleLanguage,
      scoreVizMode,
      savedPlaceIds,
      toggleSavedPlace,
      spotNotes,
      setSpotNote,
      effectiveDog,
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
      pendingDeepLinkSpotId,
      clearPendingDeepLinkSpot,
      isLoading,
      isOfflineForecast,
      errorBanner,
      refreshData,
      forecast,
      scoredHours,
      bestWindows,
      safeSelectedIndex,
      selectedHour,
      scoredPlaces,
      hasCuratedPlacesFallback,
    ]
  );

  return (
    <WalkPlannerContext.Provider value={value}>
      {children}
    </WalkPlannerContext.Provider>
  );
};

export function useWalkPlanner(): WalkPlannerContextValue {
  const ctx = useContext(WalkPlannerContext);
  if (!ctx) {
    throw new Error('useWalkPlanner must be used within WalkPlannerProvider');
  }
  return ctx;
}
