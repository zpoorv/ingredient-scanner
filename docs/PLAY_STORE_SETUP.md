# Inqoura Play Store Setup

## Already in place

- Android package name: `com.zpoorv.inqoura`
- Firebase Authentication wired into the app
- Google services file connected to the Android app
- Firestore connected for profile, history, and admin override data
- Expo dev-client Android project generated
- `eas.json` added with preview and production Android build profiles
- Android `versionCode` set to `1`
- Local release signing now supports `android/keystore.properties`
- Local Android App Bundle build script: `npm run android:aab`

## Current backend usage

- Firebase Authentication is used for email, email-link, and Google sign-in.
- Firebase Firestore is already used for:
  - synced user profiles
  - synced scan history
  - admin product overrides
  - admin app config
- Product lookup still uses Open Food Facts as the default public catalog.

## Recommended next services

1. Firebase Authentication
   Already needed for email, Google, verification, and password reset flows.

2. Firebase Firestore
   Use this for cloud sync, admin product overrides, user roles, and lightweight premium entitlements.

3. Google Play Console
   Needed for release signing, app content forms, testing tracks, and publishing.

## Setup you still need to do in Firebase Console

1. Deploy the local Firestore files in this repo:
   - `firestore.rules`
2. Keep Firebase Authentication enabled for:
   - Email/password
   - Email link
   - Google
3. Add your authorized domains for email links and production web pages.
4. Enable Firebase App Check before broad production rollout.
5. Prepare the hosted URLs you will put into Play Console:
   - privacy policy
   - account deletion page
   - support/contact page if you want one

## Cloud data model to start with

- `users/{uid}`
  - `email`
  - `name`
  - `countryCode`
  - `role`
  - `plan`
  - timestamps
- `users/{uid}/scanHistory/{scanId}`
  - saved product snapshot and scoring summary
- `productOverrides/{barcode}`
  - admin-owned override for `imageUrl`, name, ingredient text, nutrition corrections, and admin notes
- `feedback/{feedbackId}`
  - optional support/feedback pipeline

## Roles and admin setup

Do not grant `admin` or `premium` from the client app.

Use Firebase Auth custom claims for trusted access control, then mirror that role in the Firestore user document for UI display.

Recommended setup:

1. Firebase Auth for identity
2. Firebase Admin SDK or Cloud Functions to set claims
3. Firestore security rules to enforce admin-only writes
4. A separate protected admin web panel, or an admin-only app section later

Suggested claims:

- `admin: true`
- `premium: true`
- `countryCode: "IN"` or similar if you need server-side price or entitlement logic

## Premium setup for Android

For digital premium features inside an Android app, use Google Play Billing. Do not wire direct PayPal, debit-card, or credit-card checkout inside the app for unlocking digital app features.

Suggested path:

1. Create a subscription in Play Console
2. Add one or more base plans and offers
3. Configure regional availability and prices per country
4. Verify purchases on a backend or secure server function
5. Set the user's premium claim only after purchase verification succeeds

For your example pricing, set that in Play Console at the product/base-plan level:

- US: `$1.00`
- India: `Rs 50`

You should not trust country or payment state from the device alone.

## Free-ish backend stack for admin overrides and premium

This is the lowest-friction setup that still scales:

1. Firebase Auth
2. Cloud Firestore
3. Firebase Hosting for a small admin panel and public privacy/account-deletion pages
4. Cloud Functions or another trusted backend for:
   - setting custom claims
   - verifying Google Play purchases
   - syncing admin updates safely

Use external image URLs for product overrides at first. That keeps text data in Firestore and avoids paying for Firebase Storage before you actually need uploads.

Spark can cover early development, but premium billing verification and heavier production usage often push teams toward Blaze later.

## Release checklist

1. Create a Play Console app for `Inqoura`
2. Host the privacy policy URL used in the app
3. Host a public account deletion page for Play review
4. Complete the Play Console app content forms
5. Prepare store listing assets
6. Generate or confirm the release upload key
7. Build an Android App Bundle
8. Upload the first internal test release
9. Add a tester account for review because the app requires login
10. Set up Google Play Billing merchant payouts if you will sell premium

## Assets you should prepare

- App icon
- Feature graphic
- Phone screenshots
- Short description
- Full description
- Support email
- Privacy policy URL
- Account deletion web page URL

## If you want cloud sync later
Cloud sync is already wired for core profile and history data.

Future additions can extend:

- `users/{userId}/favorites/{itemId}`
- `users/{userId}/collections/{collectionId}`
- `subscriptions/{uid}`
- `purchaseReceipts/{receiptId}`

## Local release build

1. Generate a release keystore or keep the existing upload key safe.
2. Fill `android/keystore.properties` from `android/keystore.properties.example`.
3. Build locally:
   - `npm run android:aab`
4. The bundle is created at:
   - `android/app/build/outputs/bundle/release/app-release.aab`
