# Ingredient Scanner

Minimal Expo + React Navigation foundation for scanning food product barcodes
and showing product placeholders, ingredients, and a health score.

## Install

```bash
npm install
npx expo install expo-camera expo-barcode-scanner @react-navigation/native-stack
```

## Run

```bash
npx expo start
```

## Project Structure

```text
.
|-- App.tsx
|-- components/
|   `-- PrimaryButton.tsx
|-- constants/
|   |-- api.ts
|   `-- colors.ts
|-- screens/
|   |-- HomeScreen.tsx
|   `-- ResultScreen.tsx
|-- services/
|   `-- openFoodFacts.ts
`-- utils/
    |-- barcode.ts
    `-- navigation.ts
```

## MVP Flow

1. Open the home screen.
2. Grant camera permission.
3. Tap `Scan Barcode`.
4. After a barcode is detected, navigate to the result screen.
5. Load Open Food Facts data when available and keep placeholders as fallback.
