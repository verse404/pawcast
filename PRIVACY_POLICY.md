# Privacy Policy for PawCast

**Effective Date:** November 27, 2026  
**Application:** PawCast — Smart Dog Walk Planner (iOS, Android, and Web)

## 1. Overview
PawCast helps dog owners plan safe, comfortable daily walks by checking live pavement temperatures, UV index, air quality, rain conditions, and nearby dog-friendly parks, beaches, and trails.

We built PawCast with a **privacy-by-design, local-first architecture**:
- **Guest Mode requires no account or sign-up** — all core features run 100% locally on your device.
- **Optional Email Sign-In & Cloud Sync** (powered by Google Firebase Authentication and Cloud Firestore) is strictly opt-in if you want to back up your dog profiles, saved parks, and walk logs across devices.
- **No advertising SDKs, analytics trackers, or cross-app tracking (`NSPrivacyTracking = false`).**

---

## 2. Information Used by the App

### A. Foreground Location (Optional)
- **What happens:** When you tap **Auto-Locate Nearest Suburb (GPS)** or the map location button, PawCast requests foreground location access (`When In Use`). PawCast never accesses your location in the background.
- **How it is used:** Your coordinates are matched locally on your device against PawCast's built-in suburb directory (`2,182` suburbs across Melbourne, Sydney, and Shanghai) and sent over encrypted HTTPS (`TLS 1.2+`) to public weather and map providers solely to return local weather, air quality, and nearby park listings:
  - **Open-Meteo API** (`api.open-meteo.com`, `air-quality-api.open-meteo.com`, `geocoding-api.open-meteo.com`) for hourly temperature, solar radiation, UV, precipitation, and air quality forecasts.
  - **OpenStreetMap Photon & Wikimedia Commons** (`photon.komoot.io`, `commons.wikimedia.org`) when discovering local outer-suburb parks and public outdoor park photos.
  - **Apple MapKit** (on iOS) for interactive map rendering.
- **Can you use PawCast without GPS?** Yes. You can deny location permission and manually pick any of the `2,182` built-in suburbs or search any city worldwide.

### B. Member Profile, Preferences, Saved Parks & Notes (Local-First; Optional Cloud Sync)
- **Guest Mode (Default):** Your display name, dog profiles, walk routine preferences, pinned suburbs, custom secret spots, care reminder dates, gear checklist, saved favorite parks, private park notes, and walk logs are stored **exclusively on your device** via local app storage (`AsyncStorage`). They are never transmitted to any server.
- **Signed-In Mode (Optional):** If you choose to create an account with **Firebase Email/Password Sign-In**, PawCast stores your email address and optional display name in **Firebase Authentication** and syncs your sanitized profile (`memberProfile`, `memberPreferences`, dogs, pinned suburbs, custom spots, lightweight reminder dates, gear checklist, saved parks, notes, and walk logs) to a private per-user **Cloud Firestore** document (`users/{uid}/pawcast/profile`) restricted strictly to your authenticated user ID (`request.auth.uid == userId`).
- **Optional Household / Co-Walker Sharing:** If you explicitly create or join a shared household using a single-use cryptographic invite token (`192-bit` random code), your shared dog pack, saved parks, walk logs, and care reminders are stored in `households/{householdId}` accessible exclusively to the up to 4 authenticated members in `memberUids`. You may leave or disband a shared household at any time.

### C. Optional Member, Dog & Walk Map Photos (Camera / Photo Library)
- If you upload or snap a portrait (for yourself or your dog) or pin a walk memory on the **Photos** map tab, PawCast verifies image magic bytes (`JPEG`/`PNG`/`WebP`) and re-encodes the image locally on your device through an offscreen canvas (stripping camera EXIF metadata) before saving.
- For walk memory photos, optional JPEG EXIF GPS coordinates and capture date are read strictly locally on your device so you can preview or override the map pin location before saving; the saved image itself contains no EXIF metadata.
- In Guest Mode, photos never leave your device. If you opt into Cloud Sync, compact resized portraits (`<= 120 KB`) sync inside your private per-user Firestore profile and walk map photos sync in your private `users/{uid}/photoMemories` subcollection, permanently erased whenever you delete a photo or delete your account.

---

## 3. Data Sharing & Third-Party Links
- We do **not** sell, rent, or share personal information with data brokers or advertisers.
- Your email address is used strictly for account authentication, email verification, and password reset emails via Firebase Authentication.
- When you tap **Dog Gate Maps** or **Start Walk in Maps**, PawCast opens Apple Maps or Google Maps on your device with the destination park coordinates.
- When you tap **Invite / Share Walk Meet-Up**, PawCast opens the native Share Sheet or copies plain text to your clipboard only at your explicit request.

---

## 4. Data Retention & Permanent Account Deletion
- **Guest Mode:** Edit or clear your dog photo, saved parks, walk logs, or notes anytime inside the **Dog Profile** tab, or clear browser/app storage to erase all local data.
- **Signed-In Account Deletion (In-App):** You can permanently delete your account at any time inside the **Dog Profile → Cloud Account & Sync → Delete Account** flow. After re-entering your current password, PawCast immediately deletes your per-user Cloud Firestore document, clears local profile data, and permanently deletes your Firebase Authentication account.

---

## 5. Children's Privacy
PawCast does not knowingly collect personal information from children under 13 (or the applicable minimum age in your jurisdiction).

---

## 6. Contact
If you have questions about this Privacy Policy or PawCast privacy practices, please reach out via the project repository:  
**Website:** https://verse404.github.io/pawcast/  
**Source & Issue Tracker:** https://github.com/verse404/pawcast
