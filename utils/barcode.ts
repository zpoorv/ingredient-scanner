export function normalizeBarcode(rawValue: string): string {
  const trimmedValue = rawValue.trim();
  const digitsOnly = trimmedValue.replace(/\D/g, '');

  return digitsOnly || trimmedValue;
}
