"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SERVICE_I18N, translate, type Lang } from "@/lib/i18n";

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** localized service name + description */
  service: (id: string) => { name: string; description: string };
}

const I18nContext = createContext<I18nValue | null>(null);
const LS_KEY = "gleam.lang";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem(LS_KEY) as Lang | null;
    if (saved === "en" || saved === "es") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(LS_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === "en" ? "es" : "en"),
      t: (key, vars) => translate(lang, key, vars),
      service: (id) => SERVICE_I18N[lang][id] ?? SERVICE_I18N.en[id] ?? { name: id, description: "" },
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
