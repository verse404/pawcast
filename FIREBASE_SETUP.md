# Connecting Firebase Email Sign-In & Cloud Sync to PawCast

PawCast works **100% offline/locally in Guest Mode** out of the box. When you connect a free Firebase Spark project, users gain optional **Email/Password Sign-In**, **Password Reset**, **Email Verification**, **Cross-Device Cloud Sync** (dogs, saved parks, private spot notes, walk logs, units, and language), and **In-App Account Deletion**.

---

## Step 1: Create a Free Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Create a project** (Spark Free tier is sufficient — no billing card required for Email/Password Auth and Cloud Firestore free quotas).
2. Register a **Web app** (`</>`) inside Project Overview and copy the `firebaseConfig` values (`apiKey`, `authDomain`, `projectId`, `appId`, plus optional `storageBucket` and `messagingSenderId`).

## Step 2: Enable Email/Password Authentication
1. Open **Build → Authentication → Sign-in method**.
2. Enable **Email/Password** (leave Passwordless link disabled unless desired).
3. Go to **Authentication → Settings → Authorized domains** and add your deployment hostnames:
   - `verse404.github.io` (GitHub Pages)
   - `localhost` (included by default for local dev)
   - Any custom domain (e.g., Vercel or Cloudflare Pages)
4. Verify **Authentication → Settings → User actions → Email enumeration protection** is **Enabled** (default in modern Firebase projects).

## Step 3: Enable Cloud Firestore & Publish Security Rules
1. Open **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** and select a nearby region (e.g., `australia-southeast1` or `asia-east1`).
3. Open the **Rules** tab, paste the exact contents of [`firestore.rules`](./firestore.rules) from this repository, and click **Publish**.
   - These rules enforce strict per-user isolation (`request.auth.uid == userId`), explicit schema v1/v2 field allow-listing, bounded document sizes (`<= 5` dogs, `<= 20` personal secret spots, `<= 12` care reminders, `<= 15` gear items, `<= 50` saved parks, `<= 100` walk logs), non-enumerable 192-bit cryptographic invite tokens for optional Co-Walker Household sharing (`<= 4` members), and default-deny on every other path.

## Step 4: Configure Environment Variables

### Option A — Local Development (`.env.local`)
Copy `.env.example` to `.env.local` (already git-ignored) and paste your Firebase Web config values:

```bash
cp .env.example .env.local
```

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_web_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

Restart Expo (`npx expo start`) so Metro inlines the `EXPO_PUBLIC_*` values.

### Option B — GitHub Pages (`deploy-pages.yml`)
1. Open your GitHub repository → **Settings → Secrets and variables → Actions → Variables** (you may also use **Secrets**; the workflow checks both).
2. Add these 4 repository variables:
   - `EXPO_PUBLIC_FIREBASE_API_KEY`
   - `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   - `EXPO_PUBLIC_FIREBASE_APP_ID`
   - *(Optional)* `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
3. Open **Actions → Deploy PawCast Web to GitHub Pages → Run workflow** to rebuild and publish with Email Sign-In active.

## Step 5: Recommended API Key Hardening
Firebase Web API keys are public project identifiers (not admin secrets), and authorization is enforced by `firestore.rules`. As an extra defense-in-depth step:
1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) for your Firebase project.
2. Select your Browser API key → **Application restrictions → Websites** and allow-list your production origins (e.g., `https://verse404.github.io/*`, `http://localhost:*/*`).
3. Under **API restrictions**, restrict the key to **Identity Toolkit API**, **Token Service API**, and **Cloud Firestore API**.
