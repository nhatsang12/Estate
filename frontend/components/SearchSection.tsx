import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, SlidersHorizontal, X, Check, Building2 } from 'lucide-react';
import { propertyService, FilterOptionsData } from '@/services/propertyService';

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
export interface SearchParams {
    tab: string; // Keep for backward compatibility
    location: string;
    types: string[];
    priceMin: number;
    priceMax: number;
    areaMin: number;
    areaMax: number;
    bedrooms: string[];
    bathrooms: string[];
}

interface SearchSectionProps {
    onSearch?: (params: SearchParams) => void;
    loading?: boolean;
    compact?: boolean; // hides heading + reduces padding when embedded inside listings
}

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const PRICE_MARKS = [0, 2, 5, 10, 20, 50];   // tỷ
const AREA_MARKS = [0, 30, 60, 100, 200, 500]; // m²

/* ══════════════════════════════════════════
   DUAL RANGE SLIDER (Native Theme)
══════════════════════════════════════════ */
function DualRange({
    marks, valueMin, valueMax, formatTick, onChange,
}: {
    marks: number[];
    valueMin: number;
    valueMax: number;
    formatTick: (v: number) => string;
    onChange: (min: number, max: number) => void;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    const dragging = useRef<'min' | 'max' | null>(null);
    const min = marks[0], max = marks[marks.length - 1];
    const pct = (v: number) => ((v - min) / (max - min)) * 100;

    const snap = useCallback((raw: number) => {
        let closest = marks[0];
        marks.forEach(m => { if (Math.abs(m - raw) < Math.abs(closest - raw)) closest = m; });
        return closest;
    }, [marks]);

    const getVal = useCallback((clientX: number) => {
        const rect = trackRef.current?.getBoundingClientRect();
        if (!rect) return min;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return snap(min + ratio * (max - min));
    }, [min, max, snap]);

    useEffect(() => {
        const mv = (e: MouseEvent | TouchEvent) => {
            if (!dragging.current) return;
            const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const v = getVal(x);
            if (dragging.current === 'min') onChange(Math.min(v, valueMax), valueMax);
            else onChange(valueMin, Math.max(v, valueMin));
        };
        const up = () => { dragging.current = null; };
        window.addEventListener('mousemove', mv);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', mv, { passive: true });
        window.addEventListener('touchend', up);
        return () => {
            window.removeEventListener('mousemove', mv);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', mv);
            window.removeEventListener('touchend', up);
        };
    }, [getVal, onChange, valueMin, valueMax]);

    return (
        <div style={{ paddingBottom: '1rem' }}>
            {/* Value display */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--e-muted)', fontWeight: 600, marginBottom: 4, fontFamily: 'var(--e-sans)' }}>Từ</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', fontFamily: 'var(--e-serif)' }}>{formatTick(valueMin)}</div>
                </div>
                <div style={{ width: 16, height: 1, background: 'var(--e-beige)', margin: '0 8px', alignSelf: 'center' }} />
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--e-muted)', fontWeight: 600, marginBottom: 4, fontFamily: 'var(--e-sans)' }}>Đến</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', fontFamily: 'var(--e-serif)' }}>
                        {valueMax >= max ? `${formatTick(max)}+` : formatTick(valueMax)}
                    </div>
                </div>
            </div>

            {/* Track */}
            <div ref={trackRef} style={{ position: 'relative', height: 4, background: 'var(--e-beige)', borderRadius: 4, margin: '0 8px 24px', cursor: 'pointer' }}>
                <div style={{
                    position: 'absolute', height: '100%', background: 'var(--e-charcoal)', borderRadius: 4,
                    left: `${pct(valueMin)}%`, width: `${pct(valueMax) - pct(valueMin)}%`,
                }} />
                {(['min', 'max'] as const).map(side => (
                    <div key={side}
                        onMouseDown={e => { e.preventDefault(); dragging.current = side; }}
                        onTouchStart={() => { dragging.current = side; }}
                        style={{
                            position: 'absolute', top: '50%',
                            left: `${pct(side === 'min' ? valueMin : valueMax)}%`,
                            transform: 'translate(-50%,-50%)',
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'var(--e-white)', border: '2px solid var(--e-charcoal)',
                            cursor: 'grab', touchAction: 'none',
                            boxShadow: '0 2px 6px rgba(0,0,0,.15)', zIndex: 2,
                            transition: 'transform .1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translate(-50%,-50%) scale(1)'}
                    />
                ))}
            </div>

            {/* Tick snap areas */}
            <div style={{ position: 'relative', height: 8, margin: '0 8px' }}>
                {marks.map(m => (
                    <div key={m} style={{
                        position: 'absolute', left: `${pct(m)}%`, transform: 'translateX(-50%)',
                        width: 4, height: 4, borderRadius: '50%',
                        background: (m >= valueMin && m <= valueMax) ? 'var(--e-charcoal)' : 'var(--e-beige)',
                        opacity: 0.5,
                        top: 2
                    }} />
                ))}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════
   CHIP (Native Theme)
══════════════════════════════════════════ */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} style={{
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
   ADVANCED FILTER MODAL (shared)
══════════════════════════════════════════ */
function AdvancedModal({
    advancedRef, onClose, onSearch, onReset,
    safeTypes, safeBedrooms, safeBathrooms,
    types, setTypes, bedrooms, setBedrooms, bathrooms, setBathrooms,
    priceMin, priceMax, setPriceMin, setPriceMax,
    areaMin, areaMax, setAreaMin, setAreaMax,
    fmtPrice, fmtArea, toggleArr,
}: any) {
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(26, 23, 20, 0.4)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }} onClick={onClose}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '4rem' }}>
                    {/* Left Col */}
                    <div>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: '1.5rem', fontFamily: 'var(--e-serif)' }}>Loại Bất Động Sản</h4>
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

                    {/* Right Col */}
                    <div>
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: '1.5rem', fontFamily: 'var(--e-serif)' }}>Khoảng Giá (Tỷ VNĐ)</h4>
                        <DualRange
                            marks={PRICE_MARKS} valueMin={priceMin} valueMax={priceMax}
                            formatTick={fmtPrice} onChange={(a: number, b: number) => { setPriceMin(a); setPriceMax(b); }}
                        />
                        <div style={{ height: '3rem' }} />
                        <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--e-charcoal)', marginBottom: '1.5rem', fontFamily: 'var(--e-serif)' }}>Diện Tích (m²)</h4>
                        <DualRange
                            marks={AREA_MARKS} valueMin={areaMin} valueMax={areaMax}
                            formatTick={fmtArea} onChange={(a: number, b: number) => { setAreaMin(a); setAreaMax(b); }}
                        />
                    </div>
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
                    }}>Xóa bộ lọc</button>
                    <button onClick={onSearch} style={{
                        padding: '12px 48px', background: 'var(--e-charcoal)', color: 'var(--e-white)',
                        border: '1px solid var(--e-charcoal)', fontSize: '0.85rem', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'var(--e-sans)', letterSpacing: '0.1em', textTransform: 'uppercase',
                        transition: 'all 0.2s ease'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--e-gold)'; e.currentTarget.style.borderColor = 'var(--e-gold)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--e-charcoal)'; e.currentTarget.style.borderColor = 'var(--e-charcoal)'; }}
                    >Áp dụng bộ lọc</button>
                </div>
            </div>
        </div>
    );
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

    const [priceMin, setPriceMin] = useState(PRICE_MARKS[0]);
    const [priceMax, setPriceMax] = useState(PRICE_MARKS[PRICE_MARKS.length - 1]);
    const [areaMin, setAreaMin] = useState(AREA_MARKS[0]);
    const [areaMax, setAreaMax] = useState(AREA_MARKS[AREA_MARKS.length - 1]);

    const advancedRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close advanced on outside click
    useEffect(() => {
        if (!isAdvancedOpen) return;
        const fn = (e: MouseEvent) => {
            if (advancedRef.current && !advancedRef.current.contains(e.target as Node)) setIsAdvancedOpen(false);
        };
        const t = setTimeout(() => document.addEventListener('mousedown', fn), 0);
        return () => { clearTimeout(t); document.removeEventListener('mousedown', fn); };
    }, [isAdvancedOpen]);

    const toggleArr = (arr: string[], val: string, set: (v: string[]) => void) =>
        set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

    const reset = () => {
        setTypes([]); setBedrooms([]); setBathrooms([]);
        setPriceMin(PRICE_MARKS[0]); setPriceMax(PRICE_MARKS[PRICE_MARKS.length - 1]);
        setAreaMin(AREA_MARKS[0]); setAreaMax(AREA_MARKS[AREA_MARKS.length - 1]);
    };

    const activeCount =
        types.length + bedrooms.length + bathrooms.length +
        (priceMin > PRICE_MARKS[0] || priceMax < PRICE_MARKS[PRICE_MARKS.length - 1] ? 1 : 0) +
        (areaMin > AREA_MARKS[0] || areaMax < AREA_MARKS[AREA_MARKS.length - 1] ? 1 : 0);

    // ─── EXACT SAME logic as original ───
    const handleSearch = () => {
        setIsAdvancedOpen(false);
        onSearch?.({ tab: "Mua Bán", location, types, priceMin, priceMax, areaMin, areaMax, bedrooms, bathrooms });
    };

    const fmtPrice = (v: number) => `${v} tỷ`;
    const fmtArea = (v: number) => `${v} m²`;

    const typeLabel = types.length === 0 ? 'Tất cả loại BĐS'
        : types.length === 1 ? safeTypes.find(t => t.value === types[0])?.label
            : `${types.length} loại BĐS`;

    /* ─── Shared modal props ─── */
    const modalProps = {
        advancedRef, onClose: () => setIsAdvancedOpen(false),
        onSearch: handleSearch, onReset: reset,
        safeTypes, safeBedrooms, safeBathrooms,
        types, setTypes, bedrooms, setBedrooms, bathrooms, setBathrooms,
        priceMin, priceMax, setPriceMin, setPriceMax,
        areaMin, areaMax, setAreaMin, setAreaMax,
        fmtPrice, fmtArea, toggleArr,
    };

    /* ════════════════════════════════════════════════
       COMPACT MODE — search bar only, no heading/section
       Used when embedded inside listings section
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
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.4rem', borderRight: '1px solid var(--e-beige)' }}>
                            <MapPin size={18} color="var(--e-gold)" />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--e-muted)', marginBottom: 2, fontFamily: 'var(--e-sans)' }}>Địa điểm</div>
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
                            onClick={() => setIsAdvancedOpen(true)}
                            style={{ flex: 0.55, display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1.4rem', cursor: 'pointer', borderRight: '1px solid var(--e-beige)', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--e-cream)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--e-white)'}
                        >
                            <Building2 size={18} color="var(--e-gold)" />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--e-muted)', marginBottom: 2, fontFamily: 'var(--e-sans)' }}>Loại BĐS</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--e-charcoal)', fontFamily: 'var(--e-serif)' }}>{typeLabel}</div>
                            </div>
                        </div>

                        {/* Advanced toggle */}
                        <button
                            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '0 1.6rem', background: 'var(--e-cream)',
                                border: 'none', cursor: 'pointer', color: 'var(--e-charcoal)',
                                fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                                fontFamily: 'var(--e-sans)', transition: 'background 0.2s',
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
                            onClick={handleSearch}
                            disabled={loading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '0 2rem',
                                background: 'var(--e-charcoal)', color: 'var(--e-white)', border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                                fontFamily: 'var(--e-sans)', transition: 'background 0.2s', opacity: loading ? .8 : 1,
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
       FULL MODE — original layout with heading
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

                {/* Primary Search Bar — exact same as original */}
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
                    to { opacity: 1; transform: scale(1); }
                }
                .spinner {
                    width: 16px; height: 16px;
                    border: 2px solid rgba(255,255,255,.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: ss-spin .8s linear infinite;
                }
                @keyframes ss-spin { to { transform: rotate(360deg); } }
                @media (max-width: 768px) {
                    /* Add responsive layout if needed */
                }
            `}</style>
        </section>
    );
}