import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "@/i18n/locales/en/common.json";
import viCommon from "@/i18n/locales/vi/common.json";

type TranslationBundle = Record<string, unknown>;

function normalizeTranslationBundle(bundle: unknown): TranslationBundle {
  if (
    bundle &&
    typeof bundle === "object" &&
    "default" in (bundle as Record<string, unknown>) &&
    (bundle as Record<string, unknown>).default &&
    typeof (bundle as Record<string, unknown>).default === "object"
  ) {
    return (bundle as { default: TranslationBundle }).default;
  }
  return (bundle as TranslationBundle) || {};
}

const resources = {
  en: { translation: normalizeTranslationBundle(enCommon) },
  vi: { translation: normalizeTranslationBundle(viCommon) },
} as const;

const DEFAULT_LANGUAGE = "vi";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    // Always start with a deterministic language for SSR/CSR consistency.
    // The persisted client language is applied in _app after hydration.
    lng: DEFAULT_LANGUAGE,
    supportedLngs: ["vi", "en"],
    preload: ["vi", "en"],
    fallbackLng: DEFAULT_LANGUAGE,
    // Prevent async init race in SSR (server can render translation keys before resources are ready).
    initImmediate: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
