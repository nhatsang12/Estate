import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // ─── Dùng AuthContext.login() → tự lưu token vào localStorage ──
            await login({ email: form.email, password: form.password });

            // ─── Lấy role từ API /users/me sau khi đã có token ───────────
            const token = window.localStorage.getItem('estate_manager_token');
            if (!token) throw new Error('Đăng nhập thất bại');

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });
            const data = await res.json();
            const role = data.data?.user?.role;

            // ─── Redirect theo role ───────────────────────────────────────
            if (role === 'admin') {
                router.push('/admin/dashboard');
            } else if (role === 'provider') {
                router.push('/provider/dashboard');
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <Head>
                <title>Đăng Nhập — Estoria</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className="estoria" style={{ minHeight: '100vh', background: 'var(--e-ivory)' }}>

                {/* ── Navbar ── */}
                <nav style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                    height: 70, padding: '0 5vw',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(18px)',
                    borderBottom: '1px solid rgba(140,110,63,0.15)',
                }}>
                    <Link href="/" style={{
                        fontFamily: 'var(--e-serif)', fontSize: '1.55rem', fontWeight: 600,
                        letterSpacing: '0.04em', color: 'var(--e-charcoal)', textDecoration: 'none',
                    }}>
                        Esto<span style={{ color: 'var(--e-gold-light)' }}>ria</span>
                    </Link>
                    <span style={{ fontSize: '0.78rem', color: 'var(--e-muted)', fontWeight: 500, letterSpacing: '0.06em' }}>
                        Chưa có tài khoản?{' '}
                        <Link href="/auth/register" style={{ color: 'var(--e-gold)', textDecoration: 'none', fontWeight: 600 }}>
                            Đăng ký
                        </Link>
                    </span>
                </nav>

                {/* ── Main Layout ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    minHeight: '100vh',
                }}>

                    {/* ── Left: Visual Panel ── */}
                    <div style={{
                        position: 'relative',
                        overflow: 'hidden',
                        background: 'var(--e-charcoal)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '5vw',
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: 'url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: 0.35,
                        }} />
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(to bottom, rgba(17,28,20,0.3) 0%, rgba(17,28,20,0.85) 100%)',
                        }} />
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
                            opacity: 0.4, pointerEvents: 'none',
                        }} />

                        <div style={{ position: 'relative', zIndex: 2 }}>
                            {/* Redirect notice */}
                            <div style={{
                                display: 'inline-block',
                                fontSize: '0.68rem', letterSpacing: '0.20em', textTransform: 'uppercase',
                                color: 'var(--e-gold-light)', fontFamily: 'var(--e-sans)', fontWeight: 500,
                                border: '1px solid rgba(184,146,78,0.45)', padding: '6px 14px',
                                marginBottom: '1.5rem',
                            }}>
                                Chào Mừng Trở Lại
                            </div>

                            <h2 style={{
                                fontFamily: 'var(--e-serif)',
                                fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                                fontWeight: 500, color: 'var(--e-white)',
                                lineHeight: 1.15, marginBottom: '1rem',
                            }}>
                                Khám phá bất động sản<br />
                                <em style={{ fontStyle: 'italic', color: 'var(--e-gold-light)', fontWeight: 400 }}>cao cấp nhất</em>
                            </h2>
                            <p style={{
                                fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)',
                                lineHeight: 1.8, fontWeight: 300, maxWidth: 380,
                                marginBottom: '2.5rem',
                            }}>
                                Hơn 10,000 bất động sản cao cấp được tuyển chọn kỹ lưỡng. Kết nối với chủ nhà uy tín, thanh toán an toàn.
                            </p>

                            <div style={{ display: 'flex', gap: '2.5rem' }}>
                                {[
                                    { num: '10K+', label: 'Bất động sản' },
                                    { num: '5K+', label: 'Khách hàng' },
                                    { num: '98%', label: 'Hài lòng' },
                                ].map((s) => (
                                    <div key={s.label}>
                                        <div style={{
                                            fontFamily: 'var(--e-serif)', fontSize: '1.6rem',
                                            fontWeight: 500, color: 'var(--e-white)', lineHeight: 1,
                                        }}>{s.num}</div>
                                        <div style={{
                                            fontSize: '0.65rem', letterSpacing: '0.12em',
                                            textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
                                            marginTop: 4,
                                        }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Form Panel ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '7rem 5vw 4rem',
                        background: 'var(--e-ivory)',
                    }}>
                        <div style={{ width: '100%', maxWidth: 420 }}>

                            <div style={{ marginBottom: '2.8rem' }}>
                                <div className="e-section-label" style={{ marginBottom: '0.8rem' }}>
                                    Tài Khoản
                                </div>
                                <h1 style={{
                                    fontFamily: 'var(--e-serif)',
                                    fontSize: 'clamp(2rem, 3vw, 2.6rem)',
                                    fontWeight: 500, color: 'var(--e-charcoal)',
                                    lineHeight: 1.15, marginBottom: '0.6rem',
                                }}>
                                    Đăng <em style={{ fontStyle: 'italic', color: 'var(--e-muted)', fontWeight: 400 }}>nhập</em>
                                </h1>
                                <p style={{ fontSize: '0.85rem', color: 'var(--e-muted)', fontWeight: 300, lineHeight: 1.7 }}>
                                    Nhập thông tin để tiếp tục trải nghiệm.
                                </p>
                            </div>

                            {error && (
                                <div style={{
                                    border: '1px solid #f5c6c6', background: '#fdf2f2',
                                    padding: '12px 16px', borderRadius: 2,
                                    fontSize: '0.83rem', color: '#c0392b', marginBottom: '1.5rem',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                }}>
                                    <span>⚠</span> {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

                                <div>
                                    <label style={{
                                        display: 'block', fontSize: '0.62rem', letterSpacing: '0.14em',
                                        textTransform: 'uppercase', color: 'var(--e-light-muted)',
                                        fontWeight: 600, marginBottom: 8,
                                    }}>Email</label>
                                    <input
                                        type="email" name="email" required
                                        value={form.email} onChange={handleChange}
                                        placeholder="your@email.com"
                                        style={{
                                            width: '100%', padding: '14px 16px',
                                            fontFamily: 'var(--e-sans)', fontSize: '0.9rem',
                                            border: '1px solid var(--e-beige)',
                                            background: 'var(--e-white)', color: 'var(--e-charcoal)',
                                            outline: 'none', transition: 'border-color 0.2s',
                                            borderRadius: 0,
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--e-beige)'}
                                    />
                                </div>

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <label style={{
                                            fontSize: '0.62rem', letterSpacing: '0.14em',
                                            textTransform: 'uppercase', color: 'var(--e-light-muted)', fontWeight: 600,
                                        }}>Mật Khẩu</label>
                                        <Link href="/auth/forgot-password" style={{
                                            fontSize: '0.72rem', color: 'var(--e-gold)', textDecoration: 'none', fontWeight: 500,
                                        }}>Quên mật khẩu?</Link>
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password" required
                                            value={form.password} onChange={handleChange}
                                            placeholder="••••••••"
                                            style={{
                                                width: '100%', padding: '14px 44px 14px 16px',
                                                fontFamily: 'var(--e-sans)', fontSize: '0.9rem',
                                                border: '1px solid var(--e-beige)',
                                                background: 'var(--e-white)', color: 'var(--e-charcoal)',
                                                outline: 'none', transition: 'border-color 0.2s',
                                                borderRadius: 0,
                                            }}
                                            onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                            onBlur={e => e.target.style.borderColor = 'var(--e-beige)'}
                                        />
                                        <button type="button"
                                            onClick={() => setShowPassword(p => !p)}
                                            style={{
                                                position: 'absolute', right: 14, top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'var(--e-light-muted)', padding: 0,
                                            }}>
                                            {showPassword ? (
                                                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit" disabled={loading}
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '15px 32px',
                                        background: loading ? 'var(--e-sand)' : 'var(--e-charcoal)',
                                        color: 'var(--e-white)',
                                        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                        fontFamily: 'var(--e-sans)', fontSize: '0.72rem',
                                        fontWeight: 600, letterSpacing: '0.14em',
                                        textTransform: 'uppercase',
                                        transition: 'background 0.3s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    }}
                                    onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)'; }}
                                    onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)'; }}
                                >
                                    {loading ? (
                                        <>
                                            <span style={{
                                                width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: '#fff', borderRadius: '50%',
                                                display: 'inline-block',
                                                animation: 'spin 0.7s linear infinite',
                                            }} />
                                            Đang đăng nhập…
                                        </>
                                    ) : 'Đăng Nhập'}
                                </button>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    margin: '0.5rem 0',
                                }}>
                                    <div style={{ flex: 1, height: 1, background: 'var(--e-beige)' }} />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--e-light-muted)', letterSpacing: '0.08em' }}>hoặc</span>
                                    <div style={{ flex: 1, height: 1, background: 'var(--e-beige)' }} />
                                </div>

                                <p style={{ textAlign: 'center', fontSize: '0.83rem', color: 'var(--e-muted)', fontWeight: 300 }}>
                                    Chưa có tài khoản?{' '}
                                    <Link href="/auth/register" style={{ color: 'var(--e-gold)', fontWeight: 600, textDecoration: 'none' }}>
                                        Đăng ký ngay
                                    </Link>
                                </p>
                            </form>

                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: var(--e-light-muted); }
      `}</style>
        </>
    );
}