import { AppLanguage } from '../types/walk';
import { AuthErrorKey } from '../utils/validation';

/**
 * Centralized English & Simplified Mandarin (`zh`) UI copy catalog.
 * Numbers, temperatures, distances, and clock times are formatted dynamically
 * via ECMAScript `Intl` APIs in `src/i18n/formatters.ts` using `locale`.
 */
export interface AppStrings {
  /** @desc App subtitle in desktop studio toolbar [CHAR_LIMIT=42] */
  appSubtitle: string;
  /** @desc Button label to switch to full browser width on desktop [CHAR_LIMIT=22] */
  fullWidthToggle: string;
  /** @desc Button label to switch to iPhone frame preview on desktop [CHAR_LIMIT=24] */
  iphoneFrameToggle: string;
  /** @desc Bottom tab label for Walk Now screen [CHAR_LIMIT=16] */
  tabWalkNow: string;
  /** @desc Bottom tab label for Map screen [CHAR_LIMIT=12] */
  tabExploreMap: string;
  /** @desc Bottom tab label for Photo Memory Map screen [CHAR_LIMIT=14] */
  tabPhotoMap: string;
  /** @desc Error boundary title [CHAR_LIMIT=40] */
  errorTitle: string;
  /** @desc Error boundary description [CHAR_LIMIT=NONE] */
  errorSub: string;
  /** @desc Error boundary reload button [CHAR_LIMIT=24] */
  errorReload: string;

  // Walk Now screen
  loadingForecast: string;
  retryAction: string;
  liveCheck: string;
  checkingConditions: string;
  groundLabel: string;
  bestLabel: string;
  updatingStatus: string;
  refreshShort: string;
  livePrefix: string;
  offlineCachedPrefix: string;
  packSafetyBadge: string;
  hide24hForecast: string;
  check24hForecast: string;
  resetToNow: string;
  locatingStatus: string;
  nearbySuburbsShort: string;
  autoLocateSuburbShort: string;
  rainLabel: string;
  sunsetLabel: string;
  nowShort: string;
  parksAndBeachesTab: string;
  topParksTab: string;
  fromMyDoorTab: string;
  bestOpenMatchesTitle: string;
  fullMapLabel: string;
  browseAllSpotsCta: (count: string) => string;
  circularLoopTitle: string;
  startsFinishesAt: (place: string) => string;
  minShort: string;
  steersVia: string;
  skipsPrefix: string;
  startLoopInMaps: (mins: string) => string;
  previewLoopOnMap: string;
  walkLoggedJournal: string;
  logMinWalk: (mins: string) => string;

  // Map screen
  easyLegend: string;
  peakLegend: string;
  narrowLegend: string;
  showStreetLines: string;
  filtersBtn: string;
  minCircularLoop: (mins: string) => string;
  viaPrefix: string;
  backToParks: string;
  startLoopShort: string;
  calmSwap: string;
  startCorner: string;
  localGuideAndGate: string;
  dogGateMaps: string;
  noParksMatchFilters: string;
  resetMapFilters: string;
  mapFiltersTitle: string;
  resetBtn: string;
  showCount: (count: string) => string;
  browseNearbyTitle: string;
  closeBtn: string;
  spotsTab: (count: string) => string;
  trailsAndStreetsTab: (count: string) => string;
  filterDogBeaches: string;
  filterFencedRun: string;
  filterAnyOffLeash: string;
  filterShadedCanopy: string;
  filterWalkableMetric: string;
  filterWalkableImperial: string;
  filterDryPaved: string;
  filterOpenNow: string;
  filterSavedRegulars: string;

  // Park Guide Sheet
  exactDogEntrance: string;
  previewTrailOnMap: string;
  groundAndRulesNow: string;
  dogPerksNearby: string;
  localHeadsUp: string;
  addPrivateNotePlaceholder: (dogName: string) => string;
  walkToGate: string;
  driveToGate: string;
  copiedInvite: string;
  wechatMeetUp: string;
  shareWalkInvite: string;
  hideBtn: string;
  inviteCardReadyZh: string;
  inviteCardReadyEn: string;
  rightNowLabel: string;

  // Location Modal
  chooseWalkArea: string;
  doneBtn: string;
  locatingNearestSuburbs: string;
  refreshNearestSuburbsGps: string;
  autoLocateNearestSuburbGps: string;
  cityMelbourne: string;
  citySydney: string;
  cityShanghai: string;
  cityGlobal: string;
  searchAction: string;
  searchSuburbPlaceholderSh: string;
  searchSuburbPlaceholderAu: (city: string) => string;
  searchCityPlaceholder: string;
  areaAll: string;
  areaPopular: string;
  areaNearest: string;
  popularBadge: string;
  closestBadge: (dist: string) => string;
  exactGpsBtn: string;
  useHereBtn: string;
  demoGpsPin: string;
  gpsPinLocated: string;
  chooseNearestBelow: string;
  closestPrefix: string;
  awaySuffix: string;
  suburbUnitSingular: string;
  suburbUnitPlural: string;
  tapHintSh: string;
  tapHintAu: string;
  popularCitiesLabel: string;
  noSuburbMatched: (q: string) => string;
  searchWorldFallback: (q: string) => string;

  // Dog Profile Screen
  walkingPackActive: string;
  walkTogetherBtn: string;
  addPupBtn: string;
  packSafetySubtitle: (count: number) => string;
  editProfileAndPhoto: (dogName: string) => string;
  happyTempZoneTitle: (dogName: string) => string;
  chillyLabel: string;
  nowLabel: string;
  hotLabel: string;
  savedRegularsTitle: (dogName: string) => string;
  savedCountLabel: (count: number) => string;
  tapHeartPrompt: string;
  switchAndViewMap: string;
  emptySavedHint: string;
  savePrefix: string;
  walkStreakJournalTitle: string;
  logWalkShort: string;
  dayStreakLabel: string;
  thisWeekLabel: string;
  loggedDistLabel: string;
  emptyJournalHint: string;
  uploadPhoto: string;
  changePhoto: string;
  openingStatus: string;
  snapCamera: string;
  breedAvatar: string;
  dogNameLabel: string;
  pupNamePlaceholder: string;
  breedLookVibe: string;
  bodySizeLabel: string;
  sizeSmall: string;
  sizeMedium: string;
  sizeLarge: string;
  sizeXL: string;
  lifeStageLabel: string;
  stagePuppy: string;
  stageAdult: string;
  stageSenior: string;
  coatAndPawsLabel: string;
  coatShort: string;
  coatMedium: string;
  coatThick: string;
  pawsSoft: string;
  pawsNormal: string;
  pawsTough: string;
  flatSnootActive: string;
  flatSnootInactive: string;
  flatSnootSub: (low: string, high: string) => string;
  languageSectionLabel: string;
  unitsSectionLabel: string;
  metricTitle: string;
  metricSub: string;
  imperialTitle: string;
  imperialSub: string;
  removePupFromHousehold: (name: string) => string;
  regoReadySh: string;
  regoMissingSh: string;
  regoReadyShSub: string;
  regoMissingShSub: string;
  regoReadyAu: string;
  regoMissingAu: string;
  regoReadyAuSub: string;
  regoMissingAuSub: string;
  traitRegoShReady: string;
  traitRegoShFree: string;
  traitRegoAuReady: string;
  traitRegoAuFenced: string;
  moodDefault: string;
  moodRain: string;
  moodWetGrass: string;
  moodExtremeUv: string;
  moodWarm: string;
  moodIdeal: string;
  moodCozy: string;

  // Notices, Demo GPS & Journal Expansion
  weatherFetchError: string;
  locationPermissionDenied: string;
  demoGpsMel: string;
  demoGpsSyd: string;
  demoGpsSh: string;
  gpsLocatedPrefix: string;
  globalGpsSub: string;
  testSuburbsMel: string;
  testSuburbsSyd: string;
  testSuburbsSh: string;
  zoomLabel: (scale: number) => string;
  showAllWalks: (count: string) => string;
  showFewerWalks: string;

  // Firebase Auth & Cloud Sync
  accountCardTitle: string;
  accountGuestBadge: string;
  accountSetupBadge: string;
  accountGuestSubtitle: string;
  accountSetupNotice: string;
  accountSignInCta: string;
  accountSetupGuideCta: string;
  accountVerifiedBadge: string;
  accountUnverifiedBadge: string;
  accountResendVerify: string;
  accountVerifySent: string;
  accountSyncSynced: string;
  accountSyncSyncing: string;
  accountSyncError: string;
  accountSyncIdle: string;
  accountSyncNowBtn: string;
  accountSignOutBtn: string;
  accountDeleteBtn: string;
  authTabSignIn: string;
  authTabSignUp: string;
  authTitleSignIn: string;
  authTitleSignUp: string;
  authTitleReset: string;
  authTitleDelete: string;
  authEmailLabel: string;
  authEmailPlaceholder: string;
  authPasswordLabel: string;
  authCurrentPasswordLabel: string;
  authPasswordPlaceholder: string;
  authNewPasswordPlaceholder: string;
  authShowPassword: string;
  authHidePassword: string;
  authStrengthHint: string;
  authStrengthWeak: string;
  authStrengthGood: string;
  authStrengthStrong: string;
  authForgotPasswordLink: string;
  authBackToSignIn: string;
  authSubmitSignIn: string;
  authSubmitSignUp: string;
  authSubmitReset: string;
  authSubmitDelete: string;
  authWorkingStatus: string;
  authResetSentNotice: string;
  authDeleteWarning: string;
  authCancelBtn: string;
  authPrivacyFootnote: string;
  authSetupStepsTitle: string;
  authSetupStepsBody: string;
  authErrNotConfigured: string;
  authErrInvalidEmail: string;
  authErrWeakPassword: string;
  authErrInvalidCredentials: string;
  authErrTooManyRequests: string;
  authErrRequiresRecentLogin: string;
  authErrNetwork: string;
  authErrGeneric: string;

  // Member Profile, Tier 1 & Tier 2 Preferences
  authDisplayNameLabel: string;
  authDisplayNamePlaceholder: string;
  accountOpenHubBtn: string;
  accountGuestName: string;
  memberHubTitle: string;
  memberTabProfile: string;
  memberTabSpots: string;
  memberTabCare: string;
  memberTabHousehold: string;
  memberDisplayNameLabel: string;
  memberDisplayNamePlaceholder: string;
  memberUploadAvatar: string;
  memberChangeAvatar: string;
  memberClearAvatar: string;
  memberPinnedAreasTitle: string;
  memberPinCurrentBtn: string;
  memberPinLabelPlaceholder: string;
  memberNoPinnedAreas: string;
  memberRoutineTitle: string;
  memberMorningHourLabel: string;
  memberEveningHourLabel: string;
  memberOffLabel: string;
  memberDefaultLoopLabel: string;
  memberPreferredMapsLabel: string;
  mapsAppAuto: string;
  mapsAppApple: string;
  mapsAppGoogle: string;
  mapsAppAmap: string;
  memberDefaultFiltersLabel: string;
  saveFiltersAsDefaultBtn: string;
  savedDefaultFiltersToast: string;
  memberInviteSignatureLabel: string;
  memberInviteSignaturePlaceholder: string;
  memberWeeklyGoalsLabel: string;
  memberGoalWalksUnit: string;
  memberGoalDistUnitMetric: string;
  memberGoalDistUnitImperial: string;
  memberSecretSpotsTitle: string;
  memberSecretSpotsSub: string;
  memberSpotNamePlaceholder: string;
  memberSpotNotePlaceholder: string;
  memberAddSpotAtCurrentBtn: string;
  memberEmptySpots: string;
  memberSpotCatPark: string;
  memberSpotCatDogPark: string;
  memberSpotCatTrail: string;
  memberSpotCatBeach: string;
  memberSpotTagShade: string;
  memberSpotTagWater: string;
  memberSpotTagFenced: string;
  memberSpotTagQuiet: string;
  memberRemindersTitle: string;
  memberRemindersSub: string;
  memberReminderTitlePlaceholder: string;
  memberReminderDatePlaceholder: string;
  memberReminderAddBtn: string;
  memberReminderTypeRego: string;
  memberReminderTypeRabies: string;
  memberReminderTypeFlea: string;
  memberReminderTypeGrooming: string;
  memberReminderTypeCustom: string;
  memberReminderRepeatOnce: string;
  memberReminderRepeatMonthly: string;
  memberReminderRepeatQuarterly: string;
  memberReminderRepeatYearly: string;
  memberReminderOverdue: string;
  memberReminderDueToday: string;
  memberReminderDueInDays: (days: string) => string;
  memberReminderRenewDone: string;
  memberEmptyReminders: string;
  memberGearTitle: string;
  memberGearSub: string;
  memberGearAddPlaceholder: string;
  memberGearAddBtn: string;
  gearTriggerAlways: string;
  gearTriggerHotPaws: string;
  gearTriggerRain: string;
  gearTriggerNight: string;
  gearTriggerLicense: string;
  packForWalkTitle: string;
  memberHouseholdTitle: string;
  memberHouseholdSub: string;
  memberHouseholdSignInNeeded: string;
  memberHouseholdCreateBtn: string;
  memberHouseholdJoinLabel: string;
  memberHouseholdJoinPlaceholder: string;
  memberHouseholdJoinBtn: string;
  memberHouseholdMembersLabel: string;
  memberHouseholdOwnerTag: string;
  memberHouseholdInviteCodeLabel: string;
  memberHouseholdCopyCode: string;
  memberHouseholdCopiedCode: string;
  memberHouseholdNewCode: string;
  memberHouseholdSyncBtn: string;
  memberHouseholdLeaveBtn: string;
  memberHouseholdDisbandBtn: string;
  memberHouseholdJoinFailed: string;
  memberHouseholdActionFailed: string;
  dogQuirksSectionLabel: string;
  dogQuietModeTitle: string;
  dogQuietModeSub: string;
  dogHatesRainTitle: string;
  dogHatesRainSub: string;
  dogLovesWaterTitle: string;
  dogLovesWaterSub: string;
  dogCustomMaxTempLabel: string;
  dogCustomMaxTempAuto: string;
  walkGoalProgressLabel: (done: string, target: string) => string;
  walkTagHydrated: string;
  walkTagRecall: string;
  walkTagPotty: string;
  walkTagPaws: string;
  walkTagHot: string;
  walkTagSocial: string;
  walkExportCsvBtn: string;
  walkExportJsonBtn: string;
  walkExportedToast: string;
  walkLoggedByPrefix: string;
  pinnedAreasHeader: string;
  pinThisAreaShort: string;
  homeSignInBannerTitle: string;
  homeSignInBannerCta: string;
  profileSignInShort: string;

  // Photo Memory Map Tab
  photosCountSummary: (photos: string, places: string) => string;
  photosViewMap: string;
  photosViewGrid: string;
  photosAddBtn: string;
  photosAddFirstBtn: string;
  photosFitAllBtn: string;
  photosEmptyTitle: string;
  photosEmptySub: string;
  photosTapMapPrompt: string;
  photosViewFullBtn: string;
  photosOpenSpotMaps: string;
  photosShowPinOnMap: string;
  photosComposerTitle: string;
  photosExifGpsFound: string;
  photosPinnedOnMap: string;
  photosNoExifFallback: string;
  photosChoosePinSpotLabel: string;
  photosDropPinBtn: string;
  photosPlaceLabel: string;
  photosPlacePlaceholder: string;
  photosCaptionLabel: string;
  photosCaptionPlaceholder: string;
  photosDateLabel: string;
  photosSaveToMapBtn: string;
  photosDeleteBtn: string;
  photosConfirmDeleteBtn: string;
  photosWallBtn: string;
  photosBackToMapBtn: string;
  photosWallModeAll: string;
  photosWallModeFolders: string;
  photosWallModeMonths: string;
  photosFolderCount: (count: string) => string;
  photosAllFoldersBack: string;
  photosAddCardLabel: string;
  photosPrevBtn: string;
  photosNextBtn: string;
}

const EN_STRINGS: AppStrings = {
  appSubtitle: 'Smart Dog Walk Planner',
  fullWidthToggle: 'Full Width',
  iphoneFrameToggle: 'iPhone Preview',
  tabWalkNow: 'Walk Now',
  tabExploreMap: 'Map',
  tabPhotoMap: 'Photos',
  errorTitle: 'PawCast hit a quick snag',
  errorSub: 'Tap below to restore your live walk forecast and saved parks.',
  errorReload: 'Reload PawCast',

  loadingForecast: 'Checking local weather, paws & parks…',
  retryAction: 'Retry',
  liveCheck: 'LIVE CHECK',
  checkingConditions: 'Checking Walk Conditions…',
  groundLabel: 'Ground',
  bestLabel: 'Best',
  updatingStatus: 'Updating…',
  refreshShort: 'Refresh ↻',
  livePrefix: 'Live',
  offlineCachedPrefix: 'Offline · Cached',
  packSafetyBadge: 'Pack Safety',
  hide24hForecast: 'Hide 24h Forecast',
  check24hForecast: 'Check 24h Forecast',
  resetToNow: 'Back to Now',
  locatingStatus: 'Locating…',
  nearbySuburbsShort: 'Nearby Suburbs',
  autoLocateSuburbShort: 'Auto-Locate Suburb',
  rainLabel: 'Rain',
  sunsetLabel: 'Sunset',
  nowShort: 'Now',
  parksAndBeachesTab: 'Parks & Beaches',
  topParksTab: 'Top Parks',
  fromMyDoorTab: 'From My Door',
  bestOpenMatchesTitle: 'Best Open Matches Right Now',
  fullMapLabel: 'Full Map',
  browseAllSpotsCta: (count) => `Browse All ${count} Spots & Trails on Map`,
  circularLoopTitle: 'Circular Loop From Your Door',
  startsFinishesAt: (place) => `Starts & finishes right at ${place}`,
  minShort: 'min',
  steersVia: 'Steers via',
  skipsPrefix: 'Skips',
  startLoopInMaps: (mins) => `Start ${mins}-Min Walk in Maps ↗`,
  previewLoopOnMap: 'Preview Circular Route on Map',
  walkLoggedJournal: 'Walk Logged to Journal ✓',
  logMinWalk: (mins) => `Log ${mins}-Min Walk`,

  easyLegend: 'Easy',
  peakLegend: 'Peak',
  narrowLegend: 'Narrow',
  showStreetLines: 'Show Street Lines',
  filtersBtn: 'Filters',
  minCircularLoop: (mins) => `${mins}-Min Circular Doorstep Loop`,
  viaPrefix: 'Via',
  backToParks: 'Back to Parks',
  startLoopShort: 'Start Loop ↗',
  calmSwap: 'Calm Swap ›',
  startCorner: 'Start Corner ↗',
  localGuideAndGate: 'Local Guide & Gate',
  dogGateMaps: 'Dog Gate Maps ↗',
  noParksMatchFilters: 'No parks match your active filters',
  resetMapFilters: 'Reset Map Filters',
  mapFiltersTitle: 'Map Filters',
  resetBtn: 'Reset',
  showCount: (count) => `Show ${count}`,
  browseNearbyTitle: 'Browse Nearby',
  closeBtn: 'Close',
  spotsTab: (count) => `Spots (${count})`,
  trailsAndStreetsTab: (count) => `Trails & Streets (${count})`,
  filterDogBeaches: 'Dog Beaches',
  filterFencedRun: 'Fenced Dog Run',
  filterAnyOffLeash: 'Any Off-Leash',
  filterShadedCanopy: 'Shaded Canopy',
  filterWalkableMetric: 'Walkable (<2.5 km)',
  filterWalkableImperial: 'Walkable (<1.5 mi)',
  filterDryPaved: 'Dry Paved Path',
  filterOpenNow: 'Open Right Now',
  filterSavedRegulars: 'Saved Regulars',

  exactDogEntrance: 'EXACT DOG ENTRANCE & PARKING',
  previewTrailOnMap: 'Preview Trail & Surrounding Streets on Map',
  groundAndRulesNow: 'Ground & Rules Now',
  dogPerksNearby: 'Dog Perks Nearby',
  localHeadsUp: 'Local Heads-Up',
  addPrivateNotePlaceholder: (dogName) =>
    `Add a private note for ${dogName} here…`,
  walkToGate: 'Walk to Gate',
  driveToGate: 'Drive to Gate',
  copiedInvite: 'Copied Invite!',
  wechatMeetUp: 'WeChat Meet-Up',
  shareWalkInvite: 'Share Walk Invite',
  hideBtn: 'Hide',
  inviteCardReadyZh: '微信约遛卡 · Ready to Paste in WeChat',
  inviteCardReadyEn: 'Walk Meet-Up Card · Ready for SMS / WhatsApp',
  rightNowLabel: 'Right Now',

  chooseWalkArea: 'Choose Walk Area',
  doneBtn: 'Done',
  locatingNearestSuburbs: 'Locating Nearest Suburbs…',
  refreshNearestSuburbsGps: 'Refresh Nearest Suburbs (GPS)',
  autoLocateNearestSuburbGps: 'Auto-Locate Nearest Suburb (GPS)',
  cityMelbourne: 'Melbourne',
  citySydney: 'Sydney',
  cityShanghai: 'Shanghai',
  cityGlobal: 'Global',
  searchAction: 'Search',
  searchSuburbPlaceholderSh: 'Filter Shanghai suburb (街道/镇), 20xxxx or district…',
  searchSuburbPlaceholderAu: (city) =>
    `Filter ${city} suburb, postcode or council…`,
  searchCityPlaceholder: 'Search city or neighborhood…',
  areaAll: 'All',
  areaPopular: '★ Popular',
  areaNearest: '📍 Nearest',
  popularBadge: 'Popular',
  closestBadge: (dist) => `★ Closest · ${dist}`,
  exactGpsBtn: 'Exact GPS',
  useHereBtn: 'Use Here',
  demoGpsPin: 'Demo GPS Pin',
  gpsPinLocated: 'GPS Pin Located',
  chooseNearestBelow: 'Choose Nearest Suburb Below',
  closestPrefix: 'Closest:',
  awaySuffix: 'away',
  suburbUnitSingular: 'Suburb',
  suburbUnitPlural: 'Suburbs',
  tapHintSh: 'Tap any 街道/镇 for local parks & 狗证 tips',
  tapHintAu: 'Tap any suburb for local parks & UV',
  popularCitiesLabel: 'Quick Cities',
  noSuburbMatched: (q) => `No Melbourne, Sydney, or Shanghai suburb matched “${q}”.`,
  searchWorldFallback: (q) => `Search Worldwide Cities for “${q}”`,

  walkingPackActive: 'Walking Pack ✓',
  walkTogetherBtn: 'Walk Together',
  addPupBtn: '+ Add Pup',
  packSafetySubtitle: (count) =>
    `Pack Safety Mode · ${count} Pups (Scored for Most Sensitive)`,
  editProfileAndPhoto: (dogName) => `Edit ${dogName}’s Profile & Photo`,
  happyTempZoneTitle: (dogName) => `${dogName}’s Happy Temp Zone`,
  chillyLabel: 'Chilly',
  nowLabel: 'Now',
  hotLabel: 'Hot',
  savedRegularsTitle: (dogName) => `${dogName}’s Saved Regulars`,
  savedCountLabel: (count) => `${count} saved`,
  tapHeartPrompt: 'Tap ♡ on any park',
  switchAndViewMap: 'Tap to switch & view on map',
  emptySavedHint:
    'Star your favorite daily parks so they stay one tap away here.',
  savePrefix: 'Save',
  walkStreakJournalTitle: 'Walk Streak & Journal',
  logWalkShort: '+ Log Walk',
  dayStreakLabel: 'Day Streak',
  thisWeekLabel: 'This Week',
  loggedDistLabel: 'Logged Dist',
  emptyJournalHint:
    'Tap + Log Walk here or inside any park guide to track your daily walk streak on-device.',
  uploadPhoto: 'Upload Photo',
  changePhoto: 'Change Photo',
  openingStatus: 'Opening…',
  snapCamera: 'Snap Camera',
  breedAvatar: 'Breed Avatar',
  dogNameLabel: 'Dog’s Name',
  pupNamePlaceholder: 'Pup Name',
  breedLookVibe: 'Breed Look & Vibe',
  bodySizeLabel: 'Body Size',
  sizeSmall: 'Small',
  sizeMedium: 'Medium',
  sizeLarge: 'Large',
  sizeXL: 'XL',
  lifeStageLabel: 'Life Stage',
  stagePuppy: 'Puppy',
  stageAdult: 'Adult',
  stageSenior: 'Senior',
  coatAndPawsLabel: 'Coat & Paws',
  coatShort: 'Sleek Coat',
  coatMedium: 'Classic Coat',
  coatThick: 'Fluffy Coat',
  pawsSoft: 'Soft Paws',
  pawsNormal: 'Normal Paws',
  pawsTough: 'Tough Paws',
  flatSnootActive: 'Flat Snoot Active (Frenchie / Pug)',
  flatSnootInactive: 'Classic Snoot · Tap if Flat-Faced',
  flatSnootSub: (low, high) =>
    `Caps comfort ceiling at ${low}–${high} for safer breathing`,
  languageSectionLabel: 'Language · 语言',
  unitsSectionLabel: 'Temperature & Distance Units',
  metricTitle: 'Metric (°C · km)',
  metricSub: 'Australia / China / EU',
  imperialTitle: 'Imperial (°F · mi)',
  imperialSub: 'US / UK Miles',
  removePupFromHousehold: (name) => `Remove ${name} from Household`,
  regoReadySh: 'Shanghai 狗证 & Rabies Card Ready',
  regoMissingSh: 'No 狗证 Yet · Free Walk-In Mode',
  regoReadyShSub: 'Unlocks gated runs (Expo DogGO, Century Pet Park)',
  regoMissingShSub: 'Deprioritizes gated parks that inspect 狗证',
  regoReadyAu: 'Council Rego & Solid Voice Recall',
  regoMissingAu: 'Recall in Training · Boost Fenced Parks',
  regoReadyAuSub: 'Ready for unfenced off-leash ovals & dog beaches',
  regoMissingAuSub: 'Prioritizes fully fenced dog runs over unfenced beaches/ovals',
  traitRegoShReady: '狗证 Ready',
  traitRegoShFree: 'Free Walk-In',
  traitRegoAuReady: 'Council Rego + Recall',
  traitRegoAuFenced: 'Fenced Runs First',
  moodDefault: 'Ready for our next walk adventure!',
  moodRain: 'Puddles outside — grab my raincoat!',
  moodWetGrass: 'Wet grass outside — let’s stick to dry paved paths!',
  moodExtremeUv: 'Extreme UV 11+ outside — keep my nose in the shade till arvo!',
  moodWarm: 'A bit toasty — let’s find shady tree canopy!',
  moodIdeal: 'Zoomie weather! Grab my leash!',
  moodCozy: 'Ready for a cozy sniff walk!',

  weatherFetchError:
    'Live weather is temporarily unavailable. Check your connection or retry.',
  locationPermissionDenied:
    'Location access wasn’t granted — pick any suburb below or try a demo GPS pin.',
  demoGpsMel: 'Demo Melbourne GPS',
  demoGpsSyd: 'Demo Sydney GPS',
  demoGpsSh: 'Demo Shanghai GPS',
  gpsLocatedPrefix: 'GPS Located:',
  globalGpsSub: 'Worldwide Location · Tap to walk here or test suburb GPS:',
  testSuburbsMel: 'Test Melbourne Suburbs',
  testSuburbsSyd: 'Test Sydney Suburbs',
  testSuburbsSh: 'Test Shanghai Suburbs',
  zoomLabel: (scale) => `Zoom ${scale}×`,
  showAllWalks: (count) => `Show All ${count} Walks`,
  showFewerWalks: 'Show Less',

  accountCardTitle: 'Cloud Account & Sync',
  accountGuestBadge: 'Guest Mode',
  accountSetupBadge: 'Setup Needed',
  accountGuestSubtitle:
    'Using PawCast locally on this device. Sign in with email to sync your dogs, saved parks, and walk logs across devices.',
  accountSetupNotice:
    'Firebase project keys are not connected in this build yet. Guest Mode still works 100% locally — see FIREBASE_SETUP.md to turn on email sign-in.',
  accountSignInCta: 'Sign In / Create Account',
  accountSetupGuideCta: 'How to Enable Email Sign-In',
  accountVerifiedBadge: 'Verified',
  accountUnverifiedBadge: 'Unverified',
  accountResendVerify: 'Verify Email',
  accountVerifySent: 'Verification email sent — check your inbox.',
  accountSyncSynced: 'Cloud Synced',
  accountSyncSyncing: 'Syncing…',
  accountSyncError: 'Sync Paused',
  accountSyncIdle: 'Ready to Sync',
  accountSyncNowBtn: 'Sync Now',
  accountSignOutBtn: 'Sign Out',
  accountDeleteBtn: 'Delete Account',
  authTabSignIn: 'Sign In',
  authTabSignUp: 'Create Account',
  authTitleSignIn: 'Sign In to PawCast',
  authTitleSignUp: 'Create PawCast Account',
  authTitleReset: 'Reset Password',
  authTitleDelete: 'Delete Account Permanently',
  authEmailLabel: 'Email Address',
  authEmailPlaceholder: 'you@example.com',
  authPasswordLabel: 'Password',
  authCurrentPasswordLabel: 'Confirm Current Password',
  authPasswordPlaceholder: 'Enter your password',
  authNewPasswordPlaceholder: 'At least 12 characters',
  authShowPassword: 'Show',
  authHidePassword: 'Hide',
  authStrengthHint: 'Use at least 12 characters (passphrases welcome).',
  authStrengthWeak: 'Too short or too common',
  authStrengthGood: 'Good password',
  authStrengthStrong: 'Strong password',
  authForgotPasswordLink: 'Forgot password?',
  authBackToSignIn: 'Back to Sign In',
  authSubmitSignIn: 'Sign In',
  authSubmitSignUp: 'Create Account & Sync',
  authSubmitReset: 'Send Reset Link',
  authSubmitDelete: 'Permanently Delete Account',
  authWorkingStatus: 'Please wait…',
  authResetSentNotice:
    'If an account matches that email, a password reset link is on its way.',
  authDeleteWarning:
    'This permanently deletes your cloud profile, synced parks, and PawCast login. This cannot be undone.',
  authCancelBtn: 'Cancel',
  authPrivacyFootnote:
    'Guest Mode always stays free & local. Your email is used strictly for sign-in and never shared.',
  authSetupStepsTitle: 'Connect Your Firebase Project',
  authSetupStepsBody:
    '1. Create a free Firebase Spark project and enable Email/Password Authentication.\n2. Create a Cloud Firestore database and publish firestore.rules from this repo.\n3. Add EXPO_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, PROJECT_ID, and APP_ID to .env.local or GitHub Actions Variables, then rebuild.',
  authErrNotConfigured: 'Firebase Auth is not configured for this build yet.',
  authErrInvalidEmail: 'Please enter a valid email address.',
  authErrWeakPassword:
    'Choose a stronger password with at least 12 characters.',
  authErrInvalidCredentials:
    'Email or password didn’t match. Please try again.',
  authErrTooManyRequests:
    'Too many attempts. Please wait a minute before trying again.',
  authErrRequiresRecentLogin:
    'For security, please re-enter your current password to continue.',
  authErrNetwork:
    'Network request failed. Check your connection and try again.',
  authErrGeneric:
    'Unable to complete this request right now. Please try again.',

  authDisplayNameLabel: 'Your Name (Optional)',
  authDisplayNamePlaceholder: 'e.g. Sarah',
  accountOpenHubBtn: 'Member Hub & Preferences',
  accountGuestName: 'Guest Walker',
  memberHubTitle: 'Member Hub',
  memberTabProfile: 'Profile',
  memberTabSpots: 'My Spots',
  memberTabCare: 'Care & Gear',
  memberTabHousehold: 'Co-Walkers',
  memberDisplayNameLabel: 'Your Display Name',
  memberDisplayNamePlaceholder: 'Your name for walks & invites',
  memberUploadAvatar: 'Upload Photo',
  memberChangeAvatar: 'Change Photo',
  memberClearAvatar: 'Remove',
  memberPinnedAreasTitle: 'Pinned Walk Areas (Up to 5)',
  memberPinCurrentBtn: '+ Pin Current Area',
  memberPinLabelPlaceholder: 'Label (Home, Work, Weekend…)',
  memberNoPinnedAreas:
    'Pin your Home, Work, or Weekend suburbs for 1-tap switching.',
  memberRoutineTitle: 'Usual Walk Routine',
  memberMorningHourLabel: 'Morning Walk',
  memberEveningHourLabel: 'Evening Walk',
  memberOffLabel: 'Off',
  memberDefaultLoopLabel: 'Default Doorstep Loop',
  memberPreferredMapsLabel: 'Preferred Navigation App',
  mapsAppAuto: 'Auto',
  mapsAppApple: 'Apple Maps',
  mapsAppGoogle: 'Google Maps',
  mapsAppAmap: 'AMap (高德)',
  memberDefaultFiltersLabel: 'Default Map Filters',
  saveFiltersAsDefaultBtn: 'Save as Default',
  savedDefaultFiltersToast: 'Saved as default ✓',
  memberInviteSignatureLabel: 'WeChat / Meet-Up Signature',
  memberInviteSignaturePlaceholder:
    'e.g. Pudding & I will meet by the water fountain!',
  memberWeeklyGoalsLabel: 'Weekly Walk Goals',
  memberGoalWalksUnit: 'walks/wk',
  memberGoalDistUnitMetric: 'km/wk',
  memberGoalDistUnitImperial: 'mi/wk',
  memberSecretSpotsTitle: 'My Secret Spots',
  memberSecretSpotsSub:
    'Pin unlisted pocket parks, water-bowl cafés, or shaded trails near your active area.',
  memberSpotNamePlaceholder: 'Spot name (e.g. Oak St Pocket Park)',
  memberSpotNotePlaceholder: 'Tip or gate note (water bowl, quiet corner…)',
  memberAddSpotAtCurrentBtn: '+ Save at Current Area',
  memberEmptySpots:
    'No personal spots yet — add your favorite neighborhood hidden gem above.',
  memberSpotCatPark: 'Park',
  memberSpotCatDogPark: 'Dog Run',
  memberSpotCatTrail: 'Trail',
  memberSpotCatBeach: 'Beach',
  memberSpotTagShade: 'Shaded',
  memberSpotTagWater: 'Water Bowl',
  memberSpotTagFenced: 'Fenced',
  memberSpotTagQuiet: 'Quiet',
  memberRemindersTitle: 'Care & Renewal Reminders',
  memberRemindersSub:
    'Lightweight dates only — track Council Rego, Shanghai 狗证, rabies, or flea/tick cycles.',
  memberReminderTitlePlaceholder: 'Title (e.g. Council Rego / Flea & Tick)',
  memberReminderDatePlaceholder: 'YYYY-MM-DD',
  memberReminderAddBtn: '+ Add Reminder',
  memberReminderTypeRego: 'Rego / 狗证',
  memberReminderTypeRabies: 'Rabies',
  memberReminderTypeFlea: 'Flea & Tick',
  memberReminderTypeGrooming: 'Grooming',
  memberReminderTypeCustom: 'Other',
  memberReminderRepeatOnce: 'One-time',
  memberReminderRepeatMonthly: 'Monthly',
  memberReminderRepeatQuarterly: '3 Months',
  memberReminderRepeatYearly: 'Yearly',
  memberReminderOverdue: 'Overdue',
  memberReminderDueToday: 'Due Today',
  memberReminderDueInDays: (days) => `In ${days}d`,
  memberReminderRenewDone: 'Done ✓',
  memberEmptyReminders:
    'No reminders yet — add rego, vaccine, or flea/tick dates above.',
  memberGearTitle: 'Weather-Triggered Gear Checklist',
  memberGearSub:
    'Matching items appear on Walk Now whenever conditions call for them.',
  memberGearAddPlaceholder: 'Add item (e.g. Cooling vest, treats…)',
  memberGearAddBtn: '+ Add',
  gearTriggerAlways: 'Always',
  gearTriggerHotPaws: 'Hot Paws',
  gearTriggerRain: 'Rain',
  gearTriggerNight: 'Night',
  gearTriggerLicense: 'Rego/狗证',
  packForWalkTitle: 'Pack for This Walk',
  memberHouseholdTitle: 'Household & Co-Walker Sync',
  memberHouseholdSub:
    'Share your dogs, Walk Journal, saved parks, and care reminders with a partner or dog walker (up to 4 members).',
  memberHouseholdSignInNeeded:
    'Sign in with your email account first to create or join a shared household.',
  memberHouseholdCreateBtn: 'Create Shared Household',
  memberHouseholdJoinLabel: 'Have a partner’s invite code?',
  memberHouseholdJoinPlaceholder: 'Paste PAW-… invite code',
  memberHouseholdJoinBtn: 'Join Household',
  memberHouseholdMembersLabel: 'Household Members',
  memberHouseholdOwnerTag: 'Owner',
  memberHouseholdInviteCodeLabel: 'Single-Use Invite Code (7-day expiry)',
  memberHouseholdCopyCode: 'Copy Code',
  memberHouseholdCopiedCode: 'Copied ✓',
  memberHouseholdNewCode: 'New Code',
  memberHouseholdSyncBtn: 'Sync Household',
  memberHouseholdLeaveBtn: 'Leave Household',
  memberHouseholdDisbandBtn: 'Disband Household',
  memberHouseholdJoinFailed:
    'Invite code was invalid, expired, or household is full.',
  memberHouseholdActionFailed:
    'Could not update household right now. Check connection and try again.',
  dogQuirksSectionLabel: 'Temperament & Comfort Quirks',
  dogQuietModeTitle: 'Quiet / Reactive Dog Mode',
  dogQuietModeSub:
    'Boosts calmer trails & low-crowd paths over busy dog beaches',
  dogHatesRainTitle: 'Hates Rain & Wet Puddles',
  dogHatesRainSub: 'Stricter rain & damp grass penalties in your walk score',
  dogLovesWaterTitle: 'Loves Swimming & Dog Beaches',
  dogLovesWaterSub:
    'Boosts open dog beaches & waterfront spots on warm days',
  dogCustomMaxTempLabel: 'Custom Comfort Ceiling',
  dogCustomMaxTempAuto: 'Breed Auto',
  walkGoalProgressLabel: (done, target) =>
    `Weekly Goal: ${done}/${target} walks`,
  walkTagHydrated: '💧 Hydrated',
  walkTagRecall: '🐕 Good Recall',
  walkTagPotty: '💩 Potty',
  walkTagPaws: '🐾 Paw Check',
  walkTagHot: '☀️ Warm',
  walkTagSocial: '🤝 Friendly',
  walkExportCsvBtn: 'Export CSV',
  walkExportJsonBtn: 'JSON',
  walkExportedToast: 'Exported ✓',
  walkLoggedByPrefix: 'by',
  pinnedAreasHeader: 'Pinned Areas',
  pinThisAreaShort: 'Pin Current',
  homeSignInBannerTitle: 'Sync your dogs, saved parks & walk logs across devices',
  homeSignInBannerCta: 'Sign In',
  profileSignInShort: 'Sign In',

  photosCountSummary: (photos, places) =>
    `${photos} Photos · ${places} Spots`,
  photosViewMap: 'Map',
  photosViewGrid: 'Photo Wall',
  photosAddBtn: '+ Photo',
  photosAddFirstBtn: '+ Add Walk Photo',
  photosFitAllBtn: 'Fit All',
  photosEmptyTitle: 'Your Walk Photo Map',
  photosEmptySub:
    'Pin favorite photos of your walks right where you took them. JPEG GPS locations are detected automatically (or tap any park or map spot).',
  photosTapMapPrompt: 'Tap anywhere on the map to pin this photo',
  photosViewFullBtn: 'View Photo',
  photosOpenSpotMaps: 'Maps ↗',
  photosShowPinOnMap: 'Show on Map',
  photosComposerTitle: 'Pin Photo to Map',
  photosExifGpsFound: 'Photo GPS location detected',
  photosPinnedOnMap: 'Pinned manually on map',
  photosNoExifFallback: 'No photo GPS — choose a park or drop a pin',
  photosChoosePinSpotLabel: 'Where Was This Taken?',
  photosDropPinBtn: 'Tap on Map',
  photosPlaceLabel: 'Spot Name',
  photosPlacePlaceholder: 'e.g. Brighton Dog Beach',
  photosCaptionLabel: 'Memory Caption (Optional)',
  photosCaptionPlaceholder: 'e.g. Pudding loved the golden-hour breeze!',
  photosDateLabel: 'Date Taken',
  photosSaveToMapBtn: 'Pin to Photo Map',
  photosDeleteBtn: 'Delete Photo',
  photosConfirmDeleteBtn: 'Tap Again to Delete',
  photosWallBtn: 'Photo Wall',
  photosBackToMapBtn: 'Photo Map',
  photosWallModeAll: 'All Photos',
  photosWallModeFolders: 'Place Folders',
  photosWallModeMonths: 'By Month',
  photosFolderCount: (count) => `${count} photos`,
  photosAllFoldersBack: '← All Folders',
  photosAddCardLabel: 'Add Photo',
  photosPrevBtn: '‹ Prev',
  photosNextBtn: 'Next ›',
};

const ZH_STRINGS: AppStrings = {
  appSubtitle: '贴心遛狗天气助手',
  fullWidthToggle: '宽屏模式',
  iphoneFrameToggle: '手机视图',
  tabWalkNow: '去遛狗',
  tabExploreMap: '地图',
  tabPhotoMap: '足迹相册',
  errorTitle: 'PawCast 出了点小问题',
  errorSub: '点击下方按钮即可恢复实时天气和收藏的公园。',
  errorReload: '重新加载',

  loadingForecast: '正在查看实时天气、地面温度和附近公园…',
  retryAction: '重试',
  liveCheck: '实时路况',
  checkingConditions: '正在评估遛狗舒适度…',
  groundLabel: '地面',
  bestLabel: '推荐',
  updatingStatus: '更新中…',
  refreshShort: '刷新 ↻',
  livePrefix: '更新于',
  offlineCachedPrefix: '离线缓存',
  packSafetyBadge: '多犬模式',
  hide24hForecast: '收起 24 小时',
  check24hForecast: '24 小时预报',
  resetToNow: '回到现在',
  locatingStatus: '定位中…',
  nearbySuburbsShort: '附近街区',
  autoLocateSuburbShort: '定位附近',
  rainLabel: '降水',
  sunsetLabel: '日落',
  nowShort: '现在',
  parksAndBeachesTab: '公园海滩',
  topParksTab: '推荐公园',
  fromMyDoorTab: '周边环线',
  bestOpenMatchesTitle: '现在最适合去',
  fullMapLabel: '查看地图',
  browseAllSpotsCta: (count) => `在地图查看全部 ${count} 个遛狗地点`,
  circularLoopTitle: '家门口环形路线',
  startsFinishesAt: (place) => `从 ${place} 出发并返回`,
  minShort: '分钟',
  steersVia: '优先途经',
  skipsPrefix: '避开',
  startLoopInMaps: (mins) => `导航 ${mins} 分钟路线 ↗`,
  previewLoopOnMap: '在地图预览路线',
  walkLoggedJournal: '已记入遛狗日记 ✓',
  logMinWalk: (mins) => `记录 ${mins} 分钟遛狗`,

  easyLegend: '好走',
  peakLegend: '人多',
  narrowLegend: '较窄',
  showStreetLines: '显示街道贴士',
  filtersBtn: '筛选',
  minCircularLoop: (mins) => `${mins} 分钟周边环线`,
  viaPrefix: '途经',
  backToParks: '返回公园',
  startLoopShort: '开始导航 ↗',
  calmSwap: '换条清静路 ›',
  startCorner: '去起点 ↗',
  localGuideAndGate: '公园攻略',
  dogGateMaps: '导航到入口 ↗',
  noParksMatchFilters: '没有符合筛选条件的公园',
  resetMapFilters: '重置筛选',
  mapFiltersTitle: '筛选条件',
  resetBtn: '重置',
  showCount: (count) => `查看 ${count} 个结果`,
  browseNearbyTitle: '附近列表',
  closeBtn: '关闭',
  spotsTab: (count) => `公园海滩 (${count})`,
  trailsAndStreetsTab: (count) => `步道街道 (${count})`,
  filterDogBeaches: '狗狗海滩',
  filterFencedRun: '围栏狗公园',
  filterAnyOffLeash: '可松绳撒欢',
  filterShadedCanopy: '树荫多',
  filterWalkableMetric: '步行可达 (<2.5 km)',
  filterWalkableImperial: '步行可达 (<1.5 mi)',
  filterDryPaved: '干爽步道',
  filterOpenNow: '现在开放',
  filterSavedRegulars: '我的收藏',

  exactDogEntrance: '宠物专属入口与停车',
  previewTrailOnMap: '在地图查看步道和周边街道',
  groundAndRulesNow: '地面状况与入园须知',
  dogPerksNearby: '附近宠物友好设施',
  localHeadsUp: '遛狗小贴士',
  addPrivateNotePlaceholder: (dogName) => `给 ${dogName} 写条公园备忘…`,
  walkToGate: '步行导航',
  driveToGate: '驾车导航',
  copiedInvite: '已复制，去粘贴！',
  wechatMeetUp: '微信约遛',
  shareWalkInvite: '分享约遛',
  hideBtn: '收起',
  inviteCardReadyZh: '微信约遛卡片 · 已复制，可直接发送给好友',
  inviteCardReadyEn: '约遛卡片 · 可发送至微信或短信',
  rightNowLabel: '现在',

  chooseWalkArea: '选择遛狗区域',
  doneBtn: '完成',
  locatingNearestSuburbs: '正在定位附近片区…',
  refreshNearestSuburbsGps: '重新定位附近片区',
  autoLocateNearestSuburbGps: '定位我附近的片区',
  cityMelbourne: '墨尔本',
  citySydney: '悉尼',
  cityShanghai: '上海',
  cityGlobal: '全球',
  searchAction: '搜索',
  searchSuburbPlaceholderSh: '搜上海街道/镇、行政区或邮编…',
  searchSuburbPlaceholderAu: (city) => `搜${city}区名、邮编或社区…`,
  searchCityPlaceholder: '搜索全球城市或街区…',
  areaAll: '全部',
  areaPopular: '★ 热门',
  areaNearest: '📍 最近',
  popularBadge: '热门',
  closestBadge: (dist) => `★ 最近 · ${dist}`,
  exactGpsBtn: '精准定位',
  useHereBtn: '选这里',
  demoGpsPin: '模拟定位',
  gpsPinLocated: '已获取定位',
  chooseNearestBelow: '请在下方选择片区',
  closestPrefix: '最近：',
  awaySuffix: '',
  suburbUnitSingular: '个片区',
  suburbUnitPlural: '个片区',
  tapHintSh: '点击任意街道/镇查看附近公园和狗证提示',
  tapHintAu: '点击任意片区查看附近公园和紫外线',
  popularCitiesLabel: '热门城市',
  noSuburbMatched: (q) => `在墨尔本、悉尼和上海未找到“${q}”。`,
  searchWorldFallback: (q) => `在全球城市中搜索“${q}”`,

  walkingPackActive: '多犬同遛 ✓',
  walkTogetherBtn: '一起遛',
  addPupBtn: '+ 添加狗狗',
  packSafetySubtitle: (count) =>
    `多犬同遛 · ${count} 只狗狗（按最怕热/怕冷标准评估）`,
  editProfileAndPhoto: (dogName) => `编辑 ${dogName} 资料与头像`,
  happyTempZoneTitle: (dogName) => `${dogName} 的适宜温度`,
  chillyLabel: '偏冷',
  nowLabel: '当前',
  hotLabel: '炎热',
  savedRegularsTitle: (dogName) => `${dogName} 常去的公园`,
  savedCountLabel: (count) => `已收藏 ${count} 个`,
  tapHeartPrompt: '点公园 ♡ 即可收藏',
  switchAndViewMap: '点此切换城市并查看',
  emptySavedHint: '点击公园卡片上的 ♡ 即可收藏常去地点。',
  savePrefix: '收藏',
  walkStreakJournalTitle: '遛狗打卡记录',
  logWalkShort: '+ 记一次',
  dayStreakLabel: '连续打卡',
  thisWeekLabel: '本周遛狗',
  loggedDistLabel: '累计里程',
  emptyJournalHint:
    '点击“+ 记一次”或在公园详情里打卡，记录每天的遛狗轨迹（仅保存在本机）。',
  uploadPhoto: '上传照片',
  changePhoto: '更换照片',
  openingStatus: '打开中…',
  snapCamera: '拍一张',
  breedAvatar: '用默认头像',
  dogNameLabel: '狗狗昵称',
  pupNamePlaceholder: '输入狗狗名字',
  breedLookVibe: '选择品种',
  bodySizeLabel: '体型',
  sizeSmall: '小型犬',
  sizeMedium: '中型犬',
  sizeLarge: '大型犬',
  sizeXL: '巨型犬',
  lifeStageLabel: '年龄阶段',
  stagePuppy: '幼犬',
  stageAdult: '成年犬',
  stageSenior: '老年犬',
  coatAndPawsLabel: '毛发与肉垫',
  coatShort: '短毛',
  coatMedium: '中毛',
  coatThick: '厚毛/双层毛',
  pawsSoft: '肉垫娇嫩',
  pawsNormal: '肉垫正常',
  pawsTough: '肉垫耐磨',
  flatSnootActive: '已开启短鼻犬防暑保护（法斗/巴哥等）',
  flatSnootInactive: '普通犬种 · 短鼻/扁脸犬点此开启',
  flatSnootSub: (low, high) =>
    `将适宜温度上限调低至 ${low}–${high}，预防中暑和呼吸不适`,
  languageSectionLabel: '语言 · Language',
  unitsSectionLabel: '温度与距离单位',
  metricTitle: '公制 (°C · km)',
  metricSub: '中国 / 澳洲 / 欧洲',
  imperialTitle: '英制 (°F · mi)',
  imperialSub: '美国 / 英国',
  removePupFromHousehold: (name) => `移除 ${name}`,
  regoReadySh: '已办理上海养犬登记证（狗证）',
  regoMissingSh: '暂未办狗证 · 优先推荐免费开放公园',
  regoReadyShSub: '可预约世博 DogGO、世纪公园宠物乐园等围栏场地',
  regoMissingShSub: '自动降低需要查验狗证的公园排序',
  regoReadyAu: '唤回稳定（适合开放草坪与海滩）',
  regoMissingAu: '唤回训练中（优先推荐围栏公园）',
  regoReadyAuSub: '适合去开放式草坪和狗狗海滩松绳奔跑',
  regoMissingAuSub: '优先推荐带双层安全门的全围栏狗狗公园',
  traitRegoShReady: '有狗证',
  traitRegoShFree: '免预约优先',
  traitRegoAuReady: '唤回稳定',
  traitRegoAuFenced: '围栏优先',
  moodDefault: '准备好出发去遛弯啦！',
  moodRain: '外面有水洼，记得给我穿小雨衣哦！',
  moodWetGrass: '刚下过雨草地湿湿的，我们走干爽路面吧！',
  moodExtremeUv: '外面紫外线太强了，走树荫下更安全哦！',
  moodWarm: '有点热啦，找片树荫凉快一会儿吧！',
  moodIdeal: '今天天气超棒，快拿牵引绳出发吧！',
  moodCozy: '天气挺舒服，出门闻闻味道吧！',

  weatherFetchError: '实时天气暂时无法获取，请检查网络后重试。',
  locationPermissionDenied:
    '未获取到定位权限，请在下方选择片区或试试模拟定位。',
  demoGpsMel: '模拟墨尔本定位',
  demoGpsSyd: '模拟悉尼定位',
  demoGpsSh: '模拟上海定位',
  gpsLocatedPrefix: '当前定位：',
  globalGpsSub: '全球位置 · 点此使用当前位置，或体验城市片区定位：',
  testSuburbsMel: '体验墨尔本片区',
  testSuburbsSyd: '体验悉尼片区',
  testSuburbsSh: '体验上海街道',
  zoomLabel: (scale) => `缩放 ${scale}×`,
  showAllWalks: (count) => `查看全部 ${count} 条记录`,
  showFewerWalks: '收起记录',

  accountCardTitle: '云端账号与同步',
  accountGuestBadge: '访客模式',
  accountSetupBadge: '待配置',
  accountGuestSubtitle:
    '当前数据仅保存在本机。使用邮箱登录后，即可跨设备同步狗狗资料、收藏公园与遛狗打卡记录。',
  accountSetupNotice:
    '当前版本尚未连接 Firebase 项目参数，访客模式仍可完整使用；按 FIREBASE_SETUP.md 配置后即可开启邮箱登录。',
  accountSignInCta: '邮箱登录 / 注册',
  accountSetupGuideCta: '查看邮箱登录配置步骤',
  accountVerifiedBadge: '已验证',
  accountUnverifiedBadge: '未验证',
  accountResendVerify: '验证邮箱',
  accountVerifySent: '验证邮件已发出，请前往邮箱查收。',
  accountSyncSynced: '已云端同步',
  accountSyncSyncing: '同步中…',
  accountSyncError: '同步暂缓',
  accountSyncIdle: '等待同步',
  accountSyncNowBtn: '立即同步',
  accountSignOutBtn: '退出登录',
  accountDeleteBtn: '注销账号',
  authTabSignIn: '登录',
  authTabSignUp: '注册账号',
  authTitleSignIn: '登录 PawCast',
  authTitleSignUp: '注册 PawCast 账号',
  authTitleReset: '重置密码',
  authTitleDelete: '永久注销账号',
  authEmailLabel: '电子邮箱',
  authEmailPlaceholder: 'name@example.com',
  authPasswordLabel: '密码',
  authCurrentPasswordLabel: '请输入当前密码以确认',
  authPasswordPlaceholder: '请输入密码',
  authNewPasswordPlaceholder: '至少 12 位字符',
  authShowPassword: '显示',
  authHidePassword: '隐藏',
  authStrengthHint: '请使用至少 12 位字符（支持好记的长短语密码）。',
  authStrengthWeak: '长度不足或过于简单',
  authStrengthGood: '密码强度良好',
  authStrengthStrong: '密码强度极佳',
  authForgotPasswordLink: '忘记密码？',
  authBackToSignIn: '返回登录',
  authSubmitSignIn: '登录',
  authSubmitSignUp: '注册并同步',
  authSubmitReset: '发送重置链接',
  authSubmitDelete: '确认永久注销',
  authWorkingStatus: '处理中…',
  authResetSentNotice:
    '如果该邮箱已注册，我们已向其发送密码重置链接，请注意查收。',
  authDeleteWarning:
    '此操作将永久删除你的云端狗狗资料、同步收藏与 PawCast 登录账号，且无法恢复。',
  authCancelBtn: '取消',
  authPrivacyFootnote:
    '访客模式永久免费且本地可用。你的邮箱仅用于账号登录与同步，绝不对外共享。',
  authSetupStepsTitle: '连接你的 Firebase 项目',
  authSetupStepsBody:
    '1. 创建免费的 Firebase Spark 项目，并开启 Email/Password 登录。\n2. 创建 Cloud Firestore 数据库，并发布本仓库中的 firestore.rules。\n3. 在 .env.local 或 GitHub Actions Variables 中填入 4 项 EXPO_PUBLIC_FIREBASE_* 参数后重新部署。',
  authErrNotConfigured: '当前版本尚未配置 Firebase 登录服务。',
  authErrInvalidEmail: '请输入有效的电子邮箱地址。',
  authErrWeakPassword: '请设置至少 12 位的更强密码，避免过于简单的组合。',
  authErrInvalidCredentials: '邮箱或密码不正确，请检查后重试。',
  authErrTooManyRequests: '尝试次数过多，请稍等片刻后再试。',
  authErrRequiresRecentLogin: '为保障账号安全，请重新输入当前密码后再继续。',
  authErrNetwork: '网络连接失败，请检查网络后重试。',
  authErrGeneric: '暂时无法完成请求，请稍后再试。',

  authDisplayNameLabel: '你的昵称（选填）',
  authDisplayNamePlaceholder: '例如：布丁家长',
  accountOpenHubBtn: '会员中心与个性化设置',
  accountGuestName: '访客家长',
  memberHubTitle: '会员中心',
  memberTabProfile: '资料习惯',
  memberTabSpots: '私藏地点',
  memberTabCare: '护理装备',
  memberTabHousehold: '家人同遛',
  memberDisplayNameLabel: '你的显示昵称',
  memberDisplayNamePlaceholder: '用于遛狗记录与约遛邀请',
  memberUploadAvatar: '上传头像',
  memberChangeAvatar: '更换头像',
  memberClearAvatar: '移除',
  memberPinnedAreasTitle: '常用片区快捷切换（最多 5 个）',
  memberPinCurrentBtn: '+ 固定当前片区',
  memberPinLabelPlaceholder: '标签（如：家、公司、周末）',
  memberNoPinnedAreas:
    '固定家、公司或周末常去的片区，随时一键切换当地天气和公园。',
  memberRoutineTitle: '日常遛狗习惯',
  memberMorningHourLabel: '早遛时段',
  memberEveningHourLabel: '晚遛时段',
  memberOffLabel: '关闭',
  memberDefaultLoopLabel: '默认周边环线时长',
  memberPreferredMapsLabel: '默认导航地图',
  mapsAppAuto: '自动',
  mapsAppApple: '苹果地图',
  mapsAppGoogle: '谷歌地图',
  mapsAppAmap: '高德地图',
  memberDefaultFiltersLabel: '地图默认筛选条件',
  saveFiltersAsDefaultBtn: '设为默认',
  savedDefaultFiltersToast: '已设为默认 ✓',
  memberInviteSignatureLabel: '微信约遛默认签名',
  memberInviteSignaturePlaceholder: '例如：布丁和我在公园饮水点集合！',
  memberWeeklyGoalsLabel: '每周遛狗目标',
  memberGoalWalksUnit: '次/周',
  memberGoalDistUnitMetric: '公里/周',
  memberGoalDistUnitImperial: '英里/周',
  memberSecretSpotsTitle: '我的私藏遛狗点',
  memberSecretSpotsSub:
    '记录地图未收录的社区小绿地、宠物友好咖啡馆或树荫小路，自动同步到地图中。',
  memberSpotNamePlaceholder: '地点名称（如：梧桐街小草坪）',
  memberSpotNotePlaceholder: '入口或贴士（如：有饮水盆、清静无电瓶车）',
  memberAddSpotAtCurrentBtn: '+ 保存到当前区域',
  memberEmptySpots: '还没有私藏地点，在上方添加你的宝藏遛狗去处吧。',
  memberSpotCatPark: '公园',
  memberSpotCatDogPark: '狗公园',
  memberSpotCatTrail: '林荫路',
  memberSpotCatBeach: '海滩',
  memberSpotTagShade: '树荫多',
  memberSpotTagWater: '有饮水',
  memberSpotTagFenced: '有围栏',
  memberSpotTagQuiet: '清静',
  memberRemindersTitle: '护理与证件到期提醒',
  memberRemindersSub:
    '仅保存到期日期（不存敏感证件号），轻松管理上海狗证年审、疫苗或驱虫周期。',
  memberReminderTitlePlaceholder: '提醒名称（如：上海狗证年审 / 每月驱虫）',
  memberReminderDatePlaceholder: 'YYYY-MM-DD',
  memberReminderAddBtn: '+ 添加提醒',
  memberReminderTypeRego: '狗证/登记',
  memberReminderTypeRabies: '狂犬疫苗',
  memberReminderTypeFlea: '驱虫',
  memberReminderTypeGrooming: '洗澡美容',
  memberReminderTypeCustom: '其他',
  memberReminderRepeatOnce: '单次',
  memberReminderRepeatMonthly: '每月',
  memberReminderRepeatQuarterly: '每3个月',
  memberReminderRepeatYearly: '每年',
  memberReminderOverdue: '已逾期',
  memberReminderDueToday: '今天到期',
  memberReminderDueInDays: (days) => `还有 ${days} 天`,
  memberReminderRenewDone: '已完成 ✓',
  memberEmptyReminders: '暂无提醒，可在上方添加狗证年审、狂犬疫苗或每月驱虫日期。',
  memberGearTitle: '天气联动出行装备清单',
  memberGearSub: '当天气、地面温度或时段符合条件时，会自动在“去遛狗”页提醒携带。',
  memberGearAddPlaceholder: '添加装备（如：降温背心、训练零食…）',
  memberGearAddBtn: '+ 添加',
  gearTriggerAlways: '常备',
  gearTriggerHotPaws: '防烫爪',
  gearTriggerRain: '雨天',
  gearTriggerNight: '夜遛',
  gearTriggerLicense: '狗证',
  packForWalkTitle: '本次出门建议携带',
  memberHouseholdTitle: '家人 / 遛狗搭子共享',
  memberHouseholdSub:
    '与家人、伴侣或遛狗师同步狗狗资料、遛狗打卡、收藏公园和护理提醒（最多 4 人），避免重复遛或漏遛。',
  memberHouseholdSignInNeeded:
    '请先使用邮箱登录账号，即可创建或加入家庭共享空间。',
  memberHouseholdCreateBtn: '创建家庭共享空间',
  memberHouseholdJoinLabel: '已有家人的邀请码？',
  memberHouseholdJoinPlaceholder: '粘贴 PAW-… 邀请码',
  memberHouseholdJoinBtn: '加入共享空间',
  memberHouseholdMembersLabel: '共享成员',
  memberHouseholdOwnerTag: '创建者',
  memberHouseholdInviteCodeLabel: '一次性安全邀请码（7 天有效）',
  memberHouseholdCopyCode: '复制邀请码',
  memberHouseholdCopiedCode: '已复制 ✓',
  memberHouseholdNewCode: '生成新码',
  memberHouseholdSyncBtn: '同步共享数据',
  memberHouseholdLeaveBtn: '退出共享',
  memberHouseholdDisbandBtn: '解散共享空间',
  memberHouseholdJoinFailed: '邀请码无效、已过期，或共享成员已达上限。',
  memberHouseholdActionFailed: '暂时无法更新家庭共享，请检查网络后重试。',
  dogQuirksSectionLabel: '性格偏好与天气习惯',
  dogQuietModeTitle: '怕生 / 偏爱清静路线',
  dogQuietModeSub: '优先推荐清静林荫步道与人少路线，降低嘈杂狗公园排序',
  dogHatesRainTitle: '讨厌下雨与湿草地',
  dogHatesRainSub: '下雨或雨后草地潮湿时提高扣分，优先推荐干爽步道',
  dogLovesWaterTitle: '爱玩水 / 喜欢狗狗海滩',
  dogLovesWaterSub: '暖和天气时优先推荐开放的狗狗海滩和滨水路线',
  dogCustomMaxTempLabel: '自定义最高舒适气温',
  dogCustomMaxTempAuto: '按品种自动',
  walkGoalProgressLabel: (done, target) => `本周目标：${done}/${target} 次遛狗`,
  walkTagHydrated: '💧 喝足水',
  walkTagRecall: '🐕 唤回很棒',
  walkTagPotty: '💩 已便便',
  walkTagPaws: '🐾 爪子良好',
  walkTagHot: '☀️ 偏热',
  walkTagSocial: '🤝 社交开心',
  walkExportCsvBtn: '导出 CSV',
  walkExportJsonBtn: 'JSON',
  walkExportedToast: '已导出 ✓',
  walkLoggedByPrefix: '记录人',
  pinnedAreasHeader: '常用片区',
  pinThisAreaShort: '固定当前',
  homeSignInBannerTitle: '邮箱登录，跨设备同步狗狗资料、收藏公园与遛狗记录',
  homeSignInBannerCta: '登录',
  profileSignInShort: '登录',

  photosCountSummary: (photos, places) => `${photos} 张 · ${places} 处`,
  photosViewMap: '地图',
  photosViewGrid: '照片墙',
  photosAddBtn: '+ 传照片',
  photosAddFirstBtn: '+ 上传第一张遛狗照',
  photosFitAllBtn: '全部',
  photosEmptyTitle: '你的遛狗足迹相册',
  photosEmptySub:
    '把遛狗时拍的照片钉在拍摄地点上，浏览地图就能重温每一处回忆。支持自动读取原图拍摄定位，也可手动点选公园或地图位置。',
  photosTapMapPrompt: '点击地图任意位置即可放置照片图钉',
  photosViewFullBtn: '查看大图',
  photosOpenSpotMaps: '去这里 ↗',
  photosShowPinOnMap: '在地图定位',
  photosComposerTitle: '添加足迹照片',
  photosExifGpsFound: '已自动识别照片拍摄位置',
  photosPinnedOnMap: '已在地图上选定位置',
  photosNoExifFallback: '照片未含定位，请选择公园或在地图点选',
  photosChoosePinSpotLabel: '拍摄地点',
  photosDropPinBtn: '地图点选',
  photosPlaceLabel: '地点名称',
  photosPlacePlaceholder: '例如：世纪公园草坪 / Brighton 狗狗海滩',
  photosCaptionLabel: '回忆配文（选填）',
  photosCaptionPlaceholder: '例如：布丁今天在树荫下玩得超开心！',
  photosDateLabel: '拍摄日期',
  photosSaveToMapBtn: '钉在足迹地图上',
  photosDeleteBtn: '删除照片',
  photosConfirmDeleteBtn: '再次点击确认删除',
  photosWallBtn: '照片墙',
  photosBackToMapBtn: '足迹地图',
  photosWallModeAll: '全部照片',
  photosWallModeFolders: '地点文件夹',
  photosWallModeMonths: '按月份',
  photosFolderCount: (count) => `${count} 张照片`,
  photosAllFoldersBack: '← 返回全部文件夹',
  photosAddCardLabel: '添加照片',
  photosPrevBtn: '‹ 上一张',
  photosNextBtn: '下一张 ›',
};

const ZH_BREED_LABELS: Record<string, string> = {
  maltipoo: '白色马尔泰',
  cavoodle: '卡瓦普 / 贵宾混血',
  golden: '金毛 / 拉布拉多',
  kelpie: '卡尔比 / 边牧',
  staffy: '斯塔福梗',
  poodle: '泰迪 / 比熊',
  corgi: '柯基',
  frenchie: '法斗 / 巴哥',
  husky: '哈士奇 / 萨摩耶',
  shiba: '柴犬',
};

const ZH_QUALITY_TIER_LABELS: Record<string, string> = {
  ideal: '非常适合',
  good: '舒适适宜',
  caution: '注意防护',
  avoid: '不建议外出',
};

export function getBreedLabel(
  breedId: string,
  fallbackEn: string,
  language: AppLanguage
): string {
  if (language === 'zh' && ZH_BREED_LABELS[breedId]) {
    return ZH_BREED_LABELS[breedId];
  }
  return fallbackEn;
}

export function getQualityTierLabel(
  tier: string,
  fallbackEn: string,
  language: AppLanguage
): string {
  if (language === 'zh' && ZH_QUALITY_TIER_LABELS[tier]) {
    return ZH_QUALITY_TIER_LABELS[tier];
  }
  return fallbackEn;
}

export function getStrings(language: AppLanguage): AppStrings {
  return language === 'zh' ? ZH_STRINGS : EN_STRINGS;
}

export function getAuthErrorMessage(
  errorKey: AuthErrorKey | undefined,
  language: AppLanguage
): string {
  const s = getStrings(language);
  switch (errorKey) {
    case 'not_configured':
      return s.authErrNotConfigured;
    case 'invalid_email':
      return s.authErrInvalidEmail;
    case 'weak_password':
      return s.authErrWeakPassword;
    case 'invalid_credentials':
      return s.authErrInvalidCredentials;
    case 'too_many_requests':
      return s.authErrTooManyRequests;
    case 'requires_recent_login':
      return s.authErrRequiresRecentLogin;
    case 'network_error':
      return s.authErrNetwork;
    default:
      return s.authErrGeneric;
  }
}

export function getLocaleTag(language: AppLanguage): string | undefined {
  return language === 'zh' ? 'zh-CN' : undefined;
}
