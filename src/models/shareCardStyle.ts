export type ShareCardStyleId =
  | 'classic'
  | 'spotlight'
  | 'glass'
  | 'poster'
  | 'receipt'
  | 'radar';

export function isShareCardStyleId(
  value: string | null | undefined
): value is ShareCardStyleId {
  return (
    value === 'classic' ||
    value === 'spotlight' ||
    value === 'glass' ||
    value === 'poster' ||
    value === 'receipt' ||
    value === 'radar'
  );
}
