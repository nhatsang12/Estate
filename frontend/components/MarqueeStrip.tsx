import { useTranslation } from 'react-i18next';

const ITEM_KEYS = [
    'apartment',
    'villaResort',
    'townhouseDesign',
    'officeRent',
    'shophouse',
    'projectLand',
    'penthouse',
    'beachVilla',
] as const;

export default function MarqueeStrip() {
    const { t } = useTranslation();
    const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
    const fallbackByKey: Record<(typeof ITEM_KEYS)[number], string> = {
        apartment: 'Căn Hộ Cao Cấp',
        villaResort: 'Biệt Thự Nghỉ Dưỡng',
        townhouseDesign: 'Nhà Phố Thiết Kế',
        officeRent: 'Văn Phòng Cho Thuê',
        shophouse: 'Shophouse Thương Mại',
        projectLand: 'Đất Nền Dự Án',
        penthouse: 'Penthouse Thượng Lưu',
        beachVilla: 'Villa Ven Biển',
    };
    const items = ITEM_KEYS.map((key) => tr(`home.marquee.items.${key}`, fallbackByKey[key]));
    const allItems = [...items, ...items];

    return (
        <div className="e-strip" style={{ display: 'flex', alignItems: 'stretch', padding: 0 }}>
            {/* Left anchor label */}
            <div style={{
                flexShrink: 0,
                width: '120px',
                background: 'var(--e-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 1rem',
                zIndex: 2,
            }}>
                <span style={{
                    fontFamily: 'var(--e-sans)',
                    fontSize: '0.60rem',
                    fontWeight: 700,
                    letterSpacing: '0.20em',
                    textTransform: 'uppercase',
                    color: 'var(--e-white)',
                    whiteSpace: 'nowrap',
                }}>
                    {tr('home.marquee.category', 'Danh Mục')}
                </span>
            </div>

            {/* Scrolling content */}
            <div style={{ flex: 1, overflow: 'hidden', padding: '14px 0', position: 'relative' }}>
                {/* Fade edge right */}
                <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: '60px',
                    background: 'linear-gradient(to left, var(--e-charcoal), transparent)',
                    zIndex: 1, pointerEvents: 'none',
                }} />
                <div className="e-strip-inner">
                    {allItems.map((item, i) => (
                        <span key={i}>
                            {item}
                            <span className="e-strip-dot"> ✦ </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Right count badge */}
            <div style={{
                flexShrink: 0,
                width: '80px',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 0',
                gap: '2px',
            }}>
                <span style={{
                    fontFamily: 'var(--e-serif)',
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: 'var(--e-white)',
                    lineHeight: 1,
                }}>08</span>
                <span style={{
                    fontFamily: 'var(--e-sans)',
                    fontSize: '0.52rem',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.30)',
                }}>{tr('home.marquee.typesLabel', 'loại hình')}</span>
            </div>
        </div>
    );
}
