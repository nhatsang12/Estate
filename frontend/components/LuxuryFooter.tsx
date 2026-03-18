export default function LuxuryFooter() {
    return (
        <footer className="e-footer" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>

            {/* ══════════════════════════════════════
                ORGANIC CURVE BACKGROUND PATTERNS
                SVG đường cong địa hình chìm mờ
            ══════════════════════════════════════ */}

            {/* Layer 1 — Large sweeping curves top-right */}
            <svg
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: '-10%', right: '-5%',
                    width: '65%', height: 'auto',
                    opacity: 0.045,
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
                viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M580 20 C480 60, 360 40, 280 120 C200 200, 160 300, 80 360 C20 400, -20 440, -40 500" stroke="#C8A84B" strokeWidth="1" />
                <path d="M600 80 C500 110, 380 90, 300 170 C220 250, 180 350, 100 410 C40 450, 0 490, -20 550" stroke="#C8A84B" strokeWidth="1" />
                <path d="M560 -20 C460 20, 340 0, 260 80 C180 160, 140 260, 60 320 C0 360, -40 400, -60 460" stroke="#C8A84B" strokeWidth="1" />
                <path d="M540 140 C440 160, 320 140, 240 220 C160 300, 120 400, 40 460 C-20 500, -60 530, -80 590" stroke="#C8A84B" strokeWidth="0.7" />
                <path d="M520 200 C420 210, 300 190, 220 270 C140 350, 100 450, 20 510" stroke="#C8A84B" strokeWidth="0.7" />
            </svg>

            {/* Layer 2 — Tighter contour lines bottom-left */}
            <svg
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    bottom: '-5%', left: '-8%',
                    width: '55%', height: 'auto',
                    opacity: 0.038,
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
                viewBox="0 0 550 420" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M-20 380 C60 320, 140 260, 220 200 C300 140, 380 100, 460 60 C520 30, 560 10, 580 -10" stroke="white" strokeWidth="1" />
                <path d="M-20 340 C60 280, 140 220, 220 160 C300 100, 380 60, 460 20 C520 -10, 560 -30, 580 -50" stroke="white" strokeWidth="1" />
                <path d="M-20 300 C60 240, 140 180, 220 120 C300 60, 380 20, 460 -20" stroke="white" strokeWidth="1" />
                <path d="M-20 420 C80 360, 160 300, 240 240 C320 180, 400 140, 480 100 C540 70, 570 50, 590 30" stroke="white" strokeWidth="0.7" />
                <path d="M-20 260 C60 200, 140 140, 220 80 C300 20, 380 -20, 460 -60" stroke="white" strokeWidth="0.7" />
                <path d="M-20 460 C80 400, 160 340, 240 280 C320 220, 400 180, 480 140" stroke="white" strokeWidth="0.5" />
            </svg>

            {/* Layer 3 — Center subtle blob curves */}
            <svg
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: '30%', left: '35%',
                    width: '40%', height: 'auto',
                    opacity: 0.025,
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
                viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
                <ellipse cx="200" cy="150" rx="180" ry="90" stroke="white" strokeWidth="1" />
                <ellipse cx="200" cy="150" rx="150" ry="70" stroke="white" strokeWidth="1" />
                <ellipse cx="200" cy="150" rx="120" ry="52" stroke="white" strokeWidth="1" />
                <ellipse cx="200" cy="150" rx="90" ry="36" stroke="white" strokeWidth="0.8" />
                <ellipse cx="200" cy="150" rx="60" ry="22" stroke="white" strokeWidth="0.8" />
                <ellipse cx="200" cy="150" rx="30" ry="10" stroke="white" strokeWidth="0.6" />
            </svg>

            {/* Layer 4 — Vermilion accent arc top-left */}
            <svg
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '30%', height: 'auto',
                    opacity: 0.06,
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
                viewBox="0 0 300 250" fill="none" xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M-30 250 C20 180, 80 120, 150 80 C220 40, 280 20, 330 0" stroke="#C94B2A" strokeWidth="1.5" />
                <path d="M-30 210 C20 140, 80 80, 150 40 C220 0, 280 -20, 330 -40" stroke="#C94B2A" strokeWidth="1.2" />
                <path d="M-30 290 C20 220, 80 160, 150 120 C220 80, 280 60, 330 40" stroke="#C94B2A" strokeWidth="1" />
            </svg>

            {/* ══════════════════════════════════════
                CONTENT (all with position relative + z-index 1)
            ══════════════════════════════════════ */}

            {/* ── Top statement block ── */}
            <div style={{
                position: 'relative', zIndex: 1,
                padding: '5rem 5vw 4rem',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'grid',
                gridTemplateColumns: '1fr 320px',
                gap: '4rem',
                alignItems: 'flex-end',
            }}>
                <div>
                    <div style={{
                        fontFamily: 'var(--e-serif)',
                        fontSize: 'clamp(3.5rem, 8vw, 8rem)',
                        fontWeight: 500,
                        letterSpacing: '-0.04em',
                        color: 'var(--e-white)',
                        lineHeight: 0.95,
                        marginBottom: '1.5rem',
                    }}>
                        Esto<span style={{ color: 'var(--e-gold)' }}>ria</span>
                    </div>
                    <p className="e-footer-tagline" style={{ maxWidth: '520px', fontSize: '1.05rem' }}>
                        "Kiến tạo không gian sống — Nơi phong cách gặp gỡ giá trị."
                    </p>
                </div>

                <div style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(8px)',
                }}>
                    <div style={{
                        fontFamily: 'var(--e-sans)',
                        fontSize: '0.62rem',
                        letterSpacing: '0.20em',
                        textTransform: 'uppercase',
                        color: 'var(--e-gold)',
                        fontWeight: 700,
                    }}>Liên Hệ Ngay</div>
                    <div style={{
                        fontFamily: 'var(--e-serif)',
                        fontSize: '1.5rem',
                        fontWeight: 400,
                        color: 'var(--e-white)',
                        lineHeight: 1.2,
                    }}>
                        Tư vấn miễn phí<br />
                        <span style={{ color: 'rgba(255,255,255,0.30)', fontWeight: 200 }}>24/7 · 365 ngày</span>
                    </div>
                    <a href="tel:18006868" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '0.5rem',
                        fontFamily: 'var(--e-sans)',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--e-white)',
                        textDecoration: 'none',
                        padding: '10px 20px',
                        background: 'var(--e-gold)',
                        border: '1px solid var(--e-gold)',
                        transition: 'background 0.25s, border-color 0.25s',
                    }}>
                        1800 6868
                        <svg width={12} height={12} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* ── Links grid ── */}
            <div style={{ position: 'relative', zIndex: 1, padding: '3rem 5vw', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="e-footer-grid" style={{ marginBottom: 0 }}>
                    <div>
                        <div className="e-footer-col-title">Liên Hệ</div>
                        <div className="e-footer-contact">
                            <div className="e-footer-contact-item"><PinSvg />
                                <span>Tầng 18, Capital Tower, 109 Trần Hưng Đạo, Q.1, TP.HCM</span>
                            </div>
                            <div className="e-footer-contact-item"><PhoneSvg /><span>1800 6868 · Hotline 24/7</span></div>
                            <div className="e-footer-contact-item"><MailSvg /><span>hello@estoria.vn</span></div>
                        </div>
                    </div>

                    <div>
                        <div className="e-footer-col-title">Khám Phá</div>
                        <ul className="e-footer-links">
                            {['Căn Hộ Cao Cấp', 'Biệt Thự & Villa', 'Nhà Phố Thiết Kế', 'Shophouse', 'Đất Nền'].map((l) => (
                                <li key={l}><a href="#">{l}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <div className="e-footer-col-title">Công Ty</div>
                        <ul className="e-footer-links">
                            {['Về Estoria', 'Đội Ngũ', 'Tin Tức', 'Tuyển Dụng', 'Liên Hệ'].map((l) => (
                                <li key={l}><a href="#">{l}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <div className="e-footer-col-title">Pháp Lý</div>
                        <ul className="e-footer-links">
                            {['Điều Khoản Sử Dụng', 'Chính Sách Bảo Mật', 'Quy Định Đăng Tin', 'Hỗ Trợ'].map((l) => (
                                <li key={l}><a href="#">{l}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* ── Bottom bar ── */}
            <div className="e-footer-bottom" style={{ position: 'relative', zIndex: 1, padding: '1.5rem 5vw' }}>
                <div className="e-footer-copy">© 2025 Estoria Real Estate. Bảo lưu mọi quyền.</div>
                <div className="e-footer-social">
                    {SOCIAL_ICONS.map(({ label, icon }) => (
                        <button key={label} className="e-social-btn" aria-label={label}>
                            {icon}
                        </button>
                    ))}
                </div>
            </div>
        </footer>
    );
}

function PinSvg() {
    return <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 3 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>;
}
function PhoneSvg() {
    return <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 3 }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>;
}
function MailSvg() {
    return <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 3 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
}

const SOCIAL_ICONS = [
    { label: 'Facebook', icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg> },
    { label: 'Instagram', icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg> },
    { label: 'Twitter', icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></svg> },
    { label: 'LinkedIn', icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg> },
];