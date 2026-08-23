export type CsvRow = {
  name: string;
  wa: string;
  product?: string;
  tag?: string;
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

export const parseCustomerCsv = (text: string): CsvRow[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const nameIdx = header.findIndex((cell) => ['nama', 'name'].includes(cell));
  const waIdx = header.findIndex((cell) => ['wa', 'whatsapp', 'phone', 'hp'].includes(cell));
  const productIdx = header.findIndex((cell) => ['produk', 'product'].includes(cell));
  const tagIdx = header.findIndex((cell) => cell === 'tag');

  if (nameIdx < 0 || waIdx < 0) {
    throw new Error('CSV harus punya kolom nama dan wa.');
  }

  const dataLines = header.some((cell) => ['nama', 'name', 'wa'].includes(cell))
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
