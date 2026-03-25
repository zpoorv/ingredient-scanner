export function formatProductName(value?: string | null) {
  if (!value?.trim()) {
    return 'Catalog Entry Unavailable';
  }

  return value
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s([{"'/-])([a-z])/g, (_, prefix, character: string) => {
      return `${prefix}${character.toUpperCase()}`;
    });
}
