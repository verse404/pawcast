export type UnitSystem = 'imperial' | 'metric';

export type AppLanguage = 'en' | 'zh';

export type ScoreVizMode = 'A' | 'D';

export type PawSafetyTier = 'safe' | 'warm' | 'hot' | 'danger';

export type WalkQualityTier = 'ideal' | 'good' | 'caution' | 'avoid';

export type CoatType = 'short' | 'medium' | 'thick';

export type DogSize = 'small' | 'medium' | 'large' | 'giant';

export type DogAgeGroup = 'puppy' | 'adult' | 'senior';

export type PawSensitivity = 'tough' | 'normal' | 'sensitive';

export interface DogProfile {
  /** Stable local identifier for multi-dog household profiles. */
  id?: string;
  name: string;
  breedId: string;
  size: DogSize;
  ageGroup: DogAgeGroup;
  coat: CoatType;
  brachycephalic: boolean;
  pawSensitivity: PawSensitivity;
  /** True when the owner holds a valid municipal dog registration (e.g. Shanghai 狗证) + rabies card. */
  hasDogLicense: boolean;
  /** Optional user-uploaded square-cropped dog portrait (`data:image/(jpeg|png|webp);base64,...`). */
  customPhotoUri?: string | null;
  /** Tier 1 temperament: prefers calmer streets & less crowded parks. */
  quietMode?: boolean;
  /** Tier 1 quirk: extra avoidance of rain and post-rain wet grass/puddles. */
  hatesRain?: boolean;
  /** Tier 1 quirk: boosts safe dog beaches and breezy waterfront spots. */
  lovesWater?: boolean;
  /** Optional custom comfort temperature ceiling in °C (15..30). */
  customMaxTempC?: number | null;
}

export interface LocationPoint {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
  /** True when coordinates came from the user's phone/device current GPS location. */
  isCurrentDeviceLocation?: boolean;
}

export interface HourlyWeatherPoint {
  /** Machine-readable ISO 8601 timestamp from Open-Meteo (never displayed raw in UI). */
  isoTime: string;
  epochMs: number;
  tempC: number;
  feelsLikeC: number;
  precipProb: number;
  precipMm: number;
  weatherCode: number;
  windKph: number;
  uvIndex: number;
  humidity: number;
  cloudCover: number;
  solarRadiationWm2: number;
  isDay: boolean;
  usAqi: number | null;
  /** Accumulated/estimated rainfall (mm) over the preceding 5 hours for wet-turf detection. */
  trailingRainMm?: number;
}

export type ReasonTag =
  | 'comfortable_temp'
  | 'paw_safe_surface'
  | 'paw_warm_test'
  | 'paw_hot_grass_only'
  | 'paw_burn_danger'
  | 'wet_grass_post_rain'
  | 'brachy_heat_risk'
  | 'thick_coat_warm'
  | 'chilly_short_coat'
  | 'freezing_alert'
  | 'rain_likely'
  | 'heavy_rain_storm'
  | 'high_uv'
  | 'extreme_uv'
  | 'strong_wind'
  | 'poor_air_quality'
  | 'clean_air'
  | 'after_dark';

export interface ScoredHour {
  index: number;
  weather: HourlyWeatherPoint;
  asphaltTempC: number;
  pawTier: PawSafetyTier;
  /** True when rain has stopped/eased but lawns remain wet/muddy from the past ~5 hours. */
  isPostRainWetTurf: boolean;
  walkScore: number;
  qualityTier: WalkQualityTier;
  reasons: ReasonTag[];
}

export interface WalkWindow {
  id: string;
  startEpochMs: number;
  endEpochMs: number;
  startIndex: number;
  endIndex: number;
  avgScore: number;
  peakScore: number;
  avgTempC: number;
  maxAsphaltTempC: number;
  pawTier: PawSafetyTier;
  qualityTier: WalkQualityTier;
  isGoldenHour: boolean;
}

export type PlaceCategory = 'dog_park' | 'dog_beach' | 'trail' | 'park';

export type AmenityKey = 'off_leash' | 'shade' | 'water' | 'lit' | 'paved';

export type PlaceMatchBadgeKey =
  | 'shaded_relief'
  | 'off_leash_prime'
  | 'dry_paved'
  | 'lit_evening'
  | 'scenic_loop'
  | 'close_quick_walk'
  | 'small_dogs_only'
  | 'closed_at_hour'
  | 'needs_dog_license';

export type SpotAccessRule =
  | 'walk_in_free'
  | 'timed_beach'
  | 'booking_license'
  | 'pet_ticket';

export type SpotLeashPolicy =
  | 'off_leash_fenced'
  | 'off_leash_unfenced'
  | 'leashed_only';

export type StreetConvenienceLevel = 'easy' | 'moderate' | 'hard';

export interface StreetCorridor {
  id: string;
  name: string;
  district: string;
  baseConvenience: StreetConvenienceLevel;
  sidewalkWidth: string;
  crowdSummary: string;
  lengthKm: number;
  /** For 'hard' or 'moderate' streets, ID of the recommended nearby 'easy' trail. */
  betterAlternativeId?: string;
  /** For 'easy' smart-swap trails, note on which crowded street it avoids. */
  smartSwapFor?: string;
  /** Multi-point WGS-84 street polyline `[lat, lon][]`. */
  coordinates: Array<[number, number]>;
}

export interface WalkPlace {
  id: string;
  name: string;
  subtitle: string;
  district?: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  distanceKm: number;
  amenities: AmenityKey[];
  accessRule?: SpotAccessRule;
  leashPolicy?: SpotLeashPolicy;
  maxDogWeightKg?: number;
  /** Optional verified real-world park/beach thumbnail URI (first-party `park-thumbs/<id>.jpg` or HTTPS URL). */
  photoUrl?: string;
  /** Baseline Space & Calm score out of 30 (width, car-free separation, low scooters/crowds). */
  spaceScore30?: number;
  spaceNote?: string;
  entryDetail?: string;
  crowdAndSurfaceTip?: string;
  petPerks?: string;
  /** Optional daily operating hour windows `[startHour24, endHour24][]` (e.g. `[[6, 8.5], [13, 15.5]]`). Omit for 24h open access. */
  openWindows?: Array<[number, number]>;
  /** Optional Australian Daylight-Saving / Summer (Oct–Mar) off-leash windows `[startHour24, endHour24][]` when winter (Apr–Sep) is 24h off-leash. */
  seasonalSummerWindows?: Array<[number, number]>;
  /** Optional Saturday/Sunday off-leash windows `[startHour24, endHour24][]` when Mon–Fri is 24h off-leash (e.g. Sirius Cove Mosman). */
  weekendOpenWindows?: Array<[number, number]>;
  /** Human-readable operating hours summary (e.g. `'06:00–08:30, 13:00–15:30'` or `'24h Open'`). */
  hoursLabel?: string;
  /** Optional multi-point WGS-84 walking trail / loop polyline `[lat, lon][]`. */
  routePath?: Array<[number, number]>;
  loopLengthKm?: number;
  isCuratedFallback?: boolean;
}

export interface PlaceOpenStatus {
  isOpen: boolean;
  closingSoon: boolean;
  badgeText: string;
  hoursSummary: string;
}

export interface ScorePillar {
  key: 'space' | 'weather' | 'proximity' | 'dogFit';
  label: string;
  points: number;
  maxPoints: number;
  note: string;
}

export interface ScoredPlace {
  place: WalkPlace;
  placeScore: number;
  matchBadge: PlaceMatchBadgeKey;
  pillars: ScorePillar[];
  openStatus: PlaceOpenStatus;
  isMuddyTurfRisk: boolean;
  needsLicenseWarning: boolean;
}

export type LoopDurationMinutes = 15 | 30 | 45;

export interface DoorstepLoopPlan {
  durationMin: LoopDurationMinutes;
  distanceKm: number;
  coordinates: Array<[number, number]>;
  anchorName: string;
  avoidedName: string | null;
  surfaceNote: string;
}

export interface ForecastBundle {
  hours: HourlyWeatherPoint[];
  sunriseEpochMs: number | null;
  sunsetEpochMs: number | null;
  fetchedAtEpochMs: number;
}

export type WalkLogTag =
  | 'hydrated'
  | 'good_recall'
  | 'potty'
  | 'paw_check'
  | 'hot'
  | 'social';

export interface WalkLogEntry {
  id: string;
  timestampMs: number;
  placeId: string;
  placeName: string;
  cityLabel: string;
  durationMin: number;
  distanceKm: number;
  dogNames: string[];
  tags?: WalkLogTag[];
  note?: string;
  loggedBy?: string;
}

export type PreferredMapsApp = 'auto' | 'apple' | 'google' | 'amap';

export interface MemberProfile {
  displayName: string;
  avatarUri?: string | null;
}

export interface PinnedLocation {
  id: string;
  label: string;
  location: LocationPoint;
}

export interface DefaultMapFilters {
  beachesOnly: boolean;
  fencedOnly: boolean;
  offLeashOnly: boolean;
  shadedOnly: boolean;
  walkableOnly: boolean;
  pavedOnly: boolean;
  savedOnly: boolean;
  openOnly: boolean;
}

export interface MemberPreferences {
  pinnedLocations: PinnedLocation[];
  morningWalkHour: number | null;
  eveningWalkHour: number | null;
  defaultLoopDuration: LoopDurationMinutes;
  preferredMapsApp: PreferredMapsApp;
  defaultMapFilters: DefaultMapFilters;
  inviteSignature: string;
  weeklyWalkGoal: number;
  weeklyKmGoal: number;
}

export interface CustomWalkSpot {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  suburbLabel: string;
  note: string;
  tags: string[];
  createdAtMs: number;
}

export type CareReminderType =
  | 'rego'
  | 'rabies'
  | 'flea_tick'
  | 'grooming'
  | 'custom';

export interface CareReminder {
  id: string;
  dogName: string;
  type: CareReminderType;
  title: string;
  /** Strict `YYYY-MM-DD` date string (never raw ID/medical document). */
  dueDateIso: string;
  repeatMonths: 0 | 1 | 3 | 6 | 12;
}

export type GearTrigger = 'always' | 'hot_paws' | 'rain' | 'night' | 'license';

export interface GearChecklistItem {
  id: string;
  label: string;
  trigger: GearTrigger;
  checked: boolean;
}

export interface HouseholdMemberEntry {
  uid: string;
  displayName: string;
  isOwner: boolean;
}

export interface HouseholdSummary {
  id: string;
  ownerUid: string;
  members: HouseholdMemberEntry[];
  activeInviteToken?: string | null;
  updatedAtMs: number;
}

export interface PhotoMemory {
  id: string;
  /** Compact 160x160 EXIF-stripped JPEG Data URI for map pin thumbnails. */
  thumbnailUri: string;
  /** Medium max-560px EXIF-stripped JPEG Data URI for full lightbox view. */
  photoUri: string;
  latitude: number;
  longitude: number;
  placeName: string;
  suburbLabel: string;
  caption: string;
  /** Strict `YYYY-MM-DD` date string. */
  takenDateIso: string;
  dogNames: string[];
  createdAtMs: number;
}
