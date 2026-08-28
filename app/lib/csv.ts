export type CsvRow = {
  name: string;
  wa: string;
  product?: string;
  tag?: string;
};

export type ColumnMapping = {
  name: number;
  wa: number;
  product?: number;
  tag?: number;
};

const splitCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
};

/** Parse only the header row from CSV text, returning column names. */
export const parseCsvHeader = (text: string): string[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  return splitCsvLine(lines[0]);
};

/** Auto-detect column indices from a header row. Returns null if name/wa not found. */
export const autoDetectColumns = (header: string[]): ColumnMapping | null => {
  const lower = header.map((cell) => cell.toLowerCase());
  const nameIdx = lower.findIndex((cell) => ['nama', 'name', 'customer', 'pelanggan', 'nama pelanggan'].includes(cell));
  const waIdx = lower.findIndex((cell) => ['wa', 'whatsapp', 'phone', 'hp', 'no phone', 'nombor', 'nomor', 'telefon', 'telepon'].includes(cell));
  const productIdx = lower.findIndex((cell) => ['produk', 'product', 'item', 'barang'].includes(cell));
  const tagIdx = lower.findIndex((cell) => ['tag', 'label', 'kategori', 'category', 'segment'].includes(cell));

  if (nameIdx < 0 || waIdx < 0) return null;

  return {
    name: nameIdx,
    wa: waIdx,
    product: productIdx >= 0 ? productIdx : undefined,
    tag: tagIdx >= 0 ? tagIdx : undefined
  };
};

export const parseCustomerCsv = (text: string, mapping?: ColumnMapping): CsvRow[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // If mapping is provided, use it directly
  if (mapping) {
    const hasHeader = lines.length > 1;
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map((line) => {
      const cells = splitCsvLine(line);
      return {
        name: cells[mapping.name] ?? '',
        wa: cells[mapping.wa] ?? '',
        product: mapping.product != null ? cells[mapping.product] : undefined,
        tag: mapping.tag != null ? cells[mapping.tag] : undefined
      };
    });
  }

  // Auto-detect from header
  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const nameIdx = header.findIndex((cell) => ['nama', 'name', 'customer', 'pelanggan'].includes(cell));
  const waIdx = header.findIndex((cell) => ['wa', 'whatsapp', 'phone', 'hp', 'nombor', 'nomor', 'telefon', 'telepon'].includes(cell));
  const productIdx = header.findIndex((cell) => ['produk', 'product', 'item', 'barang'].includes(cell));
  const tagIdx = header.findIndex((cell) => ['tag', 'label', 'kategori', 'category', 'segment'].includes(cell));

  if (nameIdx < 0 || waIdx < 0) {
    throw new Error('CSV harus punya kolom nama dan wa.');
  }

  const dataLines = header.some((cell) => ['nama', 'name', 'wa', 'customer', 'pelanggan'].includes(cell))
    ? lines.slice(1)
    : lines;

  return dataLines.map((line) => {
    const cells = splitCsvLine(line);
    return {
      name: cells[nameIdx] ?? '',
      wa: cells[waIdx] ?? '',
      product: productIdx >= 0 ? cells[productIdx] : undefined,
      tag: tagIdx >= 0 ? cells[tagIdx] : undefined
    };
  });
};
