# Changelog

## App Version 2.5.0 (`v2.5.0`) — Multi-Dog Pack Safety, Offline Forecast Cache, Walk Streak Journal, Pinch Zoom & Automated Tests

### Highlights
- **Multi-Dog Household & Conservative Pack Safety Mode (`walkScoring.ts`, `WalkPlannerContext.tsx`, `DogProfileScreen.tsx`)**:
  - Add up to 5 dogs per household, switch individual dogs, or enable **Walk Together (Pack Safety)** to automatically score every walk by the most heat- and paw-sensitive dog in the pack.
- **Offline Last-Forecast Persistence (`WalkPlannerContext.tsx`, `WalkNowScreen.tsx`)**:
  - Persists up to 3 recent regional 24h forecasts locally (`AsyncStorage`, up to 18 hours old) and seamlessly falls back with an amber **`Offline · Cached HH:MM ↻`** badge when cell coverage drops at beaches or creek trails.
- **1-Tap Walk Log & Weekly Streak Journal (`DogProfileScreen.tsx`, `ParkGuideSheet.tsx`, `WalkNowScreen.tsx`)**:
  - Log completed walks from any Park Guide, Doorstep Loop, or the Dog Profile tab to track daily walk streaks, walks this week, total logged distance, and recent park visits on-device.
- **Automated Safety & Security Unit Test Suite (`scripts/run-tests.mjs`, `npm test`)**:
  - Zero-dependency unit suite verifying sunlit bitumen heat, sensitive paws, Extreme UV `11+`, multi-dog pack merging, Oct–Mar summer & weekend beach curfews, China WGS-84 → GCJ-02 alignment, all `2,183` suburbs, and XSS/path-traversal URL validation.
- **Two-Finger Touch Pinch-to-Zoom on Web Map (`WalkMap.tsx`)**:
  - Added smooth two-finger pinch-to-zoom alongside desktop mouse-wheel zoom on mobile Safari and Chrome web.
- **Shareable Deep Links & 1-Command Public Hosting (`src/utils/deepLinks.ts`, `vercel.json`, `public/_headers`, `public/_redirects`, `DEPLOY_WEB.md`)**:
  - Strictly allow-listed `#spot=<id>`, `#suburb=<id>`, and `#city=<name>` deep links embedded inside web share invites, plus pre-configured Vercel & Cloudflare Pages deployment manifests with CSP headers.

---

## App Version 2.4.1 (`v2.4.1`) — Live Site Polish, Interactive Web Map & Resilience

### Highlights
- **Interactive Web Map Upgrades (`WalkMap.tsx`)**:
  - Fixed `PanResponder` re-initialization during map dragging for silky 60 FPS panning with native `grab` / `grabbing` cursors.
  - Added throttled mouse-wheel & trackpad zoom on desktop web (`zoom 10–16`), clickable street corridor midpoint dots right at initial `zoom 13` with accessible labels, bounded tile failover memory, and visible Esri/OSM attribution on full-screen maps.
- **Data Freshness, Caching & Race-Condition Protection (`WalkPlannerContext.tsx`, `weatherService.ts`, `WalkNowScreen.tsx`)**:
  - Added a request sequence guard (`fetchSeqRef`) so rapid suburb/city switching can never overwrite the active city with a slower stale response.
  - Added a bounded 5-minute TTL in-memory forecast cache for instant repeat city switching (`forceRefresh` bypasses cache on manual refresh).
  - Added a clickable `Live HH:MM ↻` / `Updating…` pill in the Walk Verdict card so desktop web users can refresh live conditions in 1 click without mobile pull-to-refresh.
- **PWA, Desktop Toolbar & Resilience (`App.tsx`, `public/index.html`, `public/manifest.json`, `ParkGuideSheet.tsx`)**:
  - Added `<AppErrorBoundary>` with 1-tap recovery UI, a 1-tap `°C · km` / `°F · mi` unit toggle in the desktop toolbar, wider location pill sizing (fixing premature `"Melbourne · Fit..."` truncation), and clipboard timer cleanup on modal unmount.
  - Fixed invalid `httpEquiv` → `http-equiv` HTML attribute, added `manifest.json`, `apple-touch-icon.png`, `icon-512.png`, `theme-color`, Open Graph share tags, `:focus-visible` keyboard focus rings, and custom thin scrollbars.

---

## App Version 2.4 (`v2.4.0`) — Australia + Full Shanghai Suburbs, Verified Park Photos & Audit Polish

### Highlights
- **2,183 Official Suburbs Across Melbourne, Sydney & Shanghai (`auSuburbs.ts`, `LocationModal.tsx`, `WalkPlannerContext.tsx`)**:
  - Added **800 Greater Melbourne** suburbs (`VIC 3000–3996`), **1,161 Greater Sydney** suburbs (`NSW 2000–2770`), and all **222 official Greater Shanghai** Subdistricts (`街道`), Towns (`镇`), Townships (`乡`), and Special Zones (`20xxxx`) across all 16 districts.
  - Added **GPS Nearest-Suburb Auto-Locator** with real-time Haversine distance badges, cross-city Shanghai/Melbourne/Sydney GPS prefix resolution, and 1-tap Demo GPS pins when desktop browser geolocation is unavailable.
- **90 Visually Verified Park & Dog-Beach Photo Thumbnails (`parkPhotos.ts`, `UiIcons.tsx`, `public/park-thumbs/`)**:
  - Bundled `240×240` Retina thumbnails for all `30` Melbourne, `30` Sydney, and `30` Shanghai curated spots, plus Wikimedia Commons HTTPS geosearch enrichment for outer-suburb OpenStreetMap reserves.
- **Seasonal & Weekend Dog-Beach Rules + Esri Map Tile Failover (`walkScoring.ts`, `auPresets.ts`, `WalkMap.tsx`)**:
  - Enforced Australian summer daylight-saving (`Oct–Mar`) timed off-leash curfews, weekend beach curfews (`Sirius Cove`), daily timed surf beaches (`Greenhills`), and Extreme UV (`11+`) paw/nose safety alerts.
  - Replaced rate-limited raw OSM tile servers with **Esri `World_Topo_Map`** + automatic failover to **Humanitarian OpenStreetMap (`a.tile.openstreetmap.fr/hot`)**.
- **Cross-City UX & Security Hardening (`DogProfileScreen.tsx`, `ExploreMapScreen.tsx`, `WalkNowScreen.tsx`)**:
  - Preserved `Saved Regulars` across Melbourne, Sydney, and Shanghai with 1-tap cross-city switching.
  - Wired `Metric (°C · km)` / `Imperial (°F · mi)` unit formatting across all V2 screens + unit selector in `Edit Profile`, region-aware map filters & copy, and strict `Content-Security-Policy` + `Permissions-Policy` response headers.

---

## App Version 2 (`v2.0.0`) — Streamlined 3-Tab Mobile Experience

### Highlights
- **3-Tab Intent Navigation & WCAG AA Accessibility (`App.tsx`, `colors.ts`)**:
  - Replaced dense single-screen controls with **Option A**: `🐾 Walk Now`, `🗺️ Map`, and `🐶 Mochi`.
  - Added semantic HTML5 landmarks (`banner`, `main`, `navigation`, `<h1>` heading), screen-reader labels, and WCAG AA contrast-compliant palettes (`0` Axe/Fixie violations across all tabs).
- **`🐾 Walk Now` Home Screen (`WalkNowScreen.tsx`)**:
  - Condition-aware Walk Verdict card distinguishing active rain, passing light drizzle, post-rain muddy grass, hot/warm pavement, elevated AQI, brisk cold, gusty winds, and evening lighting, with pull-to-refresh and an expandable 24h forecast & micro-metrics strip (`Ground · Wind · UV · AQI · Sunset`).
  - 2-way intent toggle between **Top 3 Best Open Matches** (zero-truncation cards + Simple Tags) and **15 / 30 / 45-min Circular Doorstep Loops**.
- **Full-Screen `🗺️ Map` + Unified Single-Row HUD (`ExploreMapScreen.tsx`, `WalkMap`)**:
  - Unified top floating HUD (`🟢 Street Lines`, `☰ List`, `⚙️ Filters`), edge-clamped Simple Tag pins with zoom-control clearance, and **`‹ 1 / N ›` previous/next park arrows** on the floating bottom card.
- **V3 Single-Park Local Insider & Direct Gate Sheet (`ParkGuideSheet.tsx`, `spotGuide.ts`)**:
  - Complete curated gate, parking, dog perks, and local heads-up coverage across **all 30 Greater-Shanghai spots**, centered phone-width modal sheets on desktop, persisted private notes (`📝`), and 1-tap `💬 WeChat Meet-Up` invites.
- **Calm Pet Passport (`DogProfileScreen.tsx`, `DogAvatar.tsx`)**:
  - Above-the-fold 3-card layout (Passport, Happy Temp Zone, `♥ Saved Regulars`) with `React.memo` SVG portraits and a slide-up `✎ Edit Profile & Photo` sheet.

---

## App Version 1 (`v1.0.0`) — Initial Consolidated Release

### Highlights
- **Best Places & Interactive Map (`BestPlacesScreen`, `WalkMap`)**
  - 30 verified Greater-Shanghai dog parks, district pilot lawns, and scenic waterfront trails + dynamic global OpenStreetMap Photon discovery outside Shanghai.
  - 12 Shanghai street convenience corridors (`🟢 Easy & Wide`, `🟡 Off-Peak`, `🔴 Crowded / Narrow`) with 1-tap smart-swap recommendations.
  - Switchable 4-pillar score visualization: **Version A (`≡ Bars`)** vs. **Version D (`◇ Walk DNA` Radar)**.
- **15 / 30 / 45-Min Quick Doorstep Loop (`walkScoring`, `WalkMap`)**
  - Closed circular walking route (`1.1 km` / `2.2 km` / `3.4 km`) with multi-waypoint Maps launch.
- **Best Time & Hyperlocal Weather (`BestTimeScreen`, `weatherService`)**
  - Live Phone GPS weather lookup, solar asphalt paw-pad temperature estimation, US AQI, and Post-Rain Wet Grass alert.
- **Real-Time Park Hours, `狗证` Readiness, Saved Regulars & Custom Dog Portraits**
  - Timed dog-run status badges, Shanghai `狗证` toggle, `♥ Saved` spots, bilingual WeChat Meet-Up cards, and magic-byte-verified custom dog photo cropping.
