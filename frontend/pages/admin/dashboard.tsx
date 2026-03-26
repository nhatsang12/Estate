import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  CheckCircle, XCircle, LoaderCircle, RefreshCcw,
  ShieldCheck, ShieldAlert, CheckCircle2, UserRoundSearch,
  Clock, Home, Users, FileText, Key,
  MapPin, ChevronDown, ChevronRight,
  SlidersHorizontal, Search, Phone,
  BadgeCheck, AlertTriangle, Eye, CreditCard, User as UserIcon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { adminService } from "@/services/adminService";
import type { SubscriptionTransaction } from "@/services/paymentService";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import KycStatusBadge from "@/components/KycStatusBadge";
import type { Property } from "@/types/property";
import type { KycStatus, User } from "@/types/user";
import { formatVNDShort } from "@/utils/formatPrice";

/* ═══════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════ */
type View = "dashboard" | "properties" | "providers" | "kyc";
type KycStatusFilter = KycStatus | "all";
type SortOrder = "newest" | "oldest";
type RoleFilter = "provider" | "user";

interface DashboardStats {
  totalUsers: number; totalProviders: number; totalProperties: number;
  totalPropertyApprovals: number; totalPropertyRejections: number;
  totalVerifiedProviders: number; totalPendingProviders: number;
  totalRejectedProviders: number; pendingPropertiesCount: number;
  activePaidProviders: number;
  subscriptionSales: {
    totalSold: number;
    totalRevenue: number;
    byPlan: {
      Pro: { totalSold: number; totalRevenue: number };
      ProPlus: { totalSold: number; totalRevenue: number };
    };
    byPaymentMethod: {
      VNPay: { totalSold: number; totalRevenue: number };
      PayPal: { totalSold: number; totalRevenue: number };
    };
  };
}

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Đã xảy ra lỗi.";
}
function formatDate(date?: string) {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function prettyJson(value: unknown) {
  if (!value) return "Không có dữ liệu";
  try { return JSON.stringify(value, null, 2); } catch { return "Không thể hiển thị dữ liệu"; }
}
const fmtVND = (n: number) => formatVNDShort(n);
function isImageUrl(url: string) {
  return /\/image\/upload\//.test(url) || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
}

const SUBSCRIPTION_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  success: {
    label: "Thành công",
    color: "#2E8B75",
    bg: "rgba(46,139,117,0.08)",
    border: "rgba(46,139,117,0.24)",
  },
  pending: {
    label: "Đang xử lý",
    color: "#7a5e28",
    bg: "rgba(154,124,69,0.08)",
    border: "rgba(154,124,69,0.22)",
  },
  failed: {
    label: "Thất bại",
    color: "#9a3820",
    bg: "rgba(184,74,42,0.07)",
    border: "rgba(184,74,42,0.22)",
  },
  cancelled: {
    label: "Đã hủy",
    color: "#556177",
    bg: "rgba(85,97,119,0.08)",
    border: "rgba(85,97,119,0.2)",
  },
};

/* ═══════════════════════════════════════════════════════════
   ANIMATED SELECT
═══════════════════════════════════════════════════════════ */
interface SelectOption { value: string; label: string; }

function AnimatedSelect({
  label, value, onChange, options, icon: Icon,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  icon?: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const activeLabel = options.find(o => o.value === value)?.label ?? "";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function reposition() {
      if (!buttonRef.current) return;
      const r = buttonRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const handleOpen = () => {
    if (buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    setOpen(v => !v);
  };

  const dropdown = (
    <div ref={dropRef} style={{
      position: "fixed", top: dropPos.top, left: dropPos.left, width: dropPos.width,
      zIndex: 99999, background: "#fff", border: "1px solid rgba(154,124,69,0.2)",
      borderRadius: "10px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      transformOrigin: "top center", transition: "opacity 0.18s ease, transform 0.18s ease",
      opacity: open ? 1 : 0,
      transform: open ? "scaleY(1) translateY(0)" : "scaleY(0.9) translateY(-6px)",
      pointerEvents: open ? "auto" : "none", overflow: "hidden",
    }}>
      {options.map((opt, i) => (
        <button key={opt.value} type="button"
          onClick={() => { onChange(opt.value); setOpen(false); }}
          style={{
            width: "100%", textAlign: "left", padding: "10px 14px", border: "none",
            background: opt.value === value ? "rgba(154,124,69,0.07)" : "transparent",
            color: opt.value === value ? "var(--e-gold)" : "var(--e-charcoal)",
            fontFamily: "var(--e-sans)", fontSize: "0.83rem",
            fontWeight: opt.value === value ? 700 : 400,
            cursor: "pointer", transition: "background 0.15s",
            borderBottom: i < options.length - 1 ? "1px solid rgba(154,124,69,0.06)" : "none",
          }}
          onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = "rgba(154,124,69,0.04)"; }}
          onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = "transparent"; }}
        >{opt.label}</button>
      ))}
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      <label style={{
        display: "block", fontSize: "0.6rem", letterSpacing: "0.14em",
        textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700,
        marginBottom: 6, fontFamily: "var(--e-sans)",
      }}>{label}</label>
      <button ref={buttonRef} type="button" onClick={handleOpen}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "9px 12px",
          border: `1px solid ${open ? "var(--e-gold)" : "rgba(154,124,69,0.25)"}`,
          borderRadius: "8px",
          background: open ? "rgba(154,124,69,0.04)" : "rgba(255,255,255,0.92)",
          cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.84rem",
          color: "var(--e-charcoal)", transition: "all 0.2s",
          boxShadow: open ? "0 0 0 3px rgba(154,124,69,0.08)" : "none", textAlign: "left",
        }}>
        {Icon && <Icon size={13} style={{ color: open ? "var(--e-gold)" : "var(--e-light-muted)", flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{activeLabel}</span>
        <ChevronDown size={13} style={{
          color: open ? "var(--e-gold)" : "var(--e-light-muted)",
          transition: "transform 0.25s",
          transform: open ? "rotate(180deg)" : "none", flexShrink: 0,
        }} />
      </button>
      {mounted && createPortal(dropdown, document.body)}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW WRAPPER
═══════════════════════════════════════════════════════════ */
function ViewWrapper({ children }: { children: React.ReactNode }) {
  return <div><div>{children}</div></div>;
}

/* ═══════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, icon, accent = false, warn = false }: {
  label: string; value: string | number; icon: React.ReactNode;
  accent?: boolean; warn?: boolean;
}) {
  return (
    <div className="e-glass-card" style={{
      padding: "1.5rem",
      background: accent ? "var(--e-charcoal)" : warn ? "rgba(154,124,69,0.06)" : "rgba(255,255,255,0.85)",
      backdropFilter: "blur(8px)",
      border: accent ? "none" : warn ? "1px solid rgba(154,124,69,0.25)" : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: accent ? "rgba(255,255,255,0.5)" : "var(--e-muted)", fontWeight: 700, margin: 0, fontFamily: "var(--e-sans)" }}>{label}</p>
        <div style={{ color: accent ? "var(--e-gold-light)" : "var(--e-gold)", opacity: 0.85 }}>{icon}</div>
      </div>
      <p style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.4rem, 2vw, 2rem)", fontWeight: 600, color: accent ? "#fff" : "var(--e-charcoal)", lineHeight: 1, margin: 0, letterSpacing: "-0.02em" }}>{value}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD VIEW
═══════════════════════════════════════════════════════════ */
function DashboardView({ stats, onNavigate }: { stats: DashboardStats | null; onNavigate: (v: View) => void }) {
  const trendData = [
    { month: "T1", "Tin đăng": 12, "Đã duyệt": 8, "Từ chối": 2 },
    { month: "T2", "Tin đăng": 18, "Đã duyệt": 14, "Từ chối": 3 },
    { month: "T3", "Tin đăng": 24, "Đã duyệt": 19, "Từ chối": 4 },
    { month: "T4", "Tin đăng": 20, "Đã duyệt": 16, "Từ chối": 2 },
    { month: "T5", "Tin đăng": 31, "Đã duyệt": 25, "Từ chối": 5 },
    { month: "T6", "Tin đăng": 28, "Đã duyệt": 22, "Từ chối": 3 },
  ];
  const propertyPieData = [
    { name: "Đã duyệt", value: stats?.totalPropertyApprovals || 0, color: "#2E8B75" },
    { name: "Từ chối", value: stats?.totalPropertyRejections || 0, color: "#b84a2a" },
    { name: "Chờ duyệt", value: stats?.pendingPropertiesCount || 0, color: "var(--e-gold)" },
  ].filter(d => d.value > 0);
  const providerPieData = [
    { name: "Đã xác minh", value: stats?.totalVerifiedProviders || 0, color: "#2E8B75" },
    { name: "Chờ xác minh", value: stats?.totalPendingProviders || 0, color: "var(--e-gold)" },
    { name: "Từ chối", value: stats?.totalRejectedProviders || 0, color: "#b84a2a" },
  ].filter(d => d.value > 0);
  const tooltipStyle = {
    borderRadius: "12px", border: "1px solid rgba(154,124,69,0.2)",
    background: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)", fontFamily: "var(--e-sans)", fontSize: "0.8rem",
  };
  const subscriptionSales = stats?.subscriptionSales;
  const totalSubscriptionSold = subscriptionSales?.totalSold ?? 0;
  const totalSubscriptionRevenue = subscriptionSales?.totalRevenue ?? 0;
  const proSold = subscriptionSales?.byPlan?.Pro?.totalSold ?? 0;
  const proPlusSold = subscriptionSales?.byPlan?.ProPlus?.totalSold ?? 0;
  const proPlusShare = totalSubscriptionSold > 0 ? Math.round((proPlusSold / totalSubscriptionSold) * 100) : 0;

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Admin Dashboard</p>
        <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          Bảng <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Điều Khiển</em>
        </h1>
      </div>

      {((stats?.pendingPropertiesCount ?? 0) > 0 || (stats?.totalPendingProviders ?? 0) > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: (stats?.pendingPropertiesCount ?? 0) > 0 && (stats?.totalPendingProviders ?? 0) > 0 ? "1fr 1fr" : "1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {(stats?.pendingPropertiesCount ?? 0) > 0 && (
            <button onClick={() => onNavigate("properties")}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.4rem", background: "rgba(154,124,69,0.07)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "10px", cursor: "pointer", transition: "background 0.2s", textAlign: "left", fontFamily: "var(--e-sans)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(154,124,69,0.13)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(154,124,69,0.07)"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--e-gold)", display: "flex" }}><ShieldAlert size={16} /></span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--e-charcoal)" }}>{stats?.pendingPropertiesCount} tin đang chờ duyệt</span>
              </div>
              <span style={{ fontSize: "0.65rem", color: "var(--e-gold)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Duyệt Ngay →</span>
            </button>
          )}
          {(stats?.totalPendingProviders ?? 0) > 0 && (
            <button onClick={() => onNavigate("providers")}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.4rem", background: "rgba(154,124,69,0.07)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "10px", cursor: "pointer", transition: "background 0.2s", textAlign: "left", fontFamily: "var(--e-sans)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(154,124,69,0.13)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(154,124,69,0.07)"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--e-gold)", display: "flex" }}><UserRoundSearch size={16} /></span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--e-charcoal)" }}>{stats?.totalPendingProviders} provider chờ xác minh</span>
              </div>
              <span style={{ fontSize: "0.65rem", color: "var(--e-gold)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Xác Minh →</span>
            </button>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Tổng Người Dùng" value={stats?.totalUsers || 0} icon={<Users size={20} />} accent />
        <StatCard label="Nhà Cung Cấp" value={stats?.totalProviders || 0} icon={<Home size={20} />} />
        <StatCard label="Tổng Bất Động Sản" value={stats?.totalProperties || 0} icon={<FileText size={20} />} />
        <StatCard label="Chờ Phê Duyệt" value={stats?.pendingPropertiesCount || 0} icon={<Clock size={20} />} warn />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Doanh Thu Gói" value={fmtVND(totalSubscriptionRevenue)} icon={<CreditCard size={20} />} accent />
        <StatCard label="Tổng Gói Đã Bán" value={totalSubscriptionSold} icon={<CheckCircle2 size={20} />} />
        <StatCard label="Provider Gói Trả Phí" value={stats?.activePaidProviders || 0} icon={<BadgeCheck size={20} />} />
        <StatCard label="Tỷ Trọng Pro Plus" value={`${proPlusShare}%`} icon={<SlidersHorizontal size={20} />} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="e-glass-card" style={{ padding: "1.6rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Doanh Thu Gói</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1rem" }}>Theo Từng Gói Đăng Ký</h3>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {[
              { label: "Pro", sold: proSold, revenue: subscriptionSales?.byPlan?.Pro?.totalRevenue ?? 0 },
              { label: "Pro Plus", sold: proPlusSold, revenue: subscriptionSales?.byPlan?.ProPlus?.totalRevenue ?? 0 },
            ].map(item => (
              <div key={item.label} style={{ border: "1px solid rgba(154,124,69,0.14)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.78)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.76rem", fontWeight: 700, color: "var(--e-charcoal)" }}>{item.label}</span>
                  <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.69rem", color: "var(--e-muted)" }}>{item.sold} gói</span>
                </div>
                <div style={{ marginTop: 4, fontFamily: "var(--e-serif)", fontSize: "1.02rem", color: "var(--e-charcoal)", fontWeight: 600 }}>
                  {fmtVND(item.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="e-glass-card" style={{ padding: "1.6rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Kênh Thanh Toán</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1rem" }}>Theo Phương Thức</h3>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {[
              { label: "VNPay", sold: subscriptionSales?.byPaymentMethod?.VNPay?.totalSold ?? 0, revenue: subscriptionSales?.byPaymentMethod?.VNPay?.totalRevenue ?? 0 },
              { label: "PayPal", sold: subscriptionSales?.byPaymentMethod?.PayPal?.totalSold ?? 0, revenue: subscriptionSales?.byPaymentMethod?.PayPal?.totalRevenue ?? 0 },
            ].map(item => (
              <div key={item.label} style={{ border: "1px solid rgba(154,124,69,0.14)", borderRadius: 10, padding: "0.8rem 0.9rem", background: "rgba(255,255,255,0.78)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.76rem", fontWeight: 700, color: "var(--e-charcoal)" }}>{item.label}</span>
                  <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.69rem", color: "var(--e-muted)" }}>{item.sold} giao dịch</span>
                </div>
                <div style={{ marginTop: 4, fontFamily: "var(--e-serif)", fontSize: "1.02rem", color: "var(--e-charcoal)", fontWeight: 600 }}>
                  {fmtVND(item.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div className="e-glass-card" style={{ padding: "1.8rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Xu Hướng</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1.5rem" }}>Biến Động Tin Đăng 6 Tháng</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--e-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--e-muted)" }} axisLine={false} tickLine={false} dx={-6} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "0.72rem", fontFamily: "var(--e-sans)", paddingTop: 12 }} />
                <Line type="monotone" dataKey="Tin đăng" stroke="var(--e-gold)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--e-gold)" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Đã duyệt" stroke="#2E8B75" strokeWidth={2.5} dot={{ r: 3, fill: "#2E8B75" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Từ chối" stroke="#b84a2a" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: "#b84a2a" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="e-glass-card" style={{ padding: "1.8rem", display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Bất Động Sản</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1rem" }}>Phân Bổ Trạng Thái</h3>
          <div style={{ flex: 1, minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={propertyPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={75} paddingAngle={4} dataKey="value">
                  {propertyPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            {propertyPieData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="e-glass-card" style={{ padding: "1.8rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>So Sánh</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1.5rem" }}>Duyệt & Từ Chối Theo Tháng</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--e-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--e-muted)" }} axisLine={false} tickLine={false} dx={-6} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: "0.72rem", fontFamily: "var(--e-sans)", paddingTop: 10 }} />
                <Bar dataKey="Đã duyệt" fill="#2E8B75" radius={[5, 5, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Từ chối" fill="#b84a2a" radius={[5, 5, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="e-glass-card" style={{ padding: "1.8rem", display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Provider</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1rem" }}>Trạng Thái Xác Minh</h3>
          <div style={{ flex: 1, minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={providerPieData} cx="50%" cy="50%" innerRadius={52} outerRadius={75} paddingAngle={4} dataKey="value">
                  {providerPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
            {providerPieData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="e-glass-card" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
        <div style={{ padding: "1.2rem 1.6rem", borderBottom: "1px solid rgba(154,124,69,0.1)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Hành Động</p>
          <h2 style={{ fontFamily: "var(--e-sans)", fontSize: "1rem", fontWeight: 700, color: "var(--e-charcoal)", margin: 0 }}>Truy Cập Nhanh</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", padding: "1rem" }}>
          {[
            { view: "properties" as View, label: "Duyệt Bất Động Sản", desc: `${stats?.pendingPropertiesCount || 0} đang chờ`, icon: <FileText size={22} /> },
            { view: "providers" as View, label: "Xác Minh Provider", desc: `${stats?.totalPendingProviders || 0} đang chờ`, icon: <Users size={22} /> },
            { view: "kyc" as View, label: "Quản Lý KYC", desc: "Duyệt hồ sơ CCCD", icon: <Key size={22} /> },
          ].map(action => (
            <button key={action.view} onClick={() => onNavigate(action.view)}
              style={{ display: "flex", flexDirection: "column", padding: "1.4rem 1.6rem", background: "rgba(255,252,248,0.7)", border: "1px solid rgba(154,124,69,0.12)", borderRadius: "12px", cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "var(--e-sans)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(154,124,69,0.07)"; e.currentTarget.style.borderColor = "rgba(154,124,69,0.28)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,252,248,0.7)"; e.currentTarget.style.borderColor = "rgba(154,124,69,0.12)"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ color: "var(--e-gold)", marginBottom: "0.8rem" }}>{action.icon}</span>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--e-charcoal)", marginBottom: 4 }}>{action.label}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--e-muted)" }}>{action.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROPERTY MODERATION ROW
═══════════════════════════════════════════════════════════ */
function PropertyModerationRow({ property, onApprove, onReject, isLoading }: {
  property: Property; onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>; isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const owner = typeof property.ownerId !== "string" && property.ownerId ? property.ownerId : null;

  const handleReject = async () => {
    if (!reason.trim()) { alert("Vui lòng nhập lý do từ chối."); return; }
    await onReject(reason);
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(154,124,69,0.15)", borderRadius: "18px",
      overflow: "hidden", position: "relative",
      transition: "box-shadow 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 20px 56px rgba(154,124,69,0.11)"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.35)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "rgba(154,124,69,0.15)"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--e-gold), transparent 70%)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr auto", minHeight: 168 }}>
        <div style={{ position: "relative", overflow: "hidden", background: "#f0ede8" }}>
          {property.images?.[0] ? (
            <img src={property.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.55s ease" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><Home size={28} color="var(--e-light-muted)" /></div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(26,24,20,0.35) 0%, transparent 55%)" }} />
          <span style={{ position: "absolute", top: 12, left: 12, fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, color: "#fff", fontFamily: "var(--e-sans)", background: "rgba(26,24,20,0.55)", backdropFilter: "blur(6px)", padding: "4px 10px", borderRadius: "6px" }}>{property.type}</span>
          {(property.images?.length ?? 0) > 1 && (
            <span style={{ position: "absolute", bottom: 10, left: 12, fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "var(--e-sans)" }}>{property.images!.length} ảnh</span>
          )}
        </div>
        <div style={{ padding: "1.4rem 1.6rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.7rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, padding: "4px 11px", borderRadius: "20px", color: "var(--e-gold)", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.3)", fontFamily: "var(--e-sans)" }}>
                <Clock size={8} /> Chờ duyệt
              </span>
              <span style={{ fontFamily: "var(--e-serif)", fontSize: "1.05rem", fontWeight: 600, color: "var(--e-charcoal)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{fmtVND(property.price)}</span>
            </div>
            <h3 style={{ fontFamily: "var(--e-sans)", fontSize: "1rem", fontWeight: 700, color: "var(--e-charcoal)", lineHeight: 1.35, marginTop: "0.55rem", marginBottom: 0 }}>{property.title}</h3>
            <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.73rem", color: "var(--e-muted)", marginTop: "0.3rem", fontFamily: "var(--e-sans)" }}>
              <MapPin size={12} color="var(--e-gold)" style={{ flexShrink: 0 }} />{property.address}
            </p>
          </div>
          <div>
            {owner && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0.55rem 0.9rem", marginBottom: "0.8rem", background: "rgba(154,124,69,0.04)", border: "1px solid rgba(154,124,69,0.1)", borderRadius: "10px" }}>
                <div style={{ width: 30, height: 30, borderRadius: "8px", background: "linear-gradient(135deg, var(--e-gold), var(--e-gold-light))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, color: "#fff", flexShrink: 0, fontFamily: "var(--e-serif)" }}>{owner.name?.charAt(0)?.toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{owner.name}</div>
                  <div style={{ fontSize: "0.67rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{owner.email}</div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", paddingTop: "0.8rem", borderTop: "1px solid rgba(154,124,69,0.08)" }}>
              {[`${property.area} m²`, `${property.bedrooms ?? 0} phòng ngủ`, `${property.bathrooms ?? 0} WC`, property.furnished ? "Đầy đủ nội thất" : "Chưa có nội thất"].map(text => (
                <span key={text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.71rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--e-gold)", flexShrink: 0 }} />{text}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.45rem", padding: "1.2rem 1.2rem 1.2rem 1rem", borderLeft: "1px solid rgba(154,124,69,0.1)", background: "rgba(248,245,240,0.45)", minWidth: 112 }}>
          {[
            { label: "Duyệt", icon: <CheckCircle size={13} />, style: { color: "#fff", background: "#2E8B75", borderColor: "#2E8B75", boxShadow: "0 3px 12px rgba(46,139,117,0.25)" }, onClick: onApprove },
            { label: "Từ chối", icon: <XCircle size={13} />, style: { color: "#b84a2a", background: "rgba(184,74,42,0.04)", borderColor: "rgba(184,74,42,0.25)" }, onClick: () => setRejecting(v => !v) },
            { label: "Chi tiết", icon: <ChevronDown size={12} />, style: { color: "var(--e-charcoal)", background: "rgba(255,255,255,0.8)", borderColor: "rgba(154,124,69,0.2)" }, onClick: () => setExpanded(v => !v) },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} disabled={isLoading && btn.label === "Duyệt"}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", fontSize: "0.61rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "9px", cursor: "pointer", transition: "all 0.22s", border: "1px solid", fontFamily: "var(--e-sans)", ...btn.style }}>
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ borderTop: rejecting ? "1px solid rgba(184,74,42,0.15)" : "none", background: "rgba(184,74,42,0.02)", maxHeight: rejecting ? 130 : 0, overflow: "hidden", transition: "max-height 0.35s ease", padding: rejecting ? "1rem 1.8rem" : "0 1.8rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do từ chối tin đăng này..."
            style={{ flex: 1, padding: "10px 12px", border: "1px solid rgba(184,74,42,0.28)", borderRadius: "9px", background: "#fff", fontFamily: "var(--e-sans)", fontSize: "0.83rem", color: "var(--e-charcoal)", outline: "none", resize: "none", minHeight: 62 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <button onClick={handleReject} style={{ padding: "9px 18px", background: "#b84a2a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Xác Nhận</button>
            <button onClick={() => { setRejecting(false); setReason(""); }} style={{ padding: "9px 18px", background: "transparent", color: "var(--e-muted)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Hủy</button>
          </div>
        </div>
      </div>
      <div style={{ borderTop: expanded ? "1px solid rgba(154,124,69,0.1)" : "none", background: "rgba(248,245,240,0.5)", maxHeight: expanded ? 900 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)", padding: expanded ? "1.4rem 1.8rem" : "0 1.8rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
          <div>
            <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>Mô Tả</p>
            <p style={{ fontSize: "0.79rem", color: "var(--e-muted)", lineHeight: 1.75, fontFamily: "var(--e-sans)" }}>{property.description || "Chưa có mô tả."}</p>
            {(property.amenities?.length ?? 0) > 0 && (<>
              <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, margin: "1.2rem 0 7px", fontFamily: "var(--e-sans)" }}>Tiện Ích</p>
              <div>{property.amenities?.map(a => (<span key={a} style={{ display: "inline-block", padding: "3px 10px", margin: 2, background: "rgba(154,124,69,0.07)", border: "1px solid rgba(154,124,69,0.15)", borderRadius: "6px", fontSize: "0.68rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{a}</span>))}</div>
            </>)}
            {owner && (<>
              <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, margin: "1.2rem 0 7px", fontFamily: "var(--e-sans)" }}>Chủ Sở Hữu</p>
              <div style={{ padding: "0.8rem 1rem", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(154,124,69,0.12)", borderRadius: "8px" }}>
                <p style={{ fontWeight: 700, color: "var(--e-charcoal)", fontSize: "0.84rem", marginBottom: 3, fontFamily: "var(--e-sans)" }}>{owner.name}</p>
                <p style={{ fontSize: "0.76rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{owner.email}</p>
              </div>
            </>)}
          </div>
          <div>
            {(property.images?.length ?? 0) > 0 && (<>
              <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>Hình Ảnh</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", marginBottom: "1rem" }}>
                {property.images!.slice(0, 6).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", height: 68, borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(154,124,69,0.15)" }}>
                    <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.07)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                  </a>
                ))}
              </div>
            </>)}
            {(property.ownershipDocuments?.length ?? 0) > 0 && (<>
              <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>Giấy Tờ Pháp Lý</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {property.ownershipDocuments?.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(154,124,69,0.15)" }}>
                    {isImageUrl(url) ? (<img src={url} alt="" style={{ width: "100%", height: 72, objectFit: "cover", display: "block", transition: "transform 0.3s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />) : (<div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--e-cream)", fontSize: "0.72rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>PDF</div>)}
                    <div style={{ padding: "0.4rem 0.6rem", background: "#fff", fontSize: "0.68rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)", fontWeight: 600 }}>Giấy tờ {i + 1}</div>
                  </a>
                ))}
              </div>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROPERTIES VIEW
═══════════════════════════════════════════════════════════ */
type PropFilter = "all" | "apartment" | "house" | "villa" | "studio" | "office";

function PropertiesView() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processedId, setProcessedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<PropFilter>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await adminService.getPendingProperties(page, 20); setProperties(res.data.properties); setTotalPages(res.totalPages || 1); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...properties];
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(p => p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)); }
    if (typeFilter !== "all") list = list.filter(p => p.type === typeFilter);
    if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [properties, search, typeFilter, sortBy]);

  const handleApprove = (id: string) => async () => {
    setProcessedId(id);
    try { await adminService.moderateProperty(id, { status: "approved" }); setProperties(p => p.filter(x => x._id !== id)); alert("Phê duyệt thành công"); }
    catch (e: any) { alert(e.message || "Lỗi"); } finally { setProcessedId(null); }
  };
  const handleReject = (id: string) => async (reason: string) => {
    setProcessedId(id);
    try { await adminService.moderateProperty(id, { status: "rejected", rejectionReason: reason }); setProperties(p => p.filter(x => x._id !== id)); alert("Đã từ chối"); }
    catch (e: any) { alert(e.message || "Lỗi"); } finally { setProcessedId(null); }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Quản Lý Bất Động Sản</p>
          <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>Duyệt <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Tin Đăng</em></h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold)", border: "1px solid rgba(154,124,69,0.3)", padding: "5px 12px", background: "rgba(154,124,69,0.06)", borderRadius: "6px", fontFamily: "var(--e-sans)", display: "flex", alignItems: "center" }}>{filtered.length} đang chờ</span>
          <button onClick={() => setShowFilters(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: showFilters ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: showFilters ? "#fff" : "var(--e-charcoal)", transition: "all 0.2s" }}>
            <SlidersHorizontal size={13} /> Bộ Lọc
          </button>
        </div>
      </div>
      <div style={{ maxHeight: showFilters ? 500 : 0, overflow: showFilters ? "visible" : "hidden", transition: "max-height 0.35s ease", marginBottom: showFilters ? "1.2rem" : 0 }}>
        <div className="e-glass-card" style={{ padding: "1.2rem 1.4rem", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Tìm Kiếm</label>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--e-light-muted)" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc địa chỉ..." style={{ width: "100%", padding: "9px 12px 9px 30px", border: "1px solid rgba(154,124,69,0.25)", borderRadius: "8px", background: "rgba(255,255,255,0.92)", fontFamily: "var(--e-sans)", fontSize: "0.84rem", color: "var(--e-charcoal)", outline: "none" }} onFocus={e => e.target.style.borderColor = "var(--e-gold)"} onBlur={e => e.target.style.borderColor = "rgba(154,124,69,0.25)"} />
            </div>
          </div>
          <AnimatedSelect label="Loại Hình" value={typeFilter} onChange={v => setTypeFilter(v as PropFilter)} icon={Home} options={[{ value: "all", label: "Tất cả" }, { value: "apartment", label: "Căn hộ" }, { value: "house", label: "Nhà phố" }, { value: "villa", label: "Biệt thự" }, { value: "studio", label: "Studio" }, { value: "office", label: "Văn phòng" }]} />
          <AnimatedSelect label="Sắp Xếp" value={sortBy} onChange={setSortBy} icon={SlidersHorizontal} options={[{ value: "newest", label: "Mới nhất" }, { value: "oldest", label: "Cũ nhất" }, { value: "price_asc", label: "Giá tăng dần" }, { value: "price_desc", label: "Giá giảm dần" }]} />
        </div>
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}><LoaderCircle size={16} className="animate-spin" /> Đang tải…</div>
      ) : filtered.length > 0 ? (<>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map(p => (<PropertyModerationRow key={p._id} property={p} onApprove={handleApprove(p._id)} onReject={handleReject(p._id)} isLoading={processedId === p._id} />))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>← Trước</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setPage(p)} style={{ width: 38, height: 38, borderRadius: "8px", border: "none", background: p === page ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", color: p === page ? "#fff" : "var(--e-charcoal)", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.8rem", fontWeight: 700 }}>{p}</button>))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>Sau →</button>
        </div>
      </>) : (
        <div style={{ textAlign: "center", padding: "5rem 2rem", background: "rgba(255,255,255,0.85)", borderRadius: "14px", border: "1px solid rgba(154,124,69,0.15)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "1rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{search || typeFilter !== "all" ? "Không tìm thấy kết quả phù hợp" : "Không có bất động sản chờ duyệt"}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROVIDERS VIEW
═══════════════════════════════════════════════════════════ */
function ProviderModerationRow({ provider, onApprove, onReject, isLoading }: {
  provider: User; onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>; isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [subscriptions, setSubscriptions] = useState<SubscriptionTransaction[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
  const [subscriptionsPage, setSubscriptionsPage] = useState(1);
  const [subscriptionsTotalPages, setSubscriptionsTotalPages] = useState(1);
  const handleReject = async () => { if (!reason.trim()) { alert("Vui lòng nhập lý do từ chối."); return; } await onReject(reason); };
  const AVATAR_GRADIENTS = ["linear-gradient(135deg, var(--e-gold), var(--e-gold-light))", "linear-gradient(135deg, #7b9e6e, #a8c896)", "linear-gradient(135deg, #7e6a9e, #a89cc8)"];
  const avatarGrad = AVATAR_GRADIENTS[(provider.name?.charCodeAt(0) ?? 0) % 3];

  const loadSubscriptions = useCallback(async (page = 1) => {
    try {
      setSubscriptionsLoading(true);
      setSubscriptionsError(null);
      const response = await adminService.getProviderSubscriptions(provider._id, page, 5);
      setSubscriptions(response.data?.subscriptions ?? []);
      setSubscriptionsPage(response.currentPage ?? page);
      setSubscriptionsTotalPages(response.totalPages ?? 1);
    } catch (caughtError) {
      const fallbackMessage = "Không thể tải thông tin gói đăng ký.";
      const message = caughtError instanceof Error ? caughtError.message : fallbackMessage;
      setSubscriptionsError(message || fallbackMessage);
    } finally {
      setSubscriptionsLoading(false);
    }
  }, [provider._id]);

  const handleToggleSubscriptions = () => {
    setSubscriptionsExpanded(prev => {
      const next = !prev;
      if (next) {
        void loadSubscriptions(subscriptionsPage);
      }
      return next;
    });
  };
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(154,124,69,0.15)", borderRadius: "18px", overflow: "hidden", position: "relative", transition: "box-shadow 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 20px 56px rgba(154,124,69,0.11)"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.35)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(154,124,69,0.15)"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--e-gold), transparent 70%)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", minHeight: 130, alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg, rgba(201,169,110,0.07) 0%, rgba(201,169,110,0.02) 100%)", borderRight: "1px solid rgba(154,124,69,0.08)", padding: "1.2rem 0.8rem" }}>
          <div style={{ width: 52, height: 52, borderRadius: "14px", background: avatarGrad, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--e-serif)", fontSize: "1.3rem", fontWeight: 600, color: "#fff", boxShadow: "0 4px 14px rgba(201,169,110,0.3)", flexShrink: 0 }}>{provider.name?.charAt(0)?.toUpperCase()}</div>
        </div>
        <div style={{ padding: "1.3rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.6rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{provider.name}</span>
              <KycStatusBadge status={provider.kycStatus || "pending"} />
            </div>
            <p style={{ fontSize: "0.73rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{provider.email}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
            {provider.phone && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}><Phone size={12} color="var(--e-gold)" /> {provider.phone}</span>}
            {provider.address && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}><MapPin size={12} color="var(--e-gold)" /> {provider.address}</span>}
            {(provider.kycDocuments?.length ?? 0) > 0 && <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "#1a6fa8", fontFamily: "var(--e-sans)" }}><FileText size={12} /> {provider.kycDocuments!.length} tài liệu CCCD</span>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.42rem", padding: "1.1rem 1.1rem 1.1rem 0.9rem", borderLeft: "1px solid rgba(154,124,69,0.1)", background: "rgba(248,245,240,0.45)", minWidth: 118 }}>
          {[
            { label: "Xác minh", icon: <ShieldCheck size={13} />, cls: "approve", onClick: onApprove },
            { label: "Từ chối", icon: <XCircle size={13} />, cls: "reject", onClick: () => setRejecting(v => !v) },
            { label: "Gói", icon: <CreditCard size={12} />, cls: "detail", onClick: handleToggleSubscriptions },
            { label: "Tài liệu", icon: <ChevronDown size={12} />, cls: "detail", onClick: () => setExpanded(v => !v) },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} disabled={isLoading && btn.cls === "approve"}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 14px", fontSize: "0.61rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "9px", cursor: "pointer", transition: "all 0.22s", whiteSpace: "nowrap", border: "1px solid", fontFamily: "var(--e-sans)", ...(btn.cls === "approve" ? { color: "#fff", background: "#2E8B75", borderColor: "#2E8B75", boxShadow: "0 3px 12px rgba(46,139,117,0.25)" } : btn.cls === "reject" ? { color: "#b84a2a", background: "rgba(184,74,42,0.04)", borderColor: "rgba(184,74,42,0.25)" } : { color: "var(--e-charcoal)", background: "rgba(255,255,255,0.8)", borderColor: "rgba(154,124,69,0.2)" }) }}>
              {isLoading && btn.cls === "approve" ? <LoaderCircle size={12} className="animate-spin" /> : btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: rejecting ? 130 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
        <div style={{ borderTop: "1px solid rgba(184,74,42,0.15)", background: "rgba(184,74,42,0.025)", padding: "1rem 1.6rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do từ chối provider này..." style={{ flex: 1, padding: "10px 12px", border: "1px solid rgba(184,74,42,0.28)", borderRadius: "9px", background: "#fff", fontFamily: "var(--e-sans)", fontSize: "0.83rem", color: "var(--e-charcoal)", outline: "none", resize: "none", minHeight: 58 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
              <button onClick={handleReject} style={{ padding: "9px 18px", background: "#b84a2a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Xác Nhận</button>
              <button onClick={() => { setRejecting(false); setReason(""); }} style={{ padding: "9px 18px", background: "transparent", color: "var(--e-muted)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.64rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Hủy</button>
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxHeight: subscriptionsExpanded ? 460 : 0, overflow: "hidden", transition: "max-height 0.42s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ borderTop: "1px solid rgba(154,124,69,0.1)", background: "rgba(248,245,240,0.5)", padding: "1.3rem 1.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.8rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "0.53rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Gói Đăng Ký Provider</p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>
                Gói hiện tại: <strong>{provider.subscriptionPlan || "Free"}</strong> · Tin đã đăng: <strong>{provider.listingsCount ?? 0}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadSubscriptions(subscriptionsPage)}
              disabled={subscriptionsLoading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid rgba(154,124,69,0.2)",
                background: "rgba(255,255,255,0.9)",
                color: "var(--e-charcoal)",
                fontFamily: "var(--e-sans)",
                fontSize: "0.63rem",
                fontWeight: 700,
                cursor: subscriptionsLoading ? "wait" : "pointer",
              }}
            >
              {subscriptionsLoading ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Làm mới
            </button>
          </div>

          {subscriptionsError && (
            <div style={{ marginBottom: "0.8rem", border: "1px solid rgba(184,74,42,0.25)", background: "rgba(184,74,42,0.06)", borderRadius: 9, padding: "0.65rem 0.8rem", color: "#9a3820", fontSize: "0.75rem", fontFamily: "var(--e-sans)" }}>
              {subscriptionsError}
            </div>
          )}

          <div style={{ border: "1px solid rgba(154,124,69,0.16)", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
            {subscriptionsLoading && subscriptions.length === 0 ? (
              <div style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "var(--e-muted)", fontFamily: "var(--e-sans)", fontSize: "0.78rem" }}>
                <LoaderCircle size={14} className="animate-spin" />
                Đang tải giao dịch...
              </div>
            ) : subscriptions.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 680, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(248,245,240,0.8)" }}>
                      {["Mã GD", "Gói", "P.thức", "Số tiền", "Trạng thái", "Thời gian"].map(head => (
                        <th key={head} style={{ textAlign: "left", padding: "10px 11px", borderBottom: "1px solid rgba(154,124,69,0.14)", fontSize: "0.56rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((tx, index) => {
                      const statusMeta = SUBSCRIPTION_STATUS_META[tx.status] ?? SUBSCRIPTION_STATUS_META.pending;
                      return (
                        <tr key={tx._id} style={{ borderBottom: index < subscriptions.length - 1 ? "1px solid rgba(154,124,69,0.1)" : "none" }}>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", fontSize: "0.71rem", fontWeight: 700, color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>#{tx._id.slice(-8).toUpperCase()}</td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", fontSize: "0.73rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{tx.subscriptionPlan}</td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", fontSize: "0.73rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{tx.paymentMethod}</td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", fontSize: "0.73rem", fontWeight: 700, color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{fmtVND(tx.amount)}</td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 18, border: `1px solid ${statusMeta.border}`, background: statusMeta.bg, color: statusMeta.color, fontSize: "0.56rem", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, fontFamily: "var(--e-sans)" }}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td style={{ padding: "9px 11px", whiteSpace: "nowrap", fontSize: "0.72rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{formatDate(tx.orderedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.78rem" }}>
                Provider này chưa có lịch sử thanh toán gói.
              </div>
            )}
          </div>

          {subscriptionsTotalPages > 1 && (
            <div style={{ marginTop: "0.65rem", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.45rem" }}>
              <button onClick={() => void loadSubscriptions(Math.max(1, subscriptionsPage - 1))} disabled={subscriptionsPage === 1 || subscriptionsLoading} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(154,124,69,0.2)", background: "#fff", opacity: subscriptionsPage === 1 ? 0.45 : 1, cursor: subscriptionsPage === 1 ? "not-allowed" : "pointer", fontFamily: "var(--e-sans)", fontSize: "0.64rem", fontWeight: 700 }}>← Trước</button>
              <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.66rem", color: "var(--e-muted)", fontWeight: 700 }}>{subscriptionsPage}/{subscriptionsTotalPages}</span>
              <button onClick={() => void loadSubscriptions(Math.min(subscriptionsTotalPages, subscriptionsPage + 1))} disabled={subscriptionsPage === subscriptionsTotalPages || subscriptionsLoading} style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid rgba(154,124,69,0.2)", background: "#fff", opacity: subscriptionsPage === subscriptionsTotalPages ? 0.45 : 1, cursor: subscriptionsPage === subscriptionsTotalPages ? "not-allowed" : "pointer", fontFamily: "var(--e-sans)", fontSize: "0.64rem", fontWeight: 700 }}>Sau →</button>
            </div>
          )}
        </div>
      </div>
      <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ borderTop: "1px solid rgba(154,124,69,0.1)", background: "rgba(248,245,240,0.5)", padding: "1.3rem 1.6rem" }}>
          <p style={{ fontSize: "0.53rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 10, fontFamily: "var(--e-sans)" }}>Tài Liệu CCCD</p>
          {provider.kycDocuments?.length ? (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {provider.kycDocuments.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", width: 160, height: 108, borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(154,124,69,0.2)" }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.35s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                </a>
              ))}
            </div>
          ) : <p style={{ fontSize: "0.82rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Chưa có tài liệu KYC.</p>}
        </div>
      </div>
    </div>
  );
}

function ProvidersView() {
  const [providers, setProviders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [processedId, setProcessedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await adminService.getPendingProviders(page, 20); setProviders(res.data.providers); setTotalPages(res.totalPages || 1); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...providers];
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)); }
    if (kycFilter !== "all") list = list.filter(p => (p.kycStatus || "pending") === kycFilter);
    if (sortBy === "name_asc") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "name_desc") list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [providers, search, kycFilter, sortBy]);

  const handleApprove = (id: string) => async () => {
    setProcessedId(id);
    try { await adminService.verifyProvider(id, { isVerified: true }); setProviders(p => p.filter(x => x._id !== id)); alert("Xác minh thành công"); }
    catch (e: any) { alert(e.message || "Lỗi"); } finally { setProcessedId(null); }
  };
  const handleReject = (id: string) => async (reason: string) => {
    setProcessedId(id);
    try { await adminService.verifyProvider(id, { isVerified: false, kycRejectionReason: reason }); setProviders(p => p.filter(x => x._id !== id)); alert("Đã từ chối"); }
    catch (e: any) { alert(e.message || "Lỗi"); } finally { setProcessedId(null); }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Quản Lý Đối Tác</p>
          <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1 }}>Xác Minh <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Nhà Cung Cấp</em></h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold)", border: "1px solid rgba(154,124,69,0.3)", padding: "5px 12px", background: "rgba(154,124,69,0.06)", borderRadius: "6px", fontFamily: "var(--e-sans)", display: "flex", alignItems: "center" }}>{filtered.length} đang chờ</span>
          <button onClick={() => setShowFilters(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: showFilters ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: showFilters ? "#fff" : "var(--e-charcoal)", transition: "all 0.2s" }}>
            <SlidersHorizontal size={13} /> Bộ Lọc
          </button>
        </div>
      </div>
      <div style={{ maxHeight: showFilters ? 500 : 0, overflow: showFilters ? "visible" : "hidden", transition: "max-height 0.35s ease", marginBottom: showFilters ? "1.2rem" : 0 }}>
        <div className="e-glass-card" style={{ padding: "1.2rem 1.4rem", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Tìm Kiếm</label>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--e-light-muted)" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc email..." style={{ width: "100%", padding: "9px 12px 9px 30px", border: "1px solid rgba(154,124,69,0.25)", borderRadius: "8px", background: "rgba(255,255,255,0.92)", fontFamily: "var(--e-sans)", fontSize: "0.84rem", color: "var(--e-charcoal)", outline: "none" }} onFocus={e => e.target.style.borderColor = "var(--e-gold)"} onBlur={e => e.target.style.borderColor = "rgba(154,124,69,0.25)"} />
            </div>
          </div>
          <AnimatedSelect label="Trạng Thái KYC" value={kycFilter} onChange={setKycFilter} icon={ShieldCheck} options={[{ value: "all", label: "Tất cả" }, { value: "pending", label: "Chờ xử lý" }, { value: "submitted", label: "Đã nộp" }, { value: "reviewing", label: "Đang xem xét" }, { value: "rejected", label: "Từ chối" }]} />
          <AnimatedSelect label="Sắp Xếp" value={sortBy} onChange={setSortBy} icon={SlidersHorizontal} options={[{ value: "newest", label: "Mới nhất" }, { value: "oldest", label: "Cũ nhất" }, { value: "name_asc", label: "Tên A→Z" }, { value: "name_desc", label: "Tên Z→A" }]} />
        </div>
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}><LoaderCircle size={16} className="animate-spin" /> Đang tải…</div>
      ) : filtered.length > 0 ? (<>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {filtered.map(p => (<ProviderModerationRow key={p._id} provider={p} onApprove={handleApprove(p._id)} onReject={handleReject(p._id)} isLoading={processedId === p._id} />))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>← Trước</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (<button key={p} onClick={() => setPage(p)} style={{ width: 38, height: 38, borderRadius: "8px", border: "none", background: p === page ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", color: p === page ? "#fff" : "var(--e-charcoal)", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.8rem", fontWeight: 700 }}>{p}</button>))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>Sau →</button>
        </div>
      </>) : (
        <div style={{ textAlign: "center", padding: "5rem 2rem", background: "rgba(255,255,255,0.85)", borderRadius: "14px", border: "1px solid rgba(154,124,69,0.15)", backdropFilter: "blur(8px)" }}>

          <p style={{ fontSize: "1rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{search || kycFilter !== "all" ? "Không tìm thấy kết quả phù hợp" : "Không có nhà cung cấp chờ xác minh"}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KYC VIEW — REDESIGNED
═══════════════════════════════════════════════════════════ */
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; dot: string; icon: React.ReactNode }> = {
  verified: { label: "Đã xác minh", bg: "rgba(46,139,117,0.08)", color: "#1a7a62", border: "rgba(46,139,117,0.25)", dot: "#2E8B75", icon: <BadgeCheck size={11} /> },
  submitted: { label: "Đã nộp", bg: "rgba(59,130,246,0.07)", color: "#1e56a0", border: "rgba(59,130,246,0.22)", dot: "#3b82f6", icon: <FileText size={11} /> },
  reviewing: { label: "Đang xem xét", bg: "rgba(154,124,69,0.08)", color: "#7a5e28", border: "rgba(154,124,69,0.25)", dot: "var(--e-gold)", icon: <Eye size={11} /> },
  rejected: { label: "Từ chối", bg: "rgba(184,74,42,0.07)", color: "#9a3820", border: "rgba(184,74,42,0.22)", dot: "#b84a2a", icon: <XCircle size={11} /> },
  pending: { label: "Chờ xử lý", bg: "rgba(0,0,0,0.04)", color: "var(--e-light-muted)", border: "rgba(0,0,0,0.1)", dot: "#aaa", icon: <Clock size={11} /> },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px 3px 8px", borderRadius: "20px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--e-sans)" }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function KycUserCard({ user, isActive, onClick }: { user: User; isActive: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[user.kycStatus ?? "pending"];
  const initials = user.name?.slice(0, 2)?.toUpperCase() ?? "??";
  const hue = (user.name?.charCodeAt(0) ?? 65) % 360;
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.85rem 1.1rem", borderRadius: "12px", background: isActive ? "linear-gradient(135deg, rgba(201,169,110,0.12), rgba(201,169,110,0.05))" : "transparent", border: isActive ? "1px solid rgba(201,169,110,0.28)" : "1px solid transparent", transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)", position: "relative", overflow: "hidden" }}
        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.background = "rgba(154,124,69,0.04)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(154,124,69,0.12)"; } }}
        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.borderColor = "transparent"; } }}>
        {isActive && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 3px 3px 0", background: "linear-gradient(to bottom, var(--e-gold), var(--e-gold-light))" }} />}
        <div style={{ width: 42, height: 42, borderRadius: "12px", background: isActive ? "linear-gradient(135deg, var(--e-gold), var(--e-gold-light))" : `hsl(${hue},28%,42%)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--e-serif)", fontSize: "0.95rem", fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: isActive ? "0 4px 14px rgba(201,169,110,0.35)" : "none", transition: "all 0.22s" }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "var(--e-charcoal)", fontFamily: "var(--e-sans)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
          <div style={{ fontSize: "0.67rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
        </div>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0, boxShadow: `0 0 6px ${cfg.dot}66` }} />
      </div>
    </button>
  );
}

function CaseFilePanel({ user, onApprove, onReject, actionLoading, errorMessage, successMessage }: {
  user: User; onApprove: () => void; onReject: (reason: string) => void;
  actionLoading: boolean; errorMessage: string | null; successMessage: string | null;
}) {
  const [reason, setReason] = useState(user.kycRejectionReason || "");
  const [docOpen, setDocOpen] = useState(false);
  useEffect(() => { setReason(user.kycRejectionReason || ""); }, [user._id, user.kycRejectionReason]);
  const initials = user.name?.slice(0, 2)?.toUpperCase() ?? "??";
  const hue = (user.name?.charCodeAt(0) ?? 65) % 360;

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(154,124,69,0.18)", borderRadius: "20px", overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.07)", display: "flex", flexDirection: "column" }}>
      {/* Hero header */}
      <div style={{ position: "relative", overflow: "hidden", padding: "2rem 2rem 1.6rem", background: "linear-gradient(135deg, #e8f5f1 0%, #d4ede7 60%, #eaf4f1 100%)", minHeight: 160 }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(46,139,117,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(46,139,117,0.25), transparent)" }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.2rem", position: "relative" }}>
          <div style={{ width: 68, height: 68, borderRadius: "18px", background: `linear-gradient(135deg, hsl(${hue},38%,52%), hsl(${hue + 30},30%,38%))`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--e-serif)", fontSize: "1.6rem", fontWeight: 700, color: "#fff", flexShrink: 0, border: "2px solid rgba(46,139,117,0.25)", boxShadow: "0 8px 24px rgba(46,139,117,0.2)" }}>{initials}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--e-serif)", fontSize: "1.4rem", fontWeight: 500, color: "#1a3d32", lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 4 }}>{user.name}</div>
            <div style={{ fontSize: "0.72rem", color: "rgba(26,61,50,0.55)", fontFamily: "var(--e-sans)", marginBottom: 10 }}>{user.email}</div>
            <StatusPill status={user.kycStatus ?? "pending"} />
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.5rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(46,139,117,0.5)", fontFamily: "var(--e-sans)", marginBottom: 3 }}>Case ID</div>
            <div style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#2E8B75", letterSpacing: "0.05em" }}>{user._id?.slice(-8)?.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.6rem" }} className="custom-scrollbar">
        {/* Info grid */}
        <div style={{ marginBottom: "1.4rem" }}>
          <div style={{ fontSize: "0.52rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 10, fontFamily: "var(--e-sans)" }}>Thông Tin Cá Nhân</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            {[
              { icon: <UserIcon size={12} />, label: "Vai trò", value: user.role, cap: true },
              { icon: <BadgeCheck size={12} />, label: "Xác minh", value: user.isVerified ? "Đã xác minh" : "Chưa xác minh", accent: user.isVerified ? "#2E8B75" : undefined },
              { icon: <Phone size={12} />, label: "Điện thoại", value: user.phone || "—" },
              { icon: <MapPin size={12} />, label: "Địa chỉ", value: user.address || "—", span: true },
              { icon: <Clock size={12} />, label: "Ngày tạo", value: formatDate(user.createdAt), span: true },
            ].map((item, i) => (
              <div key={i} style={{ gridColumn: item.span ? "span 2" : "auto", padding: "0.75rem 0.9rem", background: "rgba(248,245,240,0.7)", border: "1px solid rgba(154,124,69,0.1)", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-muted)", fontFamily: "var(--e-sans)", marginBottom: 4 }}>
                  <span style={{ color: "var(--e-gold)", opacity: 0.7 }}>{item.icon}</span>{item.label}
                </div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, fontFamily: "var(--e-sans)", color: item.accent ?? "var(--e-charcoal)", textTransform: item.cap ? "capitalize" : undefined }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* KYC docs accordion */}
        <div style={{ marginBottom: "1.4rem" }}>
          <button onClick={() => setDocOpen(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "0.6rem 0", marginBottom: docOpen ? 10 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "0.52rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, fontFamily: "var(--e-sans)" }}>
              <FileText size={12} />Tài Liệu CCCD ({user.kycDocuments?.length ?? 0})
            </div>
            <ChevronRight size={14} style={{ color: "var(--e-light-muted)", transform: docOpen ? "rotate(90deg)" : "none", transition: "transform 0.25s" }} />
          </button>
          <div style={{ maxHeight: docOpen ? 400 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
            {user.kycDocuments?.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {user.kycDocuments.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(154,124,69,0.18)", position: "relative" }}>
                    <img src={url} alt={`KYC ${i + 1}`} style={{ width: "100%", height: 90, objectFit: "cover", display: "block", transition: "transform 0.35s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "4px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.55))", fontSize: "0.58rem", color: "rgba(255,255,255,0.85)", fontFamily: "var(--e-sans)" }}>Ảnh {i + 1}</div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ padding: "1.2rem", textAlign: "center", border: "1px dashed rgba(154,124,69,0.2)", borderRadius: "10px", color: "var(--e-light-muted)", fontSize: "0.78rem", fontFamily: "var(--e-sans)" }}>Chưa có tài liệu</div>
            )}
          </div>
        </div>

        {/* OCR */}
        <div style={{ marginBottom: "1.4rem" }}>
          <div style={{ fontSize: "0.52rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 10, fontFamily: "var(--e-sans)" }}>Dữ Liệu OCR Trích Xuất</div>
          <pre style={{ background: "#16120d", color: "#c9a96e", padding: "1rem 1.1rem", borderRadius: "12px", fontSize: "0.67rem", lineHeight: 1.7, margin: 0, overflowY: "auto", maxHeight: 120, border: "1px solid rgba(201,169,110,0.12)", letterSpacing: "0.02em" }} className="custom-scrollbar">
            {prettyJson(user.kycExtractedData)}
          </pre>
        </div>

        {/* Previous rejection */}
        {user.kycRejectionReason && (
          <div style={{ marginBottom: "1.4rem", padding: "1rem", background: "rgba(184,74,42,0.04)", border: "1px solid rgba(184,74,42,0.2)", borderRadius: "12px", borderLeft: "3px solid #b84a2a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b84a2a", fontWeight: 700, fontFamily: "var(--e-sans)", marginBottom: 6 }}>
              <AlertTriangle size={11} /> Lý Do Từ Chối Trước
            </div>
            <p style={{ fontSize: "0.78rem", color: "#9a3820", lineHeight: 1.65, margin: 0, fontFamily: "var(--e-sans)" }}>{user.kycRejectionReason}</p>
          </div>
        )}

        {/* Reason textarea */}
        <div style={{ marginBottom: "1.2rem" }}>
          <label style={{ display: "block", fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>
            Lý do từ chối <span style={{ color: "rgba(0,0,0,0.3)", textTransform: "none", letterSpacing: 0 }}>(bắt buộc khi từ chối)</span>
          </label>
          <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Mô tả chi tiết lý do từ chối hồ sơ KYC này..."
            style={{ width: "100%", padding: "10px 13px", border: "1px solid rgba(154,124,69,0.22)", borderRadius: "10px", background: "rgba(255,252,248,0.95)", fontFamily: "var(--e-sans)", fontSize: "0.82rem", color: "var(--e-charcoal)", outline: "none", resize: "none", minHeight: 72, transition: "border-color 0.2s, box-shadow 0.2s" }}
            onFocus={e => { e.target.style.borderColor = "var(--e-gold)"; e.target.style.boxShadow = "0 0 0 3px rgba(154,124,69,0.08)"; }}
            onBlur={e => { e.target.style.borderColor = "rgba(154,124,69,0.22)"; e.target.style.boxShadow = "none"; }} />
        </div>

        {errorMessage && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "9px", background: "rgba(184,74,42,0.07)", border: "1px solid rgba(184,74,42,0.22)", fontSize: "0.78rem", color: "#9a3820", fontFamily: "var(--e-sans)", display: "flex", alignItems: "center", gap: 7 }}>
            <AlertTriangle size={13} /> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "9px", background: "rgba(46,139,117,0.07)", border: "1px solid rgba(46,139,117,0.22)", fontSize: "0.78rem", color: "#1a7a62", fontFamily: "var(--e-sans)", display: "flex", alignItems: "center", gap: 7 }}>
            <CheckCircle2 size={13} /> {successMessage}
          </div>
        )}
      </div>

      {/* Sticky action footer */}
      <div style={{ padding: "1.2rem 1.6rem", borderTop: "1px solid rgba(154,124,69,0.12)", background: "rgba(255,252,248,0.98)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        <button onClick={onApprove} disabled={actionLoading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: "11px", background: actionLoading ? "#7cbdaf" : "linear-gradient(135deg, #2E8B75, #1e6b57)", color: "#fff", border: "none", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "var(--e-sans)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", boxShadow: actionLoading ? "none" : "0 4px 16px rgba(46,139,117,0.3)", transition: "all 0.22s" }}
          onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
          {actionLoading ? <LoaderCircle size={13} className="animate-spin" /> : <ShieldCheck size={13} />}Duyệt KYC
        </button>
        <button onClick={() => onReject(reason)} disabled={actionLoading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px", borderRadius: "11px", background: "rgba(184,74,42,0.05)", color: "#b84a2a", border: "1px solid rgba(184,74,42,0.28)", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "var(--e-sans)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.22s" }}
          onMouseEnter={e => { if (!actionLoading) { e.currentTarget.style.background = "#b84a2a"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
          onMouseLeave={e => { if (!actionLoading) { e.currentTarget.style.background = "rgba(184,74,42,0.05)"; e.currentTarget.style.color = "#b84a2a"; e.currentTarget.style.transform = "none"; } }}>
          {actionLoading ? <LoaderCircle size={13} className="animate-spin" /> : <XCircle size={13} />}Từ Chối
        </button>
      </div>
    </div>
  );
}

function KycView() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("submitted");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("provider");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedUser = useMemo(() => users.find(u => u._id === selectedUserId) || null, [selectedUserId, users]);
  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    users.forEach(u => { const s = u.kycStatus ?? "pending"; map[s] = (map[s] ?? 0) + 1; });
    return map;
  }, [users]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const res = await userService.getUsersForKycReview(token, { role: roleFilter, kycStatus: statusFilter, sort: sortOrder, limit: 100 });
      setUsers(res.data.users);
      const list = res.data.users;
      if (list.length === 0) setSelectedUserId(null);
      else if (!list.some((u: User) => u._id === selectedUserId)) setSelectedUserId(list[0]._id);
    } catch (err) { setErrorMessage(getErrorMessage(err)); } finally { setLoading(false); }
  }, [roleFilter, sortOrder, statusFilter, token]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const handleApprove = async () => {
    if (!token || !selectedUser) return;
    setActionLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try { await userService.updateUserKycStatus(token, selectedUser._id, { isVerified: true, kycStatus: "verified" }); setSuccessMessage("Đã duyệt KYC thành công."); await loadUsers(); }
    catch (err) { setErrorMessage(getErrorMessage(err)); } finally { setActionLoading(false); }
  };
  const handleReject = async (reason: string) => {
    if (!token || !selectedUser) return;
    if (!reason.trim()) { setErrorMessage("Vui lòng nhập lý do từ chối."); return; }
    setActionLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try { await userService.updateUserKycStatus(token, selectedUser._id, { isVerified: false, kycStatus: "rejected", kycRejectionReason: reason.trim() }); setSuccessMessage("Đã từ chối KYC."); await loadUsers(); }
    catch (err) { setErrorMessage(getErrorMessage(err)); } finally { setActionLoading(false); }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Xác Thực Danh Tính</p>
          <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Quản Lý <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Hồ Sơ KYC</em>
          </h2>
        </div>
        <button onClick={() => void loadUsers()}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "9px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-charcoal)", transition: "all 0.22s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--e-charcoal)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.85)"; e.currentTarget.style.color = "var(--e-charcoal)"; }}>
          <RefreshCcw size={13} /> Làm Mới
        </button>
      </div>

      {/* Filter bar */}
      <div className="e-glass-card" style={{ padding: "1.2rem 1.4rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", overflow: "visible" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Tìm Kiếm</label>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--e-light-muted)" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc email..."
                style={{ width: "100%", padding: "9px 12px 9px 30px", border: "1px solid rgba(154,124,69,0.25)", borderRadius: "8px", background: "rgba(255,255,255,0.92)", fontFamily: "var(--e-sans)", fontSize: "0.84rem", color: "var(--e-charcoal)", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "var(--e-gold)"} onBlur={e => e.target.style.borderColor = "rgba(154,124,69,0.25)"} />
            </div>
          </div>
          <AnimatedSelect label="Trạng Thái" value={statusFilter} onChange={v => setStatusFilter(v as KycStatusFilter)} icon={ShieldCheck}
            options={[{ value: "all", label: "Tất cả" }, { value: "submitted", label: "Đã nộp" }, { value: "reviewing", label: "Đang xem xét" }, { value: "rejected", label: "Từ chối" }, { value: "verified", label: "Đã xác minh" }, { value: "pending", label: "Chờ xử lý" }]} />
          <AnimatedSelect label="Vai Trò" value={roleFilter} onChange={v => setRoleFilter(v as RoleFilter)} icon={Users}
            options={[{ value: "provider", label: "Provider" }, { value: "user", label: "Người dùng" }]} />
        </div>
        {Object.keys(counts).length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.9rem", paddingTop: "0.9rem", borderTop: "1px solid rgba(154,124,69,0.1)" }}>
            {Object.entries(counts).map(([status, count]) => {
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
              return (
                <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: "20px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "0.62rem", fontWeight: 700, fontFamily: "var(--e-sans)", letterSpacing: "0.06em" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />{cfg.label} · {count}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}><LoaderCircle size={16} className="animate-spin" /> Đang tải hồ sơ…</div>
      ) : users.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", textAlign: "center", border: "1px dashed rgba(154,124,69,0.2)", borderRadius: "16px", background: "rgba(255,255,255,0.6)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "16px", background: "rgba(154,124,69,0.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}><ShieldCheck size={24} color="var(--e-gold)" style={{ opacity: 0.6 }} /></div>
          <p style={{ fontSize: "0.88rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", margin: 0 }}>Không tìm thấy hồ sơ KYC nào phù hợp.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1.2rem", alignItems: "start" }}>
          {/* List panel */}
          <div className="e-glass-card" style={{ background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
            <div style={{ padding: "1.1rem 1.3rem", borderBottom: "1px solid rgba(154,124,69,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: "8px", background: "rgba(154,124,69,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}><Users size={13} color="var(--e-gold)" /></div>
                <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.88rem", fontWeight: 700, color: "var(--e-charcoal)" }}>Hàng Chờ KYC</span>
              </div>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, fontFamily: "var(--e-sans)", color: "var(--e-gold)", background: "rgba(154,124,69,0.08)", border: "1px solid rgba(154,124,69,0.2)", padding: "2px 9px", borderRadius: "20px" }}>{filtered.length}</span>
            </div>
            <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 360px)", padding: "0.6rem" }} className="custom-scrollbar">
              {filtered.length > 0 ? filtered.map(u => (
                <KycUserCard key={u._id} user={u} isActive={u._id === selectedUserId} onClick={() => setSelectedUserId(u._id)} />
              )) : (
                <div style={{ padding: "2rem", textAlign: "center", fontSize: "0.82rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Không tìm thấy kết quả.</div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ position: "sticky", top: "1rem" }}>
            {selectedUser ? (
              <CaseFilePanel user={selectedUser} onApprove={() => void handleApprove()} onReject={reason => void handleReject(reason)} actionLoading={actionLoading} errorMessage={errorMessage} successMessage={successMessage} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, border: "1px dashed rgba(154,124,69,0.2)", borderRadius: "20px", background: "rgba(255,255,255,0.6)" }}>
                <div style={{ width: 56, height: 56, borderRadius: "16px", background: "rgba(154,124,69,0.06)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}><UserIcon size={24} color="var(--e-gold)" style={{ opacity: 0.5 }} /></div>
                <p style={{ fontFamily: "var(--e-sans)", fontSize: "0.85rem", margin: 0, color: "var(--e-light-muted)" }}>Chọn người dùng để xem hồ sơ KYC</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAV + MAIN PAGE
═══════════════════════════════════════════════════════════ */
const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: "dashboard", label: "Tổng Quan", icon: <SlidersHorizontal size={14} /> },
  { view: "properties", label: "Duyệt Tin", icon: <FileText size={14} /> },
  { view: "providers", label: "Provider", icon: <Home size={14} /> },
  { view: "kyc", label: "Quản Lý KYC", icon: <ShieldCheck size={14} /> },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");

  useEffect(() => {
    const q = router.query.view as string | undefined;
    if (q && ["dashboard", "properties", "providers", "kyc"].includes(q)) setView(q as View);
  }, [router.query.view]);

  const handleSetView = useCallback((newView: View) => {
    setView(newView);
    void router.replace({ pathname: "/admin/dashboard", query: newView === "dashboard" ? {} : { view: newView } }, undefined, { shallow: true });
  }, [router]);

  useEffect(() => {
    const init = async () => {
      try {
        if (!user || user.role !== "admin") { router.push("/"); return; }
        const res = await adminService.getDashboardStats();
        setStats(res.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    if (!isAuthLoading) void init();
  }, [router, user, isAuthLoading]);

  if (loading) return (
    <div className="estoria" style={{ minHeight: "100vh", background: "var(--e-cream)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--e-sans)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "2px solid rgba(154,124,69,0.2)", borderTopColor: "var(--e-gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        <p style={{ marginTop: "1rem", fontSize: "0.8rem", color: "var(--e-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Đang tải…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <Head><title>Admin Dashboard — Estoria</title></Head>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .e-glass-card {
          background: #ffffff; border: 1px solid var(--e-beige); border-radius: 12px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04);
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1);
          position: relative;
        }
        .e-glass-card:hover { transform: translateY(-3px); box-shadow: 0 15px 45px -10px rgba(154,124,69,0.12); border-color: rgba(154,124,69,0.3); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.4); }
      `}</style>

      <div className="estoria min-h-screen flex overflow-hidden font-[var(--e-sans)] bg-[var(--e-cream)]">
        <aside className="w-64 flex flex-col h-screen fixed top-0 left-0 z-50 shadow-2xl overflow-hidden"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85')", backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#111c14]/95 to-[#111c14]/90 backdrop-blur-md pointer-events-none z-0" />
          <div className="relative z-10 flex flex-col h-full border-r border-[#D4AF37]/10">
            <div className="p-8 pb-6 border-b border-[#D4AF37]/10">
              <Link href="/" className="flex items-center gap-2 no-underline group block">
                <span className="text-3xl font-extrabold text-white tracking-tighter" style={{ fontFamily: "var(--e-serif)" }}>Esto<span className="text-[var(--e-gold-light)] group-hover:text-white transition-colors duration-500">ria</span></span>
              </Link>
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-[var(--e-gold-light)] font-bold mt-2 ml-0.5" style={{ fontFamily: "var(--e-sans)" }}>Hệ Thống Quản Trị</div>
            </div>
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
              {NAV_ITEMS.map(item => {
                const isActive = view === item.view;
                const badge = item.view === "properties" ? stats?.pendingPropertiesCount : item.view === "providers" ? stats?.totalPendingProviders : undefined;
                return (
                  <button key={item.view} onClick={() => handleSetView(item.view)}
                    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20 shadow-lg text-white" : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"}`}
                    style={{ fontFamily: "var(--e-sans)" }}>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--e-gold-light)] shadow-[0_0_10px_var(--e-gold)]" />}
                    <span className={`transition-transform duration-300 z-10 ${isActive ? "text-[var(--e-gold-light)] scale-110" : "group-hover:scale-110"}`}>{item.icon}</span>
                    <span className={`text-[0.8rem] font-semibold tracking-wide flex-1 text-left z-10 ${isActive ? "opacity-100" : "opacity-90"}`}>{item.label}</span>
                    {badge != null && badge > 0 && (<span className="z-10" style={{ fontSize: "0.6rem", fontWeight: 700, background: "var(--e-gold)", color: "#fff", padding: "2px 7px", borderRadius: "6px", minWidth: 24, textAlign: "center", boxShadow: "0 0 10px rgba(212,175,55,0.4)" }}>{badge}</span>)}
                  </button>
                );
              })}
              <div className="h-px bg-[#D4AF37]/10 my-8 mx-2" />
              <a href="/" className="flex items-center gap-4 px-5 py-3.5 text-white/40 hover:text-[var(--e-gold-light)] hover:bg-[#D4AF37]/5 rounded-xl transition-all duration-300 border border-transparent" style={{ fontFamily: "var(--e-sans)" }}>
                <span className="opacity-90">←</span>
                <span className="text-[0.8rem] font-medium tracking-wide">Về Trang Chủ</span>
              </a>
            </nav>
            <div className="p-5 border-t border-[#D4AF37]/10 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--e-gold)] to-[var(--e-gold-light)] flex items-center justify-center text-white text-[1.1rem] font-bold shadow-lg flex-shrink-0" style={{ fontFamily: "var(--e-serif)" }}>{user?.name?.charAt(0)?.toUpperCase() ?? "A"}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.75rem] font-bold text-white truncate leading-tight mb-0.5" style={{ fontFamily: "var(--e-sans)" }}>{user?.name || "Administrator"}</p>
                  <p className="text-[0.63rem] text-[var(--e-gold-light)]/80 truncate mt-0 mb-0 tracking-wider" style={{ fontFamily: "var(--e-sans)" }}>{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 ml-64 min-h-screen relative overflow-y-auto">
          <div style={{ position: "fixed", top: 0, left: "16rem", right: 0, bottom: 0, backgroundImage: "url('https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=1600&q=85')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px) opacity(0.06)", zIndex: 0, pointerEvents: "none" }} />
          <div className="relative z-10 min-h-full flex flex-col p-8 lg:p-12">
            <div className="w-full max-w-7xl mx-auto flex-1">
              {view === "dashboard" && <ViewWrapper><DashboardView stats={stats} onNavigate={handleSetView} /></ViewWrapper>}
              {view === "properties" && <ViewWrapper><PropertiesView /></ViewWrapper>}
              {view === "providers" && <ViewWrapper><ProvidersView /></ViewWrapper>}
              {view === "kyc" && <ViewWrapper><KycView /></ViewWrapper>}
            </div>
            <footer className="mt-16 pt-8 border-t border-[var(--e-beige)] text-center text-[0.68rem] uppercase tracking-widest text-[var(--e-muted)] font-medium" style={{ fontFamily: "var(--e-sans)" }}>
              &copy; {new Date().getFullYear()} Estoria Luxury Real Estate
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
