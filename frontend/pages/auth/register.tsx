import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'user' | 'provider';
type Step = 1 | 2;

export default function RegisterPage() {
    const router = useRouter();
    const { signup } = useAuth();
    const [step, setStep] = useState<Step>(1);
    const [role, setRole] = useState<Role>('user');
    const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', address: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    }

    function handleNext(e: React.FormEvent) {
        e.preventDefault();
        if (!form.name || !form.email || !form.password || !form.passwordConfirm) { setError('Vui lòng điền đầy đủ thông tin.'); return; }
        if (form.password !== form.passwordConfirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
        if (form.password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
        setError(null);
        setStep(2);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.address) { setError('Vui lòng nhập địa chỉ.'); return; }
        setLoading(true);
        setError(null);
        try {
            // Đăng ký + tự động đăng nhập luôn qua AuthContext
            await signup({
                name: form.name,
                email: form.email,
                password: form.password,
                passwordConfirm: form.passwordConfirm,
                address: form.address,
                phone: form.phone,
                role: 'user', // luôn tạo là user trước
            });

            // Nếu chọn provider → gửi role request
            if (role === 'provider') {
                const token = localStorage.getItem('estate_manager_token') || '';
                const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                await fetch(`${API}/api/users/role-request`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
                // Redirect về profile với thông báo pending
                router.push('/profile/settings?registered=provider');
                return;
            }

            // User thường → về trang chính
            router.push('/');

        } catch (err: any) {
            setError(err.message || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    }

    const pwStrength = form.password.length >= 8 ? 'strong' : form.password.length >= 4 ? 'medium' : 'weak';
    const pwColor = pwStrength === 'strong' ? 'var(--e-gold)' : pwStrength === 'medium' ? '#e07b39' : '#e57373';

    return (
        <>
            <Head>
                <title>Đăng Ký — Estoria</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <div className="estoria" style={{ minHeight: '100vh', background: 'var(--e-cream)' }}>

                {/* ── Navbar ── */}
                <nav style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                    height: 68, padding: '0 5vw',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(18px)',
                    borderBottom: '1px solid rgba(154,124,69,0.15)',
                }}>
                    <Link href="/" style={{
                        fontFamily: 'var(--e-serif)', fontSize: '1.55rem', fontWeight: 600,
                        letterSpacing: '0.04em', color: 'var(--e-charcoal)', textDecoration: 'none',
                    }}>
                        Esto<span style={{ color: 'var(--e-gold)' }}>ria</span>
                    </Link>
                    <span style={{ fontSize: '0.8rem', color: 'var(--e-muted)', fontWeight: 500, fontFamily: 'var(--e-sans)' }}>
                        Đã có tài khoản?{' '}
                        <Link href="/auth/login" style={{ color: 'var(--e-gold)', textDecoration: 'none', fontWeight: 700 }}>
                            Đăng nhập
                        </Link>
                    </span>
                </nav>

                {/* ── Split Layout ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>

                    {/* ── Left: Visual Panel ── */}
                    <div style={{
                        position: 'relative', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '9rem 5vw 5vw',
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: 'url(https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85)',
                            backgroundSize: 'cover', backgroundPosition: 'center',
                        }} />
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'linear-gradient(135deg, rgba(17,28,20,0.82) 0%, rgba(17,28,20,0.68) 100%)',
                        }} />
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
                            opacity: 0.4, pointerEvents: 'none',
                        }} />

                        {/* Top text */}
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{
                                display: 'inline-block', fontSize: '0.64rem', letterSpacing: '0.22em',
                                textTransform: 'uppercase', color: 'var(--e-gold-light)',
                                fontFamily: 'var(--e-sans)', fontWeight: 700,
                                border: '1px solid rgba(184,146,78,0.4)', padding: '6px 14px',
                                marginBottom: '1.5rem',
                            }}>Tạo Tài Khoản</div>
                            <h2 style={{
                                fontFamily: 'var(--e-serif)',
                                fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                                fontWeight: 500, color: '#fff',
                                lineHeight: 1.15, marginBottom: '1.2rem',
                            }}>
                                Bắt đầu hành trình<br />
                                <em style={{ fontStyle: 'italic', color: 'var(--e-gold-light)', fontWeight: 400 }}>tìm tổ ấm</em><br />
                                của bạn
                            </h2>
                            <p style={{
                                fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)',
                                lineHeight: 1.85, fontWeight: 300, maxWidth: 360,
                                fontFamily: 'var(--e-sans)',
                            }}>
                                Đăng ký miễn phí để khám phá, yêu thích và liên hệ chủ nhà trực tiếp.
                            </p>
                        </div>

                        {/* Bottom: role info + step bar */}
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ marginBottom: '1.8rem' }}>
                                {[
                                    { title: 'Khách hàng', text: 'Tìm kiếm và thuê/mua bất động sản' },
                                    { title: 'Chủ nhà (Provider)', text: 'Đăng tin và quản lý tài sản' },
                                ].map((item) => (
                                    <div key={item.title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{
                                            width: 34, height: 34, flexShrink: 0,
                                            border: '1px solid rgba(154,124,69,0.35)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--e-gold-light)', fontSize: '0.9rem',
                                        }}>✦</div>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 3, fontFamily: 'var(--e-sans)' }}>{item.title}</div>
                                            <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, fontWeight: 300, fontFamily: 'var(--e-sans)' }}>{item.text}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Step indicator */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {([1, 2] as Step[]).map((s) => (
                                    <div key={s} style={{
                                        height: 3, flex: 1,
                                        background: step >= s ? 'var(--e-gold-light)' : 'rgba(255,255,255,0.18)',
                                        transition: 'background 0.4s', borderRadius: 2,
                                    }} />
                                ))}
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginLeft: 4, letterSpacing: '0.1em', fontFamily: 'var(--e-sans)' }}>
                                    {step}/2
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Form Panel ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '7rem 5vw 4rem',
                        background: 'var(--e-cream)', overflowY: 'auto',
                    }}>
                        <div style={{ width: '100%', maxWidth: 440 }}>

                            {/* Header */}
                            <div style={{ marginBottom: '2rem' }}>
                                <p style={{
                                    fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                                    color: 'var(--e-gold)', fontWeight: 700, fontFamily: 'var(--e-sans)',
                                    marginBottom: '0.8rem',
                                }}>
                                    {step === 1 ? 'Bước 1 / 2' : 'Bước 2 / 2'}
                                </p>
                                <h1 style={{
                                    fontFamily: 'var(--e-serif)',
                                    fontSize: 'clamp(1.8rem, 2.8vw, 2.4rem)',
                                    fontWeight: 500, color: 'var(--e-charcoal)',
                                    lineHeight: 1.12, marginBottom: '0.5rem',
                                }}>
                                    {step === 1 ? (
                                        <>Thông tin <em style={{ fontStyle: 'italic', color: 'var(--e-muted)', fontWeight: 400 }}>tài khoản</em></>
                                    ) : (
                                        <>Thông tin <em style={{ fontStyle: 'italic', color: 'var(--e-muted)', fontWeight: 400 }}>cá nhân</em></>
                                    )}
                                </h1>
                                <p style={{ fontSize: '0.88rem', color: 'var(--e-muted)', fontWeight: 300, lineHeight: 1.75, fontFamily: 'var(--e-sans)' }}>
                                    {step === 1 ? 'Điền email và mật khẩu để tạo tài khoản.' : 'Hoàn tất hồ sơ của bạn.'}
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div style={{
                                    border: '1px solid rgba(184,74,42,0.3)', background: 'rgba(184,74,42,0.06)',
                                    padding: '12px 16px', fontSize: '0.84rem', color: '#b84a2a',
                                    marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 8,
                                    fontFamily: 'var(--e-sans)',
                                }}>
                                    <span>⚠</span> {error}
                                </div>
                            )}

                            {/* ─── STEP 1 ─── */}
                            {step === 1 && (
                                <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>

                                    {/* Role selector */}
                                    <div>
                                        <label style={labelStyle}>Loại Tài Khoản</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: 'rgba(154,124,69,0.12)' }}>
                                            {([
                                                { value: 'user', label: 'Khách Hàng' },
                                                { value: 'provider', label: 'Chủ Nhà' },
                                            ] as { value: Role; label: string }[]).map((r) => (
                                                <button
                                                    key={r.value} type="button"
                                                    onClick={() => setRole(r.value)}
                                                    style={{
                                                        padding: '13px 16px',
                                                        background: role === r.value ? 'var(--e-charcoal)' : '#fff',
                                                        color: role === r.value ? '#fff' : 'var(--e-muted)',
                                                        border: 'none', cursor: 'pointer',
                                                        fontFamily: 'var(--e-sans)', fontSize: '0.8rem',
                                                        fontWeight: 700, letterSpacing: '0.08em',
                                                        transition: 'all 0.22s',
                                                    }}
                                                >
                                                    {role === r.value ? '✦ ' : ''}{r.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Provider notice */}
                                        {role === 'provider' && (
                                            <div style={{
                                                marginTop: 8, padding: '10px 12px',
                                                background: '#fffbeb', border: '1px solid #fcd34d',
                                                fontSize: '0.74rem', color: '#92400e',
                                                fontFamily: 'var(--e-sans)', lineHeight: 1.6,
                                            }}>
                                                ✦ Tài khoản sẽ được tạo và yêu cầu Provider gửi đến admin xét duyệt trong <strong>1–3 ngày</strong>.
                                            </div>
                                        )}
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <label style={labelStyle}>Họ & Tên</label>
                                        <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="Họ tên phải đúng với CCCD/CMND" style={inputStyle}
                                            onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label style={labelStyle}>Email</label>
                                        <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="your@email.com" style={inputStyle}
                                            onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label style={labelStyle}>Mật Khẩu</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showPassword ? 'text' : 'password'} name="password" required
                                                value={form.password} onChange={handleChange}
                                                placeholder="Tối thiểu 8 ký tự"
                                                style={{ ...inputStyle, paddingRight: 44 }}
                                                onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'}
                                            />
                                            <button type="button" onClick={() => setShowPassword(p => !p)} style={eyeBtnStyle}>
                                                <EyeIcon show={showPassword} />
                                            </button>
                                        </div>
                                        {form.password && (
                                            <div style={{ display: 'flex', gap: 3, marginTop: 7 }}>
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} style={{
                                                        flex: 1, height: 2, borderRadius: 2,
                                                        background: form.password.length >= i * 2 ? pwColor : 'rgba(154,124,69,0.15)',
                                                        transition: 'background 0.3s',
                                                    }} />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label style={labelStyle}>Xác Nhận Mật Khẩu</label>
                                        <input
                                            type="password" name="passwordConfirm" required
                                            value={form.passwordConfirm} onChange={handleChange}
                                            placeholder="Nhập lại mật khẩu"
                                            style={{
                                                ...inputStyle,
                                                borderColor: form.passwordConfirm && form.passwordConfirm !== form.password
                                                    ? '#e57373' : 'rgba(154,124,69,0.25)',
                                            }}
                                            onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                            onBlur={e => {
                                                e.target.style.borderColor = form.passwordConfirm !== form.password && form.passwordConfirm
                                                    ? '#e57373' : 'rgba(154,124,69,0.25)';
                                            }}
                                        />
                                    </div>

                                    <button type="submit" style={submitBtnStyle}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)'}
                                    >
                                        Tiếp Theo →
                                    </button>

                                    <p style={{ textAlign: 'center', fontSize: '0.86rem', color: 'var(--e-muted)', fontWeight: 300, fontFamily: 'var(--e-sans)' }}>
                                        Đã có tài khoản?{' '}
                                        <Link href="/auth/login" style={{ color: 'var(--e-gold)', fontWeight: 700, textDecoration: 'none' }}>
                                            Đăng nhập
                                        </Link>
                                    </p>
                                </form>
                            )}

                            {/* ─── STEP 2 ─── */}
                            {step === 2 && (
                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>

                                    {/* Address */}
                                    <div>
                                        <label style={labelStyle}>Địa Chỉ</label>
                                        <input type="text" name="address" required value={form.address} onChange={handleChange} placeholder="Số nhà, đường, quận, tỉnh thành" style={inputStyle}
                                            onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label style={labelStyle}>
                                            Số Điện Thoại{' '}
                                            <span style={{ color: 'var(--e-light-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(tuỳ chọn)</span>
                                        </label>
                                        <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0901 234 567" style={inputStyle}
                                            onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                    </div>

                                    {/* Summary card */}
                                    <div style={{
                                        border: '1px solid rgba(154,124,69,0.2)',
                                        padding: '1.1rem 1.3rem', background: 'rgba(255,252,248,0.8)',
                                    }}>
                                        <div style={{ fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--e-gold)', fontWeight: 700, marginBottom: 10, fontFamily: 'var(--e-sans)' }}>
                                            Xác nhận thông tin
                                        </div>
                                        {[
                                            { label: 'Họ tên', value: form.name },
                                            { label: 'Email', value: form.email },
                                            { label: 'Vai trò', value: role === 'provider' ? 'Chủ Nhà (Provider) — Chờ duyệt' : 'Khách Hàng' },
                                        ].map(item => (
                                            <div key={item.label} style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                fontSize: '0.82rem', color: 'var(--e-muted)',
                                                padding: '5px 0',
                                                borderBottom: '1px solid rgba(154,124,69,0.1)',
                                                fontFamily: 'var(--e-sans)',
                                            }}>
                                                <span style={{ fontWeight: 700, color: 'var(--e-charcoal)' }}>{item.label}</span>
                                                <span>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                                        <button type="button" onClick={() => { setStep(1); setError(null); }}
                                            style={{
                                                padding: '14px', background: 'transparent',
                                                border: '1px solid rgba(154,124,69,0.25)',
                                                color: 'var(--e-muted)', cursor: 'pointer',
                                                fontFamily: 'var(--e-sans)', fontSize: '0.74rem',
                                                fontWeight: 700, letterSpacing: '0.1em', transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--e-charcoal)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--e-charcoal)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(154,124,69,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--e-muted)'; }}
                                        >
                                            ← Quay lại
                                        </button>

                                        <button type="submit" disabled={loading}
                                            style={{
                                                ...submitBtnStyle,
                                                background: loading ? 'var(--e-muted)' : 'var(--e-charcoal)',
                                                cursor: loading ? 'not-allowed' : 'pointer',
                                            }}
                                            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)'; }}
                                            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)'; }}
                                        >
                                            {loading ? (<><span style={spinnerStyle} />Đang tạo tài khoản…</>) : 'Tạo Tài Khoản'}
                                        </button>
                                    </div>

                                    <p style={{ textAlign: 'center', fontSize: '0.76rem', color: 'var(--e-light-muted)', fontWeight: 300, lineHeight: 1.7, fontFamily: 'var(--e-sans)' }}>
                                        Bằng cách đăng ký, bạn đồng ý với{' '}
                                        <a href="#" style={{ color: 'var(--e-gold)', textDecoration: 'none', fontWeight: 600 }}>Điều khoản sử dụng</a>
                                        {' '}và{' '}
                                        <a href="#" style={{ color: 'var(--e-gold)', textDecoration: 'none', fontWeight: 600 }}>Chính sách bảo mật</a>.
                                    </p>
                                </form>
                            )}

                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                input::placeholder { color: var(--e-light-muted); opacity: 1; }
            `}</style>
        </>
    );
}

/* ─── Shared Styles ──────────────────────────────────────────── */
const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.64rem', letterSpacing: '0.16em',
    textTransform: 'uppercase', color: 'var(--e-muted)',
    fontWeight: 700, marginBottom: 8, fontFamily: 'var(--e-sans)',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 15px',
    fontFamily: 'var(--e-sans)', fontSize: '0.92rem',
    border: '1px solid rgba(154,124,69,0.25)',
    background: '#fff', color: 'var(--e-charcoal)',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    borderRadius: 0,
};

const submitBtnStyle: React.CSSProperties = {
    padding: '14px 32px',
    background: 'var(--e-charcoal)', color: '#fff',
    border: 'none', cursor: 'pointer',
    fontFamily: 'var(--e-sans)', fontSize: '0.74rem',
    fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
    transition: 'background 0.25s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
};

const eyeBtnStyle: React.CSSProperties = {
    position: 'absolute', right: 14, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--e-light-muted)', padding: 0,
};

const spinnerStyle: React.CSSProperties = {
    width: 14, height: 14,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
};

function EyeIcon({ show }: { show: boolean }) {
    return show ? (
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
    );
}