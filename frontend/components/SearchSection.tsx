import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, MapPin, SlidersHorizontal, X, Check, Building2 } from 'lucide-react';
import { propertyService, FilterOptionsData } from '@/services/propertyService';

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
export interface SearchParams {
    tab: string;
    location: string;
    types: string[];
    priceMin: number;
    priceMax: number;
    areaMin: number;
    areaMax: number;
    bedrooms: string[];
    bathrooms: string[];
    priceSortOrder?: PriceSortOrder;
}

interface SearchSectionProps {
    onSearch?: (params: SearchParams) => void;
    loading?: boolean;
    compact?: boolean;
}

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const AREA_MARKS = [0, 30, 60, 100, 200, 500]; // kept for legacy ref if needed

interface RangeOption {
    key: string;
    label: string;
    min: number;
    max: number;
}

// Giá — sort direction
export type PriceSortOrder = 'desc' | 'asc' | '';

const PRICE_SORT_OPTIONS: { key: PriceSortOrder; label: string }[] = [
    { key: 'desc', label: '↓ Cao → Thấp' },
    { key: 'asc', label: '↑ Thấp → Cao' },
];

// Diện tích — từ lớn đến nhỏ
const AREA_RANGES: RangeOption[] = [
    { key: 'above500', label: 'Trên 500 m²', min: 500, max: 9999 },
    { key: '200to500', label: '200 – 500 m²', min: 200, max: 500 },
    { key: '100to200', label: '100 – 200 m²', min: 100, max: 200 },
    { key: '60to100', label: '60 – 100 m²', min: 60, max: 100 },
    { key: '30to60', label: '30 – 60 m²', min: 30, max: 60 },
    { key: 'below30', label: 'Dưới 30 m²', min: 0, max: 30 },
];

/* ══════════════════════════════════════════
   HELPER — resolve multi-select area ranges → min/max
══════════════════════════════════════════ */
function resolveAreaRange(keys: string[], options: RangeOption[]): { min: number; max: number } {
    if (keys.length === 0) return { min: 0, max: options[0].max };
    const selected = options.filter(o => keys.includes(o.key));
    return {
        min: Math.min(...selected.map(o => o.min)),
        max: Math.max(...selected.map(o => o.max)),
    };
}

/* ══════════════════════════════════════════
   CHIP (Native Theme)
══════════════════════════════════════════ */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '8px 16px',
                borderRadius: 0,
                border: `1px solid ${active ? 'var(--e-charcoal)' : 'var(--e-beige)'}`,
                background: active ? 'var(--e-charcoal)' : 'transparent',
                color: active ? 'var(--e-white)' : 'var(--e-charcoal)',
                fontSize: '0.85rem', fontWeight: active ? 500 : 400,
                cursor: 'pointer',
                transition: 'all .2s ease',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--e-sans)'
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--e-gold)'; e.currentTarget.style.color = 'var(--e-gold)'; } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--e-beige)'; e.currentTarget.style.color = 'var(--e-charcoal)'; } }}
        >
            {active && <Check size={14} strokeWidth={2.5} />}
            {label}
        </button>
    );
}

/* ══════════════════════════════════════════
   RANGE CHIP GROUP — reusable multi-select
══════════════════════════════════════════ */
function RangeChipGroup({
    title,
    ranges,
    selected,
    onToggle,
}: {
    title: string;
    ranges: RangeOption[];
    selected: string[];
    onToggle: (key: string) => void;
}) {
    return (
        <div>
            <h4 style={{
                fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)',
                marginBottom: '1.5rem', fontFamily: 'var(--e-serif)'
            }}>
                {title}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ranges.map(r => (
                    <Chip
                        key={r.key}
                        label={r.label}
                        active={selected.includes(r.key)}
                        onClick={() => onToggle(r.key)}
                    />
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   ADVANCED FILTER MODAL
══════════════════════════════════════════ */
function AdvancedModal({
    advancedRef, onClose, onSearch, onReset,
    safeTypes, safeBedrooms, safeBathrooms,
    types, setTypes, bedrooms, setBedrooms, bathrooms, setBathrooms,
    selectedAreaRanges, toggleAreaRange,
    toggleArr,
}: any) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const modalContent = (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, width: '100vw', height: '100vh',
                background: 'rgba(26, 23, 20, 0.4)',
                backdropFilter: 'blur(8px)',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            }}
            onClick={onClose}
        >
            <div
                ref={advancedRef}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 1000,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'var(--e-white)',
                    border: '1px solid var(--e-beige)',
                    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)',
                    padding: '3rem',
                    position: 'relative',
                    animation: 'modalScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '1.5rem', right: '1.5rem',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--e-muted)', transition: 'color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--e-charcoal)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--e-muted)'}
                >
                    <X size={24} />
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '3rem' }}>

                    {/* Col 1 — Loại BĐS + Phòng */}
                    <div>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: '1.5rem', fontFamily: 'var(--e-serif)' }}>
                            Loại Bất Động Sản
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: '3rem' }}>
                            {safeTypes.map((pt: any) => (
                                <Chip key={pt.value} label={pt.label} active={types.includes(pt.value)} onClick={() => toggleArr(types, pt.value, setTypes)} />
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: '1.5rem', fontFamily: 'var(--e-serif)' }}>Phòng Ngủ</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {safeBedrooms.map((b: string) => (
                                        <Chip key={b} label={b} active={bedrooms.includes(b)} onClick={() => toggleArr(bedrooms, b, setBedrooms)} />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: '1.5rem', fontFamily: 'var(--e-serif)' }}>Phòng Tắm</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {safeBathrooms.map((b: string) => (
                                        <Chip key={b} label={b} active={bathrooms.includes(b)} onClick={() => toggleArr(bathrooms, b, setBathrooms)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Col 2 — Diện Tích */}
                    <RangeChipGroup
                        title="Diện Tích (m²)"
                        ranges={AREA_RANGES}
                        selected={selectedAreaRanges}
                        onToggle={toggleAreaRange}
                    />
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--e-beige)'
                }}>
                    <button onClick={onReset} style={{
                        background: 'transparent', border: 'none', color: 'var(--e-muted)',
                        fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                        fontFamily: 'var(--e-sans)', textDecoration: 'underline', textUnderlineOffset: 4
                    }}>
                        Xóa bộ lọc
                    </button>
                    <button
                        onClick={onSearch}
                        style={{
                            padding: '12px 48px', background: 'var(--e-charcoal)', color: 'var(--e-white)',
                            border: '1px solid var(--e-charcoal)', fontSize: '0.85rem', fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--e-sans)', letterSpacing: '0.1em', textTransform: 'uppercase',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--e-gold)'; e.currentTarget.style.borderColor = 'var(--e-gold)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--e-charcoal)'; e.currentTarget.style.borderColor = 'var(--e-charcoal)'; }}
                    >
                        Áp dụng bộ lọc
                    </button>
                </div>
            </div>
        </div>
    );

    if (!mounted) return null;
    return createPortal(modalContent, document.body);
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function SearchSection({ onSearch, loading, compact = false }: SearchSectionProps) {
    const [filterData, setFilterData] = useState<FilterOptionsData | null>(null);

    useEffect(() => {
        propertyService.getFilterOptions()
            .then(data => setFilterData(data))
            .catch(console.error);
    }, []);

    const safeTypes = filterData?.types || [];
    const safeBedrooms = filterData?.bedrooms || [];
    const safeBathrooms = filterData?.bathrooms || [];

    const [location, setLocation] = useState('');
    const [types, setTypes] = useState<string[]>([]);
    const [bedrooms, setBedrooms] = useState<string[]>([]);
    const [bathrooms, setBathrooms] = useState<string[]>([]);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

    // ── Sort & range states ──
    const [priceSortOrder, setPriceSortOrder] = useState<PriceSortOrder>('');
    const [selectedAreaRanges, setSelectedAreaRanges] = useState<string[]>([]);

    const toggleAreaRange = (key: string) =>
        setSelectedAreaRanges(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const advancedRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!isAdvancedOpen) return;
        const fn = (e: MouseEvent) => {
            if (advancedRef.current && !advancedRef.current.contains(e.target as Node))
                setIsAdvancedOpen(false);
        };
        const t = setTimeout(() => document.addEventListener('mousedown', fn), 0);
        return () => { clearTimeout(t); document.removeEventListener('mousedown', fn); };
    }, [isAdvancedOpen]);

    const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) =>
        set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

    const reset = () => {
        setTypes([]); setBedrooms([]); setBathrooms([]);
        setSelectedAreaRanges([]);
    };

    const activeCount =
        types.length + bedrooms.length + bathrooms.length +
        (selectedAreaRanges.length > 0 ? 1 : 0);

    const handleSearch = () => {
        setIsAdvancedOpen(false);
        const area = resolveAreaRange(selectedAreaRanges, AREA_RANGES);
        onSearch?.({
            tab: 'Mua Bán', location, types,
            priceMin: 0, priceMax: 9999,
            areaMin: area.min, areaMax: area.max,
            bedrooms, bathrooms,
            priceSortOrder,
        });
    };

    const typeLabel =
        types.length === 0 ? 'Tất cả loại BĐS'
            : types.length === 1 ? safeTypes.find(t => t.value === types[0])?.label
                : `${types.length} loại BĐS`;

    /* ─── Shared modal props ─── */
    const modalProps = {
        advancedRef,
        onClose: () => setIsAdvancedOpen(false),
        onSearch: handleSearch,
        onReset: reset,
        safeTypes, safeBedrooms, safeBathrooms,
        types, setTypes, bedrooms, setBedrooms, bathrooms, setBathrooms,
        selectedAreaRanges, toggleAreaRange,
        toggleArr,
    };

    /* ════════════════════════════════════════════════
       COMPACT MODE
    ════════════════════════════════════════════════ */
    if (compact) {
        return (
            <>
                <div style={{ marginBottom: '0.25rem' }}>
                    <div style={{
                        background: 'var(--e-white)',
                        border: '1px solid var(--e-beige)',
                        display: 'flex',
                        alignItems: 'stretch',
                        position: 'relative',
                        zIndex: 20,
                        boxShadow: '0 8px 30px -8px rgba(26,23,20,0.07)'
                    }}>
                        {/* Location */}
                        <div className="ss-item" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.8rem', borderRight: '1px solid var(--e-beige)' }}>
                            <MapPin size={18} color="var(--e-gold)" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div className="ss-label" style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--e-muted)', overflow: 'hidden', fontFamily: 'var(--e-sans)' }}>Địa điểm</div>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Nhập khu vực, dự án..."
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                    style={{
                                        width: '100%', border: 'none', background: 'transparent',
                                        outline: 'none', fontSize: '0.95rem', fontWeight: 500,
                                        color: 'var(--e-charcoal)', padding: 0, fontFamily: 'var(--e-serif)'
                                    }}
                                />
                            </div>
                            {location && (
                                <button onClick={() => setLocation('')} style={{ background: 'var(--e-cream)', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--e-muted)' }}>
                                    <X size={11} />
                                </button>
                            )}
                        </div>

                        {/* Type */}
                        <div
                            className="ss-item"
                            onClick={() => setIsAdvancedOpen(true)}
                            style={{ flex: 0.55, display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', borderRight: '1px solid var(--e-beige)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--e-cream)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--e-white)'}
                        >
                            <Building2 size={18} color="var(--e-gold)" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div className="ss-label" style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--e-muted)', overflow: 'hidden', fontFamily: 'var(--e-sans)' }}>Loại BĐS</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--e-charcoal)', fontFamily: 'var(--e-serif)' }}>{typeLabel}</div>
                            </div>
                        </div>

                        {/* Price Sort Segment */}
                        <div style={{ display: 'flex', alignItems: 'stretch', borderRight: '1px solid var(--e-beige)' }}>
                            {PRICE_SORT_OPTIONS.map((opt, i) => (
                                <button
                                    key={opt.key}
                                    className="ss-price-btn"
                                    onClick={() => setPriceSortOrder(priceSortOrder === opt.key ? '' : opt.key)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        background: priceSortOrder === opt.key ? 'var(--e-charcoal)' : 'transparent',
                                        color: priceSortOrder === opt.key ? 'var(--e-white)' : 'var(--e-muted)',
                                        border: 'none',
                                        borderLeft: i > 0 ? '1px solid var(--e-beige)' : 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.72rem', fontWeight: 600,
                                        letterSpacing: '0.04em', textTransform: 'uppercase',
                                        fontFamily: 'var(--e-sans)',
                                        whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={e => { if (priceSortOrder !== opt.key) e.currentTarget.style.color = 'var(--e-charcoal)'; }}
                                    onMouseLeave={e => { if (priceSortOrder !== opt.key) e.currentTarget.style.color = 'var(--e-muted)'; }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Advanced toggle */}
                        <button
                            className="ss-btn-filter"
                            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                background: 'var(--e-cream)',
                                border: 'none', cursor: 'pointer', color: 'var(--e-charcoal)',
                                fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                                fontFamily: 'var(--e-sans)',
                                position: 'relative', whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--e-beige)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--e-cream)'}
                        >
                            <SlidersHorizontal size={16} color="var(--e-gold)" />
                            Bộ Lọc
                            {activeCount > 0 && (
                                <span style={{
                                    marginLeft: 3, width: 18, height: 18, borderRadius: '50%',
                                    background: 'var(--e-gold)', color: 'var(--e-charcoal)',
                                    fontSize: '0.65rem', fontWeight: 700,
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>{activeCount}</span>
                            )}
                        </button>

                        {/* Search */}
                        <button
                            className="ss-btn-search"
                            onClick={handleSearch}
                            disabled={loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'var(--e-charcoal)', color: 'var(--e-white)', border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                                fontFamily: 'var(--e-sans)', opacity: loading ? .8 : 1,
                                whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--e-gold)'; }}
                            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--e-charcoal)'; }}
                        >
                            {loading ? <span className="spinner" /> : <Search size={16} />}
                            Tìm Kiếm
                        </button>
                    </div>
                </div>

                {isAdvancedOpen && <AdvancedModal {...modalProps} />}

                <style>{`
                    @keyframes modalScale { from { opacity:0;transform:scale(0.95); } to { opacity:1;transform:scale(1); } }
                    .spinner { width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ss-spin .8s linear infinite; }
                    @keyframes ss-spin { to { transform: rotate(360deg); } }
                `}</style>
            </>
        );
    }

    /* ════════════════════════════════════════════════
       FULL MODE
    ════════════════════════════════════════════════ */
    return (
        <section style={{
            position: 'relative',
            background: 'var(--e-white)',
            padding: '4rem 5vw 5rem',
            borderBottom: '1px solid var(--e-beige)'
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {/* Heading */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        fontSize: '0.6rem', fontWeight: 600, letterSpacing: '.22em',
                        textTransform: 'uppercase', color: 'var(--e-gold)',
                        fontFamily: 'var(--e-sans)', marginBottom: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
                    }}>
                        <span style={{ display: 'block', width: '2rem', height: '1.5px', background: 'var(--e-gold)' }} />
                        Bộ Lọc
                        <span style={{ display: 'block', width: '2rem', height: '1.5px', background: 'var(--e-gold)' }} />
                    </div>

                    <h2 style={{
                        fontSize: '2.5rem', fontWeight: 700, color: 'var(--e-charcoal)',
                        fontFamily: 'var(--e-serif)', margin: '0 0 1rem 0'
                    }}>
                        Tìm Kiếm Bất Động Sản Hoàn Mỹ
                    </h2>
                    <p style={{ color: 'var(--e-muted)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto', fontFamily: 'var(--e-sans)' }}>
                        Khám phá bộ sưu tập bất động sản cao cấp, được tinh tuyển dành riêng cho bạn.
                    </p>
                </div>

                {/* Primary Search Bar */}
                <div style={{
                    background: 'var(--e-white)',
                    border: '1px solid var(--e-beige)',
                    display: 'flex',
                    alignItems: 'stretch',
                    position: 'relative',
                    zIndex: 20,
                    boxShadow: '0 20px 40px -10px rgba(26, 23, 20, 0.05)'
                }}>

                    {/* Location Input */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderRight: '1px solid var(--e-beige)' }}>
                        <MapPin size={20} color="var(--e-gold)" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--e-muted)', marginBottom: 2, fontFamily: 'var(--e-sans)' }}>Địa điểm</div>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Nhập khu vực, dự án..."
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                style={{
                                    width: '100%', border: 'none', background: 'transparent',
                                    outline: 'none', fontSize: '1.1rem', fontWeight: 500,
                                    color: 'var(--e-charcoal)', padding: 0, fontFamily: 'var(--e-serif)'
                                }}
                            />
                        </div>
                        {location && (
                            <button onClick={() => setLocation('')} style={{ background: 'var(--e-cream)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--e-muted)' }}>
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Property Type Toggle */}
                    <div
                        onClick={() => setIsAdvancedOpen(true)}
                        style={{
                            flex: 0.6, display: 'flex', alignItems: 'center', gap: '1rem',
                            padding: '1rem 1.5rem', cursor: 'pointer', borderRight: '1px solid var(--e-beige)',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--e-cream)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--e-white)'}
                    >
                        <Building2 size={20} color="var(--e-gold)" />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--e-muted)', marginBottom: 2, fontFamily: 'var(--e-sans)' }}>Loại BĐS</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--e-charcoal)', fontFamily: 'var(--e-serif)' }}>
                                {typeLabel}
                            </div>
                        </div>
                    </div>

                    {/* Price Sort Segment */}
                    <div style={{ display: 'flex', alignItems: 'stretch', borderRight: '1px solid var(--e-beige)' }}>
                        {PRICE_SORT_OPTIONS.map((opt, i) => (
                            <button
                                key={opt.key}
                                onClick={() => setPriceSortOrder(priceSortOrder === opt.key ? '' : opt.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '0 1.4rem',
                                    background: priceSortOrder === opt.key ? 'var(--e-charcoal)' : 'transparent',
                                    color: priceSortOrder === opt.key ? 'var(--e-white)' : 'var(--e-muted)',
                                    border: 'none',
                                    borderLeft: i > 0 ? '1px solid var(--e-beige)' : 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.78rem', fontWeight: 600,
                                    letterSpacing: '0.05em', textTransform: 'uppercase',
                                    fontFamily: 'var(--e-sans)',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { if (priceSortOrder !== opt.key) e.currentTarget.style.color = 'var(--e-charcoal)'; }}
                                onMouseLeave={e => { if (priceSortOrder !== opt.key) e.currentTarget.style.color = 'var(--e-muted)'; }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Advanced Filters Toggle */}
                    <button
                        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '0 2rem', background: 'var(--e-cream)',
                            border: 'none', cursor: 'pointer', color: 'var(--e-charcoal)',
                            fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                            fontFamily: 'var(--e-sans)', transition: 'background 0.2s',
                            position: 'relative'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--e-beige)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--e-cream)'}
                    >
                        <SlidersHorizontal size={18} color="var(--e-gold)" />
                        Bộ Lọc Nâng Cao
                        {activeCount > 0 && (
                            <span style={{
                                position: 'absolute', top: 12, right: 15,
                                width: 18, height: 18, borderRadius: '50%',
                                background: 'var(--e-auth-primary)', color: 'var(--e-white)',
                                fontSize: '0.7rem', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>{activeCount}</span>
                        )}
                    </button>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '0 3rem', background: 'var(--e-charcoal)',
                            color: 'var(--e-white)', border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                            fontFamily: 'var(--e-sans)', transition: 'background 0.2s', opacity: loading ? .8 : 1
                        }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--e-gold)'; }}
                        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--e-charcoal)'; }}
                    >
                        {loading ? <span className="spinner" /> : <Search size={18} />}
                        Tìm Kiếm
                    </button>
                </div>

                {isAdvancedOpen && <AdvancedModal {...modalProps} />}
            </div>

            <style>{`
                @keyframes modalScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to   { opacity: 1; transform: scale(1);    }
                }
                .spinner {
                    width: 16px; height: 16px;
                    border: 2px solid rgba(255,255,255,.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: ss-spin .8s linear infinite;
                }
                @keyframes ss-spin { to { transform: rotate(360deg); } }
            `}</style>
        </section>
    );
}