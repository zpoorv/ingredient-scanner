# Production Security Notes

If this repository is public, other people can always rebuild a visual clone of the app.
What you can protect is production backend access.

Current hardening in this repo:

- Firebase admin writes are locked behind Firestore rules, and admin accounts must have verified emails.
- Firestore admin access currently requires either a Firebase custom claim or a verified Firestore admin profile document whose email matches the signed-in account.
- The repo includes a custom-claim grant script so production can move to claim-only admin access.
- User documents and scan history remain scoped to the signed-in user.

Recommended production setup:

1. Use a separate Firebase project for production.
2. Keep production env values in EAS secrets or your CI/CD system, not in local files committed to git.
3. Enable Firebase App Check for production clients.
4. On Android, use the Play Integrity provider for App Check.
5. Keep admin grants server-side only through custom claims.

Admin claim command:

```bash
GOOGLE_OAUTH_ACCESS_TOKEN=<service-account-or-gcloud-access-token> \
FIREBASE_PROJECT_ID=inqoura \
TARGET_UID=<firebase-auth-uid> \
node scripts/grant_admin_claim.mjs
```

Why this matters:

- A rebuilt clone should not be able to write admin data.
- A cloned client should not be trusted just because it knows your public Firebase config.
- Public Firebase config is normal. Security must come from rules, claims, App Check, and project separation.

Additional repo docs:

- `PLAY_INTEGRITY_PLAN.md`
- `FIREBASE_GITHUB_SECURITY_CHECKLIST.md`
