export function normalizeBarcode(rawValue: string): string {
  const trimmedValue = rawValue.trim();
  const digitsOnly = trimmedValue.replace(/\D/g, '');

  return digitsOnly || trimmedValue;
}

function addCandidate(candidates: Set<string>, value?: string | null) {
  if (!value) {
    return;
  }

  const normalizedValue = normalizeBarcode(value);

  if (normalizedValue) {
    candidates.add(normalizedValue);
  }
}

function calculateUpcCheckDigit(upcWithoutCheckDigit: string): string {
  const digits = upcWithoutCheckDigit.split('').map(Number);
  const oddPositionTotal = digits.reduce((total, digit, index) => {
    return index % 2 === 0 ? total + digit : total;
  }, 0);
  const evenPositionTotal = digits.reduce((total, digit, index) => {
    return index % 2 === 1 ? total + digit : total;
  }, 0);
  const remainder = (oddPositionTotal * 3 + evenPositionTotal) % 10;

  return remainder === 0 ? '0' : String(10 - remainder);
}

function expandUpcEToUpcA(upcEValue: string): string | null {
  const digits = normalizeBarcode(upcEValue);

  if (digits.length < 6 || digits.length > 8) {
    return null;
  }

  const candidates: Array<{ numberSystem: string; payload: string; checkDigit?: string }> =
    [];

  if (digits.length === 8) {
    candidates.push({
      numberSystem: digits[0],
      payload: digits.slice(1, 7),
      checkDigit: digits[7],
    });
  } else if (digits.length === 7) {
    candidates.push({
      numberSystem: digits[0],
      payload: digits.slice(1),
    });
    candidates.push({
      numberSystem: '0',
      payload: digits.slice(0, 6),
      checkDigit: digits[6],
    });
  } else {
    candidates.push({
      numberSystem: '0',
      payload: digits,
    });
  }

  for (const candidate of candidates) {
    const { numberSystem, payload, checkDigit } = candidate;

    if (payload.length !== 6) {
      continue;
    }

    const [digit1, digit2, digit3, digit4, digit5, digit6] = payload;
    let upcWithoutCheckDigit = '';

    switch (digit6) {
      case '0':
      case '1':
      case '2':
        upcWithoutCheckDigit =
          `${numberSystem}${digit1}${digit2}${digit6}0000${digit3}${digit4}${digit5}`;
        break;
      case '3':
        upcWithoutCheckDigit =
          `${numberSystem}${digit1}${digit2}${digit3}00000${digit4}${digit5}`;
        break;
      case '4':
        upcWithoutCheckDigit =
          `${numberSystem}${digit1}${digit2}${digit3}${digit4}00000${digit5}`;
        break;
      default:
        upcWithoutCheckDigit =
          `${numberSystem}${digit1}${digit2}${digit3}${digit4}${digit5}0000${digit6}`;
        break;
    }

    const resolvedCheckDigit =
      checkDigit || calculateUpcCheckDigit(upcWithoutCheckDigit);

    return `${upcWithoutCheckDigit}${resolvedCheckDigit}`;
  }

  return null;
}

function extractGs1Gtins(barcodeValue: string): string[] {
  const normalizedValue = normalizeBarcode(barcodeValue);
  const gtins = new Set<string>();
  const ai01Matches = normalizedValue.matchAll(/01(\d{14})/g);

  for (const match of ai01Matches) {
    if (match[1]) {
      gtins.add(match[1]);
    }
  }

  // Handle the common case where a GS1-128 payload starts directly with AI 01.
  if (normalizedValue.startsWith('01') && normalizedValue.length >= 16) {
    gtins.add(normalizedValue.slice(2, 16));
  }

  return Array.from(gtins);
}

export function createBarcodeLookupCandidates(
  rawValue: string,
  barcodeType?: string | null
): string[] {
  const normalizedValue = normalizeBarcode(rawValue);
  const candidates = new Set<string>();

  addCandidate(candidates, normalizedValue);

  // Retry the most common GTIN variants because camera SDKs can report
  // UPC/EAN families with different lengths than the OFF catalog entry.
  if (normalizedValue.length <= 7) {
    addCandidate(candidates, normalizedValue.padStart(8, '0'));
    addCandidate(candidates, normalizedValue.padStart(13, '0'));
  } else if (normalizedValue.length === 8) {
    addCandidate(candidates, normalizedValue.padStart(13, '0'));
  } else if (normalizedValue.length >= 9 && normalizedValue.length <= 12) {
    addCandidate(candidates, normalizedValue.padStart(13, '0'));
  } else if (normalizedValue.length === 13 && normalizedValue.startsWith('0')) {
    addCandidate(candidates, normalizedValue.slice(1));
  } else if (normalizedValue.length === 14 && normalizedValue.startsWith('0')) {
    addCandidate(candidates, normalizedValue.slice(1));
  }

  if (barcodeType === 'upc_e') {
    const expandedUpcA = expandUpcEToUpcA(normalizedValue);

    addCandidate(candidates, expandedUpcA);

    if (expandedUpcA) {
      addCandidate(candidates, expandedUpcA.padStart(13, '0'));
    }
  }

  for (const gtin of extractGs1Gtins(rawValue)) {
    addCandidate(candidates, gtin);

    if (gtin.startsWith('0')) {
      addCandidate(candidates, gtin.slice(1));
    }
  }

  return Array.from(candidates);
}
