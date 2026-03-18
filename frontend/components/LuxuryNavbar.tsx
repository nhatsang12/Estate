import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

interface LuxuryNavbarProps {
    onPostClick?: () => void;
    variant?: 'default' | 'light';
}

const NAV_LINKS = [
    { href: '#featured', label: 'Nổi Bật' },
    { href: '#listings', label: 'Danh Sách' },
    { href: '#vision', label: 'Về Chúng Tôi' },
    { href: '#gallery', label: 'Thư Viện' },
];

// ─── Avatar initials ──────────────────────────────────────────
function getInitials(name?: string | null): string {
    if (!name) return '?';
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// ─── Role label ───────────────────────────────────────────────
function getRoleLabel(role?: string): string {
    if (role === 'admin') return 'Quản Trị Viên';
    if (role === 'provider') return 'Nhà Cung Cấp';
    return 'Khách Hàng';
}

function getDashboardHref(role?: string): string {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'provider') return '/provider/dashboard';
    return '/profile/settings';
}

export default function LuxuryNavbar({ onPostClick, variant = 'default' }: LuxuryNavbarProps) {
    const router = useRouter();
    const { user, logout } = useAuth();

    const [scrolled, setScrolled] = useState(false);
    const [hovered, setHovered] = useState<string | null>(null);
    const [ctaHovered, setCtaHovered] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isLoggedIn = !!user;
    const isScrolled = variant === 'light' ? true : scrolled;

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // ─── Close dropdown khi click ngoài ──────────────────────
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function handleLogout() {
        logout();
        setDropdownOpen(false);
        router.push('/');
    }

    return (
        <nav className={`e-nav${isScrolled ? ' scrolled' : ''}`}>
            <Link href="/" className="e-nav-logo">
                Esto<span>ria</span>
            </Link>

            <div className="e-nav-links">
                {NAV_LINKS.map((link) => {
                    const isHov = hovered === link.href;
                    const resolvedHref = link.href.startsWith('#') && router.pathname !== '/'
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
                            {link.label}
                            <span style={{
                                position: 'absolute',
                                bottom: 0, left: 0,
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

            {/* ── Right side: Avatar OR CTA ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>

                {isLoggedIn ? (
                    /* ── Avatar + Dropdown ── */
                    <div ref={dropdownRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setDropdownOpen(p => !p)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '4px',
                            }}
                        >
                            {/* Avatar circle */}
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: isScrolled ? 'var(--e-charcoal)' : 'rgba(255,255,255,0.15)',
                                border: `2px solid ${isScrolled ? 'var(--e-gold)' : 'rgba(255,255,255,0.5)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: 'var(--e-serif)',
                                fontSize: '0.78rem', fontWeight: 600,
                                color: isScrolled ? 'var(--e-white)' : 'var(--e-white)',
                                transition: 'all 0.3s var(--e-ease)',
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}>
                                {user?.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    getInitials(user?.name)
                                )}
                            </div>

                            {/* Chevron */}
                            <svg
                                width={10} height={10}
                                viewBox="0 0 10 6" fill="none"
                                stroke={isScrolled ? 'var(--e-muted)' : 'rgba(255,255,255,0.6)'}
                                strokeWidth={1.5}
                                style={{
                                    transition: 'transform 0.25s var(--e-ease)',
                                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                            >
                                <path d="M1 1l4 4 4-4" />
                            </svg>
                        </button>

                        {/* ── Dropdown Menu ── */}
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
                                {/* User info */}
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
                                        fontFamily: 'var(--e-serif)',
                                        fontSize: '0.95rem', fontWeight: 500,
                                        color: 'var(--e-charcoal)', marginBottom: 2,
                                    }}>
                                        {user?.name}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--e-muted)' }}>
                                        {user?.email}
                                    </div>
                                </div>

                                {/* Menu items */}
                                <div style={{ padding: '0.5rem 0' }}>
                                    {[
                                        { href: getDashboardHref(user?.role), label: 'Dashboard', icon: '▦' },
                                        { href: '/profile/settings', label: 'Hồ Sơ', icon: '◎' },
                                        { href: user?.role === 'admin' ? '/admin/kyc-management' : user?.role === 'provider' ? '/provider/dashboard?view=kyc' : '/profile/kyc', label: 'Xác Minh KYC', icon: '✦' },
                                        { href: user?.role === 'provider' ? '/provider/dashboard?view=plans' : '/subscription/plans', label: 'Gói Dịch Vụ', icon: '◈' },
                                    ].map((item) => (
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
                                </div>

                                {/* Divider + Logout */}
                                <div style={{ borderTop: '1px solid var(--e-beige)', padding: '0.5rem 0' }}>
                                    <button
                                        onClick={handleLogout}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.7rem',
                                            width: '100%', padding: '0.7rem 1.4rem',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            fontSize: '0.78rem', color: '#c0392b',
                                            fontWeight: 600, letterSpacing: '0.04em',
                                            textAlign: 'left',
                                            transition: 'background 0.15s',
                                            fontFamily: 'var(--e-sans)',
                                        }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#fdf2f2'}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
                                    >
                                        <span style={{ fontSize: '0.85rem' }}>↗</span>
                                        Đăng Xuất
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* ── CTA Button (chưa đăng nhập) ── */
                    <button
                        className="e-nav-cta"
                        onClick={onPostClick}
                        onMouseEnter={() => setCtaHovered(true)}
                        onMouseLeave={() => setCtaHovered(false)}
                        style={{
                            position: 'relative', overflow: 'hidden',
                            background: isScrolled
                                ? (ctaHovered ? 'var(--e-gold)' : 'var(--e-charcoal)')
                                : 'transparent',
                            borderColor: isScrolled
                                ? (ctaHovered ? 'var(--e-gold)' : 'var(--e-charcoal)')
                                : (ctaHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)'),
                            color: isScrolled ? 'var(--e-white)' : (ctaHovered ? 'var(--e-charcoal)' : 'var(--e-white)'),
                            transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                        }}
                    >
                        {!isScrolled && (
                            <span style={{
                                position: 'absolute', inset: 0,
                                background: 'var(--e-white)',
                                transform: ctaHovered ? 'translateX(0)' : 'translateX(-101%)',
                                transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
                                zIndex: 0,
                            }} />
                        )}
                        <span style={{ position: 'relative', zIndex: 1 }}>Đăng Bài</span>
                    </button>
                )}
            </div>

            <style>{`
                @keyframes dropdownIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </nav>
    );
}
