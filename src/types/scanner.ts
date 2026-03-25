export type ScanResultSource = 'barcode' | 'ingredient-ocr';

export type ScannerState = 'ready' | 'loading' | 'empty' | 'error';

export type LastScanResult = {
  barcode: string;
  barcodeType?: string | null;
};
