# Ingredient Scanner

Expo React Native app for scanning packaged-food barcodes, loading product data,
and reviewing ingredient, additive, and nutrition signals in a clean mobile flow.

## Features

- Barcode scanning with `expo-camera`
- Duplicate-scan protection while a lookup is in flight
- Product lookup from Open Food Facts
- Optional USDA FoodData Central enrichment when configured and matched
- Ingredient risk highlighting with `safe`, `caution`, and `high-risk` states
- Tap-to-explain ingredient modal with short plain-English notes
- Deterministic health score with grade and explanation
- Local scan history with search, sorting, and reopen-result support

## Tech Stack

- Expo SDK 54
- React Native
- React Navigation native stack
- AsyncStorage for local scan history persistence
- TypeScript with functional components and hooks

## Getting Started

### Install

```bash
npm install
```

### Run

```bash
npx expo start
```

This project works best with Node 20+ for Expo and Metro.

## Optional Environment

You can add a USDA API key for secondary nutrition enrichment:

```bash
EXPO_PUBLIC_USDA_API_KEY=your_key_here
```

Notes:
- USDA data is only shown when a real FoodData Central match is found and used.
- If the key is not set, the app still works normally with Open Food Facts.

## App Flow

1. Open the home screen.
2. Tap `Open Scanner`.
3. Scan a packaged-food barcode.
4. The scanner pauses while the product lookup finishes.
5. If a product is found, the app opens the result screen with fetched data.
6. The result screen saves the scan to local history.
7. Open `View Scan History` to search, sort, and reopen previous results.

## Scan History Behavior

- Each saved entry includes:
  - timestamp
  - barcode
  - product name
  - numeric score
  - short risk summary
- Duplicate scans are merged by barcode.
- Rescanning the same product updates the saved snapshot and timestamp instead of creating a new row.

## Project Structure

```text
.
|-- App.tsx
|-- components/
|   |-- BarcodeScannerPanel.tsx
|   |-- HistoryListItem.tsx
|   |-- IngredientExplanationModal.tsx
|   `-- PrimaryButton.tsx
|-- constants/
|   |-- api.ts
|   |-- colors.ts
|   |-- harmfulIngredients.ts
|   |-- ingredientExplanations.ts
|   `-- productHealthScore.ts
|-- navigation/
|   |-- RootNavigator.tsx
|   `-- types.ts
|-- screens/
|   |-- HistoryScreen.tsx
|   |-- HomeScreen.tsx
|   |-- ResultScreen.tsx
|   `-- ScannerScreen.tsx
|-- services/
|   |-- foodDataCentral.ts
|   |-- http.ts
|   |-- openFoodFacts.ts
|   |-- productLookup.ts
|   `-- scanHistoryStorage.ts
|-- types/
|   `-- async-storage.d.ts
`-- utils/
    |-- barcode.ts
    |-- healthScore.ts
    |-- ingredientExplanations.ts
    |-- ingredientHighlighting.ts
    |-- productHealthScore.ts
    |-- productInsights.ts
    `-- scanHistory.ts
```

## Notes

- Product detail loading, empty states, and lookup failures are handled in the scanner flow before navigation.
- Ingredient explanations currently use mock local data, but the lookup utility is structured so a server or AI source can replace it later.
- Local history storage is isolated from the UI layer in `services/scanHistoryStorage.ts`.
