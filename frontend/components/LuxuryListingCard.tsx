import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { Property } from '@/types/property';

interface LuxuryListingCardProps {
    property: Property;
}

// ─── Map type enum → label tiếng Việt ────────────────────────
const TYPE_LABEL = {
    apartment: 'Căn Hộ',
    house: 'Nhà Phố',
    villa: 'Biệt Thự',
    studio: 'Studio',
    office: 'Văn Phòng',
};

type BadgeKey = 'new' | 'hot' | 'vip';
const BADGE_MAP: Record<BadgeKey, { cls: string; label: string }> = {
    new: { cls: 'e-badge-new', label: 'Mới' },
    hot: { cls: 'e-badge-hot', label: 'Hot' },
    vip: { cls: 'e-badge-vip', label: '✦ VIP' },
};

function getBadge(p: Property): BadgeKey | null {
    if ((p as any).featured) return 'vip';
    const daysSince = Math.floor(
        (Date.now() - new Date(p.createdAt ?? Date.now()).getTime()) / 86_400_000
    );
    if (daysSince <= 3) return 'new';
    if ((p as any).viewCount > 500) return 'hot';
    return null;
}

function shortenAddress(address?: string, maxParts: number = 3) {
    if (!address) return '—';
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= maxParts) return parts.join(', ');
    return `${parts.slice(0, maxParts).join(', ')}…`;
}

export default function LuxuryListingCard({ property: p }: LuxuryListingCardProps) {
    const router = useRouter();
    const [faved, setFaved] = useState(false);
    const badge = getBadge(p);

    const getImgSource = (img: any, p: any) => {
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object' && (img.url || img.secure_url)) return img.url || img.secure_url;
        
        // Fallback to p.image if available
        const singleImg = p.image;
        if (typeof singleImg === 'string') return singleImg;
        if (singleImg && typeof singleImg === 'object' && (singleImg.url || singleImg.secure_url)) return singleImg.url || singleImg.secure_url;
        
        return 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80';
    };

    const img = getImgSource(p.images?.[0], p);

    const priceFormatted = p.price
        ? p.price.toLocaleString('vi-VN') + ' ₫'
        : '—';

    const handleCardClick = () => {
        router.push(`/properties/${p._id}`);
    };

    return (
        <div
            className="e-listing-card"
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleCardClick();
                }
            }}
        >
            {/* Image */}
            <div className="e-listing-img-wrap">
                <img className="e-listing-img" src={img} alt={p.title} loading="lazy" />

                {badge && (
                    <span className={`e-badge ${BADGE_MAP[badge].cls}`} style={{ top: 12, left: 12, position: 'absolute' }}>
                        {BADGE_MAP[badge].label}
                    </span>
                )}

                <button
                    className="e-listing-fav"
                    onClick={(event) => {
                        event.stopPropagation();
                        setFaved((v) => !v);
                    }}
                    aria-label="Yêu thích"
                >
                    <HeartIcon filled={faved} />
                </button>
            </div>

            {/* Body */}
            <div className="e-listing-body">
                {/* ─── Type label ── */}
                <div className="e-listing-type">
                    {TYPE_LABEL[p.type as keyof typeof TYPE_LABEL] ?? 'Bất Động Sản'}
                </div>

                <div className="e-listing-name">{p.title}</div>

                {/* ─── Address — đọc đúng từ p.address ── */}
                <div className="e-listing-addr">
                    <PinIcon />
                    {shortenAddress(p.address)}
                </div>

                <div className="e-listing-specs">
                    {p.area != null && (
                        <div className="e-spec">
                            <AreaIcon /> {p.area} m²
                        </div>
                    )}
                    {p.bedrooms != null && (
                        <div className="e-spec">
                            <BedIcon /> {p.bedrooms} PN
                        </div>
                    )}
                    {p.bathrooms != null && (
                        <div className="e-spec">
                            <BathIcon /> {p.bathrooms} WC
                        </div>
                    )}
                </div>

                <div className="e-listing-footer">
                    <div className="e-listing-price">
                        {priceFormatted}
                        <small>/ tháng</small>
                    </div>
                    <Link
                        href={`/properties/${p._id}`}
                        className="e-listing-detail-btn"
                        onClick={(event) => event.stopPropagation()}
                    >
                        Chi tiết
                        <ArrowSmIcon />
                    </Link>
                </div>
            </div>
        </div>
    );
}

/* ——— Inline SVG Icons ——— */
function HeartIcon({ filled }: { filled: boolean }) {
    return (
        <svg width={15} height={15} viewBox="0 0 24 24" stroke={filled ? '#B49A6E' : '#9C9590'} fill={filled ? '#B49A6E' : 'none'} strokeWidth={1.5}>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
    );
}
function PinIcon() {
    return (
        <svg width={11} height={11} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        </svg>
    );
}
function AreaIcon() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="#C8B89A" fill="none" strokeWidth={1.5}>
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    );
}
function BedIcon() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="#C8B89A" fill="none" strokeWidth={1.5}>
            <path d="M2 4a2 2 0 012-2h16a2 2 0 012 2v16H2z" />
            <path d="M8 21V10M16 21V10M2 10h20" />
        </svg>
    );
}
function BathIcon() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="#C8B89A" fill="none" strokeWidth={1.5}>
            <path d="M5 3v16M5 19h14M19 19V8M19 8H9M9 8V3" />
        </svg>
    );
}
function ArrowSmIcon() {
    return (
        <svg width={12} height={12} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}>
            <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
    );
}
