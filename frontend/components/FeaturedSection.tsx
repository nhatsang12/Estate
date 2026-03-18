import Link from 'next/link';
import type { Property, PropertyType } from '@/types/property';

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
    main?: boolean;
    id?: string;
}

const TYPE_LABEL: Record<PropertyType, string> = {
    apartment: 'Căn Hộ Cao Cấp',
    house: 'Nhà Phố',
    villa: 'Biệt Thự',
    studio: 'Studio',
    office: 'Văn Phòng',
};

const BADGE_MAP: Record<BadgeType, { cls: string; label: string }> = {
    new: { cls: 'e-badge-new', label: 'Mới' },
    hot: { cls: 'e-badge-hot', label: 'Hot' },
    vip: { cls: 'e-badge-vip', label: '✦ VIP' },
    '': { cls: '', label: '' },
};

const FEATURED_FALLBACK: FeaturedItem[] = [
    {
        name: 'Villa Lumière',
        type: 'Biệt Thự',
        location: 'Thủ Đức, TP.HCM',
        price: '85.000.000 ₫/tháng',
        img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80',
        badge: 'vip',
        main: true,
    },
    {
        name: 'The Riviera Sky',
        type: 'Căn Hộ Cao Cấp',
        location: 'Quận 2, TP.HCM',
        price: '32.000.000 ₫/tháng',
        img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80',
        badge: 'new',
    },
    {
        name: 'Maison Indochine',
        type: 'Nhà Phố Thiết Kế',
        location: 'Quận 7, TP.HCM',
        price: '45.000.000 ₫/tháng',
        img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=700&q=80',
        badge: 'hot',
    },
];

function shortenAddress(address?: string, maxParts: number = 3) {
    if (!address) return '—';
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= maxParts) return parts.join(', ');
    return `${parts.slice(0, maxParts).join(', ')}…`;
}

function toFeaturedItem(p: Property, index: number): FeaturedItem {
    const getImgSource = (img: any) => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object' && img.url) return img.url;
        if (img && typeof img === 'object' && img.secure_url) return img.secure_url;
        return FEATURED_FALLBACK[index]?.img ?? 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=75';
    };

    return {
        id: p._id,
        name: p.title,
        type: TYPE_LABEL[p.type] ?? p.type,
        location: shortenAddress(p.address),
        price: `${p.price.toLocaleString('vi-VN')} ₫/tháng`,
        img: getImgSource(p.images?.[0]),
        badge: index === 0 ? 'vip' : index === 1 ? 'new' : 'hot',
        main: index === 0,
    };
}

export default function FeaturedSection({ properties }: FeaturedSectionProps) {
    const items: FeaturedItem[] =
        properties.length >= 3
            ? properties.slice(0, 3).map(toFeaturedItem)
            : FEATURED_FALLBACK;

    const [main, ...secondary] = items;
    const mainHref = main.id ? `/properties/${main.id}` : '#listings';

    return (
        <section className="e-featured e-section" id="featured">
            {/* ── Header row ── */}
            <div className="e-featured-header e-reveal">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem' }}>
                    {/* Big section number */}
                    <span style={{
                        fontFamily: 'var(--e-serif)',
                        fontSize: 'clamp(4rem, 7vw, 7rem)',
                        fontWeight: 200,
                        color: 'var(--e-beige)',
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                        userSelect: 'none',
                    }}>02</span>
                    <div>
                        <div className="e-section-label">Chọn Lọc</div>
                        <h2 className="e-section-title">
                            Bất Động Sản <em>Nổi Bật</em>
                        </h2>
                    </div>
                </div>
                <a href="#listings" className="e-view-all">
                    Xem tất cả <ArrowIcon />
                </a>
            </div>

            {/* ── New asymmetric layout: left big + right stacked ── */}
            <div className="e-reveal" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 380px',
                gridTemplateRows: 'auto auto',
                gap: '3px',
                background: 'var(--e-charcoal)',
            }}>

                {/* Main card — tall left, spans 2 rows */}
                <Link
                    href={mainHref}
                    className="e-featured-card e-featured-card-main"
                    style={{ gridRow: 'span 2', minHeight: '600px', display: 'block' }}
                >
                    {main.badge && BADGE_MAP[main.badge].label && (
                        <span className={`e-badge ${BADGE_MAP[main.badge].cls}`}>
                            {BADGE_MAP[main.badge].label}
                        </span>
                    )}
                    <img className="e-featured-img" src={main.img} alt={main.name}
                        style={{ height: '100%', minHeight: '600px' }} />

                    <div className="e-featured-info" style={{ padding: '2.5rem' }}>
                        {/* Pull quote style */}
                        <div style={{
                            fontFamily: 'var(--e-serif)',
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                            color: 'rgba(255,255,255,0.35)',
                            marginBottom: '1rem',
                            letterSpacing: '0.02em',
                        }}>
                            "Không gian sống đẳng cấp"
                        </div>
                        <div className="e-featured-type">
                            {main.type} · {main.location}
                        </div>
                        <div className="e-featured-name" style={{ fontSize: '2.2rem' }}>{main.name}</div>
                        {/* Price with label */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <div className="e-featured-price" style={{ fontSize: '1.6rem' }}>{main.price}</div>
                        </div>
                        {/* CTA */}
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '1.4rem',
                            fontFamily: 'var(--e-sans)',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'var(--e-white)',
                            textDecoration: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.35)',
                            paddingBottom: '3px',
                            transition: 'border-color 0.2s, letter-spacing 0.3s',
                        }}>
                            Xem chi tiết <ArrowIcon />
                        </span>
                    </div>
                </Link>

                {/* Secondary cards — stacked right */}
                {secondary.map((item, i) => {
                    const href = item.id ? `/properties/${item.id}` : '#listings';
                    return (
                    <Link key={i} href={href} className="e-featured-card" style={{ height: '350px', display: 'block' }}>
                        {item.badge && BADGE_MAP[item.badge].label && (
                            <span className={`e-badge ${BADGE_MAP[item.badge].cls}`}>
                                {BADGE_MAP[item.badge].label}
                            </span>
                        )}
                        <img className="e-featured-img" src={item.img} alt={item.name}
                            style={{ height: '100%' }} />
                        <div className="e-featured-info">
                            {/* Card number */}
                            <div style={{
                                fontFamily: 'var(--e-serif)',
                                fontSize: '2rem',
                                fontWeight: 200,
                                color: 'rgba(255,255,255,0.12)',
                                lineHeight: 1,
                                marginBottom: '0.5rem',
                            }}>
                                0{i + 2}
                            </div>
                            <div className="e-featured-type">{item.type} · {item.location}</div>
                            <div className="e-featured-name">{item.name}</div>
                            <div className="e-featured-price">{item.price}</div>
                        </div>
                    </Link>
                )})}
            </div>
        </section>
    );
}

function ArrowIcon() {
    return (
        <svg width={14} height={14} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5}>
            <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
    );
}
