const FEATURES = [
    {
        num: '01',
        title: '100% Xác Minh Pháp Lý',
        text: 'Mỗi bất động sản được kiểm tra kỹ lưỡng về giấy tờ và tình trạng pháp lý trước khi đăng tải.',
        icon: <ShieldIcon />,
        stat: '100%',
        statLabel: 'Xác minh',
    },
    {
        num: '02',
        title: 'Chuyên Gia Hỗ Trợ 24/7',
        text: 'Đội ngũ môi giới chuyên nghiệp sẵn sàng tư vấn và đồng hành trong mọi quyết định.',
        icon: <StarIcon />,
        stat: '24/7',
        statLabel: 'Hỗ trợ',
    },
    {
        num: '03',
        title: 'Cộng Đồng 12,000+ Khách Hàng',
        text: 'Mạng lưới khách hàng và đối tác rộng lớn, tạo hệ sinh thái bất động sản bền vững.',
        icon: <PeopleIcon />,
        stat: '12K+',
        statLabel: 'Khách hàng',
    },
];

/* ── Forest green palette ── */
const FOREST = {
    bg: '#0D1F12',   // near-black forest
    bgDeep: '#091610',   // deepest shadow
    mid: '#1A3320',   // mid forest
    card: 'rgba(26, 51, 32, 0.75)',   // card glass
    cardAccent: 'rgba(34, 72, 42, 0.90)',   // center card
    border: 'rgba(74, 130, 82, 0.18)',  // soft green border
    borderAccent: 'rgba(94, 170, 100, 0.40)', // accent border
    accent: '#4A8A52',   // sage green accent
    accentLight: '#7DBF82',   // light sage
    gold: '#C8A84B',   // warm gold stays for contrast
    text: 'rgba(220, 240, 220, 0.88)',
    textMuted: 'rgba(180, 210, 180, 0.45)',
    textFaint: 'rgba(140, 180, 140, 0.20)',
    divider: 'rgba(74, 130, 82, 0.15)',
};

export default function VisionSection() {
    return (
        <section id="vision" style={{
            padding: 0,
            position: 'relative',
            overflow: 'hidden',
            minHeight: '620px',
            background: FOREST.bg,
        }}>

            {/* ── Full bleed background image với green overlay ── */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'url("https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=80")',
                backgroundSize: 'cover',
                backgroundPosition: 'center 40%',
                backgroundAttachment: 'fixed',
                transform: 'scale(1.03)',
            }} />

            {/* Forest green overlay — deep gradient */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(160deg, ${FOREST.bgDeep}EE 0%, ${FOREST.bg}CC 40%, ${FOREST.bgDeep}F5 100%)`,
            }} />

            {/* Subtle green radial glow */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(ellipse 70% 60% at 60% 50%, rgba(34,90,42,0.25) 0%, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            {/* Top accent line — sage green */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0,
                height: '3px',
                background: `linear-gradient(to right, ${FOREST.accentLight} 0%, transparent 60%)`,
            }} />

            {/* ── Content ── */}
            <div style={{ position: 'relative', zIndex: 2, padding: '5rem 5vw' }}>

                {/* Header */}
                <div className="e-reveal" style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    marginBottom: '3.5rem',
                    flexWrap: 'wrap',
                    gap: '1.5rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem' }}>
                        <span style={{
                            fontFamily: 'var(--e-serif)',
                            fontSize: 'clamp(4rem, 7vw, 7rem)',
                            fontWeight: 200,
                            color: FOREST.textFaint,
                            lineHeight: 1,
                            letterSpacing: '-0.04em',
                            userSelect: 'none',
                        }}>03</span>
                        <div>
                            <div style={{
                                fontSize: '0.65rem',
                                letterSpacing: '0.24em',
                                textTransform: 'uppercase',
                                color: FOREST.accentLight,
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '0.8rem',
                                fontFamily: 'var(--e-sans)',
                            }}>
                                <span style={{ display: 'block', width: '22px', height: '2px', background: FOREST.accentLight }} />
                                Triết Lý
                            </div>
                            <h2 style={{
                                fontFamily: 'var(--e-serif)',
                                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                                fontWeight: 500,
                                lineHeight: 1.12,
                                color: FOREST.text,
                                letterSpacing: '-0.02em',
                                margin: 0,
                            }}>
                                Kiến Tạo{' '}
                                <em style={{ fontStyle: 'italic', fontWeight: 200, color: FOREST.textMuted }}>
                                    Giá Trị
                                </em>
                            </h2>
                        </div>
                    </div>

                    {/* Pull quote */}
                    <p style={{
                        fontFamily: 'var(--e-serif)',
                        fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
                        fontStyle: 'italic',
                        fontWeight: 200,
                        color: FOREST.textMuted,
                        lineHeight: 1.65,
                        maxWidth: '360px',
                        textAlign: 'right',
                        borderRight: `2px solid ${FOREST.accent}`,
                        paddingRight: '1.2rem',
                    }}>
                        "Không chỉ kết nối — chúng tôi tạo ra trải nghiệm sống đáng nhớ."
                    </p>
                </div>

                {/* ── 3 Feature cards ── */}
                <div className="e-reveal" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '2px',
                }}>
                    {FEATURES.map((f, i) => (
                        <div
                            key={f.num}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0,
                                padding: '2.5rem',
                                background: i === 1 ? FOREST.cardAccent : FOREST.card,
                                border: `1px solid ${i === 1 ? FOREST.borderAccent : FOREST.border}`,
                                backdropFilter: 'blur(14px)',
                                position: 'relative',
                                overflow: 'hidden',
                                transition: 'transform 0.4s var(--e-ease), background 0.3s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-4px)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                        >
                            {/* BG number texture */}
                            <span style={{
                                position: 'absolute', bottom: '-1.5rem', right: '-0.5rem',
                                fontFamily: 'var(--e-serif)', fontSize: '8rem', fontWeight: 700,
                                color: i === 1 ? 'rgba(94,170,100,0.07)' : 'rgba(255,255,255,0.03)',
                                lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
                            }}>{f.num}</span>

                            {/* Top: icon + stat */}
                            <div style={{
                                display: 'flex', alignItems: 'flex-start',
                                justifyContent: 'space-between', marginBottom: '2rem',
                            }}>
                                <div style={{
                                    width: '44px', height: '44px',
                                    border: `1px solid ${i === 1 ? FOREST.borderAccent : FOREST.border}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    background: i === 1 ? 'rgba(94,170,100,0.10)' : 'rgba(74,130,82,0.08)',
                                    transition: 'background 0.3s, border-color 0.3s, transform 0.3s',
                                }}>
                                    {f.icon}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{
                                        fontFamily: 'var(--e-serif)', fontSize: '2rem', fontWeight: 500,
                                        color: i === 1 ? FOREST.accentLight : FOREST.text,
                                        lineHeight: 1, letterSpacing: '-0.02em',
                                    }}>{f.stat}</div>
                                    <div style={{
                                        fontFamily: 'var(--e-sans)', fontSize: '0.60rem',
                                        letterSpacing: '0.16em', textTransform: 'uppercase',
                                        color: FOREST.textMuted, fontWeight: 600, marginTop: '3px',
                                    }}>{f.statLabel}</div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{
                                width: '100%', height: '1px',
                                background: i === 1 ? FOREST.borderAccent : FOREST.divider,
                                marginBottom: '1.5rem',
                            }} />

                            {/* Title + text */}
                            <div style={{
                                fontFamily: 'var(--e-sans)', fontSize: '0.86rem', fontWeight: 700,
                                color: i === 1 ? FOREST.text : 'rgba(200,230,200,0.80)',
                                marginBottom: '0.6rem', letterSpacing: '0.01em',
                            }}>{f.title}</div>
                            <div style={{
                                fontFamily: 'var(--e-sans)', fontSize: '0.78rem',
                                color: FOREST.textMuted, lineHeight: 1.72, fontWeight: 400,
                            }}>{f.text}</div>

                            {/* Bottom index */}
                            <div style={{
                                marginTop: '2rem',
                                fontFamily: 'var(--e-sans)', fontSize: '0.58rem',
                                letterSpacing: '0.20em', textTransform: 'uppercase',
                                color: i === 1 ? FOREST.accentLight : FOREST.textFaint,
                                fontWeight: 700,
                            }}>— {f.num}</div>
                        </div>
                    ))}
                </div>

                {/* ── Bottom strip ── */}
                <div className="e-reveal" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: '2.5rem', paddingTop: '1.5rem',
                    borderTop: `1px solid ${FOREST.divider}`,
                    flexWrap: 'wrap', gap: '1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        {[
                            { num: '2,400+', label: 'Bất động sản' },
                            { num: '63', label: 'Tỉnh thành' },
                            { num: '98%', label: 'Pháp lý xác minh' },
                        ].map((s) => (
                            <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{
                                    fontFamily: 'var(--e-serif)', fontSize: '1.1rem', fontWeight: 500,
                                    color: FOREST.text, letterSpacing: '-0.01em',
                                }}>{s.num}</span>
                                <span style={{
                                    fontFamily: 'var(--e-sans)', fontSize: '0.62rem',
                                    letterSpacing: '0.12em', textTransform: 'uppercase',
                                    color: FOREST.textMuted, fontWeight: 600,
                                }}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                    <span style={{
                        fontFamily: 'var(--e-sans)', fontSize: '0.62rem',
                        letterSpacing: '0.16em', textTransform: 'uppercase',
                        color: FOREST.textFaint, fontWeight: 600,
                    }}>Est. 2018 · TP. Hồ Chí Minh</span>
                </div>
            </div>

            <style>{`
                @media (max-width: 768px) {
                    #vision [style*="repeat(3"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </section>
    );
}

function ShieldIcon() {
    return <svg width={18} height={18} viewBox="0 0 24 24" stroke="#7DBF82" fill="none" strokeWidth={1.5}><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9c0-1.01-.13-1.99-.382-2.916z" /></svg>;
}
function StarIcon() {
    return <svg width={18} height={18} viewBox="0 0 24 24" stroke="#7DBF82" fill="none" strokeWidth={1.5}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>;
}
function PeopleIcon() {
    return <svg width={18} height={18} viewBox="0 0 24 24" stroke="#7DBF82" fill="none" strokeWidth={1.5}><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>;
}