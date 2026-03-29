import Link from 'next/link';
import type { Property, PropertyType } from '@/types/property';
import { formatVNDShort } from '@/utils/formatPrice';
import { optimizeCloudinaryUrl } from '@/utils/imageOptimization';

interface FeaturedSectionProps {
    properties: Property[];
}

type BadgeType = 'new' | 'hot' | 'vip' | '';

interface FeaturedItem {
    name: string;
    type: string;
    location: string;
    price: string;
    img: string;
    badge: BadgeType;
    id?: string;
    area?: string;
    lot: string;
}

const TYPE_LABEL: Record<PropertyType, string> = {
    apartment: 'Căn Hộ Cao Cấp',
    house: 'Nhà Phố',
    villa: 'Biệt Thự',
    studio: 'Studio',
    office: 'Văn Phòng',
};

const FALLBACK: FeaturedItem[] = [
    {
        lot: 'LOT 001',
        name: 'Villa Lumière',
        type: 'Biệt Thự',
        location: 'Thủ Đức, TP.HCM',
        price: '85 tỷ',
        img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=85',
        badge: 'vip',
        area: '420 m²',
    },
    {
        lot: 'LOT 002',
        name: 'The Riviera Sky',
        type: 'Căn Hộ Cao Cấp',
        location: 'Quận 2, TP.HCM',
        price: '32 tỷ',
        img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=85',
        badge: 'new',
        area: '148 m²',
    },
    {
        lot: 'LOT 003',
        name: 'Maison Indochine',
        type: 'Nhà Phố Thiết Kế',
        location: 'Quận 7, TP.HCM',
        price: '45 tỷ',
        img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&q=85',
        badge: 'hot',
        area: '210 m²',
    },
];

const BADGE_CONFIG = {
    vip: { label: '✦ VIP', cls: 'ah-badge--vip' },
    new: { label: 'Mới', cls: 'ah-badge--new' },
    hot: { label: 'Hot', cls: 'ah-badge--hot' },
    '': { label: '', cls: '' },
};

function shortenAddress(address?: string, maxParts = 3) {
    if (!address) return '—';
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    return parts.slice(0, maxParts).join(', ');
}

function toItem(p: Property, i: number): FeaturedItem {
    const getImg = (img: any) => {
        let url = '';
        if (typeof img === 'string') url = img;
        else if (img?.url) url = img.url;
        else if (img?.secure_url) url = img.secure_url;
        
        if (url) return optimizeCloudinaryUrl(url, 600);
        return FALLBACK[i]?.img ?? '';
    };
    return {
        id: p._id,
        lot: `LOT 00${i + 1}`,
        name: (p.title || '').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        type: TYPE_LABEL[p.type] ?? p.type,
        location: shortenAddress(p.address),
        price: formatVNDShort(p.price),
        img: getImg(p.images?.[0]),
        badge: i === 0 ? 'vip' : i === 1 ? 'new' : 'hot',
        area: FALLBACK[i]?.area,
    };
}

export default function FeaturedSection({ properties }: FeaturedSectionProps) {
    const items = properties.length >= 3
        ? properties.slice(0, 3).map(toItem)
        : FALLBACK;

    const [hero, card2, card3] = items;
    const heroHref = hero?.id ? `/properties/${hero.id}` : '#listings';
    const card2Href = card2?.id ? `/properties/${card2.id}` : '#listings';
    const card3Href = card3?.id ? `/properties/${card3.id}` : '#listings';

    return (
        <>
            <style>{`
                /* ════════════════════════════════════════════
                   FEATURED v4 — Auction House Catalog
                   Sotheby's / Christie's aesthetic
                   3-card horizontal: hero 55% | stack 45%
                ════════════════════════════════════════════ */

                .ah-root {
                    background: #ffffff;
                    padding: clamp(3.5rem, 6vw, 7rem) clamp(1.5rem, 5vw, 5rem);
                    position: relative;
                    font-family: var(--e-sans);
                }

                /* Subtle grain */
                .ah-root::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
                    pointer-events: none;
                    z-index: 0;
                }

                /* ── Section header ── */
                .ah-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    margin-bottom: clamp(2rem, 3.5vw, 3.5rem);
                    position: relative;
                    z-index: 1;
                    padding-bottom: 1.4rem;
                    border-bottom: 1px solid rgba(37,45,54,0.1);
                }

                .ah-header-left { display: flex; flex-direction: column; gap: 0.5rem; }

                .ah-eyebrow {
                    display: flex;
                    align-items: center;
                    gap: 0.7rem;
                    font-size: 0.68rem;
                    font-weight: 600;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--e-gold, #D4AF37);
                }
                .ah-eyebrow-line { width: 28px; height: 1px; background: var(--e-gold, #D4AF37); }

                .ah-title {
                    font-family: var(--e-serif);
                    font-size: clamp(2rem, 4vw, 3.2rem);
                    font-weight: 400;
                    color: var(--e-charcoal, #252D36);
                    letter-spacing: -0.025em;
                    line-height: 1.08;
                    margin: 0;
                }
                .ah-title em { font-style: italic; color: var(--e-gold, #D4AF37); }

                /* Header right: lot count + view all */
                .ah-header-right {
                    display: flex;
                    align-items: center;
                    gap: 1.2rem;
                    align-self: flex-end;
                }
                .ah-lot-count {
                    font-family: var(--e-serif);
                    font-size: 0.78rem;
                    font-style: italic;
                    color: rgba(37,45,54,0.35);
                    white-space: nowrap;
                }
                .ah-view-all {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--e-charcoal, #252D36);
                    text-decoration: none;
                    padding: 10px 22px;
                    border: 1px solid rgba(37,45,54,0.2);
                    transition: background 0.25s, color 0.25s, gap 0.25s;
                    white-space: nowrap;
                }
                .ah-view-all:hover {
                    background: var(--e-charcoal, #252D36);
                    color: #fff;
                    gap: 13px;
                }
                .ah-view-all svg { transition: transform 0.3s; }
                .ah-view-all:hover svg { transform: translateX(3px); }

                /* ════════════════════════════════════════
                   CARD GRID: hero left | two stacked right
                ════════════════════════════════════════ */
                .ah-grid {
                    display: grid;
                    grid-template-columns: 1.22fr 1fr;
                    grid-template-rows: auto;
                    gap: 5px;
                    position: relative;
                    z-index: 1;
                    /* Fixed height for consistent proportion */
                    height: 660px;
                }

                .ah-grid-right {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                /* ── Shared card base ── */
                .ah-card {
                    position: relative;
                    overflow: hidden;
                    display: block;
                    text-decoration: none;
                    background: var(--e-charcoal, #252D36);
                    flex: 1;
                }

                /* Gold top shimmer on hover */
                .ah-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, var(--e-gold, #D4AF37), rgba(212,175,55,0.3), transparent);
                    transform: scaleX(0);
                    transform-origin: left;
                    transition: transform 0.55s cubic-bezier(0.22,1,0.36,1);
                    z-index: 10;
                }
                .ah-card:hover::before { transform: scaleX(1); }

                /* ── Image ── */
                .ah-img {
                    position: absolute;
                    inset: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    display: block;
                    transition:
                        transform 1.1s cubic-bezier(0.25,0.46,0.45,0.94),
                        filter 0.65s ease;
                    filter: brightness(0.62) saturate(0.78);
                }
                .ah-card:hover .ah-img {
                    transform: scale(1.06);
                    filter: brightness(0.38) saturate(0.82);
                }

                /* ── Lot number — the signature element ── */
                /*
                   Runs VERTICALLY along the LEFT edge of each card.
                   Outlined only, huge, acts as a decorative column marker.
                */
                .ah-lot-num {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    z-index: 3;
                    display: flex;
                    align-items: flex-end;
                    padding: 1.5rem 0 1.5rem 1.2rem;
                    writing-mode: vertical-rl;
                    text-orientation: mixed;
                    transform: rotate(180deg);
                    pointer-events: none;
                    user-select: none;
                }
                .ah-lot-num-text {
                    font-family: var(--e-serif);
                    font-size: 0.6rem;
                    font-weight: 700;
                    letter-spacing: 0.3em;
                    text-transform: uppercase;
                    color: rgba(212,175,55,0.55);
                    white-space: nowrap;
                    transition: color 0.35s;
                }
                .ah-card:hover .ah-lot-num-text { color: rgba(212,175,55,0.9); }

                /* Gold left border bar */
                .ah-lot-bar {
                    position: absolute;
                    left: 0; top: 0; bottom: 0;
                    width: 2px;
                    background: linear-gradient(to bottom,
                        transparent 0%,
                        rgba(212,175,55,0.6) 20%,
                        rgba(212,175,55,0.6) 80%,
                        transparent 100%
                    );
                    z-index: 4;
                    opacity: 0;
                    transition: opacity 0.4s;
                }
                .ah-card:hover .ah-lot-bar { opacity: 1; }

                /* ── Badge ── */
                .ah-badge {
                    position: absolute;
                    top: 1.2rem;
                    right: 1.2rem;
                    z-index: 5;
                    font-size: 0.54rem;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    padding: 5px 12px;
                    border-radius: 2px;
                    backdrop-filter: blur(10px);
                    transition: transform 0.3s;
                }
                .ah-card:hover .ah-badge { transform: scale(0.94); }
                .ah-badge--vip { background: rgba(212,175,55,0.2); color: #e5c97a; border: 1px solid rgba(212,175,55,0.55); }
                .ah-badge--new { background: rgba(120,180,110,0.15); color: #a8c8a0; border: 1px solid rgba(120,180,110,0.5); }
                .ah-badge--hot { background: rgba(220,110,60,0.15); color: #e8a080; border: 1px solid rgba(220,110,60,0.45); }

                /* ── Info panel (bottom overlay) ── */
                .ah-info {
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    z-index: 3;
                    padding: 2rem 1.8rem 1.8rem 2.8rem; /* extra left for lot bar */
                    background: linear-gradient(
                        to top,
                        rgba(10,9,8,0.97) 0%,
                        rgba(10,9,8,0.75) 45%,
                        rgba(10,9,8,0.15) 75%,
                        transparent 100%
                    );
                }

                /* Hero card info — more space */
                .ah-card-hero .ah-info {
                    padding: 3rem 2.5rem 2.5rem 3.2rem;
                }

                .ah-info-type {
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--e-gold, #D4AF37);
                    margin-bottom: 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .ah-info-type::before {
                    content: '';
                    display: inline-block;
                    width: 16px; height: 1px;
                    background: var(--e-gold, #D4AF37);
                }

                .ah-info-name {
                    font-family: var(--e-serif);
                    font-weight: 400;
                    color: #fff;
                    line-height: 1.1;
                    letter-spacing: -0.015em;
                    margin: 0 0 0.6rem;
                    transition: color 0.25s;
                    text-transform: capitalize;
                    font-size: clamp(1.15rem, 2vw, 1.55rem);
                }
                .ah-card-hero .ah-info-name {
                    font-size: clamp(1.8rem, 3.2vw, 2.8rem);
                    margin-bottom: 0.8rem;
                }
                .ah-card:hover .ah-info-name { color: rgba(255,255,255,0.85); }

                /* Hero quote */
                .ah-quote {
                    font-family: var(--e-serif);
                    font-size: 0.88rem;
                    font-style: italic;
                    color: rgba(255,255,255,0.28);
                    margin-bottom: 1.4rem;
                    line-height: 1.55;
                }

                /* Location */
                .ah-info-loc {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.68rem;
                    font-weight: 500;
                    letter-spacing: 0.08em;
                    color: rgba(255,255,255,0.42);
                    margin-bottom: 1.1rem;
                }
                .ah-info-loc svg { flex-shrink: 0; opacity: 0.6; }

                /* Specs — hero only */
                .ah-specs {
                    display: flex;
                    gap: 1.5rem;
                    margin-bottom: 1.4rem;
                }
                .ah-spec {
                    display: flex;
                    flex-direction: column;
                    gap: 0.2rem;
                    padding-right: 1.5rem;
                    border-right: 1px solid rgba(255,255,255,0.07);
                }
                .ah-spec:last-child { border-right: none; padding-right: 0; }
                .ah-spec-lbl {
                    font-size: 0.55rem;
                    font-weight: 700;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.28);
                }
                .ah-spec-val {
                    font-family: var(--e-serif);
                    font-size: 1rem;
                    color: rgba(255,255,255,0.8);
                }

                /* Divider */
                .ah-divider {
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(212,175,55,0.3), transparent);
                    margin-bottom: 1.1rem;
                }

                /* Footer row */
                .ah-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                }

                .ah-price-wrap { display: flex; flex-direction: column; gap: 0.15rem; }
                .ah-price-lbl {
                    font-size: 0.58rem;
                    font-weight: 700;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.3);
                }
                .ah-price {
                    font-family: var(--e-serif);
                    font-style: italic;
                    color: #ffffff;
                    font-size: 1.25rem;
                    line-height: 1;
                    text-shadow: 0 2px 12px rgba(0,0,0,0.5);
                }
                .ah-card-hero .ah-price { font-size: 1.9rem; }

                .ah-arrow {
                    width: 38px; height: 38px;
                    border-radius: 50%;
                    border: 1px solid rgba(255,255,255,0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(255,255,255,0.38);
                    flex-shrink: 0;
                    transition: background 0.3s, border-color 0.3s, color 0.3s, transform 0.4s;
                }
                .ah-card:hover .ah-arrow {
                    background: var(--e-gold, #D4AF37);
                    border-color: var(--e-gold, #D4AF37);
                    color: var(--e-charcoal, #252D36);
                    transform: rotate(-45deg);
                }

                /* Entrance */
                @keyframes ahFadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .ah-header { animation: ahFadeUp 0.65s cubic-bezier(0.22,1,0.36,1) both; }
                .ah-grid   { animation: ahFadeUp 0.7s  cubic-bezier(0.22,1,0.36,1) 0.1s both; }

                /* Responsive */
                @media (max-width: 900px) {
                    .ah-grid {
                        grid-template-columns: 1fr;
                        height: auto;
                    }
                    .ah-grid-right { flex-direction: row; }
                    .ah-card-hero { min-height: 480px; }
                    .ah-grid-right .ah-card { min-height: 280px; }
                }
                @media (max-width: 560px) {
                    .ah-grid-right { flex-direction: column; }
                    .ah-grid-right .ah-card { min-height: 240px; }
                    .ah-header { flex-direction: column; align-items: flex-start; gap: 1.2rem; }
                }
            `}</style>

            <section className="ah-root" id="featured">

                {/* ── Header ── */}
                <div className="ah-header">
                    <div className="ah-header-left">
                        <span className="ah-eyebrow">
                            <span className="ah-eyebrow-line" />
                            Chọn Lọc Tinh Hoa
                        </span>
                        <h2 className="ah-title">Bất Động Sản <em>Nổi Bật</em></h2>
                    </div>
                    <div className="ah-header-right">
                        <span className="ah-lot-count">3 bất động sản tuyển chọn</span>
                        <a href="#listings" className="ah-view-all">
                            Xem tất cả
                            <svg width={12} height={12} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}>
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* ════ CARD GRID ════ */}
                <div className="ah-grid">

                    {/* ── HERO CARD ── */}
                    <Link href={heroHref} className="ah-card ah-card-hero">
                        <img className="ah-img" src={hero.img} alt={hero.name} loading="lazy" decoding="async" fetchPriority="low" />

                        {/* Lot bar + number */}
                        <div className="ah-lot-bar" />
                        <div className="ah-lot-num">
                            <span className="ah-lot-num-text">{hero.lot}</span>
                        </div>

                        {hero.badge && BADGE_CONFIG[hero.badge].label && (
                            <span className={`ah-badge ${BADGE_CONFIG[hero.badge].cls}`}>
                                {BADGE_CONFIG[hero.badge].label}
                            </span>
                        )}

                        <div className="ah-info">
                            <span className="ah-info-type">{hero.type}</span>
                            <h3 className="ah-info-name">{hero.name}</h3>
                            <p className="ah-quote">"Không gian sống được kiến tạo để tôn vinh sự đẳng cấp."</p>

                            {/* Specs */}
                            <div className="ah-specs">
                                <div className="ah-spec">
                                    <span className="ah-spec-lbl">Diện tích</span>
                                    <span className="ah-spec-val">{hero.area ?? '—'}</span>
                                </div>
                                <div className="ah-spec">
                                    <span className="ah-spec-lbl">Vị trí</span>
                                    <span className="ah-spec-val" style={{ fontSize: '0.85rem' }}>{hero.location}</span>
                                </div>
                                <div className="ah-spec">
                                    <span className="ah-spec-lbl">Tình trạng</span>
                                    <span className="ah-spec-val">Sẵn sàng</span>
                                </div>
                            </div>

                            <div className="ah-divider" />
                            <div className="ah-footer">
                                <div className="ah-price-wrap">
                                    <span className="ah-price-lbl">Giá bán</span>
                                    <span className="ah-price">{hero.price}</span>
                                </div>
                                <span className="ah-arrow">
                                    <svg width={13} height={13} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}>
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </Link>

                    {/* ── RIGHT STACK ── */}
                    <div className="ah-grid-right">
                        {[card2, card3].map((card, i) => {
                            const href = card?.id ? `/properties/${card.id}` : '#listings';
                            return (
                                <Link key={i} href={href} className="ah-card">
                                    <img className="ah-img" src={card.img} alt={card.name} loading="lazy" decoding="async" fetchPriority="low" />
                                    <div className="ah-lot-bar" />
                                    <div className="ah-lot-num">
                                        <span className="ah-lot-num-text">{card.lot}</span>
                                    </div>
                                    {card.badge && BADGE_CONFIG[card.badge].label && (
                                        <span className={`ah-badge ${BADGE_CONFIG[card.badge].cls}`}>
                                            {BADGE_CONFIG[card.badge].label}
                                        </span>
                                    )}
                                    <div className="ah-info">
                                        <span className="ah-info-type">{card.type}</span>
                                        <h3 className="ah-info-name">{card.name}</h3>
                                        <div className="ah-info-loc">
                                            <svg width={10} height={10} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}>
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                            </svg>
                                            {card.location}
                                        </div>
                                        <div className="ah-divider" />
                                        <div className="ah-footer">
                                            <div className="ah-price-wrap">
                                                <span className="ah-price-lbl">Giá bán</span>
                                                <span className="ah-price">{card.price}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                {card.area && (
                                                    <span style={{
                                                        fontSize: '0.6rem', fontWeight: 700,
                                                        letterSpacing: '0.1em', textTransform: 'uppercase',
                                                        color: 'rgba(255,255,255,0.45)',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        padding: '4px 10px',
                                                        backdropFilter: 'blur(8px)',
                                                    }}>{card.area}</span>
                                                )}
                                                <span className="ah-arrow">
                                                    <svg width={13} height={13} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8}>
                                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>
        </>
    );
}
