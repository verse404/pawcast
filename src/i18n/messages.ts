import {
  AmenityKey,
  CoatType,
  DogAgeGroup,
  DogSize,
  PawSafetyTier,
  PawSensitivity,
  PlaceCategory,
  PlaceMatchBadgeKey,
  ReasonTag,
  WalkQualityTier,
} from '../types/walk';

/**
 * Centralized localizable UI message catalog with translator descriptions and
 * character limit annotations (`[CHAR_LIMIT=N]` with >=30% expansion margin).
 */
export const MESSAGES = {
  /** @desc App brand title in top iOS navigation header; proper noun brand name [CHAR_LIMIT=16] */
  appTitle: 'PawCast',
  /** @desc Subtitle beneath brand title in top header describing app purpose [CHAR_LIMIT=42] */
  appSubtitle: 'Smart Dog Walk Planner',
  /** @desc Toggle button label in desktop preview bar to switch iPhone frame view [CHAR_LIMIT=24] */
  iphoneFrameToggle: 'iPhone Preview',
  /** @desc Toggle button label in desktop preview bar to expand to full browser width [CHAR_LIMIT=22] */
  fullWidthToggle: 'Full Width',
  /** @desc Button aria/label for switching imperial (°F, mi) vs metric (°C, km) units [CHAR_LIMIT=16] */
  unitsImperial: '°F · mi',
  /** @desc Button aria/label for metric (°C, km) unit display [CHAR_LIMIT=16] */
  unitsMetric: '°C · km',

  /** @desc Bottom navigation tab label for hourly walk timing forecast [CHAR_LIMIT=16] */
  tabBestTime: 'Best Time',
  /** @desc Bottom navigation tab label for nearby dog parks and walking routes [CHAR_LIMIT=18] */
  tabBestPlaces: 'Best Places',
  /** @desc Bottom navigation tab label for customizing the dog profile [CHAR_LIMIT=16] */
  tabMyDog: 'My Dog',
  /** @desc Bottom navigation tab label in Version 2 for instant walk verdict and top 3 matches [CHAR_LIMIT=16] */
  tabWalkNow: 'Walk Now',
  /** @desc Bottom navigation tab label in Version 2 for full-screen interactive park and street map [CHAR_LIMIT=12] */
  tabExploreMap: 'Map',

  /** @desc Badge label indicating user is inspecting the current live hour [CHAR_LIMIT=16] */
  nowBadge: 'Right Now',
  /** @desc Action chip label to reset selected forecast hour back to current live hour [CHAR_LIMIT=20] */
  resetToNow: 'Back to Now',
  /** @desc Label above numeric 0-100 walk comfort score in hero card [CHAR_LIMIT=20] */
  walkScoreLabel: 'Walk Score',
  /** @desc Hero card section header showing personalized dog target; {dogName} is dog's name (e.g. Bella) [CHAR_LIMIT=40] */
  personalizedFor: (dogName: string) => `Tailored for ${dogName}`,

  /** @desc Section heading for paw-pad asphalt surface heat card [CHAR_LIMIT=36] */
  pawSurfaceTitle: 'Paw & Pavement Check',
  /** @desc Metric label for ambient air temperature [CHAR_LIMIT=18] */
  airTempLabel: 'Air Temp',
  /** @desc Metric label for feels-like apparent temperature [CHAR_LIMIT=20] */
  feelsLikeLabel: 'Feels Like',
  /** @desc Metric label for estimated sun-heated dark asphalt temperature [CHAR_LIMIT=24] */
  estAsphaltLabel: 'Est. Asphalt',
  /** @desc Educational veterinary tip shown inside paw-pad heat card [CHAR_LIMIT=NONE] */
  sevenSecondRuleTip:
    '7-Second Rule: Press the back of your hand on asphalt for 7 seconds. If it feels too hot for your hand, it can burn paw pads.',

  /** @desc Section heading listing top recommended walk time windows in next 24h [CHAR_LIMIT=36] */
  bestWindowsTitle: 'Best Walk Windows',
  /** @desc Subtitle explaining user can tap a window to preview weather & matching parks [CHAR_LIMIT=68] */
  bestWindowsSubtitle: 'Tap any window to match parks & trails for that time',
  /** @desc Badge shown on walk windows overlapping golden hour before sunset [CHAR_LIMIT=20] */
  goldenHourBadge: 'Golden Hour',
  /** @desc Empty state message when severe weather leaves no high-scoring windows [CHAR_LIMIT=NONE] */
  noIdealWindows:
    'Conditions stay challenging today. Keep potty breaks brief on shaded grass and hydrate well.',

  /** @desc Section heading above 24-hour interactive horizontal scrubber [CHAR_LIMIT=34] */
  hourlyTimelineTitle: '24-Hour Walk Forecast',
  /** @desc Helper hint next to 24-hour timeline header [CHAR_LIMIT=36] */
  hourlyTimelineHint: 'Tap an hour to inspect',

  /** @desc Section heading for detailed weather & air quality grid [CHAR_LIMIT=32] */
  conditionsTitle: 'Hourly Conditions',
  /** @desc Weather tile label for precipitation probability [CHAR_LIMIT=20] */
  rainChanceLabel: 'Rain Chance',
  /** @desc Weather tile label for UV index [CHAR_LIMIT=16] */
  uvIndexLabel: 'UV Index',
  /** @desc Weather tile label for wind speed [CHAR_LIMIT=16] */
  windLabel: 'Wind',
  /** @desc Weather tile label for US Air Quality Index [CHAR_LIMIT=20] */
  airQualityLabel: 'Air Quality (AQI)',
  /** @desc Weather tile label for sunrise clock time [CHAR_LIMIT=16] */
  sunriseLabel: 'Sunrise',
  /** @desc Weather tile label for sunset clock time [CHAR_LIMIT=16] */
  sunsetLabel: 'Sunset',
  /** @desc Fallback label when AQI reading is unavailable [CHAR_LIMIT=16] */
  notAvailable: 'N/A',

  /** @desc CTA button at bottom of Best Time screen to view ranked spots for selected hour; {time} is formatted time (e.g. 5:00 PM) [CHAR_LIMIT=52] */
  seePlacesForHour: (time: string) => `See Best Places for ${time}`,

  /** @desc Section heading on Best Places home screen [CHAR_LIMIT=36] */
  placesHeaderTitle: 'Nearby Walk Spots',
  /** @desc Subtitle on Best Places screen indicating active forecast hour; {time} is formatted time (e.g. 8:00 AM) [CHAR_LIMIT=56] */
  placesMatchedForHour: (time: string) => `Matched for ${time}`,
  /** @desc Link pill on Best Places weather banner to open full 24h Best Time forecast [CHAR_LIMIT=22] */
  fullForecastAction: '24h Forecast ›',
  /** @desc Map attribution badge required for slippy map tiles [CHAR_LIMIT=32] */
  osmAttribution: '© Esri · © OpenStreetMap',
  /** @desc Button label on floating map preview bar to launch walking directions [CHAR_LIMIT=18] */
  goDirectionsShort: 'Directions',
  /** @desc Helper label indicating walking duration estimate; {mins} is formatted minutes (e.g. 18 min) [CHAR_LIMIT=26] */
  walkTimeEstimate: (mins: string) => `🚶 ${mins} walk`,
  /** @desc Helper label indicating urban drive/ride duration for distant spots (>=2.5 km); {mins} is formatted minutes [CHAR_LIMIT=28] */
  driveTimeEstimate: (mins: string) => `🚗 ~${mins} drive`,
  /** @desc Filter toggle chip for spots within walkable neighborhood distance (<2.5 km) [CHAR_LIMIT=24] */
  filterWalkableOnly: 'Walkable (<2.5 km)',
  /** @desc Center user marker label on map [CHAR_LIMIT=12] */
  youMarker: 'You',

  /** @desc Filter chip label to show all place categories [CHAR_LIMIT=14] */
  filterAll: 'All Spots',
  /** @desc Filter chip label for off-leash dog parks [CHAR_LIMIT=18] */
  filterDogParks: 'Dog Parks',
  /** @desc Filter chip label for trails and greenways [CHAR_LIMIT=18] */
  filterTrails: 'Trails & Loops',
  /** @desc Filter chip label for neighborhood parks [CHAR_LIMIT=16] */
  filterParks: 'Parks',
  /** @desc Filter chip toggle for shaded spots only [CHAR_LIMIT=18] */
  filterShadeOnly: 'Shaded Only',

  /** @desc Action button label on a place card to open walking directions in Maps [CHAR_LIMIT=24] */
  openInMaps: 'Walking Directions',
  /** @desc Action button label on a distant place card (>=2.5 km) to open driving directions in Maps [CHAR_LIMIT=24] */
  openDrivingMaps: 'Driving Directions',
  /** @desc Notice banner when showing curated sample parks if OSM network is unreachable [CHAR_LIMIT=NONE] */
  curatedPlacesNotice:
    'Showing sample dog-friendly route ideas around this area while live map data refreshes.',
  /** @desc Empty state when active category filter matches zero places [CHAR_LIMIT=NONE] */
  noPlacesMatchFilter:
    'No nearby spots matched this filter. Try switching back to All Spots.',

  /** @desc Header title on Dog Profile screen [CHAR_LIMIT=32] */
  dogProfileTitle: 'Dog Sensitivity Profile',
  /** @desc Subtitle explaining how dog traits customize walk scores [CHAR_LIMIT=NONE] */
  dogProfileSubtitle:
    'PawCast adjusts safe temperature, humidity, and pavement thresholds based on your dog’s coat, snout, age, and paws.',
  /** @desc Form label for dog's name text input [CHAR_LIMIT=24] */
  dogNameLabel: 'Dog’s Name',
  /** @desc Placeholder inside dog name text input [CHAR_LIMIT=24] */
  dogNamePlaceholder: 'e.g. Barnaby',
  /** @desc Section label for quick breed archetype presets [CHAR_LIMIT=28] */
  breedPresetsLabel: 'Quick Breed Presets',
  /** @desc Section label for dog body size selector [CHAR_LIMIT=20] */
  dogSizeLabel: 'Size',
  /** @desc Section label for dog life stage selector [CHAR_LIMIT=20] */
  dogAgeLabel: 'Age Stage',
  /** @desc Section label for dog coat thickness selector [CHAR_LIMIT=24] */
  dogCoatLabel: 'Coat Thickness',
  /** @desc Toggle title for brachycephalic / flat-faced breeds [CHAR_LIMIT=36] */
  flatFacedTitle: 'Flat-Faced (Brachycephalic)',
  /** @desc Helper description for brachycephalic heat sensitivity [CHAR_LIMIT=NONE] */
  flatFacedDesc:
    'Frenchies, Pugs, Bulldogs, Boxers & Shih Tzus overheat 10–12°F sooner, especially in humid weather.',
  /** @desc Section label for paw pad sensitivity selector [CHAR_LIMIT=24] */
  pawSensitivityLabel: 'Paw Pad Toughness',

  /** @desc Modal header title for location search and GPS selection [CHAR_LIMIT=28] */
  locationModalTitle: 'Choose Walk Area',
  /** @desc Close button label in modal header (verb action) [CHAR_LIMIT=14] */
  closeButton: 'Done',
  /** @desc Button label to auto-locate nearest suburbs via device GPS [CHAR_LIMIT=38] */
  useCurrentLocation: 'Auto-Locate Nearest Suburb (GPS)',
  /** @desc Button label when GPS nearest suburbs have already been located and can be refreshed [CHAR_LIMIT=38] */
  refreshNearestSuburbsGps: 'Refresh Nearest Suburbs (GPS)',
  /** @desc Compact button label on Walk Now screen to auto-locate nearest suburb [CHAR_LIMIT=26] */
  autoLocateSuburbShort: 'Auto-Locate Suburb',
  /** @desc Compact button label on Best Time screen to use phone's current location [CHAR_LIMIT=22] */
  useMyLocationShort: 'Use My Location',
  /** @desc Active chip label when Best Time weather is already using phone GPS [CHAR_LIMIT=20] */
  gpsActiveRefresh: 'GPS Live ↻',
  /** @desc Subtitle on Best Time location bar when showing weather around phone's GPS; {coords} is formatted lat/lon [CHAR_LIMIT=52] */
  aroundPhoneWeather: (coords: string) => `Around your phone · ${coords}`,
  /** @desc Subtitle hint on Best Time location bar when viewing a preset/searched city [CHAR_LIMIT=32] */
  tapToChangeArea: 'Tap to change area',
  /** @desc Quick chip to switch back to Shanghai Pilot when phone GPS is in another city [CHAR_LIMIT=24] */
  backToShanghaiPilot: '↩ Shanghai Pilot',
  /** @desc Action link inside GPS permission notice to pick an area manually [CHAR_LIMIT=20] */
  chooseOtherArea: 'Choose Area ›',
  /** @desc Button label while GPS lookup is in progress [CHAR_LIMIT=28] */
  locatingStatus: 'Locating…',
  /** @desc Search input placeholder for city or neighborhood lookup [CHAR_LIMIT=36] */
  searchCityPlaceholder: 'Search city or neighborhood…',
  /** @desc Search submit button label (verb action) [CHAR_LIMIT=16] */
  searchAction: 'Search',
  /** @desc Section label for popular quick-select cities [CHAR_LIMIT=26] */
  popularCitiesLabel: 'Quick Cities',
  /** @desc Generic error message when location permission is denied or unavailable [CHAR_LIMIT=NONE] */
  locationPermissionDenied:
    'Location access wasn’t granted. Search any city or tap a quick city below.',
  /** @desc Generic error message when weather refresh fails [CHAR_LIMIT=NONE] */
  weatherFetchError:
    'Unable to refresh live forecast right now. Check your connection and pull or tap Retry.',
  /** @desc Retry button label on error banner (verb action) [CHAR_LIMIT=16] */
  retryAction: 'Retry',
  /** @desc Loading state status caption while fetching forecast and nearby parks [CHAR_LIMIT=40] */
  loadingForecast: 'Checking local weather, paws & parks…',
};

export const QUALITY_TIER_LABELS: Record<WalkQualityTier, string> = {
  /** @desc Walk score status badge for 82-100 score [CHAR_LIMIT=22] */
  ideal: 'Ideal Walk Time',
  /** @desc Walk score status badge for 65-81 score [CHAR_LIMIT=22] */
  good: 'Good Conditions',
  /** @desc Walk score status badge for 42-64 score [CHAR_LIMIT=24] */
  caution: 'Use Caution',
  /** @desc Walk score status badge for 0-41 score [CHAR_LIMIT=24] */
  avoid: 'Short Potty Only',
};

export const PAW_TIER_LABELS: Record<PawSafetyTier, { badge: string; detail: string }> = {
  safe: {
    /** @desc Safe paw-pad badge (<43°C asphalt) [CHAR_LIMIT=20] */
    badge: 'Paw Safe',
    /** @desc Safe paw-pad detail caption [CHAR_LIMIT=60] */
    detail: 'Pavement is comfortable for bare paws',
  },
  warm: {
    /** @desc Warm paw-pad badge (43-51°C asphalt) [CHAR_LIMIT=24] */
    badge: 'Warm · Test 7s',
    /** @desc Warm paw-pad detail caption [CHAR_LIMIT=64] */
    detail: 'Prefer shaded sidewalks or grassy park loops',
  },
  hot: {
    /** @desc Hot paw-pad badge (52-57°C asphalt) [CHAR_LIMIT=26] */
    badge: 'Hot · Grass / Booties',
    /** @desc Hot paw-pad detail caption [CHAR_LIMIT=68] */
    detail: 'Dark asphalt can burn sensitive pads within 60 seconds',
  },
  danger: {
    /** @desc Danger paw-pad badge (>57°C asphalt) [CHAR_LIMIT=26] */
    badge: 'Burn Risk · Skip Asphalt',
    /** @desc Danger paw-pad detail caption [CHAR_LIMIT=68] */
    detail: 'Extreme surface heat — stay on turf or wait until evening',
  },
};

export const REASON_LABELS: Record<ReasonTag, string> = {
  comfortable_temp: 'Comfortable air temp',
  paw_safe_surface: 'Cool pavement for paws',
  paw_warm_test: 'Warm sun-lit asphalt',
  paw_hot_grass_only: 'Hot pavement — stick to grass',
  paw_burn_danger: 'Dangerous asphalt heat',
  wet_grass_post_rain: 'Wet grass from earlier rain — paved paths cleaner',
  brachy_heat_risk: 'Humid/warm for flat-faced breeds',
  thick_coat_warm: 'Warm for thick double coats',
  chilly_short_coat: 'Brisk air — jacket helps thin coats',
  freezing_alert: 'Freezing — watch ice & road salt',
  rain_likely: 'Rain showers likely',
  heavy_rain_storm: 'Heavy rain or storm risk',
  high_uv: 'High UV — seek tree shade',
  extreme_uv: 'Extreme Australian UV (11+) — hot sand & sunburn risk',
  strong_wind: 'Breezy / gusty winds',
  poor_air_quality: 'Elevated AQI — keep pace gentle',
  clean_air: 'Crisp, clean air quality',
  after_dark: 'After dark — bring reflective gear',
};

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  dog_park: 'Off-Leash Dog Park',
  dog_beach: 'Off-Leash Dog Beach',
  trail: 'Trail & Walking Loop',
  park: 'Park & Green Space',
};

export const AMENITY_LABELS: Record<AmenityKey, string> = {
  off_leash: 'Off-Leash Area',
  shade: 'Tree Shade',
  water: 'Water Access',
  lit: 'Evening Lighting',
  paved: 'Paved Path',
};

export const PLACE_MATCH_LABELS: Record<PlaceMatchBadgeKey, string> = {
  shaded_relief: 'Best Shade for Sunny Heat',
  off_leash_prime: 'Top Off-Leash Play Weather',
  dry_paved: 'Dry Paved Footing',
  lit_evening: 'Best Lit Evening Option',
  scenic_loop: 'Great Pack-Walk Loop',
  close_quick_walk: 'Quick Nearby Stroll',
  small_dogs_only: 'Small Dogs (≤15 kg) Only',
  closed_at_hour: 'Closed at Selected Time',
  needs_dog_license: 'Requires 狗证 License',
};

export const ACCESS_RULE_LABELS = {
  walk_in_free: 'Free Walk-In',
  timed_beach: 'Timed Off-Leash',
  booking_license: 'Booking + 狗证',
  pet_ticket: 'Pet Ticket',
} as const;

export const LEASH_POLICY_LABELS = {
  off_leash_fenced: 'Fenced Off-Leash',
  off_leash_unfenced: 'Off-Leash Reserve',
  leashed_only: 'On-Leash Walk',
} as const;

export const SIZE_LABELS: Record<DogSize, string> = {
  small: 'Small (<22 lb)',
  medium: 'Medium (22–55 lb)',
  large: 'Large (55–90 lb)',
  giant: 'Giant (90+ lb)',
};

export const AGE_LABELS: Record<DogAgeGroup, string> = {
  puppy: 'Puppy',
  adult: 'Adult',
  senior: 'Senior',
};

export const COAT_LABELS: Record<CoatType, string> = {
  short: 'Short / Thin',
  medium: 'Medium',
  thick: 'Double / Thick',
};

export const PAW_SENSITIVITY_LABELS: Record<PawSensitivity, string> = {
  tough: 'Seasoned / Tough',
  normal: 'Normal Pads',
  sensitive: 'Sensitive / Puppy',
};
