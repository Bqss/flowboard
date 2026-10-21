const allowedTags: Record<string, true> = {
  a: true,
  b: true,
  blockquote: true,
  br: true,
  code: true,
  del: true,
  div: true,
  em: true,
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
  i: true,
  img: true,
  li: true,
  ol: true,
  p: true,
  pre: true,
  s: true,
  strong: true,
  u: true,
  ul: true
};

const voidTags: Record<string, true> = { br: true, img: true };
const dangerousBlockPattern = /<(script|style|iframe|object|embed|svg|math|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const dangerousTagPattern = /<\/?(script|style|iframe|object|embed|svg|math|form)\b[^>]*>/gi;
const tagPattern = /<\/?[a-z][^>]*>/gi;

function escapeText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isSafeUrl(value: string, allowDataImage = false): boolean {
  const normalized = value.trim().replace(/[\u0000-\u001f\u007f]/g, '');
  if (allowDataImage && /^data:image\/(?:gif|jpe?g|png|webp);base64,/i.test(normalized)) return true;
  if (/^\/(?!\/)/.test(normalized)) return true;
  try {
    const protocol = new URL(normalized).protocol;
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

function getAttribute(source: string, name: string): string | null {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function sanitizeTag(source: string): string {
  const match = source.match(/^<\s*(\/?)\s*([a-z0-9]+)([\s\S]*?)>$/i);
  if (!match) return escapeText(source);

  const closing = Boolean(match[1]);
  const tag = match[2].toLowerCase();
  const attributes = match[3] ?? '';
  if (!allowedTags[tag]) return '';
  if (closing) return voidTags[tag] ? '' : `</${tag}>`;

  if (tag === 'a') {
    const href = getAttribute(attributes, 'href');
    if (!href || !isSafeUrl(href)) return '';
    const title = getAttribute(attributes, 'title');
    return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${escapeAttribute(title)}"` : ''}>`;
  }

  if (tag === 'img') {
    const src = getAttribute(attributes, 'src');
    if (!src || !isSafeUrl(src, true)) return '';
    const alt = getAttribute(attributes, 'alt') ?? 'Gambar deskripsi';
    return `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" loading="lazy">`;
  }

  return `<${tag}>`;
}

export function sanitizeRichText(value: string | null | undefined): string {
  if (!value) return '';

  const source = value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(dangerousBlockPattern, '')
    .replace(dangerousTagPattern, '');

  let result = '';
  let cursor = 0;
  const suppressedTags: Record<string, number> = {};
  for (const match of source.matchAll(tagPattern)) {
    const index = match.index ?? cursor;
    result += escapeText(source.slice(cursor, index));
    const tagMatch = match[0].match(/^<\s*(\/?)\s*([a-z0-9]+)/i);
    const tag = tagMatch?.[2].toLowerCase() ?? '';
    const closing = Boolean(tagMatch?.[1]);
    if (closing && (suppressedTags[tag] ?? 0) > 0) {
      suppressedTags[tag] -= 1;
    } else {
      const sanitized = sanitizeTag(match[0]);
      result += sanitized;
      if (!closing && !sanitized && tag === 'a') {
        suppressedTags[tag] = (suppressedTags[tag] ?? 0) + 1;
      }
    }
    cursor = index + match[0].length;
  }
  result += escapeText(source.slice(cursor));
  return result;
}
