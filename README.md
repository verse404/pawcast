# PawCast — Smart Dog Walk Planner (`v2.5.0`)

**Live Web App:** https://verse404.github.io/pawcast/

PawCast is a streamlined, answer-first cross-platform **iOS, Android, and Web (PWA)** dog-walking planner built with **Expo (React Native + TypeScript)**. It features a 1-tap **English / Simplified Mandarin (`EN · 中文`)** toggle and covers **2,182 residential suburbs** across **Greater Melbourne (799)**, **Greater Sydney (1,161)**, and **Greater Shanghai (222)**—plus worldwide city search—pairing real-time pavement/UV safety with **90 verified park & dog-beach photo thumbnails**, multi-dog Pack Safety scoring, offline forecast fallback, local walk streaks, council off-leash schedules, and exact dog-gate navigation.

## Key Features (`v2.5.0`)

- **Bilingual English & Native Simplified Mandarin (`EN / 简体中文`)**:
  - Instant 1-tap language toggle in the app header, desktop studio bar, and profile settings, powered by `src/i18n/translations.ts` and ECMAScript `Intl` locale formatting (`zh-CN`).
- **2,182 Residential Suburbs + GPS Nearest-Suburb Auto-Locator (`auSuburbs.ts`, `LocationModal.tsx`)**:
  - **Melbourne (`799` suburbs, VIC 3000–3996)** across 9 metro regions & Mornington Peninsula.
  - **Sydney (`1,161` suburbs, NSW 2000–2770)** across 13 metro regions (Eastern Suburbs, Inner West, North Shore, Northern Beaches, Parramatta, Hills, Sutherland Shire & Western Sydney).
  - **Shanghai (`222` official Subdistricts `街道`, Towns `镇` & Townships `乡`, `20xxxx`)** across all 16 Shanghai districts (`浦东新区` to `崇明区`), searchable in English, Pinyin, Chinese characters, or postcode.
  - **1-Tap GPS Nearest-Suburb Ranking**: Sorts surrounding suburbs by exact Haversine distance (`★ Closest · 280 m`) with instant Demo GPS pins when desktop browser geolocation is blocked.
- **90 Verified Park & Dog-Beach Photo Thumbnails (`parkPhotos.ts`, `public/park-thumbs/`)**:
  - Visually verified `240×240` Retina thumbnails for all `90` curated metro parks, harbour/bay dog beaches, and fenced runs (`30` Melbourne + `30` Sydney + `30` Shanghai), plus live Wikimedia Commons HTTPS geosearch enrichment for outer-suburb OpenStreetMap reserves.
- **Tab 1 — `🐾 Walk Now` / `去遛狗` (`WalkNowScreen.tsx`)**:
  - **Answer-First Hero Verdict**: Live Open-Meteo weather, solar pavement/bitumen & dry beach sand heat model, Australian Extreme UV (`11+`) protection, post-rain wet grass detection, and collapsible 24-hour comfort scrubber.
  - **2-Way Intent Switch (`Parks & Beaches` vs. `From My Door`)**: Top 3 open, rule-compatible matches or a **15 / 30 / 45-min Circular Doorstep Loop**.
- **Tab 2 — `🗺️ Map` / `地图` (`ExploreMapScreen.tsx`, `WalkMap.tsx`)**:
  - **Resilient Slippy Map**: Esri `World_Topo_Map` primary cartography with automatic failover to Humanitarian OpenStreetMap (`a.tile.openstreetmap.fr/hot`), smooth drag, mouse-wheel & two-finger touch pinch-to-zoom, and 2nd-tap pin inspection.
  - **32 Curated Walking Corridors (`10` Melbourne + `10` Sydney + `12` Shanghai)**, region-aware filters, and `‹ 1 / N ›` quick park switcher on the floating bottom card.
- **V3 Local Insider & Direct Gate Sheet (`ParkGuideSheet.tsx`, `spotGuide.ts`, `walkScoring.ts`)**:
  - Enforces **seasonal summer daylight-saving beach curfews** (`Oct–Mar`), **weekend beach curfews** (e.g. Sirius Cove Mosman), daily timed off-leash hours, and Shanghai `狗证` rules, with 1-tap Google/Apple Maps gate routing and SMS/WhatsApp/WeChat (`微信约遛`) invite cards.
- **Tab 3 — `🐶 Pudding` (`DogProfileScreen.tsx`)**:
  - **Botanical Pet Passport & Multi-Dog Pack Safety**: Defaults to **Pudding** (custom white Maltipoo SVG avatar) with Aussie & global breed presets (`White Maltipoo`, `Cavoodle`, `Kelpie`, `Aussie Staffy`, `Golden`, `Corgi`, `Frenchie`, `Husky`, `Shiba`), custom photo upload/crop/zoom, multi-dog pack mode, cross-city `Saved Regulars`, expandable Walk Streak Journal, and `Metric (°C · km)` / `Imperial (°F · mi)` + `EN / 简体中文` preferences.

## Security & Verification Notes

- **Input & Storage Hardening**: All external API payloads, search queries, dog names, and per-spot notes are sanitized via `src/utils/validation.ts`. Uploaded dog portraits enforce a `5 MB` cap, binary magic-byte verification (`JPEG`/`PNG`/`WebP`), and `256×256` canvas re-encoding (stripping EXIF GPS metadata).
- **Allow-Listed Navigation & Image Hosts**: Map directions (`www.google.com`, `maps.apple.com`) and remote park photos (`parkPhotos.ts`) strictly validate `https://` URLs against explicit host allow-lists, with WGS-84 → GCJ-02 alignment for Mainland China.
- **HTTP Security Headers**: Local production static server binds strictly to `127.0.0.1` and serves `Content-Security-Policy`, `Permissions-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and `Referrer-Policy: strict-origin-when-cross-origin`.

## Getting Started

```bash
npm install
npx expo start
```

- Press `w` to open the web app, or scan the QR code with Expo Go on iOS/Android.
- Type-check & run automated safety unit tests with:
  ```bash
  npx tsc --noEmit
  npm test
  ```
- **Public Web Deployment**: See `DEPLOY_WEB.md` (`vercel.json`, Cloudflare Pages `public/_headers` + `public/_redirects`, and shareable `#spot=` / `#suburb=` deep links).
- **iOS App Store Build & Submission**: See `APP_STORE_SUBMISSION.md` and `PRIVACY_POLICY.md` for EAS Build / TestFlight commands (`eas build --platform ios --profile production`), App Store Connect metadata, and privacy manifest details.
