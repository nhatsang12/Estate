import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const SUPPORTED_LANGUAGES = [
  { code: "vi", label: "VI" },
  { code: "en", label: "EN" },
] as const;

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const currentLanguage = useMemo(() => {
    const current = String(i18n.resolvedLanguage || i18n.language || "vi").toLowerCase();
    return current === "en" ? "en" : "vi";
  }, [i18n.language, i18n.resolvedLanguage]);

  const handleChangeLanguage = async (language: "vi" | "en") => {
    if (language === currentLanguage) return;
    await i18n.changeLanguage(language);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("em_locale", language);
    }
  };

  return (
    <div
      aria-label={t("language.label")}
      className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-boundary bg-surface/70 px-1.5 py-1 backdrop-blur-md"
    >
      {SUPPORTED_LANGUAGES.map((item) => {
        const active = currentLanguage === item.code;
        return (
          <button
            key={item.code}
            type="button"
            onClick={() => void handleChangeLanguage(item.code)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] transition-colors ${
              active
                ? "bg-primary-dark text-white"
                : "text-text-secondary hover:bg-white/70 hover:text-text-primary"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
