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
  advanceReminderIsoDate,
  customSpotToWalkPlace,
  DEFAULT_MEMBER_PREFERENCES,
  DEFAULT_MEMBER_PROFILE,
  getDefaultGearChecklist,
  MAX_CARE_REMINDERS,
  MAX_CUSTOM_SPOTS,
  MAX_GEAR_ITEMS,
  MAX_PINNED_LOCATIONS,
  parseCareReminders,
  parseCustomWalkSpots,
  parseDefaultMapFilters,
  parseGearChecklist,
  parseMemberPreferences,
  parseMemberProfile,
  WALK_LOG_TAG_KEYS,
} from '../constants/memberDefaults';
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
  CareReminder,
  CareReminderType,
  CustomWalkSpot,
  DefaultMapFilters,
  DogProfile,
  ForecastBundle,
  GearChecklistItem,
  GearTrigger,
  HourlyWeatherPoint,
  LocationPoint,
  MemberPreferences,
  MemberProfile,
  PlaceCategory,
  ScoredHour,
  ScoredPlace,
  ScoreVizMode,
  UnitSystem,
  WalkLogEntry,
  WalkLogTag,
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
  sanitizeIsoDate,
  sanitizeText,
} from '../utils/validation';
import { useAuth } from './AuthContext';

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
    tags?: WalkLogTag[];
    note?: string;
  }) => void;
  deleteWalkLog: (logId: string) => void;

  memberProfile: MemberProfile;
  updateMemberProfile: (patch: Partial<MemberProfile>) => void;

  memberPreferences: MemberPreferences;
  updateMemberPreferences: (patch: Partial<MemberPreferences>) => void;
  pinLocation: (label: string, targetLoc?: LocationPoint) => void;
  unpinLocation: (pinId: string) => void;
  saveDefaultMapFilters: (filters: DefaultMapFilters) => void;

  customSpots: CustomWalkSpot[];
  addCustomSpot: (spot: {
    name: string;
    category: PlaceCategory;
    latitude?: number;
    longitude?: number;
    suburbLabel?: string;
    note?: string;
    tags?: string[];
  }) => boolean;
  removeCustomSpot: (spotId: string) => void;

  careReminders: CareReminder[];
  addCareReminder: (reminder: {
    dogName?: string;
    type: CareReminderType;
    title: string;
    dueDateIso: string;
    repeatMonths: CareReminder['repeatMonths'];
  }) => boolean;
  removeCareReminder: (reminderId: string) => void;
  completeCareReminder: (reminderId: string) => void;

  gearChecklist: GearChecklistItem[];
  toggleGearItem: (itemId: string) => void;
  addGearItem: (label: string, trigger: GearTrigger) => boolean;
  removeGearItem: (itemId: string) => void;

  householdId: string | null;
  startHouseholdShare: () => Promise<{ ok: boolean; inviteToken?: string }>;
  joinHouseholdByCode: (token: string) => Promise<boolean>;
  leaveCurrentHousehold: () => Promise<boolean>;

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
  syncCloudNow: () => Promise<boolean>;
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

  const rawCustomCap = Number(obj.customMaxTempC);
  const customMaxTempC =
    obj.customMaxTempC !== null &&
    obj.customMaxTempC !== undefined &&
    Number.isFinite(rawCustomCap) &&
    rawCustomCap >= 15 &&
    rawCustomCap <= 30
      ? Math.round(rawCustomCap)
      : null;

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
    quietMode: Boolean(obj.quietMode),
    hatesRain: Boolean(obj.hatesRain),
    lovesWater: Boolean(obj.lovesWater),
    customMaxTempC,
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
    const validTags = Array.isArray(rec.tags)
      ? rec.tags
          .filter(
            (x): x is WalkLogTag =>
              typeof x === 'string' && WALK_LOG_TAG_KEYS.includes(x as WalkLogTag)
          )
          .slice(0, 6)
      : undefined;
    const note = sanitizeText(rec.note, 100) || undefined;
    const loggedBy = sanitizeText(rec.loggedBy, 40) || undefined;
    clean.push({
      id,
      timestampMs: Math.round(ts),
      placeId: placeId || 'custom-walk',
      placeName,
      cityLabel: cityLabel || 'Local',
      durationMin: Math.max(5, Math.min(180, Math.round(durationMin))),
      distanceKm: Math.max(0.2, Math.min(30, Math.round(distanceKm * 10) / 10)),
      dogNames: dogNames.length > 0 ? dogNames : [DEFAULT_DOG_PROFILE.name],
      ...(validTags && validTags.length > 0 ? { tags: validTags } : {}),
      ...(note ? { note } : {}),
      ...(loggedBy ? { loggedBy } : {}),
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
  const [memberProfile, setMemberProfile] = useState<MemberProfile>(
    DEFAULT_MEMBER_PROFILE
  );
  const [memberPreferences, setMemberPreferences] = useState<MemberPreferences>(
    DEFAULT_MEMBER_PREFERENCES
  );
  const [customSpots, setCustomSpots] = useState<CustomWalkSpot[]>([]);
  const [careReminders, setCareReminders] = useState<CareReminder[]>([]);
  const [gearChecklist, setGearChecklist] = useState<GearChecklistItem[]>(() =>
    getDefaultGearChecklist('en')
  );
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [pendingDeepLinkSpotId, setPendingDeepLinkSpotId] = useState<
    string | null
  >(null);
  const [hydrated, setHydrated] = useState(false);
  const {
    user,
    pullCloudProfile,
    pushCloudProfile,
    updateAuthDisplayName,
    createHousehold,
    joinHousehold,
    pullHousehold,
    pushHousehold,
    leaveHousehold,
  } = useAuth();
  const pulledUidRef = useRef<string | null>(null);
  const suppressNextCloudPushRef = useRef(false);

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
          if (parsed.memberProfile) {
            setMemberProfile(parseMemberProfile(parsed.memberProfile));
          }
          if (parsed.memberPreferences) {
            setMemberPreferences(
              parseMemberPreferences(
                parsed.memberPreferences,
                parseStoredLocation
              )
            );
          }
          if (Array.isArray(parsed.customSpots)) {
            setCustomSpots(parseCustomWalkSpots(parsed.customSpots));
          }
          if (Array.isArray(parsed.careReminders)) {
            setCareReminders(parseCareReminders(parsed.careReminders));
          }
          const parsedGear = parseGearChecklist(parsed.gearChecklist);
          if (parsedGear) {
            setGearChecklist(parsedGear);
          } else if (parsed.language === 'zh') {
            setGearChecklist(getDefaultGearChecklist('zh'));
          }
          if (typeof parsed.householdId === 'string' && parsed.householdId) {
            setHouseholdId(sanitizeText(parsed.householdId, 64) || null);
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
      memberProfile,
      memberPreferences,
      customSpots,
      careReminders,
      gearChecklist,
      householdId,
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
    memberProfile,
    memberPreferences,
    customSpots,
    careReminders,
    gearChecklist,
    householdId,
  ]);

  const latestSyncStateRef = useRef({
    units,
    language,
    savedPlaceIds,
    spotNotes,
    dogs,
    activeDogIds,
    walkLogs,
    location,
    memberProfile,
    memberPreferences,
    customSpots,
    careReminders,
    gearChecklist,
    householdId,
  });
  latestSyncStateRef.current = {
    units,
    language,
    savedPlaceIds,
    spotNotes,
    dogs,
    activeDogIds,
    walkLogs,
    location,
    memberProfile,
    memberPreferences,
    customSpots,
    careReminders,
    gearChecklist,
    householdId,
  };

  const applySharedHouseholdData = useCallback(
    (raw: Record<string, unknown>) => {
      suppressNextCloudPushRef.current = true;
      if (Array.isArray(raw.savedPlaceIds)) {
        setSavedPlaceIds(
          raw.savedPlaceIds
            .filter((x): x is string => typeof x === 'string')
            .map((x) => sanitizeText(x, 48))
            .filter(Boolean)
            .slice(0, 50)
        );
      }
      if (Array.isArray(raw.dogs) && raw.dogs.length > 0) {
        const localAvatarById = new Map(
          latestSyncStateRef.current.dogs.map((d) => [
            d.id || 'dog-primary',
            d.customPhotoUri ?? null,
          ])
        );
        const parsedDogs = raw.dogs
          .slice(0, MAX_HOUSEHOLD_DOGS)
          .map((d, idx) => {
            const fallbackId = idx === 0 ? 'dog-primary' : `dog-${idx + 1}`;
            const parsed = parseStoredDog(d, fallbackId);
            if (!parsed.customPhotoUri) {
              const preserved = localAvatarById.get(parsed.id || fallbackId);
              if (preserved) {
                return { ...parsed, customPhotoUri: preserved };
              }
            }
            return parsed;
          });
        setDogs(parsedDogs);
        const validIds = new Set(parsedDogs.map((d) => d.id || 'dog-primary'));
        if (Array.isArray(raw.activeDogIds)) {
          const cleanActive = raw.activeDogIds.filter(
            (x): x is string => typeof x === 'string' && validIds.has(x)
          );
          setActiveDogIds(
            cleanActive.length > 0
              ? cleanActive
              : [parsedDogs[0].id || 'dog-primary']
          );
        } else {
          setActiveDogIds([parsedDogs[0].id || 'dog-primary']);
        }
      }
      if (Array.isArray(raw.walkLogs)) {
        setWalkLogs(parseStoredWalkLogs(raw.walkLogs));
      }
      if (Array.isArray(raw.careReminders)) {
        setCareReminders(parseCareReminders(raw.careReminders));
      }
    },
    []
  );

  // Pull signed-in user's cloud profile (and optional shared household) once per sign-in session
  useEffect(() => {
    if (!hydrated) return;
    if (!user?.uid) {
      pulledUidRef.current = null;
      return;
    }
    if (pulledUidRef.current === user.uid) {
      return;
    }
    let active = true;
    const targetUid = user.uid;
    pulledUidRef.current = targetUid;

    (async () => {
      const cloud = await pullCloudProfile();
      if (!active || pulledUidRef.current !== targetUid) return;

      if (cloud) {
        suppressNextCloudPushRef.current = true;
        if (cloud.units === 'metric' || cloud.units === 'imperial') {
          setUnits(cloud.units);
        }
        if (cloud.language === 'en' || cloud.language === 'zh') {
          setLanguage(cloud.language);
        }
        if (Array.isArray(cloud.savedPlaceIds)) {
          setSavedPlaceIds(
            cloud.savedPlaceIds
              .filter((x): x is string => typeof x === 'string')
              .map((x) => sanitizeText(x, 48))
              .filter(Boolean)
              .slice(0, 50)
          );
        }
        if (cloud.spotNotes && typeof cloud.spotNotes === 'object') {
          const rawNotes = cloud.spotNotes as Record<string, unknown>;
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
        if (Array.isArray(cloud.dogs) && cloud.dogs.length > 0) {
          const localAvatarById = new Map(
            latestSyncStateRef.current.dogs.map((d) => [
              d.id || 'dog-primary',
              d.customPhotoUri ?? null,
            ])
          );
          const parsedDogs = cloud.dogs
            .slice(0, MAX_HOUSEHOLD_DOGS)
            .map((d, idx) => {
              const fallbackId = idx === 0 ? 'dog-primary' : `dog-${idx + 1}`;
              const parsed = parseStoredDog(d, fallbackId);
              if (!parsed.customPhotoUri) {
                const preserved = localAvatarById.get(parsed.id || fallbackId);
                if (preserved) {
                  return { ...parsed, customPhotoUri: preserved };
                }
              }
              return parsed;
            });
          setDogs(parsedDogs);
          const validIds = new Set(parsedDogs.map((d) => d.id || 'dog-primary'));
          if (Array.isArray(cloud.activeDogIds)) {
            const cleanActive = cloud.activeDogIds.filter(
              (x): x is string => typeof x === 'string' && validIds.has(x)
            );
            setActiveDogIds(
              cleanActive.length > 0
                ? cleanActive
                : [parsedDogs[0].id || 'dog-primary']
            );
          } else {
            setActiveDogIds([parsedDogs[0].id || 'dog-primary']);
          }
        }
        if (Array.isArray(cloud.walkLogs)) {
          setWalkLogs(parseStoredWalkLogs(cloud.walkLogs));
        }
        if (cloud.location) {
          setLocationState(parseStoredLocation(cloud.location));
        }
        if (cloud.memberProfile) {
          const parsedProfile = parseMemberProfile(cloud.memberProfile);
          setMemberProfile({
            displayName: parsedProfile.displayName || user.displayName || '',
            avatarUri:
              parsedProfile.avatarUri ||
              latestSyncStateRef.current.memberProfile.avatarUri ||
              null,
          });
        } else if (user.displayName) {
          setMemberProfile((prev) => ({
            ...prev,
            displayName: prev.displayName || user.displayName,
          }));
        }
        if (cloud.memberPreferences) {
          setMemberPreferences(
            parseMemberPreferences(cloud.memberPreferences, parseStoredLocation)
          );
        }
        if (Array.isArray(cloud.customSpots)) {
          setCustomSpots(parseCustomWalkSpots(cloud.customSpots));
        }
        if (Array.isArray(cloud.careReminders)) {
          setCareReminders(parseCareReminders(cloud.careReminders));
        }
        const cloudGear = parseGearChecklist(cloud.gearChecklist);
        if (cloudGear) {
          setGearChecklist(cloudGear);
        }

        const cloudHhId =
          typeof cloud.householdId === 'string'
            ? sanitizeText(cloud.householdId, 64)
            : '';
        setHouseholdId(cloudHhId || null);
        if (cloudHhId) {
          const hhRaw = await pullHousehold(cloudHhId);
          if (active && hhRaw) {
            applySharedHouseholdData(hhRaw);
          }
        }
      } else {
        // First sign-in on a fresh account: preserve auth displayName & back up local state
        const snap = latestSyncStateRef.current;
        const mergedProfile: MemberProfile = {
          displayName: snap.memberProfile.displayName || user.displayName || '',
          avatarUri: snap.memberProfile.avatarUri ?? null,
        };
        if (mergedProfile.displayName !== snap.memberProfile.displayName) {
          suppressNextCloudPushRef.current = true;
          setMemberProfile(mergedProfile);
        }
        await pushCloudProfile({
          schemaVersion: 2,
          updatedAtMs: Date.now(),
          ...snap,
          memberProfile: mergedProfile,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [
    hydrated,
    user?.uid,
    user?.displayName,
    pullCloudProfile,
    pushCloudProfile,
    pullHousehold,
    applySharedHouseholdData,
  ]);

  // Debounced background cloud sync whenever profile/preferences/spots/logs change while signed in
  useEffect(() => {
    if (!hydrated || !user?.uid || pulledUidRef.current !== user.uid) {
      return;
    }
    if (suppressNextCloudPushRef.current) {
      suppressNextCloudPushRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      pushCloudProfile({
        schemaVersion: 2,
        updatedAtMs: Date.now(),
        units,
        language,
        savedPlaceIds,
        spotNotes,
        dogs,
        activeDogIds,
        walkLogs,
        location,
        memberProfile,
        memberPreferences,
        customSpots,
        careReminders,
        gearChecklist,
        householdId,
      }).catch(() => {});

      if (householdId) {
        pushHousehold(
          householdId,
          memberProfile.displayName || user.displayName || '',
          {
            dogs,
            activeDogIds,
            savedPlaceIds,
            walkLogs,
            careReminders,
          }
        ).catch(() => {});
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    user?.uid,
    user?.displayName,
    units,
    language,
    savedPlaceIds,
    spotNotes,
    dogs,
    activeDogIds,
    walkLogs,
    location,
    memberProfile,
    memberPreferences,
    customSpots,
    careReminders,
    gearChecklist,
    householdId,
    pushCloudProfile,
    pushHousehold,
  ]);

  const syncCloudNow = useCallback(async (): Promise<boolean> => {
    if (!user?.uid) return false;
    const snap = latestSyncStateRef.current;
    const ok = await pushCloudProfile({
      schemaVersion: 2,
      updatedAtMs: Date.now(),
      ...snap,
    });
    if (snap.householdId) {
      const hhRaw = await pullHousehold(snap.householdId);
      if (hhRaw) {
        await pushHousehold(
          snap.householdId,
          snap.memberProfile.displayName || user.displayName || '',
          {
            dogs: snap.dogs,
            activeDogIds: snap.activeDogIds,
            savedPlaceIds: snap.savedPlaceIds,
            walkLogs: snap.walkLogs,
            careReminders: snap.careReminders,
          }
        );
      }
    }
    return ok;
  }, [user?.uid, user?.displayName, pushCloudProfile, pullHousehold, pushHousehold]);

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
      tags?: WalkLogTag[];
      note?: string;
    }) => {
      const cleanName = sanitizeText(entry.placeName, 70);
      if (!cleanName) return;
      const cleanTags = Array.isArray(entry.tags)
        ? entry.tags
            .filter((t): t is WalkLogTag => WALK_LOG_TAG_KEYS.includes(t))
            .slice(0, 6)
        : undefined;
      const cleanNote = sanitizeText(entry.note, 100) || undefined;
      const walkerLabel =
        sanitizeText(memberProfile.displayName || user?.displayName, 40) ||
        undefined;
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
        ...(cleanTags && cleanTags.length > 0 ? { tags: cleanTags } : {}),
        ...(cleanNote ? { note: cleanNote } : {}),
        ...(walkerLabel ? { loggedBy: walkerLabel } : {}),
      };
      setWalkLogs((prev) => [record, ...prev].slice(0, MAX_WALK_LOGS));
    },
    [activeDogs, memberProfile.displayName, user?.displayName]
  );

  const deleteWalkLog = useCallback((logId: string) => {
    setWalkLogs((prev) => prev.filter((item) => item.id !== logId));
  }, []);

  const updateMemberProfile = useCallback(
    (patch: Partial<MemberProfile>) => {
      setMemberProfile((prev) => {
        const next: MemberProfile = {
          displayName:
            patch.displayName !== undefined
              ? sanitizeText(patch.displayName, 40)
              : prev.displayName,
          avatarUri:
            patch.avatarUri !== undefined
              ? sanitizeAvatarDataUri(patch.avatarUri)
              : prev.avatarUri ?? null,
        };
        if (patch.displayName !== undefined && user?.uid) {
          updateAuthDisplayName(next.displayName).catch(() => {});
        }
        return next;
      });
    },
    [user?.uid, updateAuthDisplayName]
  );

  const updateMemberPreferences = useCallback(
    (patch: Partial<MemberPreferences>) => {
      setMemberPreferences((prev) => ({
        ...prev,
        ...patch,
        ...(patch.inviteSignature !== undefined
          ? { inviteSignature: sanitizeText(patch.inviteSignature, 60) }
          : {}),
        ...(patch.defaultMapFilters !== undefined
          ? { defaultMapFilters: parseDefaultMapFilters(patch.defaultMapFilters) }
          : {}),
        ...(patch.weeklyWalkGoal !== undefined
          ? {
              weeklyWalkGoal: Math.max(
                1,
                Math.min(21, Math.round(patch.weeklyWalkGoal))
              ),
            }
          : {}),
        ...(patch.weeklyKmGoal !== undefined
          ? {
              weeklyKmGoal: Math.max(
                1,
                Math.min(100, Math.round(patch.weeklyKmGoal))
              ),
            }
          : {}),
      }));
    },
    []
  );

  const pinLocation = useCallback(
    (label: string, targetLoc?: LocationPoint) => {
      const target = targetLoc || location;
      const safeLabel =
        sanitizeText(label, 24) || target.name.split(' · ').pop() || 'Pinned';
      if (!isValidCoordinate(target.latitude, target.longitude)) return;
      setMemberPreferences((prev) => {
        const filtered = prev.pinnedLocations.filter(
          (p) =>
            p.label.toLowerCase() !== safeLabel.toLowerCase() &&
            !(
              Math.abs(p.location.latitude - target.latitude) < 0.002 &&
              Math.abs(p.location.longitude - target.longitude) < 0.002
            )
        );
        const nextPin = {
          id: `pin-${Date.now().toString(36)}`,
          label: safeLabel,
          location: { ...target, isCurrentDeviceLocation: false },
        };
        return {
          ...prev,
          pinnedLocations: [nextPin, ...filtered].slice(0, MAX_PINNED_LOCATIONS),
        };
      });
    },
    [location]
  );

  const unpinLocation = useCallback((pinId: string) => {
    setMemberPreferences((prev) => ({
      ...prev,
      pinnedLocations: prev.pinnedLocations.filter((p) => p.id !== pinId),
    }));
  }, []);

  const saveDefaultMapFilters = useCallback((filters: DefaultMapFilters) => {
    setMemberPreferences((prev) => ({
      ...prev,
      defaultMapFilters: parseDefaultMapFilters(filters),
    }));
  }, []);

  const addCustomSpot = useCallback(
    (spot: {
      name: string;
      category: PlaceCategory;
      latitude?: number;
      longitude?: number;
      suburbLabel?: string;
      note?: string;
      tags?: string[];
    }): boolean => {
      const cleanName = sanitizeText(spot.name, 50);
      const lat = spot.latitude ?? location.latitude;
      const lon = spot.longitude ?? location.longitude;
      if (!cleanName || !isValidCoordinate(lat, lon)) return false;
      const nextSpot: CustomWalkSpot = {
        id: `custom-${Date.now().toString(36)}`,
        name: cleanName,
        category: spot.category,
        latitude: lat,
        longitude: lon,
        suburbLabel:
          sanitizeText(spot.suburbLabel, 40) ||
          location.name.split(' · ').pop() ||
          'My Spot',
        note: sanitizeText(spot.note, 120),
        tags: (spot.tags || [])
          .map((t) => sanitizeText(t, 20))
          .filter(Boolean)
          .slice(0, 4),
        createdAtMs: Date.now(),
      };
      setCustomSpots((prev) => [nextSpot, ...prev].slice(0, MAX_CUSTOM_SPOTS));
      return true;
    },
    [location.latitude, location.longitude, location.name]
  );

  const removeCustomSpot = useCallback((spotId: string) => {
    setCustomSpots((prev) => prev.filter((s) => s.id !== spotId));
  }, []);

  const addCareReminder = useCallback(
    (reminder: {
      dogName?: string;
      type: CareReminderType;
      title: string;
      dueDateIso: string;
      repeatMonths: CareReminder['repeatMonths'];
    }): boolean => {
      const cleanTitle = sanitizeText(reminder.title, 50);
      const safeDate = sanitizeIsoDate(reminder.dueDateIso);
      if (!cleanTitle || !safeDate) return false;
      const nextItem: CareReminder = {
        id: `rem-${Date.now().toString(36)}`,
        dogName:
          sanitizeDogName(reminder.dogName) ||
          activeDogs[0]?.name ||
          DEFAULT_DOG_PROFILE.name,
        type: reminder.type,
        title: cleanTitle,
        dueDateIso: safeDate,
        repeatMonths: reminder.repeatMonths,
      };
      setCareReminders((prev) =>
        [nextItem, ...prev]
          .slice(0, MAX_CARE_REMINDERS)
          .sort((a, b) => a.dueDateIso.localeCompare(b.dueDateIso))
      );
      return true;
    },
    [activeDogs]
  );

  const removeCareReminder = useCallback((reminderId: string) => {
    setCareReminders((prev) => prev.filter((r) => r.id !== reminderId));
  }, []);

  const completeCareReminder = useCallback((reminderId: string) => {
    setCareReminders((prev) =>
      prev
        .flatMap((r) => {
          if (r.id !== reminderId) return [r];
          if (r.repeatMonths <= 0) return [];
          return [
            {
              ...r,
              dueDateIso: advanceReminderIsoDate(r.dueDateIso, r.repeatMonths),
            },
          ];
        })
        .sort((a, b) => a.dueDateIso.localeCompare(b.dueDateIso))
    );
  }, []);

  const toggleGearItem = useCallback((itemId: string) => {
    setGearChecklist((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    );
  }, []);

  const addGearItem = useCallback(
    (label: string, trigger: GearTrigger): boolean => {
      const cleanLabel = sanitizeText(label, 40);
      if (!cleanLabel) return false;
      setGearChecklist((prev) =>
        [
          ...prev,
          {
            id: `gear-${Date.now().toString(36)}`,
            label: cleanLabel,
            trigger,
            checked: false,
          },
        ].slice(0, MAX_GEAR_ITEMS)
      );
      return true;
    },
    []
  );

  const removeGearItem = useCallback((itemId: string) => {
    setGearChecklist((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const startHouseholdShare = useCallback(async (): Promise<{
    ok: boolean;
    inviteToken?: string;
  }> => {
    if (!user?.uid) return { ok: false };
    const snap = latestSyncStateRef.current;
    const res = await createHousehold(
      snap.memberProfile.displayName || user.displayName || 'Owner',
      {
        dogs: snap.dogs,
        activeDogIds: snap.activeDogIds,
        savedPlaceIds: snap.savedPlaceIds,
        walkLogs: snap.walkLogs,
        careReminders: snap.careReminders,
      }
    );
    if (res.ok && res.householdId) {
      setHouseholdId(res.householdId);
      return { ok: true, inviteToken: res.inviteToken };
    }
    return { ok: false };
  }, [user?.uid, user?.displayName, createHousehold]);

  const joinHouseholdByCode = useCallback(
    async (token: string): Promise<boolean> => {
      if (!user?.uid) return false;
      const snap = latestSyncStateRef.current;
      const res = await joinHousehold(
        snap.memberProfile.displayName || user.displayName || 'Co-Walker',
        token
      );
      if (res.ok && res.householdId) {
        setHouseholdId(res.householdId);
        if (res.rawData) {
          applySharedHouseholdData(res.rawData);
        }
        return true;
      }
      return false;
    },
    [user?.uid, user?.displayName, joinHousehold, applySharedHouseholdData]
  );

  const leaveCurrentHousehold = useCallback(async (): Promise<boolean> => {
    if (!householdId) return false;
    const ok = await leaveHousehold(householdId);
    if (ok) {
      setHouseholdId(null);
    }
    return ok;
  }, [householdId, leaveHousehold]);

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

  const combinedPlaces = useMemo<WalkPlace[]>(() => {
    const nearbyCustom = customSpots
      .map((spot) =>
        customSpotToWalkPlace(spot, location.latitude, location.longitude)
      )
      .filter((wp) => wp.distanceKm <= 25);
    if (nearbyCustom.length === 0) return rawPlaces;
    return [...nearbyCustom, ...rawPlaces];
  }, [customSpots, rawPlaces, location.latitude, location.longitude]);

  const scoredPlaces = useMemo<ScoredPlace[]>(
    () =>
      scorePlacesForHour(
        combinedPlaces,
        selectedHour,
        effectiveDog,
        location.timezone === 'auto' ? undefined : location.timezone,
        language
      ),
    [combinedPlaces, selectedHour, effectiveDog, location.timezone, language]
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
      memberProfile,
      updateMemberProfile,
      memberPreferences,
      updateMemberPreferences,
      pinLocation,
      unpinLocation,
      saveDefaultMapFilters,
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
      syncCloudNow,
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
      memberProfile,
      updateMemberProfile,
      memberPreferences,
      updateMemberPreferences,
      pinLocation,
      unpinLocation,
      saveDefaultMapFilters,
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
      syncCloudNow,
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
