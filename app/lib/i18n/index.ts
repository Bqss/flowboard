import { writable } from 'svelte/store';

export const locales = [
  { code: 'en', short: 'EN' },
  { code: 'ms', short: 'MY' }
] as const;

export type Locale = (typeof locales)[number]['code'];

const STORAGE_KEY = 'flowboard-locale';

export const locale = writable<Locale>('en');

let initialized = false;

export function isLocale(value: string | null): value is Locale {
  return locales.some((option) => option.code === value);
}

export function setLocale(next: Locale) {
  locale.set(next);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, next);
  }
}

export function initializeLocale() {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;
  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (isLocale(stored)) {
    locale.set(stored);
  }
}

export function localeToHtmlLang(value: Locale) {
  return value === 'ms' ? 'ms-MY' : 'en';
}
