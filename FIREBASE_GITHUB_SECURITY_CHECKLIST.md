# Firebase And GitHub Security Checklist

## Firebase Deployment Checklist

### 1. Select the production project

```bash
firebase login
firebase use <your-production-project-id>
```

### 2. Deploy locked-down rules

```bash
firebase deploy --only firestore:rules,storage
```

### 3. If you host policy pages on Firebase Hosting

```bash
firebase deploy --only hosting
```

### 4. Verify production behavior

- Signed-out users cannot read user documents
- A normal signed-in user cannot change their own `role`
- A normal signed-in user cannot change their own `plan`
- A normal signed-in user cannot write `adminConfig`
- A normal signed-in user cannot write `productOverrides`
- A normal signed-in user can only write their own bounded `scanHistory`
- A normal signed-in user can only create bounded `correctionReports`

### 5. Admin claim setup

Use the existing script in this repo when you need to grant a trusted admin:

```bash
GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)" \
FIREBASE_PROJECT_ID=<your-production-project-id> \
TARGET_UID=<firebase-auth-uid> \
node scripts/grant_admin_claim.mjs
```

After granting the claim:

- sign out and back in on the device
- confirm the account can read admin data
- confirm a non-admin account still cannot

### 6. Production Firebase project settings

- Use a separate production Firebase project
- Restrict who can edit Authentication, Firestore, Storage, and App Check
- Keep service account JSON files out of git
- Rotate service account keys if any were ever shared insecurely
- When Play Integrity is wired, enable Firebase App Check and enforce it

## GitHub Repository Security Checklist

### Security And Analysis

Open `GitHub > Settings > Security & analysis` and enable:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection for secrets
- Code scanning default setup, if available for your repository plan

This repo already includes `.github/dependabot.yml`, but repository-level
security features still need to be enabled in GitHub settings.

### Branch Protection

Open `GitHub > Settings > Branches` and add a protection rule for `main`:

- Require a pull request before merging
- Require status checks to pass before merging
- Require conversation resolution before merging
- Block force pushes
- Block branch deletion
- Require linear history if you want a cleaner release history

Recommended status checks for this repo:

- `npx tsc --noEmit`
- `npm run lint`

### Actions And Secrets

Open `GitHub > Settings > Secrets and variables`:

- store production secrets only in GitHub secrets or your CI/CD provider
- never commit `.env.local`, keystores, service account JSON, or API tokens
- rotate any secret immediately if it ever appears in logs, screenshots, or git

### Release Hygiene

- Use signed Android release bundles only
- Keep upload keystores backed up outside the repo
- Restrict who can publish store builds
- Treat `main` as release-quality only after checks pass

## Official References

- Firebase deploy docs: https://firebase.google.com/docs/cli#deploy_to_a_firebase_project
- GitHub protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub secret scanning: https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning
- GitHub Dependabot security updates: https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configuring-dependabot-security-updates
