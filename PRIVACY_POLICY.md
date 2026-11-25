# Privacy Policy for PawCast

**Effective Date:** November 19, 2026  
**Application:** PawCast — Smart Dog Walk Planner (iOS, Android, and Web)

## 1. Overview
PawCast helps dog owners plan safe, comfortable daily walks by checking live pavement temperatures, UV index, air quality, rain conditions, and nearby dog-friendly parks, beaches, and trails.

We built PawCast with a **privacy-by-design, local-first architecture**:
- **No user accounts or sign-up required.**
- **No advertising SDKs, analytics trackers, or cross-app tracking (`NSPrivacyTracking = false`).**
- **No developer-operated backend database storing personal user profiles.**

---

## 2. Information Used by the App

### A. Foreground Location (Optional)
- **What happens:** When you tap **Auto-Locate Nearest Suburb (GPS)** or the map location button, PawCast requests foreground location access (`When In Use`). PawCast never accesses your location in the background.
- **How it is used:** Your coordinates are matched locally on your device against PawCast's built-in suburb directory (`2,183` suburbs across Melbourne, Sydney, and Shanghai) and sent over encrypted HTTPS (`TLS 1.2+`) to public weather and map providers solely to return local weather, air quality, and nearby park listings:
  - **Open-Meteo API** (`api.open-meteo.com`, `air-quality-api.open-meteo.com`, `geocoding-api.open-meteo.com`) for hourly temperature, solar radiation, UV, precipitation, and air quality forecasts.
  - **OpenStreetMap Photon & Wikimedia Commons** (`photon.komoot.io`, `commons.wikimedia.org`) when discovering local outer-suburb parks and public outdoor park photos.
  - **Apple MapKit** (on iOS) for interactive map rendering.
- **Can you use PawCast without GPS?** Yes. You can deny location permission and manually pick any of the `2,183` built-in suburbs or search any city worldwide.

### B. Dog Profile, Saved Parks & Notes (Stored On-Device Only)
- Your dog's nickname, breed traits, unit preference (`°C · km` or `°F · mi`), saved favorite parks, and private park notes are stored **exclusively on your device** via local app storage (`AsyncStorage`). They are never transmitted to any server.

### C. Optional Dog Profile Photo (Camera / Photo Library — On-Device Only)
- If you choose to upload or snap a custom portrait for your dog, PawCast crops and re-encodes the image locally on your device (`256×256`, stripping camera EXIF/GPS metadata) and stores it only in on-device local storage. Your photos are **never uploaded** off your device.

---

## 3. Data Sharing & Third-Party Links
- We do **not** sell, rent, or share personal information with data brokers or advertisers.
- When you tap **Dog Gate Maps** or **Start Walk in Maps**, PawCast opens Apple Maps or Google Maps on your device with the destination park coordinates.
- When you tap **Invite / Share Walk Meet-Up**, PawCast opens the native iOS Share Sheet or copies plain text to your clipboard only at your explicit request.

---

## 4. Data Retention & Deletion
Because all preferences, saved parks, notes, and custom dog portraits live solely on your device:
- You can edit or clear your dog photo, saved parks, or notes at any time inside the **Dog Profile** tab.
- Deleting the PawCast app from your iPhone permanently erases all locally stored PawCast data on your device.

---

## 5. Children's Privacy
PawCast does not knowingly collect personal information from children under 13 (or the applicable minimum age in your jurisdiction).

---

## 6. Contact
If you have questions about this Privacy Policy or PawCast privacy practices, please contact:  
**Email:** `[REPLACE_WITH_YOUR_SUPPORT_EMAIL]`  
**Website / Support Page:** `[REPLACE_WITH_YOUR_GITHUB_PAGES_OR_SUPPORT_URL]`
