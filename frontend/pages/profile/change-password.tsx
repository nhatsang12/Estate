import { useState } from "react";
import { useRouter } from "next/router";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ArrowLeft, Lightbulb, User as UserIcon, Lock, Shield, Key } from "lucide-react";

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePassword() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState<ChangePasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ChangePasswordForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = "Mật khẩu hiện tại bắt buộc";
    }
    if (!formData.newPassword.trim()) {
      newErrors.newPassword = "Mật khẩu mới bắt buộc";
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = "Mật khẩu phải tối thiểu 6 ký tự";
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = "Mật khẩu mới không được giống mật khẩu cũ";
    }
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu không khớp";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      await userService.changePassword(token, formData);
      setMessage({ type: "success", text: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại." });
      setTimeout(() => {
        logout();
        router.push("/");
      }, 2000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Lỗi khi đổi mật khẩu" });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="estoria min-h-screen flex flex-col">
      <LuxuryNavbar variant="light" onPostClick={() => router.push('/provider/properties/create')} />
      <main className="flex-1 pt-32 pb-20 relative overflow-hidden" style={{ background: 'transparent' }}>

        {/* Background Image Layer */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            filter: 'sepia(0.1) saturate(1.2) brightness(0.85)',
          }}
        ></div>

        {/* Soft Frost Blur Overlay */}
        <div className="absolute inset-0 pointer-events-none z-0 bg-[var(--e-cream)]/70 backdrop-blur-[12px]"></div>

        {/* Top/Bottom Gradient Fades */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--e-cream)] to-transparent pointer-events-none z-0"></div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--e-cream)] to-transparent pointer-events-none z-0"></div>

        <div className="container mx-auto px-4 max-w-5xl relative z-10">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '2rem', marginBottom: '3rem' }}>
            <span style={{
              fontFamily: 'var(--e-serif)',
              fontSize: 'clamp(4rem, 7vw, 7rem)',
              fontWeight: 200,
              color: 'var(--e-beige)',
              lineHeight: 1,
              letterSpacing: '-0.04em',
              userSelect: 'none',
            }}>02</span>
            <div>
              <div className="e-section-label">Bảo Mật</div>
              <h2 className="e-section-title text-[var(--e-charcoal)]" style={{ margin: 0 }}>
                Đổi Mật Khẩu
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--e-muted)', marginTop: '0.3rem' }}>
                Cập nhật mật khẩu để bảo vệ tài khoản của bạn
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column - Security Tips & Nav */}
            <div className="md:col-span-4 space-y-6">

              <div className="glass-panel text-center p-8 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[var(--e-cream)] border-[var(--e-beige)] mx-auto flex items-center justify-center mb-4 text-[var(--e-gold)]">
                  <Shield size={32} strokeWidth={1.5} />
                </div>
                <h3 className="font-[var(--e-serif)] text-xl font-medium text-[var(--e-charcoal)] mb-1">
                  Bảo Mật Cấp Cao
                </h3>
                <p className="text-[var(--e-muted)] text-[0.75rem] mb-6">
                  Đảm bảo tài khoản Estoria luôn được an toàn.
                </p>

                <div className="text-left pt-6 border-t border-[var(--e-beige)]">
                  <h4 className="font-semibold text-[var(--e-charcoal)] mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Lightbulb size={16} className="text-[var(--e-gold)]" />
                    Mẹo bảo mật
                  </h4>
                  <ul className="space-y-3 text-[0.75rem] text-[var(--e-muted)]">
                    <li className="flex gap-2 items-start">
                      <span className="text-[var(--e-gold)] mt-0.5">•</span>
                      <span>Sử dụng mật khẩu mạnh với ít nhất 8 ký tự</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[var(--e-gold)] mt-0.5">•</span>
                      <span>Kết hợp cả chữ hoa, chữ thường, số đặc biệt</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="text-[var(--e-gold)] mt-0.5">•</span>
                      <span>Không dùng lại mật khẩu cũ</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="glass-panel p-4 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <Link href="/profile/settings" className="flex items-center gap-3 p-3 text-[var(--e-gold)] hover:bg-[var(--e-cream)] rounded-xl transition-all uppercase text-[0.75rem] font-bold tracking-wider">
                  <ArrowLeft size={16} />
                  Cài Đặt Hồ Sơ
                </Link>
              </div>

            </div>

            {/* Right Column - Form */}
            <div className="md:col-span-8">
              <div className="glass-panel p-8 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm h-full">
                <h3 className="font-[var(--e-serif)] text-2xl font-medium text-[var(--e-charcoal)] mb-6 pb-4 border-b border-[var(--e-beige)]">An Toàn Tài Khoản</h3>

                {message && (
                  <div
                    className={`p-4 rounded-xl mb-6 text-sm ${message.type === "success"
                        ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                        : "bg-rose-50 border border-rose-100 text-rose-700"
                      }`}
                  >
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">

                  <div className="space-y-5">
                    {/* Current Password */}
                    <div className="relative group">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">Mật khẩu hiện tại</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                          <Lock size={18} strokeWidth={2} />
                        </div>
                        <input
                          type="password"
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                          className={`w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium ${errors.currentPassword ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400" : "border-[var(--e-beige)] focus:border-[var(--e-gold)]"
                            }`}
                          placeholder="Nhập mật khẩu đang dùng..."
                        />
                      </div>
                      {errors.currentPassword && (
                        <p className="text-rose-500 text-[0.7rem] mt-2 ml-1">{errors.currentPassword}</p>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="relative group">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">Mật khẩu mới</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                          <Key size={18} strokeWidth={2} />
                        </div>
                        <input
                          type="password"
                          name="newPassword"
                          value={formData.newPassword}
                          onChange={handleChange}
                          className={`w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium ${errors.newPassword ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400" : "border-[var(--e-beige)] focus:border-[var(--e-gold)]"
                            }`}
                          placeholder="Mật khẩu mới an toàn..."
                        />
                      </div>
                      {errors.newPassword && <p className="text-rose-500 text-[0.7rem] mt-2 ml-1">{errors.newPassword}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div className="relative group">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">Xác nhận mật khẩu mới</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                          <Lock size={18} strokeWidth={2} />
                        </div>
                        <input
                          type="password"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium ${errors.confirmPassword ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400" : "border-[var(--e-beige)] focus:border-[var(--e-gold)]"
                            }`}
                          placeholder="Nhập lại mật khẩu vừa tạo..."
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-rose-500 text-[0.7rem] mt-2 ml-1">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-[var(--e-beige)] mt-8">
                    <button
                      type="submit"
                      disabled={loading}
                      className="e-btn-primary"
                      style={{ padding: '0.9rem 2rem', fontSize: '0.8rem', minWidth: '180px' }}
                    >
                      {loading ? "Đang cập nhật..." : "Đổi mật khẩu"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <LuxuryFooter />
    </div>
  );
}
