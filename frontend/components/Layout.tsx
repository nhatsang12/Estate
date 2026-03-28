import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  UserCircle2,
  X,
} from "lucide-react";
import AuthModal from "@/components/AuthModal";
import LanguageToggle from "@/components/LanguageToggle";
import { useAuth } from "@/contexts/AuthContext";
import favoriteService from "@/services/favoriteService";
import { useTranslation } from "react-i18next";

type AuthMode = "login" | "signup";

interface LayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contentClassName?: string;
}

export default function Layout({ children, sidebar, contentClassName }: LayoutProps) {
  const { t } = useTranslation();
  const { user, logout, isAuthLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [favoriteCount, setFavoriteCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const openAuthModal = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadFavoritesCount = async () => {
      if (!user || user.role === "admin") {
        setFavoriteCount(0);
        return;
      }
      try {
        const response = await favoriteService.getMyFavorites(1, 1);
        if (cancelled) return;
        const total =
          typeof response.total === "number"
            ? response.total
            : response.data?.favorites?.length || 0;
        setFavoriteCount(total);
      } catch {
        if (!cancelled) setFavoriteCount(0);
      }
    };
    void loadFavoritesCount();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),rgba(255,255,255,0.1)_38%,transparent_70%)]" />

      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/55 backdrop-blur-xl transition-all" style={{ transitionDuration: 'var(--transition-duration-normal)', transitionTimingFunction: 'var(--transition-easing)' }}>
        <div className="mx-auto flex h-16 flex-col justify-center px-4 sm:h-20 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-10 min-w-0">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-dark text-white shadow-lg shadow-primary-dark/20">
                  <Building2 size={18} />
                </span>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-text-secondary">EstateManager</p>
                  <p className="text-base font-semibold text-text-primary">Platform</p>
                </div>
              </Link>

              <nav className="hidden items-center gap-4 md:gap-6 md:flex overflow-x-auto">
                <Link href="/" className="nav-link whitespace-nowrap">
                  {t("nav.home")}
                </Link>
                <Link href="/#listings" className="nav-link whitespace-nowrap">
                  {t("nav.listings")}
                </Link>
                <Link href="/#featured" className="nav-link whitespace-nowrap">
                  {t("nav.featured")}
                </Link>
                {user?.role === "provider" && (
                  <Link href="/provider/dashboard" className="nav-link text-blue-600 font-semibold whitespace-nowrap">
                    {t("nav.providerDashboard")}
                  </Link>
                )}
                {user?.role === "admin" && (
                  <Link href="/admin/dashboard" className="nav-link text-red-600 font-semibold whitespace-nowrap">
                    {t("nav.adminDashboard")}
                  </Link>
                )}
                {user?.role === "provider" && (
                  <Link href="/provider/dashboard?view=plans" className="nav-link text-purple-600 font-semibold whitespace-nowrap">
                    {t("nav.upgrade")}
                  </Link>
                )}
                {user && user.role !== "admin" ? (
                  <Link href="/profile/kyc" className="nav-link whitespace-nowrap">
                    {t("nav.myKyc")}
                  </Link>
                ) : null}
                {user?.role === "admin" ? (
                  <Link href="/admin/kyc-management" className="nav-link whitespace-nowrap">
                    {t("nav.kycManagement")}
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <LanguageToggle />
            {!isAuthLoading && user && user.role !== "admin" ? (
              <Link href="/favorites" className="glass-button hidden sm:inline-flex relative">
                <Heart size={16} />
                <span>Saved</span>
                {favoriteCount > 0 ? (
                  <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-white text-[11px] font-semibold">
                    {favoriteCount > 99 ? "99+" : favoriteCount}
                  </span>
                ) : null}
              </Link>
            ) : null}
            {!isAuthLoading && !user ? (
              <>
                <button
                  type="button"
                  className="glass-button hidden sm:inline-flex"
                  onClick={() => openAuthModal("login")}
                >
                  {t("auth.login")}
                </button>
                <button
                  type="button"
                  className="glass-button-primary hidden sm:inline-flex"
                  onClick={() => openAuthModal("signup")}
                >
                  {t("auth.signup")}
                </button>
              </>
            ) : null}

            {!isAuthLoading && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  className="glass-button hidden max-w-[200px] sm:inline-flex"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                >
                  <UserCircle2 size={18} />
                  <span className="truncate">{user.name}</span>
                  <ChevronDown size={16} />
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 mt-3 w-64 origin-top-right transform rounded-2xl border border-boundary bg-surface/80 p-2 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-3 border-b border-boundary mb-2">
                      <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
                      <p className="truncate text-xs text-text-secondary">{user.email}</p>
                    </div>
                    <Link
                      href="/profile/settings"
                      className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-text-primary hover:bg-white/60"
                    >
                      {t("profile.settings")}
                    </Link>
                    {user.role !== "admin" ? (
                      <Link
                        href="/favorites"
                        className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-text-primary hover:bg-white/60"
                      >
                        Favorites ({favoriteCount})
                      </Link>
                    ) : null}
                    {user.role === "provider" && (
                      <div className="space-y-1 mt-1">
                        <Link
                          href="/provider/dashboard"
                          className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-primary-dark hover:bg-white/60"
                        >
                          Provider Dashboard
                        </Link>
                        <Link
                          href="/provider/dashboard?view=properties"
                          className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-primary-dark hover:bg-white/60"
                        >
                          {t("profile.myProperties")}
                        </Link>
                        <Link
                          href="/provider/dashboard?view=plans"
                          className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-primary-dark hover:bg-white/60"
                        >
                          {t("profile.services")}
                        </Link>
                      </div>
                    )}
                    {user.role === "admin" && (
                      <div className="mt-1">
                        <Link
                          href="/admin/dashboard"
                          className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-accent hover:bg-rose-50"
                        >
                          Admin Dashboard
                        </Link>
                      </div>
                    )}
                    {user.role === "provider" && (
                      <div className="mt-1">
                        <Link
                          href="/provider/dashboard?view=plans"
                          className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-primary-light hover:bg-indigo-50"
                        >
                          {t("profile.upgradePro")}
                        </Link>
                      </div>
                    )}
                    <div className="mt-1">
                      <Link
                        href={user.role === "admin" ? "/admin/kyc-management" : user.role === "provider" ? "/provider/dashboard?view=kyc" : "/profile/kyc"}
                        className="interactive-link flex w-full items-center rounded-xl px-3 py-2.5 text-sm text-text-primary hover:bg-white/60"
                      >
                        {t("profile.kycVerification")}
                      </Link>
                    </div>
                    <button
                      type="button"
                      className="interactive-link flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-accent hover:bg-rose-50 mt-2 border-t border-boundary pt-3"
                      onClick={logout}
                    >
                      <LogOut size={16} />
                      {t("profile.logout")}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className="glass-button sm:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>




      </header>

      <main className="mx-auto w-full max-w-7xl px-3 sm:px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 pt-6 sm:pt-8">
        <div className={sidebar ? "grid gap-4 sm:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]" : ""}>
          {sidebar ? <aside className="glass-panel h-fit">{sidebar}</aside> : null}
          <section className={contentClassName}>{children}</section>
        </div>
      </main>

      <footer className="border-t border-boundary bg-surface backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-3 sm:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 text-xs sm:text-sm text-text-secondary sm:flex-row">
          <p>{t("footer.foundation")}</p>
          <p>{t("footer.built")}</p>
        </div>
      </footer>

      <AuthModal
        isOpen={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onModeChange={setAuthMode}
      />
    </div>
  );
}
