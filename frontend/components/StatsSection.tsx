import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export default function StatsSection() {
    const { t } = useTranslation();
    const stats = useMemo(() => ([
        { num: '2,400', sup: '+', label: t('home.stats.items.properties.label'), desc: t('home.stats.items.properties.desc') },
        { num: '12,000', sup: '+', label: t('home.stats.items.customers.label'), desc: t('home.stats.items.customers.desc') },
        { num: '63', sup: '', label: t('home.stats.items.provinces.label'), desc: t('home.stats.items.provinces.desc') },
        { num: '98', sup: '%', label: t('home.stats.items.verified.label'), desc: t('home.stats.items.verified.desc') },
    ]), [t]);

    return (
        <section style={{ position: 'relative', overflow: 'hidden' }} id="about">
            <style>{`
                /* ═══════════════════════════════════════
                   STATS SECTION — Pure White
                   Sits between Editorial(dark forest)
                   and Footer(dark) as a bright break
                ═══════════════════════════════════════ */
                .st-root {
                    background: #ffffff;
                    position: relative;
                    overflow: hidden;
                    border-top: 1px solid rgba(212,175,55,0.18);
                }

                /* Subtle grain */
                .st-root::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.02'/%3E%3C/svg%3E");
                    pointer-events: none;
                    z-index: 0;
                }

                /* Large ghost text watermark — charcoal outlined, very faint */
                .st-root::after {
                    content: 'ESTORIA';
                    position: absolute;
                    bottom: -0.25em;
                    left: -0.02em;
                    font-family: var(--e-serif);
                    font-size: clamp(6rem, 14vw, 16rem);
                    font-weight: 300;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(37,45,54,0.04);
                    line-height: 1;
                    letter-spacing: -0.04em;
                    pointer-events: none;
                    user-select: none;
                    z-index: 0;
                    white-space: nowrap;
                }

                /* ── Top label bar ── */
                .st-topbar {
                    position: relative;
                    z-index: 1;
                    padding: 2rem 5vw;
                    border-bottom: 1px solid rgba(37,45,54,0.06);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .st-topbar-eyebrow {
                    display: flex;
                    align-items: center;
                    gap: 0.7rem;
                    font-family: var(--e-sans);
                    font-size: 0.68rem;
                    font-weight: 600;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: var(--e-gold, #D4AF37);
                }
                .st-topbar-line {
                    width: 28px;
                    height: 1px;
                    background: var(--e-gold, #D4AF37);
                }
                .st-topbar-quote {
                    font-family: var(--e-serif);
                    font-size: 0.88rem;
                    font-style: italic;
                    color: rgba(37,45,54,0.3);
                    font-weight: 300;
                }

                /* ── Stats grid ── */
                .st-grid {
                    position: relative;
                    z-index: 1;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                }

                .st-item {
                    padding: 5rem 2.8rem 5.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.2rem;
                    position: relative;
                    cursor: default;
                    transition: background 0.3s;
                }
                .st-item:first-child { padding-left: 5vw; }
                .st-item:last-child  { padding-right: 5vw; }
                .st-item:hover { background: rgba(212,175,55,0.03); }

                /* Vertical divider — thin, gold */
                .st-item::after {
                    content: '';
                    position: absolute;
                    right: 0; top: 3rem; bottom: 3rem;
                    width: 1px;
                    background: linear-gradient(to bottom,
                        transparent,
                        rgba(212,175,55,0.22) 25%,
                        rgba(212,175,55,0.22) 75%,
                        transparent
                    );
                }
                .st-item:last-child::after { display: none; }

                /* Index tag */
                .st-idx {
                    font-family: var(--e-sans);
                    font-size: 0.58rem;
                    font-weight: 700;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: rgba(212,175,55,0.55);
                }

                /* Big number — charcoal on white = maximum contrast */
                .st-num {
                    font-family: var(--e-serif);
                    font-weight: 300;
                    color: var(--e-charcoal, #252D36);
                    line-height: 1;
                    letter-spacing: -0.04em;
                    font-size: clamp(3.5rem, 6vw, 5.5rem);
                }
                .st-num sup {
                    font-size: 0.38em;
                    vertical-align: super;
                    color: var(--e-gold, #D4AF37);
                    letter-spacing: 0;
                    font-weight: 400;
                }

                /* Gold underline accent */
                .st-num-line {
                    width: 40px;
                    height: 2px;
                    background: linear-gradient(90deg, var(--e-gold, #D4AF37), transparent);
                    margin-top: 0.6rem;
                    transition: width 0.4s ease;
                }
                .st-item:hover .st-num-line { width: 64px; }

                /* Label */
                .st-label {
                    font-family: var(--e-sans);
                    font-size: 0.8rem;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: var(--e-charcoal, #252D36);
                    line-height: 1.3;
                }

                /* Desc */
                .st-desc {
                    font-family: var(--e-serif);
                    font-size: 0.82rem;
                    font-style: italic;
                    color: rgba(37,45,54,0.38);
                    line-height: 1.5;
                }

                /* Bottom accent: thin gold-to-charcoal line */
                .st-bottom-bar {
                    position: relative;
                    z-index: 1;
                    height: 2px;
                    background: linear-gradient(90deg,
                        var(--e-gold, #D4AF37) 0%,
                        rgba(37,45,54,0.15) 50%,
                        transparent 100%
                    );
                }

                /* Responsive */
                @media (max-width: 900px) {
                    .st-grid { grid-template-columns: 1fr 1fr; }
                    .st-item:nth-child(2)::after { display: none; }
                    .st-item:nth-child(1), .st-item:nth-child(2) {
                        border-bottom: 1px solid rgba(212,175,55,0.1);
                    }
                }
                @media (max-width: 480px) {
                    .st-grid { grid-template-columns: 1fr 1fr; }
                    .st-item { padding: 3.5rem 1.5rem; }
                    .st-item:first-child { padding-left: 1.5rem; }
                    .st-item:last-child  { padding-right: 1.5rem; }
                }
            `}</style>

            <div className="st-root">

                {/* ── Top label bar ── */}
                <div className="st-topbar">
                    <span className="st-topbar-eyebrow">
                        <span className="st-topbar-line" />
                        {t('home.stats.topbarEyebrow')}
                    </span>
                    <span className="st-topbar-quote">"{t('home.stats.topbarQuote')}"</span>
                </div>

                {/* ── Stats grid ── */}
                <div className="st-grid">
                    {stats.map((s, i) => (
                        <div key={s.label} className="st-item">

                            <span className="st-idx">0{i + 1}</span>

                            <div>
                                <div className="st-num">
                                    {s.num}
                                    {s.sup && <sup>{s.sup}</sup>}
                                </div>
                                <div className="st-num-line" />
                            </div>

                            <div>
                                <div className="st-label">{s.label}</div>
                                <div className="st-desc">{s.desc}</div>
                            </div>

                        </div>
                    ))}
                </div>

                {/* ── Bottom accent ── */}
                <div className="st-bottom-bar" />

            </div>
        </section>
    );
}
