export default function LuxuryFooter() {
    return (
        <footer className="e-footer" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
            <style>{`
                /* ═══════════════════════════════════════
                   FOOTER REDESIGN — Balanced 3-zone layout
                   FIX: Giant logo vs tiny columns imbalance
                ═══════════════════════════════════════ */

                /* ── Decorative SVG curves (kept, toned down) ── */
                .ft-curves { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

                /* ── Zone 1: Brand bar — compact, proportional ── */
                .ft-brand {
                    position: relative;
                    z-index: 1;
                    padding: 4rem 5vw 3.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    display: grid;
                    grid-template-columns: 1.1fr 1fr 360px;
                    gap: 4rem;
                    align-items: start;
                }

                .ft-brand-col {}

                /* Logo — reduced from 8rem to a balanced size */
                .ft-logo {
                    font-family: var(--e-serif);
                    font-size: clamp(2.4rem, 4.5vw, 3.6rem);
                    font-weight: 500;
                    letter-spacing: -0.02em;
                    color: var(--e-white);
                    line-height: 1;
                    margin-bottom: 1rem;
                }
                .ft-logo span { color: var(--e-gold); }

                .ft-tagline {
                    font-family: var(--e-serif);
                    font-size: 0.95rem;
                    font-style: italic;
                    color: rgba(255,255,255,0.3);
                    line-height: 1.7;
                    max-width: 280px;
                    margin-bottom: 1.8rem;
                }

                /* Social row under logo */
                .ft-social {
                    display: flex;
                    gap: 0.6rem;
                }
                .ft-social-btn {
                    width: 34px; height: 34px;
                    border: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: border-color 0.2s, background 0.2s;
                    background: transparent;
                }
                .ft-social-btn:hover {
                    border-color: var(--e-gold);
                    background: rgba(212,175,55,0.1);
                }

                /* ── Zone 2: Links — equal weight columns ── */
                .ft-links-zone {
                    position: relative;
                    z-index: 1;
                    padding: 3rem 5vw;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                    gap: 3rem;
                }

                .ft-col-title {
                    font-family: var(--e-sans);
                    font-size: 0.65rem;
                    font-weight: 600;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--e-gold);
                    margin-bottom: 1.4rem;
                }

                .ft-links {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .ft-links a {
                    font-family: var(--e-sans);
                    font-size: 0.82rem;
                    color: rgba(255,255,255,0.38);
                    text-decoration: none;
                    font-weight: 300;
                    transition: color 0.2s;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .ft-links a:hover { color: rgba(255,255,255,0.82); }
                .ft-links a::before {
                    content: '';
                    display: inline-block;
                    width: 12px; height: 1px;
                    background: rgba(255,255,255,0.15);
                    flex-shrink: 0;
                    transition: background 0.2s, width 0.2s;
                }
                .ft-links a:hover::before {
                    background: var(--e-gold);
                    width: 18px;
                }

                /* Contact col in links zone */
                .ft-contact {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .ft-contact-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    font-family: var(--e-sans);
                    font-size: 0.8rem;
                    color: rgba(255,255,255,0.38);
                    line-height: 1.6;
                    font-weight: 300;
                }

                /* ── CTA box — right col in brand zone ── */
                .ft-cta-box {
                    border: 1px solid rgba(255,255,255,0.08);
                    padding: 2.5rem;
                    background: rgba(255,255,255,0.02);
                    backdrop-filter: blur(8px);
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .ft-cta-eyebrow {
                    font-family: var(--e-sans);
                    font-size: 0.62rem;
                    font-weight: 600;
                    letter-spacing: 0.2em;
                    text-transform: uppercase;
                    color: var(--e-gold);
                }
                .ft-cta-heading {
                    font-family: var(--e-serif);
                    font-size: 1.5rem;
                    font-weight: 400;
                    color: var(--e-white);
                    line-height: 1.25;
                }
                .ft-cta-sub {
                    font-family: var(--e-sans);
                    font-size: 0.78rem;
                    color: rgba(255,255,255,0.28);
                    line-height: 1.55;
                }
                .ft-cta-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 0.25rem;
                    font-family: var(--e-sans);
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--e-charcoal);
                    text-decoration: none;
                    padding: 11px 22px;
                    background: var(--e-gold);
                    border: 1px solid var(--e-gold);
                    transition: background 0.25s, border-color 0.25s, color 0.25s;
                    align-self: flex-start;
                }
                .ft-cta-btn:hover {
                    background: transparent;
                    color: var(--e-gold);
                }

                /* ── Zone 3: Bottom bar ── */
                .ft-bottom {
                    position: relative;
                    z-index: 1;
                    padding: 1.5rem 5vw;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .ft-copy {
                    font-family: var(--e-sans);
                    font-size: 0.72rem;
                    color: rgba(255,255,255,0.18);
                    font-weight: 300;
                }
                .ft-bottom-links {
                    display: flex;
                    gap: 1.5rem;
                }
                .ft-bottom-links a {
                    font-family: var(--e-sans);
                    font-size: 0.68rem;
                    color: rgba(255,255,255,0.22);
                    text-decoration: none;
                    transition: color 0.2s;
                }
                .ft-bottom-links a:hover { color: rgba(255,255,255,0.6); }

                /* ── Responsive ── */
                @media (max-width: 1024px) {
                    .ft-brand { grid-template-columns: 1fr 1fr; }
                    .ft-cta-box { grid-column: span 2; }
                    .ft-links-zone { grid-template-columns: 1fr 1fr; gap: 2.5rem; }
                }
                @media (max-width: 640px) {
                    .ft-brand { grid-template-columns: 1fr; gap: 2.5rem; }
                    .ft-cta-box { grid-column: auto; }
                    .ft-links-zone { grid-template-columns: 1fr 1fr; gap: 2rem; }
                    .ft-bottom { flex-direction: column; text-align: center; }
                }
            `}</style>

            {/* ── Decorative SVG curves (subdued) ── */}
            <div className="ft-curves" aria-hidden="true">
                <svg style={{ position: 'absolute', top: '-5%', right: '-3%', width: '45%', opacity: 0.04 }}
                    viewBox="0 0 600 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M580 20 C480 60, 360 40, 280 120 C200 200, 160 300, 80 360" stroke="#C8A84B" strokeWidth="1" />
                    <path d="M600 80 C500 110, 380 90, 300 170 C220 250, 180 350, 100 410" stroke="#C8A84B" strokeWidth="1" />
                    <path d="M540 140 C440 160, 320 140, 240 220 C160 300, 120 400, 40 460" stroke="#C8A84B" strokeWidth="0.7" />
                </svg>
                <svg style={{ position: 'absolute', bottom: 0, left: '-5%', width: '40%', opacity: 0.03 }}
                    viewBox="0 0 550 420" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M-20 380 C60 320, 140 260, 220 200 C300 140, 380 100, 460 60" stroke="white" strokeWidth="1" />
                    <path d="M-20 340 C60 280, 140 220, 220 160 C300 100, 380 60, 460 20" stroke="white" strokeWidth="1" />
                </svg>
            </div>

            {/* ═══════════════════════════════════
                ZONE 1: Brand + CTA
            ═══════════════════════════════════ */}
            <div className="ft-brand">
                {/* Col 1: Logo + tagline + social */}
                <div className="ft-brand-col">
                    <div className="ft-logo">
                        Esto<span>ria</span>
                    </div>
                    <p className="ft-tagline">
                        "Kiến tạo không gian sống — Nơi phong cách gặp gỡ giá trị."
                    </p>
                    <div className="ft-social">
                        {SOCIAL_ICONS.map(({ label, icon }) => (
                            <button key={label} className="ft-social-btn" aria-label={label}>
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Col 2: Contact quick info */}
                <div className="ft-brand-col">
                    <div className="ft-col-title">Liên Hệ Trực Tiếp</div>
                    <div className="ft-contact">
                        <div className="ft-contact-item">
                            <PinSvg />
                            <span>Tầng 18, Capital Tower, 109 Trần Hưng Đạo, Q.1, TP.HCM</span>
                        </div>
                        <div className="ft-contact-item">
                            <PhoneSvg />
                            <span>1800 6868 · Hotline 24/7</span>
                        </div>
                        <div className="ft-contact-item">
                            <MailSvg />
                            <span>hello@estoria.vn</span>
                        </div>
                    </div>
                </div>

                {/* Col 3: CTA box */}
                <div className="ft-cta-box">
                    <span className="ft-cta-eyebrow">Tư Vấn Miễn Phí</span>
                    <div className="ft-cta-heading">
                        Sẵn sàng tìm<br />ngôi nhà lý tưởng?
                    </div>
                    <p className="ft-cta-sub">
                        Đội ngũ chuyên gia Estoria hỗ trợ 24/7 — 365 ngày, không kể lễ tết.
                    </p>
                    <a href="tel:18006868" className="ft-cta-btn">
                        Gọi 1800 6868
                        <svg width={11} height={11} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}>
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* ═══════════════════════════════════
                ZONE 2: Navigation links
            ═══════════════════════════════════ */}
            <div className="ft-links-zone">
                <div>
                    <div className="ft-col-title">Khám Phá</div>
                    <ul className="ft-links">
                        {['Căn Hộ Cao Cấp', 'Biệt Thự & Villa', 'Nhà Phố Thiết Kế', 'Shophouse', 'Đất Nền Dự Án'].map(l => (
                            <li key={l}><a href="#">{l}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <div className="ft-col-title">Công Ty</div>
                    <ul className="ft-links">
                        {['Về Estoria', 'Đội Ngũ Chuyên Gia', 'Tin Tức & Sự Kiện', 'Tuyển Dụng', 'Liên Hệ'].map(l => (
                            <li key={l}><a href="#">{l}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <div className="ft-col-title">Hỗ Trợ</div>
                    <ul className="ft-links">
                        {['Trung Tâm Trợ Giúp', 'Hướng Dẫn Mua Nhà', 'Quy Trình Đăng Tin', 'FAQs'].map(l => (
                            <li key={l}><a href="#">{l}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <div className="ft-col-title">Pháp Lý</div>
                    <ul className="ft-links">
                        {['Điều Khoản Sử Dụng', 'Chính Sách Bảo Mật', 'Quy Định Đăng Tin', 'Cookie Policy'].map(l => (
                            <li key={l}><a href="#">{l}</a></li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* ═══════════════════════════════════
                ZONE 3: Bottom bar
            ═══════════════════════════════════ */}
            <div className="ft-bottom">
                <span className="ft-copy">© 2026 Estoria Real Estate. Bảo lưu mọi quyền.</span>
                <div className="ft-bottom-links">
                    <a href="#">Điều khoản</a>
                    <a href="#">Bảo mật</a>
                    <a href="#">Sitemap</a>
                </div>
            </div>
        </footer>
    );
}

/* ──────────────── Icons ──────────────── */
function PinSvg() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 3 }}>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        </svg>
    );
}
function PhoneSvg() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 3 }}>
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
        </svg>
    );
}
function MailSvg() {
    return (
        <svg width={13} height={13} viewBox="0 0 24 24" stroke="var(--e-gold)" fill="none" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 3 }}>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    );
}

const SOCIAL_ICONS = [
    {
        label: 'Facebook',
        icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}>
            <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
        </svg>,
    },
    {
        label: 'Instagram',
        icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>,
    },
    {
        label: 'YouTube',
        icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}>
            <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z" />
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
        </svg>,
    },
    {
        label: 'LinkedIn',
        icon: <svg width={14} height={14} viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" fill="none" strokeWidth={1.5}>
            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
            <rect x="2" y="9" width="4" height="12" />
            <circle cx="4" cy="4" r="2" />
        </svg>,
    },
];