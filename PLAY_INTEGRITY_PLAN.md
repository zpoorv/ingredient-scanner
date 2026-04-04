# Play Integrity And Premium Hardening Plan

## Current State

The app now treats premium access as valid only when it comes from one of these
verified sources:

- an active RevenueCat entitlement
- a trusted Firebase custom claim like `admin` or `premium`
- a Firestore profile role or plan that the signed-in user cannot self-edit

The app no longer grants premium only because a locally cached profile says
`plan: premium`.

## Why Play Integrity Is Still A Follow-Up

The current app uses the Firebase JavaScript SDK from Expo React Native, not
native `@react-native-firebase/*` packages. Because of that, Firebase App Check
with the Android Play Integrity provider is not wired yet in this repo.

This is an inference from the current codebase:

- Firebase comes from `firebase`
- the app initializes auth through the JS SDK in `src/services/firebaseApp.ts`
- there is no native App Check package or bridge in the project

## Rollout Order

### Phase 1

Done in this repo:

- stop trusting the local premium mirror
- enable RevenueCat entitlement verification in informational mode
- treat failed RevenueCat verification as non-premium

### Phase 2

Add a server-side premium mirror:

1. Receive RevenueCat subscription events on a trusted backend
2. Verify the event source
3. Set Firebase custom claims like `premium: true` for the matching UID
4. Optionally mirror a read-only premium status document for admin/debug use

This makes premium access survivable even if the client is modified, because the
client must present a valid Firebase token with the expected claim.

### Phase 3

Add Firebase App Check with the Play Integrity provider for Android production:

1. Enable App Check in Firebase for:
   - Firestore
   - Storage
   - any callable/backend endpoints added later
2. Register the Android app with the Play Integrity provider
3. Add a native-capable App Check integration path
4. Turn on enforcement gradually after observing metrics

### Phase 4

Move high-value writes completely server-side:

- premium grants / revocations
- admin role grants
- correction queue priority changes

## Recommended Architecture

### Premium trust path

1. Firebase Auth identifies the user
2. RevenueCat confirms the purchase
3. Your backend maps the RevenueCat customer to the Firebase UID
4. Your backend grants or revokes a Firebase custom claim
5. The app reads the claim and only then unlocks premium

### Device trust path

1. Android app obtains an App Check token backed by Play Integrity
2. Firestore / Storage reject requests that do not include a valid token
3. Modded or replayed clients lose direct backend access even if they know your
   public Firebase config

## Production Checklist

- Keep RevenueCat entitlement verification enabled
- Add RevenueCat webhooks or another trusted backend event source
- Set `premium` claims server-side instead of relying on client profile mirrors
- Add Firebase App Check with Play Integrity before broad production rollout
- Enforce App Check only after verifying legitimate production traffic first
- Keep Firestore rules restrictive even after App Check is on

## Official References

- Google Play Integrity API: https://developer.android.com/google/play/integrity
- Firebase App Check with Play Integrity: https://firebase.google.com/docs/app-check/android/play-integrity-provider
- RevenueCat trusted entitlements: https://www.revenuecat.com/docs/customers/trusted-entitlements
