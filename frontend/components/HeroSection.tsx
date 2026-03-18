interface HeroSectionProps {
    totalListings?: number;
}

export default function HeroSection({ totalListings }: HeroSectionProps) {
    return (
        <section className="e-hero">
            {/* Background image */}
            <div
                className="e-hero-bg"
                style={{
                    backgroundImage:
                        'url("https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&q=85&auto=format&fit=crop")',
                }}
            />

            {/* Overlay */}
            <div className="e-hero-overlay" />

            {/* Content */}
            <div className="e-hero-content">
                {/* Left — headline */}
                <div className="e-hero-left">
                    <div className="e-hero-tag">Nền Tảng Đất Đai Hàng Đầu Việt Nam</div>

                    <h1>
                        Kiến Tạo<br />
                        <em>Giá Trị</em> Trên<br />
                        Từng Mảnh Đất
                    </h1>

                    <p className="e-hero-desc">
                        Khám phá hàng nghìn bất động sản đất nền, nhà phố, biệt thự được
                        xác minh pháp lý 100% — từ Bắc vào Nam, minh bạch và tin cậy.
                    </p>

                    <div className="e-hero-actions">
                        <a href="#search" className="e-btn-primary">
                            Tìm Kiếm Ngay
                        </a>
                        <a href="#featured" className="e-btn-ghost">
                            Xem Nổi Bật
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
                                ? totalListings.toLocaleString('vi-VN')
                                : '2,400'}
                            <sup style={{ fontSize: '1.2rem', color: 'var(--e-gold-light)' }}>+</sup>
                        </div>
                        <div className="e-hero-stat-label">Bất Động Sản</div>
                    </div>

                    <div className="e-hero-divider" />

                    <div className="e-hero-stat">
                        <div className="e-hero-stat-num">63</div>
                        <div className="e-hero-stat-label">Tỉnh Thành</div>
                    </div>

                    <div className="e-hero-divider" />

                    <div className="e-hero-stat">
                        <div className="e-hero-stat-num">
                            98
                            <sup style={{ fontSize: '1.2rem', color: 'var(--e-gold-light)' }}>%</sup>
                        </div>
                        <div className="e-hero-stat-label">Xác Minh</div>
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
                }}>
                    Cuộn xuống
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
                `}</style>
            </div>
        </section>
    );
}