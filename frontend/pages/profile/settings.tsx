import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
import { useAuth } from "@/contexts/AuthContext";
import { userService } from "@/services/userService";
import type { User } from "@/types/user";
import Image from "next/image";
import {
  Lock, LayoutDashboard, Settings,
  User as UserIcon, Phone, MapPin,
  Image as ImageIcon, Sparkles,
  CheckCircle2, XCircle,
} from "lucide-react";

interface UpdateFormData {
  name: string;
  phone: string;
  address: string;
  avatar: string;
}

type ProviderReqStatus = "none" | "pending" | "approved" | "rejected";

export default function ProfileSettings() {
  const router = useRouter();
  const { user: authUser, isAuthLoading, token } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UpdateFormData>({
    name: "", phone: "", address: "", avatar: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Provider request state
  const [providerReqStatus, setProviderReqStatus] = useState<ProviderReqStatus>("none");
  const [providerReqLoading, setProviderReqLoading] = useState(true);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Scroll to become-provider section if hash present
  useEffect(() => {
    if (router.asPath.includes("#become-provider")) {
      setTimeout(() => {
        document.getElementById("become-provider")?.scrollIntoView({ behavior: "smooth" });
      }, 500);
    }
  }, [router.asPath]);

  // Load user
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

  // Load role request status
  useEffect(() => {
    if (!authUser || authUser.role !== "user" || !token) {
      setProviderReqLoading(false);
      return;
    }

    fetch(`${API}/api/users/role-request/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then(r => {
        if (!r.ok) return { status: "none" };
        return r.json();
      })
      .then(data => setProviderReqStatus(data?.status ?? "none"))
      .catch(() => setProviderReqStatus("none"))
      .finally(() => setProviderReqLoading(false));
  }, [authUser, token, API]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await userService.updateMe(token!, formData);
      setMessage({ type: "success", text: "Cập nhật hồ sơ thành công!" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Lỗi khi cập nhật hồ sơ" });
    } finally {
      setSaving(false);
    }
  };

  async function handleRequestProvider() {
    setModalLoading(true);
    try {
      const res = await fetch(`${API}/api/users/role-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Gửi yêu cầu thất bại");
      }
      setProviderReqStatus("pending");
      setMessage({
        type: "success",
        text: "Yêu cầu đã được gửi! Admin sẽ xét duyệt trong 1–3 ngày làm việc.",
      });
      setTimeout(() => setMessage(null), 5000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Lỗi khi gửi yêu cầu" });
    } finally {
      setModalLoading(false);
      setShowProviderModal(false);
    }
  }

  const isUser = user?.role === "user";

  if (loading) {
    return (
      <div className="estoria bg-[var(--e-cream)] min-h-screen flex flex-col">
        <LuxuryNavbar variant="light" onPostClick={() => router.push('/provider/properties/create')} />
        <main className="flex-1 flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--e-gold)]"></div>
            <p className="mt-4 text-[var(--e-muted)]">Đang tải...</p>
          </div>
        </main>
        <LuxuryFooter />
      </div>
    );
  }

  return (
    <>
      <div className="estoria min-h-screen flex flex-col">
        <LuxuryNavbar variant="light" onPostClick={() => router.push('/provider/properties/create')} />
        <main className="flex-1 pt-32 pb-20 relative overflow-hidden">

          {/* Background */}
          <div className="absolute inset-0 pointer-events-none z-0" style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: 'cover', backgroundPosition: 'center',
            backgroundAttachment: 'fixed', filter: 'sepia(0.1) saturate(1.2) brightness(0.85)',
          }} />
          <div className="absolute inset-0 pointer-events-none z-0 bg-[var(--e-cream)]/70 backdrop-blur-[12px]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--e-cream)] to-transparent pointer-events-none z-0" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--e-cream)] to-transparent pointer-events-none z-0" />

          <div className="container mx-auto px-4 max-w-5xl relative z-10">

            {/* Page header */}
            <div style={{
              display: 'flex', alignItems: 'flex-end',
              justifyContent: 'center', gap: '2rem', marginBottom: '3rem',
            }}>
              <span style={{
                fontFamily: 'var(--e-serif)', fontSize: 'clamp(4rem, 7vw, 7rem)',
                fontWeight: 200, color: 'var(--e-beige)', lineHeight: 1,
                letterSpacing: '-0.04em', userSelect: 'none',
              }}></span>
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

              {/* ── Left Column ── */}
              <div className="md:col-span-4 space-y-6">

                {/* Profile card */}
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
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString("vi-VN", {
                              timeZone: "Asia/Ho_Chi_Minh",
                            })
                          : "N/A"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Quick links */}
                <div className="glass-panel p-6 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                  <h3 className="font-semibold text-[var(--e-charcoal)] mb-4 text-sm tracking-wide uppercase">
                    Cài đặt khác
                  </h3>
                  <div className="space-y-2">
                    <a href="/profile/change-password"
                      className="flex items-center gap-3 p-3 text-[var(--e-gold)] hover:bg-[var(--e-cream)] rounded-xl transition-all">
                      <Lock size={18} /> Đổi mật khẩu
                    </a>
                    {user?.role === "provider" && (
                      <a href="/provider/dashboard"
                        className="flex items-center gap-3 p-3 text-[var(--e-gold)] hover:bg-[var(--e-cream)] rounded-xl transition-all">
                        <LayoutDashboard size={18} /> Bảng điều khiển
                      </a>
                    )}
                    {user?.role === "admin" && (
                      <a href="/admin/dashboard"
                        className="flex items-center gap-3 p-3 text-[var(--e-gold)] hover:bg-[var(--e-cream)] rounded-xl transition-all">
                        <Settings size={18} /> Bảng điều khiển quản trị
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Right Column ── */}
              <div className="md:col-span-8 space-y-6">

                {/* Update form */}
                <div className="glass-panel p-8 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                  <h3 className="font-[var(--e-serif)] text-2xl font-medium text-[var(--e-charcoal)] mb-6 pb-4 border-b border-[var(--e-beige)]">
                    Cập Nhật Thông Tin
                  </h3>

                  {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.type === "success"
                        ? "bg-emerald-100/80 text-emerald-700"
                        : "bg-rose-100/80 text-rose-700"
                      }`}>
                      {message.text}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
                    <div className="space-y-5">

                      {/* Name */}
                      <div className="relative group">
                        <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">
                          Tên Hiển Thị
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                            <UserIcon size={18} strokeWidth={2} />
                          </div>
                          <input type="text" name="name" value={formData.name} onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                            placeholder="Nhập tên hiển thị..." />
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="relative group">
                        <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">
                          Số Điện Thoại
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                            <Phone size={18} strokeWidth={2} />
                          </div>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                            placeholder="Nhập số điện thoại liên lạc..." />
                        </div>
                      </div>

                      {/* Address */}
                      <div className="relative group">
                        <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">
                          Địa Chỉ
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                            <MapPin size={18} strokeWidth={2} />
                          </div>
                          <input type="text" name="address" value={formData.address} onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                            placeholder="Nhập địa chỉ nhà, thành phố..." />
                        </div>
                      </div>

                      {/* Avatar URL */}
                      <div className="relative group">
                        <label className="block text-[0.65rem] font-bold uppercase tracking-widest text-[var(--e-muted)] mb-2 ml-1">
                          Ảnh Đại Diện (URL)
                        </label>
                        <div className="relative flex items-center">
                          <div className="absolute left-4 text-[var(--e-gold)] opacity-70 transition-opacity group-focus-within:opacity-100">
                            <ImageIcon size={18} strokeWidth={2} />
                          </div>
                          <input type="url" name="avatar" value={formData.avatar} onChange={handleChange}
                            className="w-full pl-12 pr-4 py-3 bg-[var(--e-cream)] border border-[var(--e-beige)] rounded-xl text-[var(--e-charcoal)] placeholder-[var(--e-muted)] focus:outline-none focus:border-[var(--e-gold)] focus:ring-1 focus:ring-[var(--e-gold)] transition-all font-medium"
                            placeholder="https://example.com/avatar.jpg" />
                        </div>
                        <p className="text-[0.65rem] text-[var(--e-muted)] mt-2 ml-1 italic">
                          * Cập nhật URL ảnh để đổi hình đại diện.
                        </p>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-[var(--e-beige)]">
                      <button type="submit" disabled={saving} className="e-btn-primary"
                        style={{ padding: '0.9rem 2rem', fontSize: '0.8rem', minWidth: '180px' }}>
                        {saving ? "Đang lưu..." : "Cập nhật hồ sơ"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* ══════════════════════════════════════════════
                    BECOME PROVIDER SECTION — chỉ hiện với user
                ══════════════════════════════════════════════ */}
                {isUser && (
                  <div
                    id="become-provider"
                    className="glass-panel border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm overflow-hidden"
                  >
                    {/* Section header */}
                    <div style={{
                      padding: '1.6rem 2rem',
                      borderBottom: '1px solid var(--e-beige)',
                      background: 'linear-gradient(135deg, var(--e-cream) 0%, #fef9f0 100%)',
                      display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--e-cream), #fef3c7)',
                        border: '1px solid #fcd34d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Sparkles size={18} style={{ color: 'var(--e-gold)' }} />
                      </div>
                      <div>
                        <p style={{
                          fontSize: '0.6rem', letterSpacing: '0.16em',
                          textTransform: 'uppercase', color: 'var(--e-gold)',
                          fontWeight: 700, marginBottom: 2,
                        }}>
                          Nâng Cấp Tài Khoản
                        </p>
                        <h3 style={{
                          fontFamily: 'var(--e-serif)', fontSize: '1.15rem',
                          fontWeight: 500, color: 'var(--e-charcoal)', margin: 0,
                        }}>
                          Trở Thành Provider
                        </h3>
                      </div>
                    </div>

                    {/* Section body */}
                    <div style={{ padding: '1.8rem 2rem' }}>
                      {providerReqLoading ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          color: 'var(--e-muted)', fontSize: '0.82rem',
                          fontFamily: 'var(--e-sans)',
                        }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: '50%',
                            border: '2px solid var(--e-beige)',
                            borderTopColor: 'var(--e-gold)',
                            animation: 'spin 0.7s linear infinite',
                          }} />
                          Đang kiểm tra trạng thái...
                        </div>

                      ) : providerReqStatus === "pending" ? (
                        /* Chờ duyệt */
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: '1rem',
                          padding: '1.2rem 1.4rem',
                          background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px',
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', background: '#fef3c7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Sparkles size={16} style={{ color: '#d97706' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', marginBottom: 4, fontFamily: 'var(--e-sans)' }}>
                              Yêu cầu đang chờ xét duyệt
                            </p>
                            <p style={{ fontSize: '0.76rem', color: '#b45309', lineHeight: 1.6, fontFamily: 'var(--e-sans)' }}>
                              Admin đã nhận được yêu cầu của bạn và đang xem xét.
                              Thời gian xử lý thường từ <strong>1–3 ngày làm việc</strong>.
                              Bạn sẽ nhận thông báo qua email khi có kết quả.
                            </p>
                          </div>
                        </div>

                      ) : providerReqStatus === "approved" ? (
                        /* Đã duyệt */
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: '1rem',
                          padding: '1.2rem 1.4rem',
                          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px',
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', background: '#dcfce7',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14532d', marginBottom: 4, fontFamily: 'var(--e-sans)' }}>
                              Yêu cầu đã được phê duyệt!
                            </p>
                            <p style={{ fontSize: '0.76rem', color: '#15803d', lineHeight: 1.6, fontFamily: 'var(--e-sans)' }}>
                              Tài khoản của bạn đang được nâng cấp. Vui lòng đăng xuất
                              và đăng nhập lại để cập nhật quyền mới.
                            </p>
                          </div>
                        </div>

                      ) : providerReqStatus === "rejected" ? (
                        /* Bị từ chối */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: '1rem',
                            padding: '1.2rem 1.4rem',
                            background: '#fff1f2', border: '1px solid #fda4af', borderRadius: '12px',
                          }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%', background: '#ffe4e6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <XCircle size={16} style={{ color: '#e11d48' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#881337', marginBottom: 4, fontFamily: 'var(--e-sans)' }}>
                                Yêu cầu bị từ chối
                              </p>
                              <p style={{ fontSize: '0.76rem', color: '#be123c', lineHeight: 1.6, fontFamily: 'var(--e-sans)' }}>
                                Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết,
                                hoặc gửi lại yêu cầu sau khi bổ sung thông tin cần thiết.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowProviderModal(true)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.6rem',
                              padding: '0.85rem 1.4rem', background: 'var(--e-charcoal)',
                              border: 'none', borderRadius: '10px', cursor: 'pointer',
                              width: 'fit-content', fontSize: '0.78rem', fontWeight: 700,
                              color: 'var(--e-white)', letterSpacing: '0.06em',
                              textTransform: 'uppercase', fontFamily: 'var(--e-sans)',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)'}
                          >
                            <Sparkles size={14} /> Gửi lại yêu cầu
                          </button>
                        </div>

                      ) : (
                        /* none — chưa gửi */
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '0.84rem', color: 'var(--e-muted)',
                              lineHeight: 1.75, marginBottom: '1.2rem', fontFamily: 'var(--e-sans)',
                            }}>
                              Với tài khoản Provider, bạn có thể{' '}
                              <strong style={{ color: 'var(--e-charcoal)' }}>đăng tin bất động sản</strong>,
                              quản lý danh sách và tiếp cận hàng nghìn khách hàng tiềm năng trên Estoria.
                            </p>

                            {/* Benefits */}
                            <div style={{
                              display: 'grid', gridTemplateColumns: '1fr 1fr',
                              gap: '0.6rem', marginBottom: '1.5rem',
                            }}>
                              {[
                                "Đăng tin bất động sản",
                                "Quản lý danh sách",
                                "Tiếp cận khách hàng",
                                "Thống kê chi tiết",
                              ].map(benefit => (
                                <div key={benefit} style={{
                                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  fontSize: '0.76rem', color: 'var(--e-charcoal)',
                                  fontFamily: 'var(--e-sans)',
                                }}>
                                  <span style={{ color: 'var(--e-gold)', fontSize: '0.7rem' }}>✦</span>
                                  {benefit}
                                </div>
                              ))}
                            </div>

                            <button
                              onClick={() => setShowProviderModal(true)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                                padding: '0.9rem 2rem', background: 'var(--e-charcoal)',
                                border: 'none', borderRadius: '10px', cursor: 'pointer',
                                fontSize: '0.78rem', fontWeight: 700, color: 'var(--e-white)',
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                fontFamily: 'var(--e-sans)', transition: 'all 0.25s',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)'}
                            >
                              <Sparkles size={15} /> Đăng Ký Provider Ngay
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <LuxuryFooter />
      </div>

      {/* ══════════════════════════════════════════════════════
          Provider Request Modal
      ══════════════════════════════════════════════════════ */}
      {showProviderModal && (
        <div
          onClick={() => setShowProviderModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(17,28,20,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: 'var(--e-white)',
              boxShadow: '0 32px 80px rgba(17,28,20,0.22)',
              padding: '2.6rem', borderRadius: '4px',
              animation: 'slideUp 0.28s cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--e-cream) 0%, #fef3c7 100%)',
              border: '1px solid #fcd34d',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1.6rem',
            }}>
              <Sparkles size={22} style={{ color: 'var(--e-gold)' }} />
            </div>

            <p style={{
              fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'var(--e-gold)', fontWeight: 700, marginBottom: '0.5rem',
            }}>
              Nâng Cấp Tài Khoản
            </p>
            <h2 style={{
              fontFamily: 'var(--e-serif)', fontSize: '1.5rem',
              fontWeight: 500, color: 'var(--e-charcoal)',
              margin: '0 0 0.9rem', lineHeight: 1.3,
            }}>
              Đăng ký trở thành Provider?
            </h2>
            <p style={{
              fontSize: '0.82rem', color: 'var(--e-muted)',
              lineHeight: 1.75, marginBottom: '1rem',
            }}>
              Với tài khoản Provider, bạn có thể đăng tin bất động sản,
              quản lý danh sách và tiếp cận khách hàng tiềm năng trên Estoria.
            </p>

            <div style={{
              padding: '0.9rem 1.1rem', background: 'var(--e-cream)',
              borderLeft: '3px solid var(--e-gold)', marginBottom: '2rem',
              fontSize: '0.78rem', color: 'var(--e-muted)', lineHeight: 1.7,
            }}>
              Thời gian xét duyệt thường từ{' '}
              <strong style={{ color: 'var(--e-charcoal)' }}>1–3 ngày làm việc</strong>.
              Bạn sẽ nhận thông báo qua email khi được phê duyệt.
            </div>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={() => setShowProviderModal(false)}
                style={{
                  flex: 1, padding: '0.9rem',
                  background: 'transparent', border: '1px solid var(--e-beige)',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                  color: 'var(--e-muted)', fontFamily: 'var(--e-sans)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  borderRadius: '2px', transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--e-charcoal)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--e-charcoal)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--e-beige)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--e-muted)';
                }}
              >
                Huỷ
              </button>
              <button
                onClick={handleRequestProvider}
                disabled={modalLoading}
                style={{
                  flex: 2, padding: '0.9rem',
                  background: modalLoading ? 'var(--e-muted)' : 'var(--e-charcoal)',
                  border: 'none', cursor: modalLoading ? 'wait' : 'pointer',
                  fontSize: '0.75rem', fontWeight: 600, color: 'var(--e-white)',
                  fontFamily: 'var(--e-sans)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', borderRadius: '2px',
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
                onMouseEnter={e => {
                  if (!modalLoading)
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-gold)';
                }}
                onMouseLeave={e => {
                  if (!modalLoading)
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--e-charcoal)';
                }}
              >
                {modalLoading ? (
                  <>
                    <span style={{
                      width: 13, height: 13,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white', borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Đang gửi...
                  </>
                ) : 'Gửi Yêu Cầu'}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin    { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      )}
    </>
  );
}
