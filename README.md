# Inqoura

Inqoura is an Expo React Native app that helps everyday shoppers make faster,
clearer grocery decisions on packaged foods.

The app combines barcode scanning, ingredient-label OCR, a deterministic score,
decision-focused verdicts, confidence signals, history insights, and premium
guidance into a mobile-first flow backed by Firebase.

## What The App Does

- Scan packaged foods by barcode with live camera or manual entry
- Read ingredient labels with OCR
- Show a decision verdict, numeric score, confidence, and main concern
- Support Shelf Mode comparison for products scanned in the same shopping session
- Save scan history, favorites, and comparison selections per signed-in user
- Sync profile preferences like theme, app look, diet profile, and share card
- Offer local history-based notifications like weekly recaps and smart nudges
- Support premium subscriptions through RevenueCat
- Unlock extra OCR through rewarded ads for non-premium users
- Use admin-managed product overrides and review queues through a local admin panel

## Core Features

- Firebase authentication
  - email and password
  - passwordless email link
  - Google sign-in
- Trust-first result flow
  - decision verdict
  - confidence state
  - top concern
  - premium guidance
- Product lookup and overrides
  - Open Food Facts base data
  - Firestore product overrides
  - reviewed / improved badges
- History and personalization
  - per-account scan history
  - shopper-friendly history insights
  - favorites and comparison slots
  - local scheduled history notifications
- Premium and monetization
  - RevenueCat offerings and entitlement sync
  - rewarded ad OCR unlock path
  - premium share cards, app looks, and deeper guidance
- Admin operations
  - separate `admin_panel/` web app
  - user management
  - product override editing
  - app config controls
  - correction report queue

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Firebase Auth + Firestore
- RevenueCat
- Google Mobile Ads
- Expo Notifications
- ML Kit text recognition

## Requirements

- Node 20+
- Android development build for native feature testing
- Firebase project configured for auth and Firestore
- RevenueCat project configured for subscriptions
- `adb` available if you want to run directly on a connected Android device

## Install

```bash
npm install
```

## Environment Setup

Create a local env file:

```bash
cp .env.example .env.local
```

Populate these values:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID`
- `EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID` optional
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` optional
- `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`
- `EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID` optional during development
- `EXPO_PUBLIC_ALGOLIA_APP_ID`
- `EXPO_PUBLIC_ALGOLIA_SEARCH_API_KEY`
- `EXPO_PUBLIC_ALGOLIA_PRODUCTS_INDEX_NAME`
- `EXPO_PUBLIC_ALGOLIA_SUGGESTIONS_INDEX_NAME`
- `EXPO_PUBLIC_SEARCH_V2_ENABLED` optional, defaults to `true`

## Running The App

### Android Dev Client

Start Metro with Node 20:

```bash
export PATH="/home/zpoorv/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin:$PATH"
node ./node_modules/expo/bin/cli start --dev-client --localhost --port 8086 --clear
```

In another terminal:

```bash
adb reverse tcp:8086 tcp:8086
adb shell am start -W -a android.intent.action.VIEW -d 'exp+inqoura://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8086' com.zpoorv.inqoura
```

If you need to install or rebuild the Android dev build:

```bash
npm run android
```

### Web

For rough UI checks only:

```bash
npm run web
```

### Search Index Sync

The app search now reads product hits from the Firestore `products` collection.
Scans seed that collection, and admin-added products land there immediately.

The optional search index sync workflow can still build external indices from the
same Firestore-backed product catalog when you want broader off-device search tooling.

To rebuild the indices locally:

```bash
npm run search:index
```

Required sync environment variables:

- `ALGOLIA_APP_ID`
- `ALGOLIA_ADMIN_API_KEY`
- `ALGOLIA_PRODUCTS_INDEX_NAME`
- `ALGOLIA_SUGGESTIONS_INDEX_NAME`
- `FIREBASE_SERVICE_ACCOUNT_JSON` optional if you want Firestore product overrides merged in
- `OPEN_FOOD_FACTS_DATASET_URL` optional if you want to override the default OFF JSONL export URL
- `SEARCH_INDEX_MAX_PRODUCTS` optional, defaults to `250000`

## Admin Panel

Run the local admin panel:

```bash
npm run admin-panel
```

Then open:

```text
http://127.0.0.1:4173/login.html
```

The admin panel supports:

- dashboard overview
- product override editing
- user management
- app config controls
- correction report review

## Release Build

Signed Android App Bundle:

```bash
cd android
export PATH="/home/zpoorv/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin:$PATH"
./gradlew bundleRelease
```

Convenience scripts:

```bash
npm run android:aab
npm run android:apk:release
```

## Security And Production Hardening

Useful repo docs:

- `SECURITY.md`
- `SECURITY_HARDENING.md`
- `PLAY_INTEGRITY_PLAN.md`
- `FIREBASE_GITHUB_SECURITY_CHECKLIST.md`

## Privacy And Account Deletion

Public web pages live in:

- `privacy/index.html`
- `privacy/delete-account.html`
- `privacy/terms.html`

Expected hosted URLs:

- `https://inqoura.app/privacy`
- `https://inqoura.app/delete-account`
- `https://inqoura.app/terms`

## Project Structure

```text
.
|-- admin_panel/
|-- privacy/
|-- src/
|   |-- components/
|   |-- constants/
|   |-- models/
|   |-- navigation/
|   |-- screens/
|   |-- services/
|   |-- store/
|   |-- types/
|   `-- utils/
|-- App.tsx
|-- app.json
`-- package.json
```

## Notes

- Firebase and store credentials should stay out of git.
- `android/` and `ios/` are generated native folders and are intentionally ignored.
- `releases/` is for local build artifacts and should not be committed.
- The project uses a deterministic scoring core; AI-style guidance can be layered on top later without replacing the score engine.
