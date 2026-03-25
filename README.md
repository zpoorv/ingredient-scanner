# Ingredient Scanner

Expo React Native app for scanning packaged-food barcodes or ingredient labels,
then reviewing product ingredients, additives, nutrition, and a deterministic
health score in a mobile-first flow.

## Features

- Live barcode scanning with `expo-camera`
- Manual barcode entry that uses the same lookup flow as camera scanning
- OCR ingredient-label scanning from a photo or gallery image
- Open Food Facts product lookup with local barcode response caching
- Duplicate scan suppression while a lookup is active and within a short scan interval
- Ingredient highlighting with `safe`, `caution`, and `high-risk` states
- Tap-to-explain ingredient modal with short plain-English descriptions
- Deterministic health scoring with grade, verdict, and explanation
- Diet profile modes:
  - general
  - weight loss
  - diabetes-aware
  - vegan
  - gym / muscle gain
- Shareable result card with native share sheet support
- Local scan history with search, sort, reopen, and delete actions
- Lazy-loaded non-critical screens and skeleton loading states for better responsiveness

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React Navigation native stack
- AsyncStorage for local persistence
- TypeScript with functional components and hooks

## Requirements

- Node 20+
- Android development build for native OCR and dev-client testing
- `adb` available if you want to run directly on a connected Android device

## Install

```bash
npm install
```

## Running The App

### Expo Go

For basic work that does not depend on native OCR modules:

```bash
npx expo start
```

### Android Dev Client

This project is set up to run best in an Expo development build on Android.

1. Start Metro with Node 20:

```bash
export PATH="/home/zpoorv/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin:$PATH"
node ./node_modules/expo/bin/cli start --dev-client --localhost --port 8085 --clear
```

2. Connect the device to the Metro port:

```bash
adb reverse tcp:8085 tcp:8085
```

3. Open the installed Android dev client:

```bash
adb shell am start -W -a android.intent.action.VIEW -d 'exp+ingredient-scanner://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8085' com.anonymous.ingredientscanner
```

If you need to build or reinstall the Android dev client:

```bash
npx expo run:android
```

## App Flow

1. Open the home screen.
2. Choose or confirm the active diet profile.
3. Scan a barcode, type a barcode manually, or open ingredient-label OCR.
4. The scan flow handles loading, empty, and error states before navigation.
5. The result screen opens with product details, ingredient analysis, score, and suggestions.
6. Successful barcode results are saved to local history.
7. Open history to search, sort, reopen, or delete saved scans.

## Performance Notes

- Non-critical screens are lazy-loaded from the navigator to reduce startup work.
- Barcode lookups are cached locally so repeat scans reopen faster.
- Result analysis is deferred out of the initial render path for better low-end Android responsiveness.
- Camera resources are released when the scanner screen is not active.
- History uses `FlatList` virtualization and lightweight skeleton placeholders.

## Scan History Behavior

- Each saved entry includes:
  - timestamp
  - barcode
  - product name
  - numeric score
  - grade
  - short risk summary
  - selected diet profile
- Duplicate scans are merged by barcode.
- Rescanning the same product updates the saved snapshot and timestamp instead of creating a new row.

## Project Structure

```text
.
|-- App.tsx
|-- components/
|   |-- BarcodeScannerPanel.tsx
|   |-- DietProfileModal.tsx
|   |-- HistoryListItem.tsx
|   |-- HistoryListItemSkeleton.tsx
|   |-- IngredientExplanationModal.tsx
|   |-- ManualBarcodeEntry.tsx
|   |-- PrimaryButton.tsx
|   |-- ProductSuggestionsCard.tsx
|   |-- ResultCardSkeleton.tsx
|   `-- ShareResultCard.tsx
|-- constants/
|   |-- api.ts
|   |-- colors.ts
|   |-- dietProfiles.ts
|   |-- harmfulIngredients.ts
|   |-- ingredientExplanations.ts
|   `-- productHealthScore.ts
|-- navigation/
|   |-- RootNavigator.tsx
|   `-- types.ts
|-- screens/
|   |-- HistoryScreen.tsx
|   |-- HomeScreen.tsx
|   |-- IngredientOcrScreen.tsx
|   |-- ResultScreen.tsx
|   `-- ScannerScreen.tsx
|-- services/
|   |-- barcodeLookupCache.ts
|   |-- dietProfileStorage.ts
|   |-- http.ts
|   |-- ingredientLabelOcr.ts
|   |-- openFoodFacts.ts
|   |-- productLookup.ts
|   `-- scanHistoryStorage.ts
|-- types/
|   `-- async-storage.d.ts
`-- utils/
    |-- barcode.ts
    |-- dietProfiles.ts
    |-- gradeTone.ts
    |-- healthScore.ts
    |-- ingredientExplanations.ts
    |-- ingredientHighlighting.ts
    |-- ocrResolvedProduct.ts
    |-- productDisplay.ts
    |-- productHealthScore.ts
    |-- productInsights.ts
    |-- productSuggestions.ts
    |-- resultAnalysis.ts
    |-- scanHistory.ts
    `-- shareableResult.ts
```

## Notes

- Product lookup currently uses Open Food Facts only.
- Ingredient explanations use local mock data, but the lookup layer is structured so a server or AI source can replace it later.
- OCR runs behind a dedicated service so the implementation can be swapped later.
- Storage code is kept separate from UI code in `services/`.
