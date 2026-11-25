import { AppLanguage } from '../types/walk';

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
}

const EN_STRINGS: AppStrings = {
  appSubtitle: 'Smart Dog Walk Planner',
  fullWidthToggle: 'Full Width',
  iphoneFrameToggle: 'iPhone Preview',
  tabWalkNow: 'Walk Now',
  tabExploreMap: 'Map',
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
};

const ZH_STRINGS: AppStrings = {
  appSubtitle: '贴心遛狗天气助手',
  fullWidthToggle: '宽屏模式',
  iphoneFrameToggle: '手机视图',
  tabWalkNow: '去遛狗',
  tabExploreMap: '地图',
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

export function getLocaleTag(language: AppLanguage): string | undefined {
  return language === 'zh' ? 'zh-CN' : undefined;
}
