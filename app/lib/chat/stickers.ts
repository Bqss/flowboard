export type ChatSticker = {
  id: string;
  name: string;
  category: 'smilies' | 'gestures' | 'work' | 'animals';
  url: string;
  keywords: string;
};

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

export const STICKER_CATEGORIES: Array<{ id: 'all' | 'smilies' | 'gestures' | 'work' | 'animals'; label: string; icon: string }> = [
  { id: 'all', label: 'Semua', icon: '✨' },
  { id: 'smilies', label: 'Ekspresi', icon: '😀' },
  { id: 'gestures', label: 'Gerakan', icon: '👍' },
  { id: 'work', label: 'Kerja & Tim', icon: '🚀' },
  { id: 'animals', label: 'Hewan', icon: '🐱' }
];

export const STICKER_LIST: ChatSticker[] = [
  // --- Smilies (Ekspresi) ---
  {
    id: 'heart-eyes',
    name: 'Heart Eyes',
    category: 'smilies',
    url: `${CDN_BASE}/Smiling%20face%20with%20heart-eyes/3D/smiling_face_with_heart-eyes_3d.png`,
    keywords: 'cinta love suka senang kagum senyum'
  },
  {
    id: 'tears-of-joy',
    name: 'Tears of Joy',
    category: 'smilies',
    url: `${CDN_BASE}/Face%20with%20tears%20of%20joy/3D/face_with_tears_of_joy_3d.png`,
    keywords: 'tertawa ngakak lol wkwk bahagia nangis senang'
  },
  {
    id: 'grinning-eyes',
    name: 'Grinning Eyes',
    category: 'smilies',
    url: `${CDN_BASE}/Grinning%20face%20with%20big%20eyes/3D/grinning_face_with_big_eyes_3d.png`,
    keywords: 'senyum gembira senang happy ceria'
  },
  {
    id: 'rofl',
    name: 'ROFL',
    category: 'smilies',
    url: `${CDN_BASE}/Rolling%20on%20the%20floor%20laughing/3D/rolling_on_the_floor_laughing_3d.png`,
    keywords: 'kocak guling ketawa ngakak lol wkwk'
  },
  {
    id: 'partying',
    name: 'Partying',
    category: 'smilies',
    url: `${CDN_BASE}/Partying%20face/3D/partying_face_3d.png`,
    keywords: 'pesta perayaan selamat party hore festival'
  },
  {
    id: 'sunglasses',
    name: 'Cool Sunglasses',
    category: 'smilies',
    url: `${CDN_BASE}/Smiling%20face%20with%20sunglasses/3D/smiling_face_with_sunglasses_3d.png`,
    keywords: 'keren cool santai gaya hebat mantap'
  },
  {
    id: 'thinking',
    name: 'Thinking',
    category: 'smilies',
    url: `${CDN_BASE}/Thinking%20face/3D/thinking_face_3d.png`,
    keywords: 'pikir mikir ide bingung hmm penasaran'
  },
  {
    id: 'exploding-head',
    name: 'Mind Blown',
    category: 'smilies',
    url: `${CDN_BASE}/Exploding%20head/3D/exploding_head_3d.png`,
    keywords: 'kaget syok luar biasa gila wow pecah'
  },
  {
    id: 'winking',
    name: 'Wink',
    category: 'smilies',
    url: `${CDN_BASE}/Winking%20face/3D/winking_face_3d.png`,
    keywords: 'kedip kode rahasia oke siap asik'
  },
  {
    id: 'kiss',
    name: 'Kiss',
    category: 'smilies',
    url: `${CDN_BASE}/Face%20blowing%20a%20kiss/3D/face_blowing_a_kiss_3d.png`,
    keywords: 'cium kiss sayang terima kasih muah'
  },
  {
    id: 'zany',
    name: 'Zany Face',
    category: 'smilies',
    url: `${CDN_BASE}/Zany%20face/3D/zany_face_3d.png`,
    keywords: 'lucu gila seru jail iseng wkwk'
  },
  {
    id: 'flushed',
    name: 'Flushed',
    category: 'smilies',
    url: `${CDN_BASE}/Flushed%20face/3D/flushed_face_3d.png`,
    keywords: 'malu kaget tersipu waduh ampun'
  },
  {
    id: 'pensive',
    name: 'Pensive',
    category: 'smilies',
    url: `${CDN_BASE}/Pensive%20face/3D/pensive_face_3d.png`,
    keywords: 'sedih galau murung hening maaf'
  },
  {
    id: 'loudly-crying',
    name: 'Crying',
    category: 'smilies',
    url: `${CDN_BASE}/Loudly%20crying%20face/3D/loudly_crying_face_3d.png`,
    keywords: 'menangis sedih banget terharu ampun nangis'
  },
  {
    id: 'steam-from-nose',
    name: 'Determined',
    category: 'smilies',
    url: `${CDN_BASE}/Face%20with%20steam%20from%20nose/3D/face_with_steam_from_nose_3d.png`,
    keywords: 'semangat kesal gas pantang menyerah juang'
  },
  {
    id: 'star-struck',
    name: 'Star Struck',
    category: 'smilies',
    url: `${CDN_BASE}/Star-struck/3D/star-struck_3d.png`,
    keywords: 'kagum wow bintang luar biasa keren fans'
  },
  {
    id: 'red-heart',
    name: 'Red Heart',
    category: 'smilies',
    url: `${CDN_BASE}/Red%20heart/3D/red_heart_3d.png`,
    keywords: 'hati cinta suka sayang love heart'
  },

  // --- Hand Gestures (Gerakan) ---
  {
    id: 'thumbs-up',
    name: 'Thumbs Up',
    category: 'gestures',
    url: `${CDN_BASE}/Thumbs%20up/Default/3D/thumbs_up_3d_default.png`,
    keywords: 'suka oke sip mantap jempol setuju deal'
  },
  {
    id: 'thumbs-down',
    name: 'Thumbs Down',
    category: 'gestures',
    url: `${CDN_BASE}/Thumbs%20down/Default/3D/thumbs_down_3d_default.png`,
    keywords: 'kurang tidak setuju jelek buruk jangan'
  },
  {
    id: 'clapping',
    name: 'Clapping',
    category: 'gestures',
    url: `${CDN_BASE}/Clapping%20hands/Default/3D/clapping_hands_3d_default.png`,
    keywords: 'tepuk tangan selamat apresiasi mantap bravo'
  },
  {
    id: 'folded-hands',
    name: 'Folded Hands',
    category: 'gestures',
    url: `${CDN_BASE}/Folded%20hands/Default/3D/folded_hands_3d_default.png`,
    keywords: 'terima kasih tolong doa salam maaf amin thank you'
  },
  {
    id: 'raising-hands',
    name: 'Raising Hands',
    category: 'gestures',
    url: `${CDN_BASE}/Raising%20hands/Default/3D/raising_hands_3d_default.png`,
    keywords: 'hore sepakat puji syukur perayaan angkat tangan'
  },
  {
    id: 'peace',
    name: 'Victory Peace',
    category: 'gestures',
    url: `${CDN_BASE}/Victory%20hand/Default/3D/victory_hand_3d_default.png`,
    keywords: 'damai damai menang dua salam asik'
  },
  {
    id: 'love-you',
    name: 'Love You',
    category: 'gestures',
    url: `${CDN_BASE}/Love-you%20gesture/Default/3D/love-you_gesture_3d_default.png`,
    keywords: 'cinta sayang metal rock love you'
  },
  {
    id: 'ok-hand',
    name: 'OK Hand',
    category: 'gestures',
    url: `${CDN_BASE}/Ok%20hand/Default/3D/ok_hand_3d_default.png`,
    keywords: 'oke siap beres mantap sempurna perfect'
  },
  {
    id: 'flexed-biceps',
    name: 'Strong Muscle',
    category: 'gestures',
    url: `${CDN_BASE}/Flexed%20biceps/Default/3D/flexed_biceps_3d_default.png`,
    keywords: 'kuat semangat otot tenaga gym gas'
  },
  {
    id: 'saluting',
    name: 'Salute',
    category: 'gestures',
    url: `${CDN_BASE}/Saluting%20face/3D/saluting_face_3d.png`,
    keywords: 'hormat siap laksanakan komandan hormat'
  },

  // --- Work & Team (Kerja & Tim) ---
  {
    id: 'rocket',
    name: 'Rocket Launch',
    category: 'work',
    url: `${CDN_BASE}/Rocket/3D/rocket_3d.png`,
    keywords: 'luncurkan roket deploy cepat rilis launch naik tinggi'
  },
  {
    id: 'fire',
    name: 'Fire',
    category: 'work',
    url: `${CDN_BASE}/Fire/3D/fire_3d.png`,
    keywords: 'api panas gokil semangat trending gas pol'
  },
  {
    id: 'party-popper',
    name: 'Party Popper',
    category: 'work',
    url: `${CDN_BASE}/Party%20popper/3D/party_popper_3d.png`,
    keywords: 'selamat sukses perayaan menang pesta target'
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    category: 'work',
    url: `${CDN_BASE}/Sparkles/3D/sparkles_3d.png`,
    keywords: 'kilau magis baru fitur baru bersih kinclong'
  },
  {
    id: 'hundred-points',
    name: '100 Points',
    category: 'work',
    url: `${CDN_BASE}/Hundred%20points/3D/hundred_points_3d.png`,
    keywords: 'sempurna nilai seratus top mantap seratus'
  },
  {
    id: 'trophy',
    name: 'Trophy Winner',
    category: 'work',
    url: `${CDN_BASE}/Trophy/3D/trophy_3d.png`,
    keywords: 'piala juara menang satu prestasi hebat'
  },
  {
    id: 'check-mark',
    name: 'Check Done',
    category: 'work',
    url: `${CDN_BASE}/Check%20mark%20button/3D/check_mark_button_3d.png`,
    keywords: 'selesai beres centang tuntas verified sukses'
  },
  {
    id: 'glowing-star',
    name: 'Glowing Star',
    category: 'work',
    url: `${CDN_BASE}/Glowing%20star/3D/glowing_star_3d.png`,
    keywords: 'bintang favorit utama bersinar luar biasa'
  },
  {
    id: 'hot-coffee',
    name: 'Coffee Break',
    category: 'work',
    url: `${CDN_BASE}/Hot%20beverage/3D/hot_beverage_3d.png`,
    keywords: 'kopi santai istirahat kerja kafe semangat pagi'
  },
  {
    id: 'laptop',
    name: 'Laptop Work',
    category: 'work',
    url: `${CDN_BASE}/Laptop/3D/laptop_3d.png`,
    keywords: 'kerja koding komputer kantor laptop online'
  },
  {
    id: 'light-bulb',
    name: 'Idea Light Bulb',
    category: 'work',
    url: `${CDN_BASE}/Light%20bulb/3D/light_bulb_3d.png`,
    keywords: 'ide gagasan cemerlang inovasi solusi lampu'
  },
  {
    id: 'money-bag',
    name: 'Money Bag',
    category: 'work',
    url: `${CDN_BASE}/Money%20bag/3D/money_bag_3d.png`,
    keywords: 'uang cuan profit gaji bonus omzet untung'
  },
  {
    id: 'chart-increasing',
    name: 'Growth Chart',
    category: 'work',
    url: `${CDN_BASE}/Chart%20increasing/3D/chart_increasing_3d.png`,
    keywords: 'pertumbuhan naik performa metrik grafik target'
  },

  // --- Animals (Hewan Lucu) ---
  {
    id: 'cat-face',
    name: 'Cute Cat',
    category: 'animals',
    url: `${CDN_BASE}/Cat%20face/3D/cat_face_3d.png`,
    keywords: 'kucing lucu cat meow gemas binatang'
  },
  {
    id: 'dog-face',
    name: 'Cute Dog',
    category: 'animals',
    url: `${CDN_BASE}/Dog%20face/3D/dog_face_3d.png`,
    keywords: 'anjing lucu dog guk setia ramah binatang'
  },
  {
    id: 'panda',
    name: 'Panda',
    category: 'animals',
    url: `${CDN_BASE}/Panda/3D/panda_3d.png`,
    keywords: 'panda lucu santai bambu imut binatang'
  },
  {
    id: 'bear',
    name: 'Bear',
    category: 'animals',
    url: `${CDN_BASE}/Bear/3D/bear_3d.png`,
    keywords: 'beruang hangat peluk bear binatang'
  },
  {
    id: 'lion',
    name: 'Lion',
    category: 'animals',
    url: `${CDN_BASE}/Lion/3D/lion_3d.png`,
    keywords: 'singa gagah berani raja kuat binatang'
  },
  {
    id: 'monkey-face',
    name: 'Monkey',
    category: 'animals',
    url: `${CDN_BASE}/Monkey%20face/3D/monkey_face_3d.png`,
    keywords: 'monyet lucu jail iseng binatang'
  },
  {
    id: 'rabbit',
    name: 'Rabbit',
    category: 'animals',
    url: `${CDN_BASE}/Rabbit%20face/3D/rabbit_face_3d.png`,
    keywords: 'kelinci lucu lompat cepat imut bunny'
  },
  {
    id: 'unicorn',
    name: 'Unicorn',
    category: 'animals',
    url: `${CDN_BASE}/Unicorn/3D/unicorn_3d.png`,
    keywords: 'unicorn magis impian warna-warni ajaib'
  }
];

export function isStickerMessage(body: string | undefined | null): boolean {
  if (!body || typeof body !== 'string') return false;
  return body.startsWith('sticker:');
}

export function parseSticker(body: string | undefined | null): { url: string; name: string } | null {
  if (!isStickerMessage(body)) return null;
  const payload = (body ?? '').slice('sticker:'.length).trim();
  if (!payload) return null;

  if (payload.startsWith('{')) {
    try {
      const data = JSON.parse(payload);
      if (data && typeof data.url === 'string') {
        return { url: data.url, name: data.name || 'Stiker' };
      }
    } catch {
      // Fall through to plain string url
    }
  }
  if (payload.includes('|')) {
    const [url, ...rest] = payload.split('|');
    return { url, name: rest.join('|') || 'Stiker' };
  }

  return { url: payload, name: 'Stiker' };
}

export function formatStickerMessage(sticker: { url: string; name: string }): string {
  return `sticker:${JSON.stringify({ url: sticker.url, name: sticker.name })}`;
}

export type CustomEmojiSticker = {
  name: string;
  shortcodes: string[];
  url: string;
  category: string;
};

export const CUSTOM_EMOJI_STICKERS: CustomEmojiSticker[] = STICKER_LIST.map((s) => ({
  name: s.name,
  shortcodes: [s.id.replace(/-/g, '_'), ...s.keywords.split(' ')].filter(Boolean),
  url: s.url,
  category:
    s.category === 'smilies'
      ? 'Stiker: Ekspresi'
      : s.category === 'gestures'
        ? 'Stiker: Gerakan'
        : s.category === 'work'
          ? 'Stiker: Kerja & Tim'
          : 'Stiker: Hewan'
}));

const RECENT_STICKERS_KEY = 'flowboard:recent-stickers';

export type RecentStickerItem = {
  unicode: string;
  name: string;
};

export function normalizeEmoji(str: string | undefined | null): string {
  if (!str) return '';
  return str.normalize('NFC').replace(/[\uFE0E\uFE0F]/g, '').trim();
}

export function isValidEmoji(str: string | undefined | null): boolean {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (trimmed.length === 0 || trimmed.length > 10) return false;
  if (
    trimmed.includes('/') ||
    trimmed.includes('%') ||
    trimmed.includes('http') ||
    trimmed.includes('.') ||
    trimmed.includes(':') ||
    trimmed.includes('\\') ||
    trimmed.includes(';') ||
    trimmed.includes('=')
  ) {
    return false;
  }
  return true;
}

export function getRecentStickerItems(): RecentStickerItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_STICKERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const sanitized: RecentStickerItem[] = [];
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const unicode = typeof item.unicode === 'string' ? item.unicode.trim() : '';
      if (!isValidEmoji(unicode)) continue;
      const normalized = normalizeEmoji(unicode);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      sanitized.push({
        unicode,
        name: typeof item.name === 'string' && item.name ? item.name : 'Emoji'
      });
    }
    // Auto-purge duplicates or corrupted entries from localStorage immediately
    if (sanitized.length !== list.length) {
      localStorage.setItem(RECENT_STICKERS_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
}

export function addRecentStickerItem(item: { unicode: string; name: string }): RecentStickerItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const unicode = item.unicode?.trim() || '';
    if (!isValidEmoji(unicode)) return getRecentStickerItems();
    const targetNormalized = normalizeEmoji(unicode);
    const existing = getRecentStickerItems();
    const filtered = existing.filter((s) => normalizeEmoji(s.unicode) !== targetNormalized);
    const updated = [{ unicode, name: item.name || 'Emoji' }, ...filtered].slice(0, 16);
    localStorage.setItem(RECENT_STICKERS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
export function clearRecentStickerItems(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_STICKERS_KEY);
  } catch {
    // ignore
  }
}
