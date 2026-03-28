import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import favoriteService from '@/services/favoriteService';
import LuxuryLoginModal from './LuxuryLoginModal';

interface LuxuryNavbarProps {
    onPostClick?: () => void;
    variant?: 'default' | 'light';
}

const NAV_LINKS = [
    { href: '#featured', labelKey: 'nav.featured' },
    { href: '#listings', labelKey: 'nav.listings' },
    { href: '#about', labelKey: 'nav.about' },
    { href: '#showcase', labelKey: 'nav.gallery' },
];

function getInitials(name?: string | null): string {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function LuxuryNavbar({ onPostClick, variant = 'default' }: LuxuryNavbarProps) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();

    const [scrolled, setScrolled] = useState(false);
    const [hovered, setHovered] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [favoriteCount, setFavoriteCount] = useState(0);
    const [isHydrated, setIsHydrated] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Ensure hydration consistency: only render translated content after client hydration
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const isLoggedIn = !!user;
    const isScrolled = variant === 'light' ? true : scrolled;
    const isUser = user?.role === 'user' || (!user?.role && isLoggedIn);
    const currentLanguage = useMemo(() => {
        const raw = String(i18n.resolvedLanguage || i18n.language || 'vi').toLowerCase();
        return raw === 'en' ? 'en' : 'vi';
    }, [i18n.language, i18n.resolvedLanguage]);

    const handleChangeLanguage = async (language: 'vi' | 'en') => {
        if (language === currentLanguage) return;
        await i18n.changeLanguage(language);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('em_locale', language);
        }
    };

    const getRoleLabel = (role?: string): string => {
        if (!isHydrated) return '';
        if (role === 'admin') return t('luxuryNav.roles.admin');
        if (role === 'provider') return t('luxuryNav.roles.provider');
        return t('luxuryNav.roles.customer');
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadFavoriteCount = async () => {
            if (!user || user.role === 'admin') {
                setFavoriteCount(0);
                return;
            }
            try {
                const response = await favoriteService.getMyFavorites(1, 1);
                if (cancelled) return;
                const total = typeof response.total === 'number'
                    ? response.total
                    : response.data?.favorites?.length || 0;
                setFavoriteCount(total);
            } catch {
                if (!cancelled) setFavoriteCount(0);
            }
        };

        const handleFavoritesChanged = () => {
            void loadFavoriteCount();
        };

        void loadFavoriteCount();
        window.addEventListener('favorites:changed', handleFavoritesChanged);

        return () => {
            cancelled = true;
            window.removeEventListener('favorites:changed', handleFavoritesChanged);
        };
    }, [user]);

    function handleLogout() {
        logout();
        setDropdownOpen(false);
        router.push('/');
    }

    const userMenuItems = useMemo(() => [
        { href: '/profile/settings', label: isHydrated ? t('luxuryNav.menu.profile') : '', icon: '◎' },
        { href: '/profile/kyc', label: isHydrated ? t('luxuryNav.menu.kyc') : '', icon: '✦' },
        { href: '/favorites', label: isHydrated ? t('luxuryNav.menu.favorites') : '', icon: '♥' },
    ], [t, isHydrated]);

    const adminMenuItems = useMemo(() => [
        { href: '/admin/dashboard', label: isHydrated ? t('luxuryNav.menu.dashboard') : '', icon: '▦' },
        { href: '/profile/settings', label: isHydrated ? t('luxuryNav.menu.profile') : '', icon: '◎' },
    ], [t, isHydrated]);

    const providerMenuItems = useMemo(() => [
        { href: '/provider/dashboard', label: isHydrated ? t('luxuryNav.menu.dashboard') : '', icon: '▦' },
        { href: '/profile/settings', label: isHydrated ? t('luxuryNav.menu.profile') : '', icon: '◎' },
        { href: '/provider/dashboard?view=kyc', label: isHydrated ? t('luxuryNav.menu.kyc') : '', icon: '✦' },
        { href: '/provider/dashboard?view=plans', label: isHydrated ? t('luxuryNav.menu.services') : '', icon: '◈' },
        { href: '/favorites', label: isHydrated ? t('luxuryNav.menu.favorites') : '', icon: '♥' },
    ], [t, isHydrated]);

    function getMenuItems() {
        if (user?.role === 'admin') return adminMenuItems;
        if (user?.role === 'provider') return providerMenuItems;
        return userMenuItems;
    }

    return (
        <nav className={`e-nav${isScrolled ? ' scrolled' : ''}`}>
            <Link href="/" className="e-nav-logo">
                Esto<span>ria</span>
            </Link>

            <div className="e-nav-links">
                            {NAV_LINKS.map((link) => {
                    const isHov = hovered === link.href;
                    const resolvedHref =
                        link.href.startsWith('#') && router.pathname !== '/'
                            ? `/${link.href}`
                            : link.href;
                    return (
                        <Link
                            key={link.href}
                            href={resolvedHref}
                            onMouseEnter={() => setHovered(link.href)}
                            onMouseLeave={() => setHovered(null)}
                            style={{
                                position: 'relative',
                                color: isHov
                                    ? (isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)')
                                    : (isScrolled ? 'var(--e-muted)' : 'rgba(255,255,255,0.75)'),
                                transition: 'color 0.25s',
                                paddingBottom: '4px',
                            }}
                        >
                            {isHydrated ? t(link.labelKey) : ''}
                            <span style={{
                                position: 'absolute', bottom: 0, left: 0,
                                height: '1px',
                                width: isHov ? '100%' : '0%',
                                background: isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)',
                                transition: 'width 0.3s cubic-bezier(0.22,1,0.36,1)',
                                display: 'block',
                            }} />
                        </Link>
                    );
                })}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div
                    aria-label={isHydrated ? t('language.label') : ''}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px',
                        borderRadius: 999,
                        border: `1px solid ${isScrolled ? 'rgba(37,45,54,0.2)' : 'rgba(255,255,255,0.45)'}`,
                        background: isScrolled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(8px)',
                    }}
                >
                    {(['vi', 'en'] as const).map((lang) => {
                        const active = currentLanguage === lang;
                        return (
                            <button
                                key={lang}
                                type="button"
                                onClick={() => void handleChangeLanguage(lang)}
                                style={{
                                    border: 'none',
                                    borderRadius: 999,
                                    padding: '4px 8px',
                                    minWidth: 32,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--e-sans)',
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    color: active
                                        ? '#fff'
                                        : (isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)'),
                                    background: active
                                        ? (isScrolled ? 'var(--e-charcoal)' : 'rgba(26,24,20,0.85)')
                                        : 'transparent',
                                    opacity: active ? 1 : 0.8,
                                    transition: 'all 0.22s',
                                }}
                            >
                                {lang}
                            </button>
                        );
                    })}
                </div>
                {isLoggedIn ? (
                    <>
                        {user?.role !== 'admin' && (
                            <Link
                                href="/favorites"
                                style={{
                                    position: 'relative',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 34,
                                    height: 34,
                                    borderRadius: '50%',
                                    border: `1px solid ${isScrolled ? 'rgba(37,45,54,0.25)' : 'rgba(255,255,255,0.5)'}`,
                                    color: isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)',
                                    background: isScrolled ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.12)',
                                    transition: 'all 0.25s',
                                }}
                            >
                                <Heart size={15} fill={favoriteCount > 0 ? 'currentColor' : 'none'} />
                                {favoriteCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: -6,
                                        right: -6,
                                        minWidth: 18,
                                        height: 18,
                                        padding: '0 5px',
                                        borderRadius: 999,
                                        background: '#e0445a',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {favoriteCount > 99 ? '99+' : favoriteCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        <div ref={dropdownRef} style={{ position: 'relative' }}>
                        {/* Avatar button */}
                        <button
                            onClick={() => setDropdownOpen(p => !p)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                            }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: isScrolled ? 'var(--e-charcoal)' : 'rgba(255,255,255,0.15)',
                                border: `2px solid ${isScrolled ? 'var(--e-gold)' : 'rgba(255,255,255,0.5)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--e-serif)', fontSize: '0.78rem', fontWeight: 600,
                                color: 'var(--e-white)',
                                transition: 'all 0.3s var(--e-ease)',
                                overflow: 'hidden', flexShrink: 0,
                            }}>
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    getInitials(user?.name)
                                )}
                            </div>
                            <svg width={10} height={10} viewBox="0 0 10 6" fill="none"
                                stroke={isScrolled ? 'var(--e-muted)' : 'rgba(255,255,255,0.6)'}
                                strokeWidth={1.5}
                                style={{
                                    transition: 'transform 0.25s var(--e-ease)',
                                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}>
                                <path d="M1 1l4 4 4-4" />
                            </svg>
                        </button>

                        {/* Dropdown */}
                        {dropdownOpen && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                                width: 240,
                                background: 'var(--e-white)',
                                border: '1px solid var(--e-beige)',
                                boxShadow: '0 16px 48px rgba(17,28,20,0.14)',
                                zIndex: 200,
                                animation: 'dropdownIn 0.2s var(--e-ease)',
                            }}>
                                {/* User info header */}
                                <div style={{
                                    padding: '1.2rem 1.4rem',
                                    borderBottom: '1px solid var(--e-beige)',
                                    background: 'var(--e-cream)',
                                }}>
                                    <div style={{
                                        fontSize: '0.62rem', letterSpacing: '0.14em',
                                        textTransform: 'uppercase', color: 'var(--e-gold)',
                                        fontWeight: 700, marginBottom: 4,
                                    }}>
                                        {getRoleLabel(user?.role)}
                                    </div>
                                    <div style={{
                                        fontFamily: 'var(--e-serif)', fontSize: '0.95rem',
                                        fontWeight: 500, color: 'var(--e-charcoal)', marginBottom: 2,
                                    }}>
                                        {user?.name}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--e-muted)' }}>
                                        {user?.email}
                                    </div>
                                </div>

                                {/* Menu items */}
                                <div style={{ padding: '0.5rem 0' }}>
                                    {getMenuItems().map((item) => (
                                        <Link key={item.href} href={item.href}
                                            onClick={() => setDropdownOpen(false)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.7rem',
                                                padding: '0.7rem 1.4rem',
                                                fontSize: '0.78rem', color: 'var(--e-muted)',
                                                textDecoration: 'none', fontWeight: 500,
                                                transition: 'background 0.15s, color 0.15s',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-cream)';
                                                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--e-charcoal)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                                                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--e-muted)';
                                            }}
                                        >
                                            <span style={{ fontSize: '0.8rem', color: 'var(--e-gold)', opacity: 0.8 }}>
                                                {item.icon}
                                            </span>
                                            {item.label}
                                        </Link>
                                    ))}

                                    {/* Đổi sang Provider — chỉ hiện với role user */}
                                    {isUser && (
                                        <Link
                                            href="/profile/settings#become-provider"
                                            onClick={() => setDropdownOpen(false)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.7rem',
                                                padding: '0.9rem 1.4rem 0.7rem',
                                                fontSize: '0.78rem', color: 'var(--e-muted)',
                                                textDecoration: 'none', fontWeight: 500,
                                                transition: 'background 0.15s, color 0.15s',
                                                borderTop: '1px solid var(--e-beige)',
                                                marginTop: '0.3rem',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLAnchorElement).style.background = 'var(--e-cream)';
                                                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--e-charcoal)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                                                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--e-muted)';
                                            }}
                                        >
                                            <span style={{ fontSize: '0.8rem', color: 'var(--e-gold)', opacity: 0.8 }}>
                                                ◆
                                            </span>
                                            {t('luxuryNav.menu.switchProvider')}
                                        </Link>
                                    )}
                                </div>

                                {/* Logout */}
                                <div style={{ borderTop: '1px solid var(--e-beige)', padding: '0.5rem 0' }}>
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.7rem',
                                            width: '100%', padding: '0.7rem 1.4rem',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontSize: '0.78rem', color: '#c0392b',
                                            fontWeight: 600, letterSpacing: '0.04em',
                                            textAlign: 'left', transition: 'background 0.15s',
                                            fontFamily: 'var(--e-sans)',
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fdf2f2'}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                                    >
                                        <span style={{ fontSize: '0.85rem' }}>↗</span>
                                        {t('luxuryNav.actions.logout')}
                                    </button>
                                </div>
                            </div>
                        )}
                        </div>
                    </>
                ) : (
                    /* ── Nút Đăng Nhập khi chưa login ── */
                    <button
                        onClick={() => setShowLoginModal(true)}
                        style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '0.55rem 1.4rem',
                            fontFamily: 'var(--e-sans)', fontSize: '0.74rem',
                            fontWeight: 700, letterSpacing: '0.1em',
                            textTransform: 'uppercase', textDecoration: 'none',
                            border: `1px solid ${isScrolled ? 'var(--e-charcoal)' : 'rgba(255,255,255,0.6)'}`,
                            color: isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)',
                            background: 'transparent',
                            transition: 'all 0.25s cubic-bezier(0.22,1,0.36,1)',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background =
                                isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)';
                            (e.currentTarget as HTMLButtonElement).style.color =
                                isScrolled ? 'var(--e-white)' : 'var(--e-charcoal)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor =
                                isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                            (e.currentTarget as HTMLButtonElement).style.color =
                                isScrolled ? 'var(--e-charcoal)' : 'var(--e-white)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor =
                                isScrolled ? 'var(--e-charcoal)' : 'rgba(255,255,255,0.6)';
                        }}
                    >
                        {t('auth.login')}
                    </button>
                )}
            </div>

            {showLoginModal && (
                <LuxuryLoginModal onClose={() => setShowLoginModal(false)} />
            )}

            <style>{`
                @keyframes dropdownIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </nav>
    );
}
