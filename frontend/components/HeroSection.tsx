import { useTranslation } from 'react-i18next';

interface HeroSectionProps {
    totalListings?: number;
}

function formatCountByLanguage(value: number, language: string) {
    const normalized = Number.isFinite(value) ? Math.round(value) : 0;
    const separator = language === 'en' ? ',' : '.';
    return normalized.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export default function HeroSection({ totalListings }: HeroSectionProps) {
    const { t, i18n } = useTranslation();
    const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });

    return (
        <section className="e-hero">
            {/* Background image */}
            <div
                className="e-hero-bg"
                style={{
                    backgroundImage:
                        'url("https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop")',
                }}
            />

            {/* Overlay — tối hơn + gradient từ dưới */}
            <div className="e-hero-overlay" />

            {/* Vignette hai bên */}
            <div className="e-hero-vignette" />

            {/* Content */}
            <div className="e-hero-content">
                {/* Left — headline */}
                <div className="e-hero-left">
                    <div className="e-hero-tag">{tr('home.hero.tag', 'Nền Tảng Đất Đai Hàng Đầu Việt Nam')}</div>

                    <h1>
                        {tr('home.hero.titleLine1', 'Kiến Tạo')}<br />
                        <em>{tr('home.hero.titleEmphasis', 'Giá Trị')}</em> {tr('home.hero.titleLine2', 'Trên')}<br />
                        {tr('home.hero.titleLine3', 'Từng Mảnh Đất')}
                    </h1>

                    <p className="e-hero-desc">
                        {tr('home.hero.description', 'Khám phá hàng nghìn bất động sản đất nền, nhà phố, biệt thự được xác minh pháp lý 100% — từ Bắc vào Nam, minh bạch và tin cậy.')}
                    </p>

                    <div className="e-hero-actions">
                        <a href="#search" className="e-btn-primary">
                            {tr('home.hero.searchNow', 'Tìm Kiếm Ngay')}
                        </a>
                        <a href="#featured" className="e-btn-ghost">
                            {tr('home.hero.viewFeatured', 'Xem Nổi Bật')}
                            <svg width={14} height={14} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5}>
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>

                {/* Right — stats */}
                <div className="e-hero-right">
                    <div className="e-hero-stat">
                        <div className="e-hero-stat-num">
                            {totalListings
                                ? formatCountByLanguage(totalListings, i18n.resolvedLanguage || 'vi')
                                : '2,400'}
                            <sup style={{ fontSize: '1.2rem', color: 'var(--e-gold-light)' }}>+</sup>
                        </div>
                        <div className="e-hero-stat-label">{tr('home.hero.stats.properties', 'Bất Động Sản')}</div>
                    </div>

                    <div className="e-hero-divider" />

                    <div className="e-hero-stat">
                        <div className="e-hero-stat-num">63</div>
                        <div className="e-hero-stat-label">{tr('home.hero.stats.provinces', 'Tỉnh Thành')}</div>
                    </div>

                    <div className="e-hero-divider" />

                    <div className="e-hero-stat">
                        <div className="e-hero-stat-num">
                            98
                            <sup style={{ fontSize: '1.2rem', color: 'var(--e-gold-light)' }}>%</sup>
                        </div>
                        <div className="e-hero-stat-label">{tr('home.hero.stats.verified', 'Xác Minh')}</div>
                    </div>
                </div>
            </div>

            {/* Scroll indicator */}
            <div style={{
                position: 'absolute',
                bottom: '2.5rem',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                opacity: 0,
                animation: 'e-fade-up 0.8s 1.2s var(--e-ease) forwards',
            }}>
                <span style={{
                    fontFamily: 'var(--e-sans)',
                    fontSize: '0.58rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.35)',
                    fontWeight: 600,
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}>
                    {tr('home.hero.scrollDown', 'Cuộn xuống')}
                </span>
                <div style={{
                    width: '1px',
                    height: '36px',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.40), transparent)',
                    animation: 'e-scroll-line 1.8s ease-in-out infinite',
                }} />
                <style>{`
                    @keyframes e-scroll-line {
                        0%   { transform: scaleY(0); transform-origin: top; }
                        50%  { transform: scaleY(1); transform-origin: top; }
                        51%  { transform: scaleY(1); transform-origin: bottom; }
                        100% { transform: scaleY(0); transform-origin: bottom; }
                    }

                    /* ── Overlay: tối hơn + gradient từ dưới lên ── */
                    .e-hero-overlay {
                        background: linear-gradient(
                            to bottom,
                            rgba(10,10,8,0.62) 0%,
                            rgba(10,10,8,0.70) 60%,
                            rgba(10,10,8,0.85) 100%
                        ) !important;
                    }

                    /* ── Vignette hai bên ── */
                    .e-hero-vignette {
                        position: absolute;
                        inset: 0;
                        background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%);
                        pointer-events: none;
                        z-index: 1;
                    }

                    /* ── h1: text-shadow nhẹ tăng nổi ── */
                    .e-hero h1 {
                        text-shadow: 0 2px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4);
                        letter-spacing: -0.02em;
                    }

                    /* ── em "Giá Trị": gold gradient + drop-shadow ── */
                    .e-hero h1 em {
                        font-style: italic;
                        background: linear-gradient(135deg, #d4b07a 0%, #f0d49a 50%, #c49a55 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        text-shadow: none;
                        filter: drop-shadow(0 2px 12px rgba(180,140,60,0.4));
                    }

                    /* ── desc: shadow nhẹ ── */
                    .e-hero-desc {
                        text-shadow: 0 1px 8px rgba(0,0,0,0.5);
                    }

                    /* ── Stats box: transparent hoàn toàn ── */
                    .e-hero-right {
                        background: transparent !important;
                        border: none !important;
                        backdrop-filter: none !important;
                        -webkit-backdrop-filter: none !important;
                    }

                    /* ── stat number: shadow ── */
                    .e-hero-stat-num {
                        text-shadow: 0 2px 16px rgba(0,0,0,0.4);
                    }

                    /* ── Tag: border + blur ── */
                    .e-hero-tag {
                        border: 0.5px solid rgba(255,255,255,0.2) !important;
                        border-radius: 2px;
                        backdrop-filter: blur(4px);
                        -webkit-backdrop-filter: blur(4px);
                    }

                    /* ── Primary button shadow ── */
                    .e-hero .e-btn-primary {
                        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    }

                    /* ── Ghost button shadow ── */
                    .e-hero .e-btn-ghost {
                        text-shadow: 0 1px 6px rgba(0,0,0,0.5);
                    }
                `}</style>
            </div>
        </section>
    );
}
