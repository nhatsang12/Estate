import { useState, useRef } from 'react';

/* ─── Showcase data ─── */
const SHOWCASES = [
    {
        id: 1,
        frame: '01',
        tag: 'Villa · Thủ Đức',
        title: 'Villa\nLumière',
        sub: 'Kiến trúc Pháp — không gian sống đẳng cấp',
        area: '420 m²',
        price: '85 tỷ',
        img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=85',
        accent: '#C8A84B',
    },
    {
        id: 2,
        frame: '02',
        tag: 'Penthouse · Bình Thạnh',
        title: 'Skyline\nResidence',
        sub: 'Tầm nhìn 360° toàn thành phố',
        area: '310 m²',
        price: '62 tỷ',
        img: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=85',
        accent: '#C8A84B',
    },
    {
        id: 3,
        frame: '03',
        tag: 'Biệt Thự · Quận 7',
        title: 'Maison\nIndochine',
        sub: 'Nhà phố thiết kế — bản sắc Đông Dương',
        area: '210 m²',
        price: '45 tỷ',
        img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=85',
        accent: '#C8A84B',
    },
    {
        id: 4,
        frame: '04',
        tag: 'Căn Hộ · Quận 2',
        title: 'The\nRiviera',
        sub: 'Không gian sống hiện đại ven sông',
        area: '148 m²',
        price: '32 tỷ',
        img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85',
        accent: '#C8A84B',
    },
    {
        id: 5,
        frame: '05',
        tag: 'Garden Villa · Nhà Bè',
        title: 'Green\nEstate',
        sub: 'Biệt thự vườn — hòa mình với thiên nhiên',
        area: '580 m²',
        price: '110 tỷ',
        img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=85',
        accent: '#C8A84B',
    },
];

export default function GallerySection() {
    const [active, setActive] = useState(0);
    const [hov, setHov] = useState<number | null>(null);
    const stripRef = useRef<HTMLDivElement>(null);

    const scrollTo = (idx: number) => {
        setActive(idx);
        const strip = stripRef.current;
        if (!strip) return;
        const card = strip.children[idx] as HTMLElement;
        if (!card) return;
        const offset = card.offsetLeft - (strip.clientWidth / 2) + (card.offsetWidth / 2);
        strip.scrollTo({ left: offset, behavior: 'smooth' });
    };

    const prev = () => scrollTo(Math.max(0, active - 1));
    const next = () => scrollTo(Math.min(SHOWCASES.length - 1, active + 1));

    return (
        <>
            <style>{`
                /* ══════════════════════════════════════════════════
                   GALLERY — CINEMATIC SHOWCASE
                ══════════════════════════════════════════════════ */

                /*
                 * FIX: isolation:isolate + position:relative on cs-root
                 * contains ALL stacking contexts created by CSS animations
                 * (csFadeIn uses transform → creates stacking context).
                 * Without this the animated children punch through the
                 * sticky search bar even at z-index:200.
                 */
                .cs-root {
                    background: #F0EDE8;
                    position: relative;
                    overflow: hidden;
                    font-family: var(--e-sans);
                    isolation: isolate;
                }

                .cs-header {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    padding: 3rem clamp(1.5rem, 5vw, 5rem) 2.5rem;
                    position: relative;
                    z-index: 10;
                    border-bottom: 1px solid rgba(184,151,74,0.2);
                }

                .cs-header-left { display: flex; flex-direction: column; gap: 0.5rem; }

                .cs-eyebrow {
                    display: flex;
                    align-items: center;
                    gap: 0.7rem;
                    font-size: 0.65rem;
                    font-weight: 700;
                    letter-spacing: 0.25em;
                    text-transform: uppercase;
                    color: var(--e-gold, #C8A84B);
                }
                .cs-eyebrow-line { width: 28px; height: 1px; background: var(--e-gold, #C8A84B); }

                .cs-title {
                    font-family: var(--e-serif);
                    font-size: clamp(1.9rem, 3.5vw, 3rem);
                    font-weight: 400;
                    color: var(--e-charcoal, #1A1714);
                    letter-spacing: -0.02em;
                    line-height: 1.1;
                    margin: 0;
                }
                .cs-title em { font-style: italic; color: var(--e-gold, #C8A84B); }

                .cs-counter {
                    font-family: var(--e-serif);
                    font-size: 0.82rem;
                    font-style: italic;
                    color: rgba(26,23,20,0.3);
                    align-self: flex-end;
                    letter-spacing: 0.1em;
                }
                .cs-counter span { color: var(--e-gold, #C8A84B); }

                .cs-nav {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    align-self: flex-end;
                }
                .cs-nav-btn {
                    width: 44px; height: 44px;
                    border: 1px solid rgba(26,23,20,0.15);
                    background: transparent;
                    color: rgba(26,23,20,0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: background 0.25s, border-color 0.25s, color 0.25s, transform 0.25s;
                }
                .cs-nav-btn:hover:not(:disabled) {
                    background: var(--e-gold, #C8A84B);
                    border-color: var(--e-gold, #C8A84B);
                    color: #fff;
                    transform: scale(1.05);
                }
                .cs-nav-btn:disabled { opacity: 0.2; cursor: not-allowed; }

                .cs-strip-wrap {
                    position: relative;
                    z-index: 2;
                    padding: 3rem 0 3.5rem;
                }

                .cs-strip {
                    display: flex;
                    gap: 6px;
                    overflow-x: auto;
                    scroll-behavior: smooth;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    padding: 0 clamp(1.5rem, 5vw, 5rem);
                    scroll-snap-type: x mandatory;
                }
                .cs-strip::-webkit-scrollbar { display: none; }

                .cs-card {
                    position: relative;
                    flex-shrink: 0;
                    overflow: hidden;
                    cursor: pointer;
                    scroll-snap-align: center;
                    transition: width 0.6s cubic-bezier(0.22,1,0.36,1);
                    background: #111;
                }

                .cs-card.is-active {
                    width: clamp(420px, 50vw, 660px);
                    height: 540px;
                }
                .cs-card:not(.is-active) {
                    width: clamp(180px, 16vw, 240px);
                    height: 540px;
                    filter: brightness(0.72);
                }
                .cs-card:not(.is-active):hover { filter: brightness(0.85); }

                .cs-img {
                    position: absolute;
                    inset: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    display: block;
                    transition:
                        transform 1.2s cubic-bezier(0.25,0.46,0.45,0.94),
                        filter 0.7s ease;
                    filter: brightness(0.82) saturate(0.88);
                }
                .cs-card.is-active .cs-img { filter: brightness(0.6) saturate(0.9); }
                .cs-card.is-active:hover .cs-img { transform: scale(1.04); }

                .cs-perfs {
                    position: absolute;
                    left: 0; right: 0;
                    display: flex;
                    justify-content: space-around;
                    z-index: 4;
                    pointer-events: none;
                }
                .cs-perfs.top { top: 12px; }
                .cs-perfs.bottom { bottom: 12px; }
                .cs-perf {
                    width: 10px; height: 14px;
                    border: 1.5px solid rgba(255,255,255,0.2);
                    border-radius: 2px;
                    background: rgba(0,0,0,0.3);
                }

                .cs-frame-num {
                    position: absolute;
                    top: 2.5rem; left: 1.5rem;
                    font-family: var(--e-serif);
                    font-size: clamp(3rem, 5vw, 5.5rem);
                    font-weight: 300;
                    line-height: 1;
                    color: transparent;
                    -webkit-text-stroke: 1px rgba(200,168,75,0.5);
                    letter-spacing: -0.04em;
                    z-index: 3;
                    pointer-events: none;
                    user-select: none;
                    transition: -webkit-text-stroke-color 0.35s;
                }
                .cs-card.is-active .cs-frame-num {
                    -webkit-text-stroke-color: rgba(200,168,75,0.9);
                }

            
                .cs-card.is-active .cs-tag { opacity: 1; transform: translateY(0); }

                .cs-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        to top,
                        rgba(15,12,10,0.92) 0%,
                        rgba(15,12,10,0.45) 42%,
                        rgba(15,12,10,0.05) 68%,
                        transparent 100%
                    );
                    z-index: 2;
                    pointer-events: none;
                }

                .cs-info {
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    z-index: 3;
                    padding: 2rem 1.8rem 2.2rem;
                }
                .cs-card.is-active .cs-info { padding: 2.5rem 2.2rem 2.8rem; }

                .cs-prop-title {
                    font-family: var(--e-serif);
                    font-weight: 400;
                    color: #fff;
                    line-height: 1.08;
                    letter-spacing: -0.02em;
                    margin: 0 0 0.65rem;
                    white-space: pre-line;
                    font-size: clamp(1.2rem, 2vw, 1.6rem);
                    transition: color 0.25s;
                }
                .cs-card.is-active .cs-prop-title {
                    font-size: clamp(1.9rem, 3vw, 2.8rem);
                    margin-bottom: 0.8rem;
                }

                .cs-sub {
                    font-family: var(--e-serif);
                    font-size: 0.78rem;
                    font-style: italic;
                    color: rgba(255,255,255,0.55);
                    margin-bottom: 1.3rem;
                    line-height: 1.5;
                    display: none;
                }
                .cs-card.is-active .cs-sub { display: block; }

                .cs-divider {
                    width: 100%;
                    height: 1px;
                    background: linear-gradient(90deg, rgba(200,168,75,0.5), transparent);
                    margin-bottom: 1.1rem;
                }

                .cs-footer {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 0.75rem;
                }

                .cs-price-wrap { display: flex; flex-direction: column; gap: 0.15rem; }
                .cs-price-lbl {
                    font-size: 0.52rem;
                    font-weight: 700;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.45);
                }
                .cs-price {
                    font-family: var(--e-serif);
                    font-style: italic;
                    color: #fff;
                    font-size: 1.05rem;
                    line-height: 1;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.4);
                }
                .cs-card.is-active .cs-price { font-size: 1.55rem; }

                .cs-area-pill {
                    font-size: 0.55rem;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.6);
                    border: 1px solid rgba(255,255,255,0.25);
                    padding: 5px 12px;
                    backdrop-filter: blur(8px);
                    display: none;
                }
                .cs-card.is-active .cs-area-pill { display: inline-block; }

                .cs-dots {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 0 0 3rem;
                    position: relative;
                    z-index: 10;
                }
                .cs-dot {
                    height: 2px;
                    border-radius: 2px;
                    background: rgba(26,23,20,0.18);
                    cursor: pointer;
                    transition: background 0.3s, width 0.35s cubic-bezier(0.22,1,0.36,1);
                    width: 24px;
                }
                .cs-dot.is-active { background: var(--e-gold, #C8A84B); width: 44px; }

                .cs-cta-strip {
                    border-top: 1px solid rgba(184,151,74,0.2);
                    padding: 2rem clamp(1.5rem, 5vw, 5rem);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 2rem;
                    position: relative;
                    z-index: 10;
                }
                .cs-cta-text {
                    font-family: var(--e-serif);
                    font-size: clamp(1rem, 2vw, 1.3rem);
                    font-style: italic;
                    color: rgba(26,23,20,0.35);
                    font-weight: 300;
                }
                .cs-cta-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    font-family: var(--e-sans);
                    font-size: 0.68rem;
                    font-weight: 700;
                    letter-spacing: 0.16em;
                    text-transform: uppercase;
                    color: #fff;
                    text-decoration: none;
                    padding: 13px 28px;
                    background: var(--e-charcoal, #1A1714);
                    border: 1px solid var(--e-charcoal, #1A1714);
                    transition: background 0.25s, color 0.25s, border-color 0.25s, gap 0.25s;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .cs-cta-link:hover {
                    background: var(--e-gold, #C8A84B);
                    border-color: var(--e-gold, #C8A84B);
                    color: #fff;
                    gap: 16px;
                }
                .cs-cta-link svg { transition: transform 0.3s; }
                .cs-cta-link:hover svg { transform: translateX(4px); }

                /*
                 * FIX: animations now use opacity+transform only — no stacking context leaks.
                 * Previously csFadeIn on .cs-header/.cs-strip-wrap/.cs-cta-strip was creating
                 * stacking contexts that punched through the sticky search bar.
                 * Removed animation from those elements; entrance feel kept via cs-card transitions.
                 */

                @media (max-width: 768px) {
                    .cs-card.is-active  { width: 78vw; height: 440px; }
                    .cs-card:not(.is-active) { width: 44vw; height: 440px; }
                    .cs-cta-strip { flex-direction: column; align-items: flex-start; }
                }
                @media (max-width: 480px) {
                    .cs-card.is-active  { width: 85vw; height: 380px; }
                    .cs-card:not(.is-active) { width: 48vw; height: 380px; }
                }
            `}</style>

            
        </>
    );
}
