# PawCast — Apple App Store Submission Guide (`v2.4.0`)

Everything inside this repository is now pre-configured for **Expo Application Services (EAS Build + EAS Submit)** and **Apple App Store Connect**.

> **Pre-Flight Check for Googlers:** Before publishing a personal app under a personal Apple Developer account, review internal outside-activity / personal-project guidelines and run the `eas` commands from your personal machine using your personal Apple ID and personal GitHub/Expo accounts.

---

## 1. What Has Already Been Configured in This Repo

1. **Apple-Compliant App Icon & Launch Splash** (`assets/` + `app.json`)
   - `assets/icon.png`: `1024×1024` **24-bit opaque RGB PNG** (zero alpha/transparency channel — prevents App Store Connect `ITMS-90717` icon rejection).
   - `assets/splash-icon.png`: `1024×1024` botanical PawCast launch emblem paired with `#EDF5F0` splash background in `app.json`.
2. **Apple Privacy Manifest (`PrivacyInfo.xcprivacy`) & Export Compliance** (`app.json`)
   - `ios.infoPlist.ITSAppUsesNonExemptEncryption: false` — skips manual US export-compliance prompts on every TestFlight & App Store build.
   - `ios.privacyManifests` — declares `NSPrivacyTracking: false`, foreground location usage for App Functionality (not linked to user), and Apple's mandatory Required Reason API codes (`CA92.1`, `C617.1`, `35F9.1`, `E174.1` — prevents `ITMS-91053` upload rejection).
   - `ios.supportsTablet: false` — scopes v1 to iPhone so Apple only requires 1 set of iPhone screenshots (no 13" iPad Pro screenshots needed).
3. **Offline Native Bundling of All 90 Park Thumbnails** (`assets/park-thumbs/` + `src/constants/nativeParkPhotoAssets.native.ts`)
   - All `90` verified `240×240` Melbourne, Sydney, and Shanghai park & dog-beach thumbnails are statically bundled into the native iOS `.ipa` for 0ms offline loading, while keeping the Web JS bundle lean via `nativeParkPhotoAssets.ts`.
4. **Cloud Build & Submission Profiles** (`eas.json`)
   - Ready-to-run `development` (iOS Simulator), `preview` (internal device testing), and `production` (App Store / TestFlight with `autoIncrement: true`) profiles.
5. **Ready-to-Host Privacy Policy** (`PRIVACY_POLICY.md`)
   - Fill in `[REPLACE_WITH_YOUR_SUPPORT_EMAIL]` and `[REPLACE_WITH_YOUR_GITHUB_PAGES_OR_SUPPORT_URL]` and publish to GitHub Pages or Notion to get your public HTTPS Privacy Policy URL.

---

## 2. Exact Terminal Commands to Build & Upload to TestFlight / App Store

1. **Customize your unique Bundle ID** in `app.json`:
   - Edit `"bundleIdentifier": "com.pawcast.dogwalk"` under `expo.ios` to your personal reverse-domain ID (for example, `"com.<yourname>.pawcast"`).
2. **Install EAS CLI & Sign In**:
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. **Link Project & Build Signed iOS `.ipa` in the Cloud** *(no Mac required)*:
   ```bash
   eas init
   eas build --platform ios --profile production
   ```
   *(When prompted, sign in with your Apple Developer account — EAS will automatically create and store your iOS Distribution Certificate and Provisioning Profile.)*
4. **Upload Directly to App Store Connect / TestFlight**:
   ```bash
   eas submit --platform ios --latest
   ```

---

## 3. Copy-Paste Metadata for App Store Connect

- **App Name** *(<=30 chars)*: `PawCast: Dog Walk Planner`
- **Subtitle** *(<=30 chars)*: `Paw Heat, UV & Off-Leash Map`
- **Primary Category**: `Weather` *(Secondary: `Lifestyle` or `Navigation`)*
- **Age Rating**: `4+` (Answer "No" to all objectionable content questionnaires)
- **Keywords** *(<=100 chars, comma-separated, no spaces)*:
  `dog walk,paw heat,hot pavement,dog beach,off leash,dog park,uv index,puppy,melbourne,sydney,pet`
- **Promotional Text** *(<=170 chars)*:
  `Know in 2 seconds if pavement & UV are safe for your dog's paws—plus explore 2,183 suburbs, timed dog beaches, shaded trails & exact dog-gate directions.`
- **Description**:
  ```text
  PawCast answers every dog owner's daily question in one glance: "Is it safe and comfortable to walk my dog right now—and where is the best spot nearby?"

  LIVE PAW, BITUMEN & UV SAFETY
  • Real-time solar pavement & beach-sand heat estimates tailored to your dog's coat, snout, size, age, and paw toughness.
  • Instant alerts for hot asphalt, Extreme UV (11+), rain & post-rain muddy grass, wind gusts, and hazy air quality (AQI).
  • Interactive 24-hour forecast scrubber highlighting the top comfort windows for today and tomorrow.

  OFF-LEASH DOG BEACHES, FENCED RUNS & INSIDER GATES
  • Built-in suburb directory covering 2,183 official suburbs across Greater Melbourne (800), Greater Sydney (1,161), and Greater Shanghai (222)—plus worldwide city search.
  • 1-tap GPS Nearest-Suburb Auto-Locator.
  • Live council off-leash schedule awareness, including seasonal summer daylight-saving beach curfews and weekend beach windows.
  • Direct "Exact Dog Entrance & Parking" navigation in Apple Maps or Google Maps, plus 15 / 30 / 45-minute circular loops starting right from your door.

  PRIVATE BY DESIGN
  • No sign-up or account required.
  • Dog profiles, custom photos, saved regular parks, and private notes stay stored locally on your iPhone.
  ```

---

## 4. App Store Connect Privacy ("Nutrition Labels") Answers

1. **Do you or your third-party partners collect data from this app?** → **Yes** *(solely ephemeral coordinates sent to weather/park APIs when using location)*:
   - Check **Location → Precise Location** and **Coarse Location**
   - Purpose: **App Functionality**
   - Linked to the user's identity? → **No**
   - Used for tracking purposes? → **No**
2. **Storefront Availability Tip**:
   - Enable **All Countries & Regions** *except* **China mainland** unless you hold a Chinese **ICP filing (`ICP备案`)**, which Apple requires for apps distributed on the China mainland storefront.

---

## 5. Copy-Paste Note for Apple App Review ("Notes" Field)

> No login or account is required. Upon launch, PawCast immediately displays live walk safety, hourly forecasts, and curated dog parks/beaches. If testing outside Melbourne, Sydney, or Shanghai, tap the top location pill ("Melbourne · Fitzroy") to test either live GPS ("Auto-Locate Nearest Suburb") or any of the 2,183 built-in suburbs and worldwide city search.
