import { useCallback } from 'react';
import { useUiStore, type Locale } from '../store/ui-store';
import ko from './ko.json';
import en from './en.json';

type TranslationMap = Record<string, unknown>;

const translations: Record<Locale, TranslationMap> = { ko, en };

function getNestedValue(obj: TranslationMap, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export function useI18n() {
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations[locale], key);
    },
    [locale]
  );

  return { t, locale, setLocale };
}
