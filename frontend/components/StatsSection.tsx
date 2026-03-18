const STATS = [
    { num: '2,400', sup: '+', label: 'Bất Động Sản Đang Rao', desc: 'cập nhật mỗi ngày' },
    { num: '12,000', sup: '+', label: 'Khách Hàng Hài Lòng', desc: 'trên toàn quốc' },
    { num: '63', sup: '', label: 'Tỉnh Thành Phủ Sóng', desc: 'từ Bắc vào Nam' },
    { num: '98', sup: '%', label: 'Tỷ Lệ Xác Minh', desc: 'pháp lý minh bạch' },
];

export default function StatsSection() {
    return (
        <section className="e-stats e-reveal" style={{ padding: '0' }}>
            {/* Top label bar */}
            <div style={{
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                padding: '1.4rem 5vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div className="e-section-label" style={{ marginBottom: 0 }}>
                    Con Số Thực Tế
                </div>
                <span style={{
                    fontFamily: 'var(--e-serif)',
                    fontSize: '0.82rem',
                    fontStyle: 'italic',
                    color: 'rgba(255,255,255,0.20)',
                    fontWeight: 300,
                }}>
                    "Minh bạch — Tin cậy — Bền vững"
                </span>
            </div>

            {/* Stats row — full bleed, no outer padding */}
            <div className="e-stats-grid" style={{ marginTop: 0 }}>
                {STATS.map((s, i) => (
                    <div key={s.label} className="e-stat-item" style={{
                        padding: '3rem 5vw 3rem',
                        paddingLeft: i === 0 ? '5vw' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '1rem',
                    }}>
                        {/* Index number */}
                        <span style={{
                            fontFamily: 'var(--e-sans)',
                            fontSize: '0.58rem',
                            letterSpacing: '0.20em',
                            color: 'var(--e-gold)',
                            fontWeight: 700,
                        }}>
                            0{i + 1}
                        </span>

                        {/* Big number */}
                        <div className="e-stat-num" style={{
                            fontSize: 'clamp(2.6rem, 4.5vw, 4rem)',
                            /* Stagger baseline with margin-top */
                            marginTop: `${i * 0.5}rem`,
                        }}>
                            {s.num}
                            {s.sup && <sup>{s.sup}</sup>}
                        </div>

                        {/* Label + desc */}
                        <div>
                            <div className="e-stat-label">{s.label}</div>
                            <div style={{
                                fontFamily: 'var(--e-sans)',
                                fontSize: '0.70rem',
                                color: 'rgba(255,255,255,0.18)',
                                marginTop: '4px',
                                fontWeight: 400,
                                fontStyle: 'italic',
                            }}>
                                {s.desc}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom accent line */}
            <div style={{
                height: '3px',
                background: 'linear-gradient(to right, var(--e-gold) 0%, transparent 60%)',
            }} />
        </section>
    );
}