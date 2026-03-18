import { useState } from 'react';

const GALLERY = [
    { src: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80', label: 'Căn Hộ Cao Cấp', loc: 'Quận 1', h: 320 },
    { src: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80', label: 'Biệt Thự Vườn', loc: 'Thủ Đức', h: 220 },
    { src: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=600&q=80', label: 'Penthouse View', loc: 'Bình Thạnh', h: 280 },
    { src: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80', label: 'Studio Hiện Đại', loc: 'Quận 7', h: 360 },
    { src: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80', label: 'Villa Sân Vườn', loc: 'Nhà Bè', h: 240 },
    { src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', label: 'Nhà Phố Thiết Kế', loc: 'Quận 3', h: 300 },
    { src: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80', label: 'Shophouse Góc', loc: 'Gò Vấp', h: 260 },
    { src: 'https://images.unsplash.com/photo-1625602812206-5ec545ca1231?w=600&q=80', label: 'Đất Nền View Sông', loc: 'Long An', h: 340 },
    { src: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80', label: 'Villa Lumière', loc: 'TP.HCM', h: 220 },
    { src: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80', label: 'Sky Residence', loc: 'Quận 2', h: 290 },
    { src: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80', label: 'Green Valley', loc: 'Bình Dương', h: 250 },
    { src: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80', label: 'Riverside Manor', loc: 'Quận 9', h: 310 },
];

export default function GallerySection() {
    const [hovered, setHovered] = useState<number | null>(null);
    const [lightbox, setLightbox] = useState<number | null>(null);

    /* Split into 4 columns — distribute items sequentially */
    const cols: typeof GALLERY[] = [[], [], [], []];
    GALLERY.forEach((img, i) => cols[i % 4].push(img));

    return (
        <section className="e-gallery" id="gallery" style={{ padding: '5rem 5vw', background: 'var(--e-ivory)' }}>

            {/* ── Header ── */}
            <div className="e-gallery-header e-reveal" style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem' }}>
                    <span style={{
                        fontFamily: 'var(--e-serif)',
                        fontSize: 'clamp(4rem, 7vw, 7rem)',
                        fontWeight: 200,
                        color: 'var(--e-beige)',
                        lineHeight: 1,
                        letterSpacing: '-0.04em',
                        userSelect: 'none',
                    }}>04</span>
                    <div>
                        <div className="e-section-label">Cảm Hứng</div>
                        <h2 className="e-section-title">
                            Thư Viện <em>Ảnh</em>
                        </h2>
                    </div>
                </div>
                <a href="#" className="e-view-all">
                    Xem thêm
                    <svg width={14} height={14} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.5}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                </a>
            </div>

            {/* ── Masonry 4 columns ── */}
            <div className="e-reveal" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '3px',
                alignItems: 'start',
            }}>
                {cols.map((col, ci) => (
                    <div key={ci} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        /* Stagger columns vertically */
                        marginTop: ci % 2 === 1 ? '40px' : '0',
                    }}>
                        {col.map((img) => {
                            const globalIdx = GALLERY.indexOf(img);
                            const isHov = hovered === globalIdx;

                            return (
                                <div
                                    key={globalIdx}
                                    style={{
                                        position: 'relative',
                                        overflow: 'hidden',
                                        height: `${img.h}px`,
                                        background: 'var(--e-dark)',
                                        cursor: 'none',
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={() => setHovered(globalIdx)}
                                    onMouseLeave={() => setHovered(null)}
                                    onClick={() => setLightbox(globalIdx)}
                                >
                                    {/* Image */}
                                    <img
                                        src={img.src}
                                        alt={img.label}
                                        loading="lazy"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            display: 'block',
                                            transform: isHov ? 'scale(1.07)' : 'scale(1)',
                                            filter: isHov ? 'brightness(0.65) saturate(1.1)' : 'brightness(1)',
                                            transition: 'transform 0.75s var(--e-ease), filter 0.5s',
                                        }}
                                    />

                                    {/* Index top-left */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px', left: '12px',
                                        fontFamily: 'var(--e-serif)',
                                        fontSize: '1rem',
                                        fontWeight: 200,
                                        color: isHov ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.22)',
                                        lineHeight: 1,
                                        transition: 'color 0.3s',
                                        zIndex: 2,
                                    }}>
                                        {String(globalIdx + 1).padStart(2, '0')}
                                    </div>

                                    {/* Vermilion left bar */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, bottom: 0,
                                        width: '3px',
                                        background: 'var(--e-gold)',
                                        transform: isHov ? 'scaleY(1)' : 'scaleY(0)',
                                        transformOrigin: 'bottom',
                                        transition: 'transform 0.45s var(--e-ease)',
                                        zIndex: 3,
                                    }} />

                                    {/* Caption — slides up */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0, left: 0, right: 0,
                                        padding: '1.8rem 1.2rem 1.1rem',
                                        background: 'linear-gradient(to top, rgba(10,9,8,0.92) 0%, transparent 100%)',
                                        transform: isHov ? 'translateY(0)' : 'translateY(14px)',
                                        opacity: isHov ? 1 : 0,
                                        transition: 'transform 0.4s var(--e-ease), opacity 0.35s',
                                        zIndex: 2,
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            fontFamily: 'var(--e-sans)',
                                            fontSize: '0.55rem',
                                            letterSpacing: '0.18em',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            color: 'var(--e-gold-light)',
                                            marginBottom: '4px',
                                        }}>
                                            <svg width={8} height={8} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2.5}>
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                                            </svg>
                                            {img.loc}
                                        </div>
                                        <div style={{
                                            fontFamily: 'var(--e-serif)',
                                            fontSize: '0.95rem',
                                            fontWeight: 500,
                                            color: 'var(--e-white)',
                                            letterSpacing: '-0.01em',
                                            lineHeight: 1.25,
                                        }}>{img.label}</div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            marginTop: '7px',
                                            fontFamily: 'var(--e-sans)',
                                            fontSize: '0.58rem',
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            fontWeight: 700,
                                            color: 'rgba(255,255,255,0.38)',
                                        }}>
                                            Xem chi tiết
                                            <svg width={9} height={9} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2.5}>
                                                <path d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* ── Lightbox ── */}
            {lightbox !== null && (
                <div
                    onClick={() => setLightbox(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(10,9,8,0.96)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'none',
                    }}
                >
                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                        <img
                            src={GALLERY[lightbox].src.replace('w=600', 'w=1200')}
                            alt={GALLERY[lightbox].label}
                            style={{ maxWidth: '82vw', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '1.5rem',
                            background: 'linear-gradient(to top, rgba(10,9,8,0.90) 0%, transparent 100%)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                        }}>
                            <div>
                                <div style={{ fontFamily: 'var(--e-sans)', fontSize: '0.58rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--e-gold-light)', fontWeight: 700, marginBottom: '4px' }}>
                                    {GALLERY[lightbox].loc}
                                </div>
                                <div style={{ fontFamily: 'var(--e-serif)', fontSize: '1.2rem', fontWeight: 500, color: 'white' }}>
                                    {GALLERY[lightbox].label}
                                </div>
                            </div>
                            <div style={{ fontFamily: 'var(--e-sans)', fontSize: '0.62rem', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase' }}>
                                {String(lightbox + 1).padStart(2, '0')} / {String(GALLERY.length).padStart(2, '0')}
                            </div>
                        </div>

                        {lightbox > 0 && (
                            <button onClick={() => setLightbox(l => l! - 1)}
                                style={{ position: 'absolute', left: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: '1px solid rgba(255,255,255,0.18)', color: 'white', width: '40px', height: '40px', cursor: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width={14} height={14} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            </button>
                        )}
                        {lightbox < GALLERY.length - 1 && (
                            <button onClick={() => setLightbox(l => l! + 1)}
                                style={{ position: 'absolute', right: '-3.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: '1px solid rgba(255,255,255,0.18)', color: 'white', width: '40px', height: '40px', cursor: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width={14} height={14} viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </button>
                        )}
                        <button onClick={() => setLightbox(null)}
                            style={{ position: 'absolute', top: '-2.5rem', right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'var(--e-sans)', fontWeight: 700, cursor: 'none' }}>
                            Đóng ✕
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}