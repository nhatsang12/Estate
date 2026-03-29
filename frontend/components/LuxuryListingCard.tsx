import { useState, useEffect, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import favoriteService from '@/services/favoriteService';
import LuxuryLoginModal from './LuxuryLoginModal';
import type { Property } from '@/types/property';
import { formatVNDShort } from '@/utils/formatPrice';
import { optimizeCloudinaryUrl } from '@/utils/imageOptimization';

interface LuxuryListingCardProps {
    property: Property;
    horizontal?: boolean;
}

const TYPE_LABEL: Record<string, string> = {
    apartment: 'Căn Hộ',
    house: 'Nhà Phố',
    villa: 'Biệt Thự',
    studio: 'Studio',
    office: 'Văn Phòng',
};

type BadgeKey = 'new' | 'hot' | 'vip';
const BADGE_CONFIG: Record<BadgeKey, { label: string; cls: string }> = {
    vip: { label: '✦ VIP', cls: 'lc-badge--vip' },
    new: { label: 'Mới', cls: 'lc-badge--new' },
    hot: { label: 'Hot', cls: 'lc-badge--hot' },
};

function getBadge(p: Property): BadgeKey | null {
    if ((p as any).featured) return 'vip';
    if ((p as any).viewCount > 500) return 'hot';
    return null;
}

function shortenAddress(address?: string, maxParts = 3) {
    if (!address) return '—';
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length <= maxParts) return parts.join(', ');
    return `${parts.slice(0, maxParts).join(', ')}…`;
}

const CARD_CSS = `
.lc-card {
    background: var(--e-white);
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--e-beige);
    /* FIX: ensure card fills full grid cell height */
    height: 100%;
    transition: none;
}
.lc-card:hover {
    /* Removed expensive animations for better performance */
}
.lc-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--e-gold), transparent);
    opacity: 0;
    transition: none;
    z-index: 10;
}
.lc-card:hover::before { opacity: 0; }

/* Image */
.lc-img-wrap {
    position: relative;
    width: 100%;
    padding-top: 66%;
    overflow: hidden;
    background: linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%);
    flex-shrink: 0;
    contain: layout style paint;
}
.lc-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: none;
    filter: none;
    opacity: 1;
}
.lc-img[loading="lazy"] {
    opacity: 0.9;
    background: inherit;
}
.lc-img[loading="lazy"][src] {
    animation: fadeIn 0.3s ease-in forwards;
}
@keyframes fadeIn {
    from { opacity: 0.7; }
    to { opacity: 1; }
}
.lc-card:hover .lc-img {
    transform: none;
    filter: none;
}
.lc-img-wrap::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 60px;
    background: linear-gradient(to top, rgba(26,23,20,0.35), transparent);
    pointer-events: none;
    z-index: 1;
}

/* Badge */
.lc-badge {
    position: absolute;
    top: 1rem; left: 1rem;
    z-index: 4;
    font-family: var(--e-sans);
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: 2px;
    backdrop-filter: blur(10px);
    transition: none;
}
.lc-card:hover .lc-badge { transform: none; }
.lc-badge--vip { background: rgba(184,151,74,0.18); color: #e5c97a; border: 1px solid rgba(184,151,74,0.55); }
.lc-badge--new { background: rgba(120,180,110,0.14); color: #a8c8a0; border: 1px solid rgba(120,180,110,0.45); }
.lc-badge--hot { background: rgba(220,110,60,0.14); color: #e8a080; border: 1px solid rgba(220,110,60,0.4); }

/* Fav */
.lc-fav {
    position: absolute;
    top: 1rem; right: 1rem;
    z-index: 4;
    width: 34px; height: 34px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.3);
    background: rgba(26,23,20,0.3);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: none;
}
.lc-fav:hover { transform: none; }
.lc-fav.is-faved {
    background: rgba(184,151,74,0.2);
    border-color: rgba(184,151,74,0.6);
}
.lc-fav:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}
.lc-fav.is-loading {
    background: rgba(26,23,20,0.45);
}

/* Body — flex:1 so it stretches to fill remaining card height */
.lc-body {
    padding: 1.8rem 1.9rem 2rem;
    display: flex;
    flex-direction: column;
    flex: 1;           /* ← fills remaining height so footer always anchors to bottom */
    position: relative;
    background: var(--e-white);
}
.lc-body::before {
    content: '';
    position: absolute;
    left: 0;
    top: 1.5rem; bottom: 1.6rem;
    width: 2px;
    background: linear-gradient(to bottom, var(--e-gold), transparent);
    opacity: 0;
    transition: none;
}
.lc-card:hover .lc-body::before { opacity: 0; }

/* Type */
.lc-type {
    font-family: var(--e-sans);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--e-gold);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
}
.lc-type::before {
    content: '';
    display: inline-block;
    width: 18px; height: 1px;
    background: var(--e-gold);
    flex-shrink: 0;
}

/* Title */
.lc-name {
    font-family: var(--e-serif);
    font-size: 1.35rem;
    font-weight: 500;
    color: var(--e-charcoal);
    line-height: 1.2;
    letter-spacing: -0.015em;
    margin: 0 0 0.55rem;
    transition: none;
    text-transform: capitalize;
}
.lc-card:hover .lc-name { color: var(--e-charcoal); }

/* Address */
.lc-addr {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: var(--e-sans);
    font-size: 0.82rem;
    color: var(--e-muted);
    margin-bottom: 1.1rem;
    line-height: 1.4;
}
.lc-addr svg { flex-shrink: 0; opacity: 0.55; }

/* Specs */
.lc-specs {
    display: flex;
    gap: 0;
    border-top: 1px solid var(--e-beige);
    border-bottom: 1px solid var(--e-beige);
    margin-bottom: 1.1rem;
}
.lc-spec {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--e-sans);
    font-size: 0.83rem;
    color: var(--e-muted);
    padding: 0.65rem 0.9rem 0.65rem 0;
    margin-right: 0.9rem;
    border-right: 1px solid var(--e-beige);
    font-weight: 500;
}
.lc-spec:last-child { border-right: none; margin-right: 0; }
.lc-spec svg { flex-shrink: 0; }

/* Footer — margin-top:auto pushes it to bottom regardless of content height */
.lc-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-top: auto;
    gap: 0.5rem;
}

/* Price */
.lc-price-wrap { display: flex; flex-direction: column; gap: 0.15rem; }
.lc-price-label {
    font-family: var(--e-sans);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--e-muted);
    opacity: 0.6;
}
.lc-price {
    font-family: var(--e-serif);
    font-size: 1.4rem;
    font-style: italic;
    font-weight: 500;
    color: var(--e-charcoal);
    line-height: 1;
    letter-spacing: 0.01em;
}

/* CTA */
.lc-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-family: var(--e-sans);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--e-charcoal);
    text-decoration: none;
    padding: 9px 16px;
    border: 1px solid var(--e-beige);
    transition: none;
    white-space: nowrap;
    flex-shrink: 0;
}
.lc-cta:hover,
.lc-card:hover .lc-cta {
    background: var(--e-charcoal);
    border-color: var(--e-charcoal);
    color: var(--e-white);
    gap: 7px;
}
.lc-cta svg { transition: none; }
.lc-card:hover .lc-cta svg { transform: none; }

/* ── HORIZONTAL / LIST MODE ── */
.lc-card.lc-horizontal {
    flex-direction: row;
    height: auto;
    min-height: 160px;
}
.lc-card.lc-horizontal .lc-img-wrap {
    width: 280px;
    min-width: 280px;
    padding-top: 0;
    height: auto;
    flex-shrink: 0;
}
.lc-card.lc-horizontal .lc-body {
    padding: 1.1rem 1.5rem;
}
.lc-card.lc-horizontal .lc-name {
    font-size: 1.05rem;
    margin-bottom: 0.25rem;
}
.lc-card.lc-horizontal .lc-addr {
    margin-bottom: 0.5rem;
}
.lc-card.lc-horizontal .lc-specs {
    margin-bottom: 0.5rem;
}
.lc-card.lc-horizontal .lc-footer {
    margin-top: 0;
}
.lc-card.lc-horizontal:hover {
    transform: none;
}
@media (max-width: 640px) {
    .lc-card.lc-horizontal { flex-direction: column; height: 100%; }
    .lc-card.lc-horizontal .lc-img-wrap {
        width: 100%;
        min-width: unset;
        padding-top: 56%;
    }
}
`;

let _lcStyleInjected = false;
function useInjectCardStyles() {
    useEffect(() => {
        if (_lcStyleInjected) return;
        const el = document.createElement('style');
        el.id = 'lc-card-styles';
        el.textContent = CARD_CSS;
        document.head.appendChild(el);
        _lcStyleInjected = true;
    }, []);
}

export default function LuxuryListingCard({ property: p, horizontal = false }: LuxuryListingCardProps) {
    useInjectCardStyles();

    const router = useRouter();
    const { user } = useAuth();
    const [faved, setFaved] = useState(false);
    const [favoriteProcessing, setFavoriteProcessing] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const badge = getBadge(p);

    useEffect(() => {
        let cancelled = false;

        const resolveFavoriteState = async () => {
            if (!p?._id || !user || user.role === 'admin') {
                setFaved(false);
                return;
            }

            try {
                const response = await favoriteService.getFavoriteStatus(p._id);
                if (!cancelled) {
                    setFaved(Boolean(response.data?.isFavorite));
                }
            } catch {
                if (!cancelled) {
                    setFaved(false);
                }
            }
        };

        void resolveFavoriteState();
        return () => {
            cancelled = true;
        };
    }, [p?._id, user]);

    const emitFavoritesChanged = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('favorites:changed'));
        }
    };

    const handleToggleFavorite = async (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        if (!p?._id || favoriteProcessing) return;

        if (!user) {
            setShowLoginModal(true);
            return;
        }

        if (user.role === 'admin') return;

        try {
            setFavoriteProcessing(true);
            if (faved) {
                await favoriteService.removeFavorite(p._id);
                setFaved(false);
            } else {
                await favoriteService.addFavorite(p._id);
                setFaved(true);
            }
            emitFavoritesChanged();
        } catch (error) {
            console.error('Favorite toggle failed:', error);
        } finally {
            setFavoriteProcessing(false);
        }
    };

    const getImg = (img: any): string => {
        let url = '';
        if (typeof img === 'string') url = img;
        else if (img?.url) url = img.url;
        else if (img?.secure_url) url = img.secure_url;
        else {
            const si = (p as any).image;
            if (typeof si === 'string') url = si;
            else if (si?.url) url = si.url;
        }
        
        // Return optimized URL or fallback
        return url ? optimizeCloudinaryUrl(url, 600) : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=60';
    };

    // Remove the old optimizeCloudinaryUrl function as it's now imported from utils
    // const optimizeCloudinaryUrl = (url: string): string => { ... }

    const img = getImg(p.images?.[0]);
    const priceFormatted = p.price ? formatVNDShort(p.price) : '—';
    const typeLabel = TYPE_LABEL[p.type] ?? 'Bất Động Sản';
    const displayTitle = (p.title || '').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    return (
        <>
            <div
                className={`lc-card${horizontal ? ' lc-horizontal' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/properties/${p._id}`)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/properties/${p._id}`);
                    }
                }}
            >
                {/* Image */}
                <div className="lc-img-wrap">
                    <img 
                        className="lc-img" 
                        src={img} 
                        alt={p.title} 
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                    />
                    {badge && (
                        <span className={`lc-badge ${BADGE_CONFIG[badge].cls}`}>
                            {BADGE_CONFIG[badge].label}
                        </span>
                    )}
                    <button
                        type="button"
                        className={`lc-fav${faved ? ' is-faved' : ''}${favoriteProcessing ? ' is-loading' : ''}`}
                        onClick={(event) => void handleToggleFavorite(event)}
                        disabled={favoriteProcessing}
                        aria-label="Yêu thích"
                    >
                        <HeartIcon filled={faved} />
                    </button>
                </div>

                {/* Body */}
                <div className="lc-body">
                    <div className="lc-type">{typeLabel}</div>
                    <h3 className="lc-name">{displayTitle}</h3>
                    <div className="lc-addr">
                        <PinIcon />
                        {shortenAddress(p.address)}
                    </div>
                    {(p.area != null || p.bedrooms != null || p.bathrooms != null) && (
                        <div className="lc-specs">
                            {p.area != null && <div className="lc-spec"><AreaIcon /> {p.area} m²</div>}
                            {p.bedrooms != null && <div className="lc-spec"><BedIcon /> {p.bedrooms} PN</div>}
                            {p.bathrooms != null && <div className="lc-spec"><BathIcon /> {p.bathrooms} WC</div>}
                        </div>
                    )}
                    <div className="lc-footer">
                        <div className="lc-price-wrap">
                            <span className="lc-price-label">Giá</span>
                            <span className="lc-price">{priceFormatted}</span>
                        </div>
                        <Link
                            href={`/properties/${p._id}`}
                            className="lc-cta"
                            onClick={e => e.stopPropagation()}
                        >
                            Chi tiết <ArrowIcon />
                        </Link>
                    </div>
                </div>
            </div>

            {showLoginModal && (
                <LuxuryLoginModal onClose={() => setShowLoginModal(false)} />
            )}
        </>
    );
}

/* Icons */
function HeartIcon({ filled }: { filled: boolean }) {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24"
            stroke={filled ? '#e5c97a' : 'rgba(255,255,255,0.75)'}
            fill={filled ? '#e5c97a' : 'none'} strokeWidth={1.6}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
    );
}
function PinIcon() {
    return (
        <svg width={11} height={11} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.6}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
        </svg>
    );
}
function AreaIcon() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5}>
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <path d="M3 9h18M9 3v18" />
        </svg>
    );
}
function BedIcon() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5}>
            <path d="M3 7v10M3 12h18M21 7v10M7 12V8a2 2 0 014 0v4M13 12V8a2 2 0 014 0v4" />
        </svg>
    );
}
function BathIcon() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5}>
            <path d="M4 12h16v4a4 4 0 01-4 4H8a4 4 0 01-4-4v-4z" />
            <path d="M6 12V5a2 2 0 012-2h1" />
            <circle cx="9" cy="3" r="0.5" fill="var(--e-gold)" />
        </svg>
    );
}
function ArrowIcon() {
    return (
        <svg width={12} height={12} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}>
            <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
    );
}
