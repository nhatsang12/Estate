import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'register';
type Role = 'user' | 'provider';
type Step = 1 | 2;

export default function LuxuryLoginModal({ onClose, initialMode = 'login' }: { onClose: () => void, initialMode?: AuthMode }) {
    const router = useRouter();
    const { login, signup } = useAuth();

    const [mounted, setMounted] = useState(false);
    const [mode, setMode] = useState<AuthMode>(initialMode);

    // Login Form State
    const [loginForm, setLoginForm] = useState({ email: '', password: '' });

    // Register Form State
    const [step, setStep] = useState<Step>(1);
    const [role, setRole] = useState<Role>('user');
    const [regForm, setRegForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', address: '', phone: '' });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    function handleLoginChange(e: React.ChangeEvent<HTMLInputElement>) {
        setLoginForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    }

    function handleRegChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRegForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    }

    async function handleLoginSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await login({ email: loginForm.email, password: loginForm.password });
            const token = window.localStorage.getItem('estate_manager_token');
            if (!token) throw new Error('Đăng nhập thất bại');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include',
            });
            const data = await res.json();
            const userRole = data.data?.user?.role;
            if (userRole === 'admin') router.push('/admin/dashboard');
            else if (userRole === 'provider') router.push('/provider/dashboard');
            else {
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Đăng nhập thất bại');
        } finally {
            setLoading(false);
        }
    }

    function handleRegNext(e: React.FormEvent) {
        e.preventDefault();
        if (!regForm.name || !regForm.email || !regForm.password || !regForm.passwordConfirm) { setError('Vui lòng điền đầy đủ thông tin.'); return; }
        if (regForm.password !== regForm.passwordConfirm) { setError('Mật khẩu xác nhận không khớp.'); return; }
        if (regForm.password.length < 8) { setError('Mật khẩu phải có ít nhất 8 ký tự.'); return; }
        setError(null);
        setStep(2);
    }

    async function handleRegSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!regForm.address) { setError('Vui lòng nhập địa chỉ.'); return; }
        setLoading(true);
        setError(null);
        try {
            await signup({
                name: regForm.name,
                email: regForm.email,
                password: regForm.password,
                passwordConfirm: regForm.passwordConfirm,
                address: regForm.address,
                phone: regForm.phone,
                role: 'user', // Initial default
            });

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
                router.push('/profile/settings?registered=provider');
                onClose();
                return;
            }

            onClose();
        } catch (err: any) {
            setError(err.message || 'Đăng ký thất bại');
        } finally {
            setLoading(false);
        }
    }

    const pwStrength = regForm.password.length >= 8 ? 'strong' : regForm.password.length >= 4 ? 'medium' : 'weak';
    const pwColor = pwStrength === 'strong' ? 'var(--e-gold)' : pwStrength === 'medium' ? '#e07b39' : '#e57373';

    const modalContent = (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Backdrop */}
            <div 
                onClick={onClose} 
                className="llm-backdrop"
                style={{ position: 'absolute', inset: 0, background: 'rgba(17,28,20,0.6)', backdropFilter: 'blur(8px)' }}
            />
            
            {/* Modal Content */}
            <div className="llm-modal" style={{
                position: 'relative', width: '90%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--e-cream)', padding: '3.5rem 3rem',
                boxShadow: '0 24px 64px rgba(17,28,20,0.25)', border: '1px solid rgba(154,124,69,0.15)',
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 20, right: 20, background: 'transparent',
                    border: 'none', cursor: 'pointer', color: 'var(--e-muted)', padding: 5,
                    transition: 'color 0.2s',
                }} onMouseEnter={e => e.currentTarget.style.color='var(--e-charcoal)'} onMouseLeave={e => e.currentTarget.style.color='var(--e-muted)'}>
                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>

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

                {mode === 'login' ? (
                    <>
                        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                            <p style={{
                                fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                                color: 'var(--e-gold)', fontWeight: 700, fontFamily: 'var(--e-sans)',
                                marginBottom: '0.8rem',
                            }}>Tài Khoản</p>
                            <h2 style={{
                                fontFamily: 'var(--e-serif)', fontSize: '2.2rem',
                                fontWeight: 500, color: 'var(--e-charcoal)',
                                lineHeight: 1.12, marginBottom: '0.6rem',
                            }}>
                                Đăng <em style={{ fontStyle: 'italic', color: 'var(--e-muted)', fontWeight: 400 }}>nhập</em>
                            </h2>
                        </div>

                        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
                            {/* Email */}
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input
                                    type="email" name="email" required
                                    value={loginForm.email} onChange={handleLoginChange}
                                    placeholder="your@email.com"
                                    style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <label style={{ ...labelStyle, marginBottom: 0 }}>Mật Khẩu</label>
                                    <Link href="/auth/forgot-password" onClick={onClose} style={{ fontSize: '0.74rem', color: 'var(--e-gold)', textDecoration: 'none', fontWeight: 600, fontFamily: 'var(--e-sans)' }}>
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password" required
                                        value={loginForm.password} onChange={handleLoginChange}
                                        placeholder="••••••••"
                                        style={{ ...inputStyle, paddingRight: 44 }}
                                        onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'}
                                    />
                                    <button type="button" onClick={() => setShowPassword(p => !p)} style={eyeBtnStyle}>
                                        <EyeIcon show={showPassword} />
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit" disabled={loading}
                                style={submitBtnStyle}
                                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)'; }}
                                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)'; }}
                            >
                                {loading ? (
                                    <><span style={spinnerStyle} />Đang đăng nhập…</>
                                ) : 'Đăng Nhập'}
                            </button>
                            
                            {/* Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                <div style={{ flex: 1, height: 1, background: 'rgba(154,124,69,0.18)' }} />
                                <span style={{ fontSize: '0.72rem', color: 'var(--e-light-muted)', letterSpacing: '0.08em', fontFamily: 'var(--e-sans)' }}>hoặc</span>
                                <div style={{ flex: 1, height: 1, background: 'rgba(154,124,69,0.18)' }} />
                            </div>

                            <p style={{ textAlign: 'center', fontSize: '0.86rem', color: 'var(--e-muted)', fontWeight: 300, fontFamily: 'var(--e-sans)' }}>
                                Chưa có tài khoản?{' '}
                                <button type="button" onClick={() => { setMode('register'); setError(null); }} style={{ color: 'var(--e-gold)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>
                                    Đăng ký ngay
                                </button>
                            </p>
                        </form>
                    </>
                ) : (
                    <>
                        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                            <p style={{
                                fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase',
                                color: 'var(--e-gold)', fontWeight: 700, fontFamily: 'var(--e-sans)',
                                marginBottom: '0.8rem',
                            }}>
                                {step === 1 ? 'Bước 1 / 2' : 'Bước 2 / 2'}
                            </p>
                            <h2 style={{
                                fontFamily: 'var(--e-serif)', fontSize: '2.2rem',
                                fontWeight: 500, color: 'var(--e-charcoal)',
                                lineHeight: 1.12, marginBottom: '0.6rem',
                            }}>
                                {step === 1 ? (
                                    <>Tạo <em style={{ fontStyle: 'italic', color: 'var(--e-muted)', fontWeight: 400 }}>tài khoản</em></>
                                ) : (
                                    <>Thông tin <em style={{ fontStyle: 'italic', color: 'var(--e-muted)', fontWeight: 400 }}>cá nhân</em></>
                                )}
                            </h2>
                        </div>

                        {step === 1 ? (
                            <form onSubmit={handleRegNext} style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
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
                                    {role === 'provider' && (
                                        <div style={{
                                            marginTop: 8, padding: '10px 12px',
                                            background: '#fffbeb', border: '1px solid #fcd34d',
                                            fontSize: '0.74rem', color: '#92400e',
                                            fontFamily: 'var(--e-sans)', lineHeight: 1.6,
                                        }}>
                                            ✦ Tài khoản sẽ cần được xét duyệt trong <strong>1–3 ngày</strong>.
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Họ & Tên</label>
                                    <input type="text" name="name" required value={regForm.name} onChange={handleRegChange} placeholder="Họ tên phải trùng với CCCD/CMND" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--e-gold)'} onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Email</label>
                                    <input type="email" name="email" required value={regForm.email} onChange={handleRegChange} placeholder="your@email.com" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--e-gold)'} onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Mật Khẩu</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showPassword ? 'text' : 'password'} name="password" required
                                            value={regForm.password} onChange={handleRegChange}
                                            placeholder="Tối thiểu 8 ký tự"
                                            style={{ ...inputStyle, paddingRight: 44 }}
                                            onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'}
                                        />
                                        <button type="button" onClick={() => setShowPassword(p => !p)} style={eyeBtnStyle}>
                                            <EyeIcon show={showPassword} />
                                        </button>
                                    </div>
                                    {regForm.password && (
                                        <div style={{ display: 'flex', gap: 3, marginTop: 7 }}>
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} style={{
                                                    flex: 1, height: 2, borderRadius: 2,
                                                    background: regForm.password.length >= i * 2 ? pwColor : 'rgba(154,124,69,0.15)',
                                                    transition: 'background 0.3s',
                                                }} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Xác Nhận Mật Khẩu</label>
                                    <input
                                        type="password" name="passwordConfirm" required
                                        value={regForm.passwordConfirm} onChange={handleRegChange}
                                        placeholder="Nhập lại mật khẩu"
                                        style={{ ...inputStyle, borderColor: regForm.passwordConfirm && regForm.passwordConfirm !== regForm.password ? '#e57373' : 'rgba(154,124,69,0.25)' }}
                                        onFocus={e => e.target.style.borderColor = 'var(--e-gold)'}
                                        onBlur={e => e.target.style.borderColor = regForm.passwordConfirm !== regForm.password && regForm.passwordConfirm ? '#e57373' : 'rgba(154,124,69,0.25)'}
                                    />
                                </div>

                                <button type="submit" style={submitBtnStyle} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)'}>
                                    Tiếp Theo →
                                </button>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(154,124,69,0.18)' }} />
                                </div>
                                <p style={{ textAlign: 'center', fontSize: '0.86rem', color: 'var(--e-muted)', fontWeight: 300, fontFamily: 'var(--e-sans)' }}>
                                    Đã có tài khoản?{' '}
                                    <button type="button" onClick={() => { setMode('login'); setError(null); }} style={{ color: 'var(--e-gold)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>
                                        Đăng nhập ngay
                                    </button>
                                </p>
                            </form>
                        ) : (
                            <form onSubmit={handleRegSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
                                <div>
                                    <label style={labelStyle}>Địa Chỉ</label>
                                    <input type="text" name="address" required value={regForm.address} onChange={handleRegChange} placeholder="Số nhà, đường, tỉnh thành" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--e-gold)'} onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Số Điện Thoại <span style={{ color: 'var(--e-light-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(tuỳ chọn)</span></label>
                                    <input type="tel" name="phone" value={regForm.phone} onChange={handleRegChange} placeholder="0901 234 567" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--e-gold)'} onBlur={e => e.target.style.borderColor = 'rgba(154,124,69,0.25)'} />
                                </div>

                                <div style={{
                                    border: '1px solid rgba(154,124,69,0.2)',
                                    padding: '1.1rem 1.3rem', background: 'rgba(255,252,248,0.8)',
                                }}>
                                    <div style={{ fontSize: '0.62rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--e-gold)', fontWeight: 700, marginBottom: 10, fontFamily: 'var(--e-sans)' }}>Xác nhận thông tin</div>
                                    {[
                                        { label: 'Họ tên', value: regForm.name },
                                        { label: 'Email', value: regForm.email },
                                        { label: 'Vai trò', value: role === 'provider' ? 'Chủ Nhà — Chờ duyệt' : 'Khách Hàng' },
                                    ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--e-muted)', padding: '5px 0', borderBottom: '1px solid rgba(154,124,69,0.1)', fontFamily: 'var(--e-sans)' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--e-charcoal)' }}>{item.label}</span>
                                            <span>{item.value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                                    <button type="button" onClick={() => { setStep(1); setError(null); }}
                                        style={{
                                            padding: '14px', background: 'transparent',
                                            border: '1px solid rgba(154,124,69,0.25)', color: 'var(--e-muted)',
                                            cursor: 'pointer', fontFamily: 'var(--e-sans)', fontSize: '0.74rem',
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
                            </form>
                        )}
                    </>
                )}

                <style>{`
                    .llm-backdrop { animation: llmFadeIn 0.3s ease; }
                    .llm-modal { animation: llmSlideUp 0.4s cubic-bezier(0.16,1,0.3,1); }
                    @keyframes llmFadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes llmSlideUp {
                        from { opacity: 0; transform: translateY(20px) scale(0.98); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .llm-modal input::placeholder { color: var(--e-light-muted); opacity: 1; }
                    /* Custom scrollbar for modal */
                    .llm-modal::-webkit-scrollbar { width: 6px; }
                    .llm-modal::-webkit-scrollbar-track { background: transparent; }
                    .llm-modal::-webkit-scrollbar-thumb { background: rgba(154,124,69,0.3); border-radius: 10px; }
                `}</style>
            </div>
        </div>
    );

    if (!mounted) return null;
    return createPortal(modalContent, document.body);
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
    marginTop: '0.3rem', padding: '15px 32px',
    background: 'var(--e-charcoal)', color: '#fff', border: 'none',
    cursor: 'pointer', fontFamily: 'var(--e-sans)', fontSize: '0.74rem',
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
