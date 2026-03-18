import { useState, useRef, useEffect } from 'react';
import {
    Search, MapPin, CircleDollarSign, Maximize2,
    Sparkles, ChevronDown, Bed, Bath, LayoutGrid, SlidersHorizontal,
} from 'lucide-react';

const TABS = ['Cho Thuê', 'Mua Bán', 'Dự Án Mới', 'Thương Mại'] as const;
type Tab = (typeof TABS)[number];

interface SearchSectionProps {
    onSearch?: (params: SearchParams) => void;
    loading?: boolean;
}

export interface SearchParams {
    tab: Tab;
    location: string;
    type: string;
    price: string;
    area: string;
    bedrooms: string;
    bathrooms: string;
}

const PROPERTY_TYPE_OPTIONS: { label: string; value: string }[] = [
    { label: 'Căn hộ / Penthouse', value: 'Apartment' },
    { label: 'Biệt thự', value: 'Villa' },
    { label: 'Nhà phố', value: 'House' },
    { label: 'Đất nền', value: 'Land' },
    { label: 'Shophouse / VP', value: 'Shophouse' },
];

const PRICE_OPTIONS = ['Dưới 2 tỷ', '2 - 5 tỷ', '5 - 10 tỷ', '10 - 20 tỷ', 'Trên 20 tỷ'];
const AREA_OPTIONS = ['Dưới 50m²', '50 - 100m²', '100 - 200m²', 'Trên 200m²'];
const BEDROOM_OPTIONS = ['1 Phòng ngủ', '2 Phòng ngủ', '3 Phòng ngủ', '4+ Phòng ngủ'];
const BATHROOM_OPTIONS = ['1 Phòng tắm', '2 Phòng tắm', '3 Phòng tắm', '4+ Phòng tắm'];

/* ── Divider ─────────────────────────────────────────────── */
function Divider() {
    return (
        <div style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'var(--e-beige)',
            flexShrink: 0,
            display: 'none',
        }} className="lg-divider" />
    );
}

/* ── FilterCell ──────────────────────────────────────────── */
function FilterCell({
    label, value, placeholder, options, onChange, icon: Icon,
}: {
    label: string;
    value: string;
    placeholder: string;
    options: ({ label: string; value: string } | string)[];
    onChange: (val: string) => void;
    icon: React.ElementType;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function outside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        }
        document.addEventListener('mousedown', outside);
        return () => document.removeEventListener('mousedown', outside);
    }, []);

    const normalised = options.map((o) =>
        typeof o === 'string' ? { label: o, value: o } : o
    );
    const activeLabel = normalised.find((o) => o.value === value)?.label ?? '';

    return (
        <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <button
                onClick={() => setIsOpen((v) => !v)}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '1rem 1.25rem',
                    background: isOpen ? 'rgba(140,110,63,0.04)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.2s',
                    fontFamily: 'var(--e-sans)',
                }}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--e-cream)'; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent'; }}
            >
                <Icon
                    size={15}
                    style={{ flexShrink: 0, color: isOpen ? 'var(--e-gold)' : 'var(--e-light-muted)' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                        fontSize: '0.58rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: 'var(--e-light-muted)',
                        marginBottom: 3,
                        fontFamily: 'var(--e-sans)',
                    }}>
                        {label}
                    </div>
                    <div style={{
                        fontSize: '0.85rem',
                        fontWeight: activeLabel ? 500 : 400,
                        color: activeLabel ? 'var(--e-charcoal)' : 'var(--e-sand)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--e-sans)',
                    }}>
                        {activeLabel || placeholder}
                    </div>
                </div>
                <ChevronDown
                    size={12}
                    style={{
                        flexShrink: 0,
                        transition: 'transform 0.2s',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        color: isOpen ? 'var(--e-gold)' : 'var(--e-sand)',
                    }}
                />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    minWidth: 200,
                    background: 'var(--e-white)',
                    border: '1px solid var(--e-beige)',
                    boxShadow: '0 12px 40px rgba(17,28,20,0.12)',
                    zIndex: 50,
                    padding: '6px 0',
                }}>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {/* Reset */}
                        <div
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            style={{
                                padding: '8px 20px',
                                fontSize: '0.8rem',
                                color: value === '' ? 'var(--e-gold)' : 'var(--e-light-muted)',
                                cursor: 'pointer',
                                fontFamily: 'var(--e-sans)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--e-cream)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            Tất cả
                        </div>
                        {normalised.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                style={{
                                    padding: '8px 20px',
                                    fontSize: '0.85rem',
                                    fontWeight: value === opt.value ? 600 : 400,
                                    color: value === opt.value ? 'var(--e-gold)' : 'var(--e-muted)',
                                    background: value === opt.value ? 'rgba(140,110,63,0.06)' : 'transparent',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--e-sans)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = 'var(--e-cream)'; }}
                                onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── Main ────────────────────────────────────────────────── */
export default function SearchSection({ onSearch, loading }: SearchSectionProps) {
    const [activeTab, setActiveTab] = useState<Tab>('Mua Bán');
    const [location, setLocation] = useState('');
    const [type, setType] = useState('');
    const [price, setPrice] = useState('');
    const [area, setArea] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [bathrooms, setBathrooms] = useState('');
    const [isAdvanced, setIsAdvanced] = useState(false);

    function handleSearch() {
        onSearch?.({ tab: activeTab, location, type, price, area, bedrooms, bathrooms });
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') handleSearch();
    }

    return (
        <section className="e-search" id="search">

            {/* ── Tabs — dùng e-filter-tabs style ── */}
            <div className="e-filter-tabs" style={{ marginBottom: '1.5rem', width: 'fit-content', border: '1px solid var(--e-beige)' }}>
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`e-filter-tab${activeTab === tab ? ' active' : ''}`}
                        style={{ flex: 'none', padding: '10px 20px' }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── Horizontal filter bar ── */}
            <div style={{
                border: '1px solid var(--e-beige)',
                background: 'var(--e-white)',
            }}>
                {/* Primary row */}
                <div style={{ display: 'flex', alignItems: 'stretch' }} className="e-filter-row">

                    {/* Location */}
                    <div style={{ flex: 2, minWidth: 0, borderRight: '1px solid var(--e-beige)' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem 1.25rem',
                            height: '100%',
                        }}>
                            <MapPin size={15} style={{ flexShrink: 0, color: 'var(--e-gold)' }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.14em',
                                    color: 'var(--e-light-muted)',
                                    marginBottom: 3,
                                    fontFamily: 'var(--e-sans)',
                                }}>
                                    Địa Điểm
                                </div>
                                <input
                                    type="text"
                                    placeholder="Khu vực, dự án, từ khóa..."
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    style={{
                                        width: '100%',
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        color: 'var(--e-charcoal)',
                                        fontFamily: 'var(--e-sans)',
                                    }}
                                    className="e-filter-input"
                                />
                            </div>
                            {location && (
                                <button
                                    onClick={() => setLocation('')}
                                    style={{
                                        flexShrink: 0,
                                        background: 'var(--e-cream)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: 22,
                                        height: 22,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: 'var(--e-muted)',
                                        fontSize: '0.7rem',
                                    }}
                                >✕</button>
                            )}
                        </div>
                    </div>

                    {/* Loại hình */}
                    <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--e-beige)' }}>
                        <FilterCell label="Loại Hình" value={type} placeholder="Tất cả" options={PROPERTY_TYPE_OPTIONS} onChange={setType} icon={LayoutGrid} />
                    </div>

                    {/* Khoảng giá */}
                    <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--e-beige)' }}>
                        <FilterCell label="Khoảng Giá" value={price} placeholder="Tất cả" options={PRICE_OPTIONS} onChange={setPrice} icon={CircleDollarSign} />
                    </div>

                    {/* Diện tích */}
                    <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--e-beige)' }}>
                        <FilterCell label="Diện Tích" value={area} placeholder="Tất cả" options={AREA_OPTIONS} onChange={setArea} icon={Maximize2} />
                    </div>

                    {/* Search button */}
                    <div style={{ flexShrink: 0 }}>
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="e-btn-search"
                            style={{ height: '100%', minHeight: 58 }}
                        >
                            {loading
                                ? <div style={{
                                    width: 16, height: 16,
                                    border: '2px solid rgba(255,255,255,0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 0.8s linear infinite',
                                }} />
                                : <><Search size={15} strokeWidth={2} /> Tìm Kiếm</>
                            }
                        </button>
                    </div>
                </div>

                {/* Advanced row */}
                <div style={{
                    borderTop: isAdvanced ? '1px solid var(--e-beige)' : 'none',
                    maxHeight: isAdvanced ? 80 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.4s var(--e-ease), border-top 0.4s',
                }}>
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--e-beige)' }}>
                            <FilterCell label="Phòng Ngủ" value={bedrooms} placeholder="Tất cả" options={BEDROOM_OPTIONS} onChange={setBedrooms} icon={Bed} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--e-beige)' }}>
                            <FilterCell label="Phòng Tắm" value={bathrooms} placeholder="Tất cả" options={BATHROOM_OPTIONS} onChange={setBathrooms} icon={Bath} />
                        </div>
                        <div style={{ flex: 3 }} />
                    </div>
                </div>
            </div>

            {/* ── Bottom row ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '1rem',
                flexWrap: 'wrap',
                gap: '1rem',
            }}>
                <button
                    onClick={() => setIsAdvanced(v => !v)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--e-gold)',
                        fontFamily: 'var(--e-sans)',
                        padding: 0,
                    }}
                >
                    <SlidersHorizontal size={12} />
                    {isAdvanced ? 'Thu gọn' : 'Thêm bộ lọc'}
                </button>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    opacity: 0.5,
                    transition: 'opacity 0.3s',
                }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                >
                    <Sparkles size={12} style={{ color: 'var(--e-gold)' }} />
                    <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.18em',
                        color: 'var(--e-muted)',
                        fontFamily: 'var(--e-sans)',
                    }}>Đề xuất:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {['Penthouse Quận 1', 'Biệt thự Riviera', 'Căn hộ view sông', 'Hợp đồng dài hạn'].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setLocation(tag)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    fontSize: '0.72rem',
                                    color: 'var(--e-muted)',
                                    textDecoration: 'underline',
                                    textUnderlineOffset: 3,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--e-sans)',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--e-gold)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--e-muted)'}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @media (max-width: 768px) {
                    .e-filter-row { flex-direction: column !important; }
                    .e-filter-row > div { border-right: none !important; border-bottom: 1px solid var(--e-beige); }
                    .e-filter-row > div:last-child { border-bottom: none; }
                }
            `}</style>
        </section>
    );
}