import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import type { User } from "@/types/user";
import Image from "next/image";
import { Lock, LayoutDashboard, Settings, User as UserIcon, Phone, MapPin, Image as ImageIcon } from "lucide-react";

interface UpdateFormData {
  name: string;
  phone: string;
  address: string;
  avatar: string;
}

export default function ProfileSettings() {
  const router = useRouter();
  const { user: authUser, isAuthLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UpdateFormData>({
    name: "",
    phone: "",
    address: "",
    avatar: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!authUser) {
        router.push("/");
      } else {
        setUser(authUser);
        setFormData({
          name: authUser.name || "",
          phone: authUser.phone || "",
          address: authUser.address || "",
          avatar: authUser.avatar || "",
        });
        setLoading(false);
      }
    }
  }, [authUser, isAuthLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      await userService.updateMe(token, formData);
      setMessage({ type: "success", text: "Cập nhật hồ sơ thành công!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Lỗi khi cập nhật hồ sơ" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="estoria bg-[var(--e-cream)] min-h-screen flex flex-col pt-12 md:pt-24 mt-20">
        <LuxuryNavbar variant="light" onPostClick={() => router.push('/provider/properties/create')} />
        <main className="flex-1">
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--e-gold)]"></div>
              <p className="mt-4 text-[var(--e-muted)]">Đang tải...</p>
            </div>
          </div>
        </main>
        <LuxuryFooter />
      </div>
    );
  }

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
            }}>01</span>
            <div>
              <div className="e-section-label">Hồ Sơ Của Bạn</div>
              <h2 className="e-section-title text-[var(--e-charcoal)]" style={{ margin: 0 }}>
                Cài Đặt Hồ Sơ
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--e-muted)', marginTop: '0.3rem' }}>
                Cập nhật thông tin cá nhân và quản lý tài khoản của bạn
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column - Profile Card & Navigation */}
            <div className="md:col-span-4 space-y-6">
              <div className="glass-panel text-center p-8 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <div className="relative w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 bg-[var(--e-beige)] border-4 border-white shadow-md">
                  {formData.avatar ? (
                    <Image src={formData.avatar} alt="Avatar" fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--e-charcoal)] font-[var(--e-serif)] text-2xl font-semibold">
                      {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
                    </div>
                  )}
                </div>
                <h3 className="font-[var(--e-serif)] text-2xl font-medium text-[var(--e-charcoal)] mb-1">
                  {user?.name || "Người dùng mới"}
                </h3>
                <p className="text-[var(--e-gold)] text-[0.7rem] uppercase tracking-widest font-semibold mb-6">
                  {user?.role === "user" && "Khách Hàng"}
                  {user?.role === "provider" && "Nhà Cung Cấp"}
                  {user?.role === "admin" && "Quản Trị Viên"}
                </p>

                <div className="text-left space-y-3 pt-6 border-t border-[var(--e-beige)]">
                  <p className="text-sm">
                    <span className="block text-[0.65rem] uppercase tracking-wider text-[var(--e-muted)] mb-1">Email</span>
                    <span className="font-medium text-[var(--e-charcoal)]">{user?.email}</span>
                  </p>
                  <p className="text-sm">
                    <span className="block text-[0.65rem] uppercase tracking-wider text-[var(--e-muted)] mb-1">Ngày tham gia</span>
                    <span className="font-medium text-[var(--e-charcoal)]">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "N/A"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="glass-panel p-6 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <h3 className="font-semibold text-[var(--e-charcoal)] mb-4 text-sm tracking-wide uppercase">Cài đặt khác</h3>
                <div className="space-y-2">
                  <a
                    href="/profile/change-password"
                    className="flex items-center gap-3 p-3 text-[var(--e-gold)] hover:bg-[var(--e-cream)] rounded-xl transition-all"
                  >
                    <Lock size={18} />
                    Đổi mật khẩu
                  </a>
                  {user?.role === "provider" && (
                    <a
                      href="/provider/dashboard"
                      className="flex items-center gap-3 p-3 text-[var(--e-gold)] hover:bg-[var(--e-cream)] rounded-xl transition-all"
                    >
                      <LayoutDashboard size={18} />
                      Bảng điều khiển
                    </a>
                  )}
                  {user?.role === "admin" && (
                    <a
                      href="/admin/dashboard"
                      className="flex items-center gap-3 p-3 text-[var(--e-gold)] hover:bg-[var(--e-cream)] rounded-xl transition-all"
                    >
                      <Settings size={18} />
                      Bảng điều khiển quản trị
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Edit Form */}
            <div className="md:col-span-8">
              <div className="glass-panel p-8 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm h-full">
                <h3 className="font-[var(--e-serif)] text-2xl font-medium text-[var(--e-charcoal)] mb-6 pb-4 border-b border-[var(--e-beige)]">Cập Nhật Thông Tin</h3>
                {message && (
                  <div
                    className={`p-4 rounded-lg mb-6 ${message.type === "success"
                        ? "bg-emerald-100/80 text-emerald-700"
                        : "bg-rose-100/80 text-rose-700"
                      }`}
                  >
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">

                  <div className="space-y-5">
                    {/* Name */}
                    <div className="relative group">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">Tên Hiển Thị</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                          <UserIcon size={18} strokeWidth={2} />
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                          placeholder="Nhập tên hiển thị..."
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="relative group">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">Số Điện Thoại</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                          <Phone size={18} strokeWidth={2} />
                        </div>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                          placeholder="Nhập số điện thoại liên lạc..."
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="relative group">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">Địa Chỉ</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                          <MapPin size={18} strokeWidth={2} />
                        </div>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                          placeholder="Nhập địa chỉ nhà, thành phố..."
                        />
                      </div>
                    </div>

                    {/* Avatar URL */}
                    <div className="relative group">
                      <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">Ảnh Đại Diện (URL)</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                          <ImageIcon size={18} strokeWidth={2} />
                        </div>
                        <input
                          type="url"
                          name="avatar"
                          value={formData.avatar}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>
                      <p className="text-[0.65rem] text-[var(--e-muted)] mt-2 ml-1 italic">* Cập nhật URL ảnh để đổi hình đại diện.</p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-[var(--e-beige)]">
                    <button
                      type="submit"
                      disabled={saving}
                      className="e-btn-primary"
                      style={{ padding: '0.9rem 2rem', fontSize: '0.8rem', minWidth: '180px' }}
                    >
                      {saving ? "Đang lưu..." : "Cập nhật hồ sơ"}
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
