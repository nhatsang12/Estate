import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { DragEvent, RefObject } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import {
  Plus, DollarSign, Ruler, BedDouble,
  CheckCircle, Clock, XCircle, LoaderCircle,
  AlertTriangle, CheckCircle2, FileUp, IdCard, ShieldCheck, UploadCloud, X,
  Eye, MousePointerClick, Calendar,
  LayoutDashboard, Building2, Layers, Settings,
  Check, Sparkles, Zap, Crown, ArrowRight, MapPin, Phone, FileText, Landmark, CreditCard,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/apiClient";
import propertyService from "@/services/propertyService";
import { userService } from "@/services/userService";
import { geocodeAddress } from "@/services/geocodeService";
import {
  paymentService,
  type PaymentMethod as CheckoutPaymentMethod,
  type SubscriptionPlan as PaidSubscriptionPlan,
  type SubscriptionTransaction,
} from "@/services/paymentService";
import PropertyForm from "@/components/PropertyForm";
import type { Property } from "@/types/property";
import type { SubscriptionPlan, User } from "@/types/user";

/* ═══════════════════════════════════════════════════════════
   HYDRATION-SAFE FORMATTERS
   Always pin locale "vi-VN" + minimumFractionDigits to prevent
   server/client mismatch (Node default locale vs browser locale)
═══════════════════════════════════════════════════════════ */
const fmtVND = (n: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));

const fmtNum = (n: number): string =>
  new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const fmtDateTime = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const SUBSCRIPTION_PAYMENT_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  success: {
    label: "Thành công",
    color: "#2E8B75",
    bg: "rgba(46,139,117,0.08)",
    border: "rgba(46,139,117,0.25)",
  },
  pending: {
    label: "Đang xử lý",
    color: "#C9A96E",
    bg: "rgba(201,169,110,0.1)",
    border: "rgba(201,169,110,0.32)",
  },
  failed: {
    label: "Thất bại",
    color: "#b84a2a",
    bg: "rgba(184,74,42,0.07)",
    border: "rgba(184,74,42,0.26)",
  },
  cancelled: {
    label: "Đã hủy",
    color: "#556177",
    bg: "rgba(85,97,119,0.08)",
    border: "rgba(85,97,119,0.2)",
  },
};

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS / SHARED CONSTANTS
═══════════════════════════════════════════════════════════ */
const STATUS_META: Record<string, {
  label: string; icon: React.ReactNode;
  color: string; bg: string; border: string;
}> = {
  approved: {
    label: "Đã duyệt",
    icon: <CheckCircle size={12} />,
    color: "#2E8B75",
    bg: "rgba(46,139,117,0.08)",
    border: "rgba(46,139,117,0.28)",
  },
  pending: {
    label: "Đang chờ",
    icon: <Clock size={12} />,
    color: "#C9A96E",
    bg: "rgba(212,175,55,0.07)",
    border: "rgba(212,175,55,0.3)",
  },
  rejected: {
    label: "Bị từ chối",
    icon: <XCircle size={12} />,
    color: "#b84a2a",
    bg: "rgba(184,74,42,0.07)",
    border: "rgba(184,74,42,0.28)",
  },
};

const CARD_HOVER_STYLE = {
  transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.25s",
} as React.CSSProperties;

type View = "dashboard" | "properties" | "plans" | "create" | "edit" | "kyc";

/* ═══════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */
function SectionHeader({ eyebrow, title, subtitle }: {
  eyebrow: string; title: React.ReactNode; subtitle?: string;
}) {
  return (
    <div style={{ marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.12)" }}>
      <p style={{ fontSize: "0.56rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>{eyebrow}</p>
      <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: "0.82rem", color: "var(--e-muted)", marginTop: 8, fontFamily: "var(--e-sans)", lineHeight: 1.65 }}>{subtitle}</p>}
    </div>
  );
}

function GlassCard({ children, style, className, onMouseEnter, onMouseLeave }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      className={className}
      style={{
        background: "rgba(255,255,255,0.88)",
        border: "1px solid rgba(154,124,69,0.14)",
        borderRadius: 16,
        backdropFilter: "blur(8px)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
        position: "relative",
        overflow: "hidden",
        ...CARD_HOVER_STYLE,
        ...style,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Gold top accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, rgba(201,169,110,0.6), transparent 65%)",
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: "0.54rem", letterSpacing: "0.13em", textTransform: "uppercase",
      fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`,
      fontFamily: "var(--e-sans)", whiteSpace: "nowrap",
    }}>
      {meta.icon}{meta.label}
    </span>
  );
}

function ActionBtn({
  children, onClick, variant = "outline", disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "gold" | "dark" | "outline" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "8px 16px", fontSize: "0.61rem", fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase",
    borderRadius: 9, cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.22s", whiteSpace: "nowrap", border: "1px solid",
    fontFamily: "var(--e-sans)", opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    gold: { color: "#fff", background: "var(--e-gold)", borderColor: "var(--e-gold)", boxShadow: "0 3px 12px rgba(201,169,110,0.3)" },
    dark: { color: "#fff", background: "var(--e-charcoal)", borderColor: "var(--e-charcoal)", boxShadow: "0 3px 12px rgba(26,24,20,0.18)" },
    outline: { color: "var(--e-charcoal)", background: "rgba(255,255,255,0.8)", borderColor: "rgba(154,124,69,0.2)" },
    danger: { color: "#b84a2a", background: "rgba(184,74,42,0.05)", borderColor: "rgba(184,74,42,0.25)" },
    ghost: { color: "var(--e-muted)", background: "transparent", borderColor: "rgba(0,0,0,0.1)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   HELPERS — resolve DB field naming inconsistency
   DB stores: subscriptionPlan + listingsCount (flat fields)
   Old type expected: subscription.plan + listingsCount
═══════════════════════════════════════════════════════════ */
function getUserPlan(user: User | null | undefined): SubscriptionPlan {
  if (!user) return "Free";
  // DB field: subscriptionPlan (flat)
  const flat = (user as any).subscriptionPlan as string | undefined;
  // Old nested format: subscription.plan
  const nested = user.subscription?.plan;
  return (flat ?? nested ?? "Free") as SubscriptionPlan;
}

function getUserListingsCount(user: User | null | undefined): number {
  if (!user) return 0;
  return (user as any).listingsCount ?? 0;
}
function ViewWrapper({ children }: { children: React.ReactNode }) {
  return <div style={{ position: "relative", zIndex: 2 }}>{children}</div>;
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD VIEW
═══════════════════════════════════════════════════════════ */
function DashboardView({
  provider, stats, properties, recentProperties, onNavigate,
}: {
  provider: { name?: string; email?: string; kycStatus?: string } | null;
  stats: { total: number; approved: number; pending: number; avgPrice: number };
  properties: Property[];
  recentProperties: Property[];
  onNavigate: (v: View) => void;
}) {
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "week">("all");

  const pieData = [
    { name: "Đã duyệt", value: stats.approved, color: "#2E8B75" },
    { name: "Chờ duyệt", value: stats.pending, color: "#C9A96E" },
    { name: "Từ chối", value: Math.max(0, stats.total - stats.approved - stats.pending), color: "#b84a2a" },
  ].filter(d => d.value > 0);

  const barData = properties.slice(0, 7).map(p => ({
    name: p.title.substring(0, 14) + (p.title.length > 14 ? "…" : ""),
    Giá: p.price,
  }));

  const mockViews = timeFilter === "all" ? 24500 : timeFilter === "month" ? 8200 : 1540;
  const mockLeads = timeFilter === "all" ? 342 : timeFilter === "month" ? 124 : 28;

  const STATS = [
    { label: "Tổng BĐS", value: stats.total, icon: <BedDouble size={18} /> },
    { label: "Lượt Xem", value: fmtNum(mockViews), icon: <Eye size={18} /> },
    { label: "Tương Tác", value: fmtNum(mockLeads), icon: <MousePointerClick size={18} /> },
    { label: "Đã Duyệt", value: stats.approved, icon: <CheckCircle size={18} /> },
    { label: "Chờ Duyệt", value: stats.pending, icon: <Clock size={18} /> },
    { label: "Giá Trung Bình", value: stats.avgPrice > 0 ? fmtVND(stats.avgPrice) : "—", icon: <DollarSign size={18} /> },
  ];

  return (
    <div style={{ padding: "2.5rem 2vw" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.12)" }}>
        <div>
          <p style={{ fontSize: "0.55rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>Provider Dashboard</p>
          <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.15 }}>
            Xin chào,{" "}
            <span style={{ fontFamily: "var(--e-sans)", color: "var(--e-light-muted)", fontWeight: 400, fontSize: "clamp(1.1rem, 2vw, 1.6rem)" }}>{provider?.name}</span>
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--e-muted)", marginTop: 6, fontFamily: "var(--e-sans)" }}>Quản lý bất động sản và theo dõi hiệu suất.</p>
        </div>

        {/* Time filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.9)", padding: 5, borderRadius: 12, border: "1px solid rgba(154,124,69,0.14)", backdropFilter: "blur(8px)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRight: "1px solid rgba(154,124,69,0.12)" }}>
            <Calendar size={13} color="var(--e-gold)" />
            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--e-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--e-sans)" }}>Kỳ</span>
          </div>
          {(["all", "month", "week"] as const).map(f => (
            <button key={f} onClick={() => setTimeFilter(f)} style={{
              padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
              fontFamily: "var(--e-sans)", fontSize: "0.67rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.06em", transition: "all 0.2s",
              background: timeFilter === f ? "var(--e-charcoal)" : "transparent",
              color: timeFilter === f ? "#fff" : "var(--e-light-muted)",
            }}>
              {f === "all" ? "Tất Cả" : f === "month" ? "Tháng" : "Tuần"}
            </button>
          ))}
        </div>
      </div>

      {/* ── KYC Warning ── */}
      {provider?.kycStatus && provider.kycStatus !== "verified" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", padding: "1rem 1.4rem", marginBottom: "1.5rem", background: "rgba(201,169,110,0.06)", border: "1px solid rgba(201,169,110,0.22)", borderRadius: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={17} color="var(--e-gold)" />
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--e-charcoal)", marginBottom: 2, fontFamily: "var(--e-sans)" }}>Tài khoản chưa xác minh KYC</div>
              <div style={{ fontSize: "0.71rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Hoàn thành KYC để đăng tin và tiếp cận khách hàng.</div>
            </div>
          </div>
          <ActionBtn variant="outline" onClick={() => onNavigate("kyc")}>Xác Minh Ngay →</ActionBtn>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.85rem", marginBottom: "1.5rem" }}>
        {STATS.map((card) => (
          <GlassCard key={card.label} style={{ padding: "1.4rem 1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.9rem" }}>
              <p style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, margin: 0, fontFamily: "var(--e-sans)" }}>{card.label}</p>
              <div style={{ color: "var(--e-gold)", opacity: 0.8 }}>{card.icon}</div>
            </div>
            <p suppressHydrationWarning style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.25rem, 1.8vw, 1.75rem)", fontWeight: 600, color: "var(--e-charcoal)", lineHeight: 1, margin: 0, letterSpacing: "-0.02em" }}>{card.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.7rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Đăng Tin Mới", view: "create" as View, variant: "dark" as const, icon: <Plus size={14} /> },
          { label: "Quản Lý BĐS", view: "properties" as View, variant: "outline" as const, icon: <Building2 size={14} /> },
          { label: "Nâng Cấp Gói", view: "plans" as View, variant: "gold" as const, icon: <Crown size={14} /> },
        ].map((btn) => (
          <button key={btn.label} onClick={() => onNavigate(btn.view)} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "0.95rem", fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            borderRadius: 12, cursor: "pointer", fontFamily: "var(--e-sans)",
            transition: "all 0.25s", border: "1px solid",
            ...(btn.variant === "dark" ? { background: "var(--e-charcoal)", color: "#fff", borderColor: "var(--e-charcoal)", boxShadow: "0 4px 14px rgba(26,24,20,0.14)" }
              : btn.variant === "gold" ? { background: "var(--e-gold)", color: "#fff", borderColor: "var(--e-gold)", boxShadow: "0 4px 14px rgba(201,169,110,0.3)" }
                : { background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", borderColor: "rgba(154,124,69,0.18)", backdropFilter: "blur(8px)" }),
          }}>
            {btn.icon}{btn.label}
          </button>
        ))}
      </div>

      {/* ── Charts ── */}
      {properties.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "0.85rem", marginBottom: "1.5rem" }}>
          <GlassCard style={{ padding: "1.6rem" }}>
            <p style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Biến Động</p>
            <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.05rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1.2rem" }}>Giá Trị Bất Động Sản</h3>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--e-muted)", fontWeight: 500 }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tickFormatter={(v: number) => `${(v / 1e9).toFixed(1)}T`} tick={{ fontSize: 10, fill: "var(--e-muted)" }} axisLine={false} tickLine={false} dx={-8} />
                  <RechartsTooltip
                    formatter={(value) => [fmtVND(Number(value ?? 0)), "Giá Trị"]}
                    cursor={{ fill: "rgba(154,124,69,0.03)" }}
                    contentStyle={{ borderRadius: 12, border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.97)", fontFamily: "var(--e-sans)", fontSize: "0.78rem" }}
                  />
                  <Bar dataKey="Giá" fill="url(#goldGrad)" radius={[6, 6, 0, 0]} maxBarSize={38} />
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A96E" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#E4C98A" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard style={{ padding: "1.6rem", display: "flex", flexDirection: "column" }}>
            <p style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Phân Bổ</p>
            <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.05rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "0.8rem" }}>Trạng Thái Tin</h3>
            <div style={{ flex: 1, minHeight: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ fontFamily: "var(--e-sans)", fontSize: "0.78rem", borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "0.8rem", flexWrap: "wrap" }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.68rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Recent Properties ── */}
      <GlassCard style={{ overflow: "hidden" }}>
        <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(154,124,69,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 3, fontFamily: "var(--e-sans)" }}>Danh Sách</p>
            <h3 style={{ fontFamily: "var(--e-sans)", fontSize: "0.95rem", fontWeight: 700, color: "var(--e-charcoal)", margin: 0 }}>Bất Động Sản Gần Đây</h3>
          </div>
          <ActionBtn variant="outline" onClick={() => onNavigate("properties")}>Xem Tất Cả →</ActionBtn>
        </div>

        {recentProperties.length > 0 ? (
          <div>
            {recentProperties.map((p, i) => (
              <div key={p._id} style={{
                display: "grid", gridTemplateColumns: "52px 1fr auto",
                alignItems: "center", gap: "1rem",
                padding: "0.95rem 1.5rem",
                borderBottom: i < recentProperties.length - 1 ? "1px solid rgba(154,124,69,0.07)" : "none",
                transition: "background 0.18s",
              }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(154,124,69,0.03)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: "var(--e-beige)", backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : "none", backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--e-charcoal)", marginBottom: 2, fontFamily: "var(--e-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                  <div style={{ fontSize: "0.7rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.address}</div>
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                  <div suppressHydrationWarning style={{ fontFamily: "var(--e-serif)", fontSize: "0.93rem", fontWeight: 600, color: "var(--e-charcoal)" }}>{fmtVND(p.price)}</div>
                  <StatusPill status={p.status ?? "pending"} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--e-light-muted)", marginBottom: "1.2rem", fontFamily: "var(--e-sans)" }}>Chưa có bất động sản nào</p>
            <ActionBtn variant="dark" onClick={() => onNavigate("create")}><Plus size={13} /> Đăng Tin Đầu Tiên</ActionBtn>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROPERTIES VIEW
═══════════════════════════════════════════════════════════ */
type FilterType = "all" | "pending" | "approved" | "rejected";
const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Tất Cả" },
  { value: "pending", label: "Đang Chờ" },
  { value: "approved", label: "Đã Duyệt" },
  { value: "rejected", label: "Bị Từ Chối" },
];

function PropertiesView({ properties, onDelete, onEdit }: {
  properties: Property[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const [filter, setFilter] = useState<FilterType>("all");
  const filtered = properties.filter(p => filter === "all" || p.status === filter);
  const counts = {
    all: properties.length,
    pending: properties.filter(p => p.status === "pending").length,
    approved: properties.filter(p => p.status === "approved").length,
    rejected: properties.filter(p => p.status === "rejected").length,
  };

  return (
    <div style={{ padding: "2.5rem 2vw" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.8rem" }}>
        <SectionHeader
          eyebrow="Nhà Cung Cấp"
          title={<>Quản Lý <span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)", fontSize: "clamp(1rem, 2vw, 1.4rem)" }}>Bất Động Sản</span></>}
        />
        <ActionBtn variant="gold"><Plus size={14} /> Tạo Mới</ActionBtn>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "0.45rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)} style={{
            padding: "6px 16px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700,
            cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.2s",
            border: filter === value ? "none" : "1px solid rgba(154,124,69,0.18)",
            background: filter === value ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)",
            color: filter === value ? "#fff" : "var(--e-light-muted)",
            boxShadow: filter === value ? "0 3px 10px rgba(26,24,20,0.1)" : "none",
            backdropFilter: "blur(8px)",
          }}>
            {label} <span style={{ marginLeft: 5, fontSize: "0.64rem", opacity: 0.65 }}>({counts[value]})</span>
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {filtered.map(property => (
            <PropertyCard
              key={property._id}
              property={property}
              onEdit={() => onEdit(property._id)}
              onDelete={() => onDelete(property._id)}
            />
          ))}
        </div>
      ) : (
        <GlassCard style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.95rem", color: "var(--e-light-muted)", marginBottom: "1.2rem", fontFamily: "var(--e-sans)" }}>
            {filter !== "all" ? `Không có tin ở trạng thái "${FILTERS.find(f => f.value === filter)?.label}"` : "Chưa có bất động sản nào"}
          </p>
          <ActionBtn variant="dark"><Plus size={14} /> Tạo Bất Động Sản Đầu Tiên</ActionBtn>
        </GlassCard>
      )}
    </div>
  );
}

/* Property Card — shared design language with admin moderation cards */
function PropertyCard({ property, onEdit, onDelete }: {
  property: Property; onEdit: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(154,124,69,0.14)",
      borderRadius: 16, overflow: "hidden", position: "relative",
      ...CARD_HOVER_STYLE,
      boxShadow: hovered ? "0 16px 48px rgba(154,124,69,0.1)" : "0 2px 12px rgba(0,0,0,0.04)",
      borderColor: hovered ? "rgba(201,169,110,0.32)" : "rgba(154,124,69,0.14)",
      transform: hovered ? "translateY(-2px)" : "none",
    }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      {/* Gold top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, var(--e-gold), transparent 70%)" }} />

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr auto", minHeight: 148 }}>
        {/* Thumbnail */}
        <div style={{ position: "relative", overflow: "hidden", background: "#f0ede8" }}>
          {property.images?.[0] ? (
            <img src={property.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.5s ease", transform: hovered ? "scale(1.05)" : "scale(1)" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--e-light-muted)" }}>
              <BedDouble size={28} />
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(26,24,20,0.3) 0%, transparent 55%)" }} />
          <span style={{ position: "absolute", top: 10, left: 10, fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700, color: "#fff", background: "rgba(26,24,20,0.55)", backdropFilter: "blur(6px)", padding: "3px 9px", borderRadius: 5, fontFamily: "var(--e-sans)" }}>
            {property.type}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: "1.3rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.65rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.8rem", marginBottom: "0.5rem" }}>
              <StatusPill status={property.status ?? "pending"} />
              <span suppressHydrationWarning style={{ fontFamily: "var(--e-serif)", fontSize: "1rem", fontWeight: 600, color: "var(--e-charcoal)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
                {fmtVND(property.price)}
              </span>
            </div>
            <h3 style={{ fontFamily: "var(--e-sans)", fontSize: "0.97rem", fontWeight: 700, color: "var(--e-charcoal)", lineHeight: 1.3, marginBottom: "0.28rem" }}>{property.title}</h3>
            <p style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.71rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
              <MapPin size={11} color="var(--e-gold)" style={{ flexShrink: 0 }} />
              {property.address}
            </p>
          </div>

          {/* Meta chips */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", paddingTop: "0.7rem", borderTop: "1px solid rgba(154,124,69,0.08)" }}>
            {[
              { icon: <Ruler size={11} />, text: `${property.area} m²` },
              { icon: <BedDouble size={11} />, text: `${property.bedrooms ?? 0} phòng ngủ` },
              { icon: <DollarSign size={11} />, text: property.furnished ? "Nội thất đầy đủ" : "Chưa nội thất" },
            ].map(({ icon, text }) => (
              <span key={text} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.69rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
                <span style={{ color: "var(--e-gold)" }}>{icon}</span>{text}
              </span>
            ))}
          </div>

          {/* Rejection reason */}
          {property.rejectionReason && property.status === "rejected" && (
            <div style={{ padding: "0.55rem 0.85rem", background: "rgba(184,74,42,0.05)", border: "1px solid rgba(184,74,42,0.22)", borderRadius: 8 }}>
              <p style={{ fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b84a2a", fontWeight: 700, marginBottom: 3, fontFamily: "var(--e-sans)" }}>Lý do từ chối</p>
              <p style={{ fontSize: "0.72rem", color: "#b84a2a", lineHeight: 1.6, fontFamily: "var(--e-sans)" }}>{property.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          gap: "0.42rem", padding: "1.1rem 1.1rem 1.1rem 0.9rem",
          borderLeft: "1px solid rgba(154,124,69,0.1)",
          background: "rgba(248,245,240,0.45)", minWidth: 108,
        }}>
          <Link href={`/properties/${property._id}`} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "8px 14px", fontSize: "0.6rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            borderRadius: 9, border: "1px solid rgba(154,124,69,0.2)",
            color: "var(--e-charcoal)", background: "rgba(255,255,255,0.8)",
            textDecoration: "none", fontFamily: "var(--e-sans)", transition: "all 0.2s",
          }}>
            <Eye size={12} /> Xem
          </Link>
          <ActionBtn variant="outline" onClick={onEdit}><Check size={12} /> Sửa</ActionBtn>
          <ActionBtn variant="danger" onClick={onDelete}><XCircle size={12} /> Xóa</ActionBtn>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PLANS VIEW
═══════════════════════════════════════════════════════════ */
const PLANS_CONFIG = [
  {
    plan: "Free" as SubscriptionPlan, name: "Free",
    tagline: "Bắt đầu hành trình",
    price: "0", priceUnit: "mãi mãi",
    accent: "#9e9e9e", accentLight: "rgba(158,158,158,0.08)", accentBorder: "rgba(158,158,158,0.2)",
    icon: <Sparkles size={18} />,
    features: ["Tối đa 3 tin đăng", "Hình ảnh cơ bản", "Hiển thị trên bản đồ", "Hỗ trợ qua email"],
  },
  {
    plan: "Pro" as SubscriptionPlan, name: "Pro",
    tagline: "Dành cho nhà môi giới chuyên nghiệp",
    price: "299.000", priceUnit: "/ tháng",
    accent: "#C9A96E", accentLight: "rgba(212,175,55,0.07)", accentBorder: "rgba(212,175,55,0.25)",
    icon: <Zap size={18} />,
    features: ["Tối đa 20 tin đăng", "Ưu tiên duyệt tin", "Thống kê lượt xem chi tiết", "Hỗ trợ ưu tiên 8h–22h", "Badge xác minh chuyên nghiệp"],
    highlight: true,
  },
  {
    plan: "ProPlus" as SubscriptionPlan, name: "Pro Plus",
    tagline: "Không giới hạn — không nhượng bộ",
    price: "599.000", priceUnit: "/ tháng",
    accent: "#c9a96e", accentLight: "rgba(201,169,110,0.08)", accentBorder: "rgba(201,169,110,0.3)",
    icon: <Crown size={18} />,
    features: ["Tin đăng không giới hạn", "Duyệt tin tức thì", "Hiển thị nổi bật trang chủ", "Phân tích & báo cáo nâng cao", "Hỗ trợ 24/7 qua Zalo & phone", "Tích hợp API"],
  },
];

const PLAN_LIMITS: Record<string, number | string> = { Free: 3, Pro: 20, ProPlus: "∞" };

function isPaidPlan(plan: SubscriptionPlan | null): plan is PaidSubscriptionPlan {
  return plan === "Pro" || plan === "ProPlus";
}

function PlansView({ currentPlan, listingsUsed }: {
  currentPlan: SubscriptionPlan;
  listingsUsed: number;
}) {
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [payMethod, setPayMethod] = useState<CheckoutPaymentMethod>("VNPay");
  const [processing, setProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const limit = PLAN_LIMITS[currentPlan];
  // For unlimited plan, show actual count vs a soft reference of 50 (purely visual)
  const usagePct = limit === "∞"
    ? Math.min(95, (listingsUsed / 50) * 100)
    : Math.min(100, listingsUsed > 0 ? (listingsUsed / (limit as number)) * 100 : 0);
  const selectedConfig = PLANS_CONFIG.find(p => p.plan === selected);
  const canCheckout = Boolean(selected && selected !== currentPlan && isPaidPlan(selected));

  const loadTransactions = useCallback(async (page = 1) => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await paymentService.getMySubscriptions(page, 8);
      setTransactions(response.data?.subscriptions ?? []);
      setHistoryPage(response.currentPage ?? page);
      setHistoryTotalPages(response.totalPages ?? 1);
    } catch (caughtError) {
      const fallbackMessage = "Không thể tải lịch sử thanh toán.";
      const message = caughtError instanceof Error ? caughtError.message : fallbackMessage;
      setHistoryError(message || fallbackMessage);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    setCheckoutError(null);
  }, [selected, payMethod]);

  useEffect(() => {
    void loadTransactions(historyPage);
  }, [historyPage, loadTransactions]);

  const handleCheckout = async () => {
    if (!selected || selected === currentPlan) {
      return;
    }

    if (!isPaidPlan(selected)) {
      setCheckoutError("Vui lòng chọn gói Pro hoặc Pro Plus để thanh toán.");
      return;
    }

    try {
      setProcessing(true);
      setCheckoutError(null);

      const response = await paymentService.createCheckout(
        {
          subscriptionPlan: selected,
          paymentMethod: payMethod,
        },
        false
      );

      const checkoutUrl = response.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      setCheckoutError("Không nhận được liên kết thanh toán. Vui lòng thử lại sau.");
    } catch (caughtError) {
      const fallbackMessage = "Không thể tạo phiên thanh toán lúc này.";
      const message = caughtError instanceof Error ? caughtError.message : fallbackMessage;
      setCheckoutError(message || fallbackMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: "2.5rem 2vw" }}>
      <SectionHeader
        eyebrow="Gói Dịch Vụ"
        title={<>Chọn Gói <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Phù Hợp</em></>}
        subtitle="Mỗi gói được thiết kế để tối ưu hoá hiệu suất đăng tin và tiếp cận khách hàng tiềm năng của bạn."
      />

      {/* Current plan usage */}
      <GlassCard style={{ padding: "1.4rem 1.8rem", marginBottom: "1.8rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "linear-gradient(135deg, var(--e-gold), #e8c97a)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px rgba(201,169,110,0.3)" }}>
            {PLANS_CONFIG.find(p => p.plan === currentPlan)?.icon}
          </div>
          <div>
            <p style={{ fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-muted)", marginBottom: 2, fontFamily: "var(--e-sans)" }}>Gói hiện tại</p>
            <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--e-charcoal)", margin: 0 }}>{currentPlan}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
            <span>Tin đã đăng</span>
            <span style={{ fontWeight: 700, color: "var(--e-charcoal)" }}>
              {listingsUsed}{limit === "∞" ? " / Không giới hạn" : ` / ${limit}`}
            </span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${usagePct}%`, background: usagePct >= 90 ? "linear-gradient(90deg, #c0392b, #e74c3c)" : "linear-gradient(90deg, var(--e-gold), #e8c97a)", transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
          </div>
        </div>
      </GlassCard>

      {/* Plan cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.9rem", marginBottom: "1.6rem" }}>
        {PLANS_CONFIG.map(p => {
          const isCurrent = currentPlan === p.plan;
          const isSelected = selected === p.plan;
          return (
            <div key={p.plan} onClick={() => !isCurrent && setSelected(p.plan)} style={{
              position: "relative", padding: "1.8rem 1.6rem", borderRadius: 16,
              border: `1px solid ${isSelected && !isCurrent ? p.accent : isCurrent ? "rgba(201,169,110,0.35)" : "rgba(154,124,69,0.12)"}`,
              background: "rgba(255,255,255,0.88)", backdropFilter: "blur(10px)",
              cursor: isCurrent ? "default" : "pointer",
              boxShadow: isSelected && !isCurrent ? `0 8px 32px ${p.accentBorder}` : "0 2px 12px rgba(0,0,0,0.04)",
              overflow: "hidden",
              transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1), box-shadow 0.35s cubic-bezier(0.16,1,0.3,1)",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: isCurrent || isSelected ? `linear-gradient(90deg, ${p.accent}, transparent)` : "transparent", transition: "background 0.3s" }} />
              {isCurrent && (
                <div style={{ position: "absolute", top: "1rem", right: "1rem", fontSize: "0.5rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, background: "rgba(201,169,110,0.1)", border: "1px solid rgba(201,169,110,0.25)", padding: "3px 8px", borderRadius: 6, fontFamily: "var(--e-sans)" }}>✦ Hiện tại</div>
              )}
              <div style={{ width: 36, height: 36, borderRadius: 9, background: p.accentLight, border: `1px solid ${p.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: p.accent, marginBottom: "1.1rem" }}>{p.icon}</div>
              <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-muted)", marginBottom: 4, fontFamily: "var(--e-sans)" }}>Gói</p>
              <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.5rem", fontWeight: 600, color: "var(--e-charcoal)", margin: "0 0 3px", lineHeight: 1 }}>{p.name}</h3>
              <p style={{ fontSize: "0.7rem", color: "var(--e-muted)", marginBottom: "1.3rem", lineHeight: 1.5, fontFamily: "var(--e-sans)" }}>{p.tagline}</p>
              <div style={{ marginBottom: "1.4rem", paddingBottom: "1.3rem", borderBottom: "1px solid rgba(154,124,69,0.1)" }}>
                <span style={{ fontFamily: "var(--e-serif)", fontSize: p.price === "0" ? "2.2rem" : "1.9rem", fontWeight: 600, color: p.price === "0" ? "var(--e-muted)" : "var(--e-charcoal)", letterSpacing: "-0.02em" }}>
                  {p.price === "0" ? "Miễn phí" : `${p.price}₫`}
                </span>
                {p.price !== "0" && <p style={{ fontSize: "0.66rem", color: "var(--e-muted)", marginTop: 3, fontFamily: "var(--e-sans)" }}>{p.priceUnit}</p>}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.4rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {p.features.map((f, fi) => (
                  <li key={fi} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: "0.73rem", color: "var(--e-muted)", lineHeight: 1.5, fontFamily: "var(--e-sans)" }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: p.accentLight, border: `1px solid ${p.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      <Check size={8} color={p.accent} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent ? (
                <button onClick={e => { e.stopPropagation(); setSelected(p.plan); }} style={{ width: "100%", padding: "10px", background: isSelected ? p.accent : "transparent", color: isSelected ? "#fff" : "var(--e-charcoal)", border: `1px solid ${isSelected ? p.accent : "rgba(154,124,69,0.2)"}`, borderRadius: 10, cursor: "pointer", fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "var(--e-sans)", transition: "all 0.22s" }}>
                  {isSelected ? <><Check size={11} strokeWidth={3} /> Đã chọn</> : <>Chọn gói <ArrowRight size={11} /></>}
                </button>
              ) : (
                <div style={{ width: "100%", padding: "10px", textAlign: "center", background: "rgba(154,124,69,0.05)", border: "1px solid rgba(154,124,69,0.15)", borderRadius: 10, fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
                  Gói đang dùng
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Checkout */}
      {canCheckout && selectedConfig && (
        <GlassCard style={{ padding: "1.6rem 1.8rem", marginBottom: "1.6rem" }}>
          <p style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: "1rem", fontFamily: "var(--e-sans)" }}>Xác Nhận Thanh Toán</p>

          <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: "0.9rem", marginBottom: "0.9rem" }}>
            <div style={{ border: "1px solid rgba(154,124,69,0.14)", borderRadius: 12, background: "rgba(255,255,255,0.82)", padding: "1rem 1.1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "0.8rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: selectedConfig.accentLight, border: `1px solid ${selectedConfig.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: selectedConfig.accent }}>
                  {selectedConfig.icon}
                </div>
                <div>
                  <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.05rem", fontWeight: 600, color: "var(--e-charcoal)", margin: 0 }}>{selectedConfig.name}</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--e-muted)", marginTop: 2, fontFamily: "var(--e-sans)" }}>
                    Chu kỳ thanh toán: 30 ngày
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "var(--e-sans)", fontSize: "0.74rem", color: "var(--e-muted)" }}>
                <span>Tổng thanh toán</span>
                <span style={{ fontFamily: "var(--e-serif)", fontSize: "1.08rem", color: "var(--e-charcoal)", fontWeight: 600 }}>
                  {selectedConfig.price}₫
                </span>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(154,124,69,0.14)", borderRadius: 12, background: "rgba(255,255,255,0.82)", padding: "1rem 0.8rem" }}>
              <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", margin: "0 0 0.65rem", fontFamily: "var(--e-sans)", fontWeight: 700 }}>
                Phương thức
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {([
                  { value: "VNPay" as CheckoutPaymentMethod, icon: <Landmark size={13} />, desc: "Ngân hàng, ví điện tử" },
                  { value: "PayPal" as CheckoutPaymentMethod, icon: <CreditCard size={13} />, desc: "Thẻ quốc tế, tài khoản PP" },
                ]).map(method => {
                  const active = payMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPayMethod(method.value)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.6rem",
                        textAlign: "left",
                        border: active ? "1px solid rgba(154,124,69,0.34)" : "1px solid rgba(154,124,69,0.14)",
                        background: active ? "rgba(154,124,69,0.08)" : "#fff",
                        borderRadius: 10,
                        padding: "0.55rem 0.7rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: active ? "var(--e-charcoal)" : "var(--e-muted)", fontSize: "0.72rem", fontWeight: active ? 700 : 600, fontFamily: "var(--e-sans)" }}>
                        {method.icon}
                        {method.value}
                      </span>
                      <span style={{ fontSize: "0.64rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{method.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {checkoutError && (
            <div style={{ marginBottom: "0.9rem", border: "1px solid rgba(184,74,42,0.28)", background: "rgba(184,74,42,0.06)", padding: "0.75rem 0.9rem", fontSize: "0.72rem", color: "#b84a2a", lineHeight: 1.55, borderRadius: 9, fontFamily: "var(--e-sans)" }}>
              {checkoutError}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleCheckout}
              disabled={processing}
              style={{
                minWidth: 210,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "10px 18px",
                borderRadius: 10,
                border: "1px solid var(--e-charcoal)",
                background: "var(--e-charcoal)",
                color: "#fff",
                cursor: processing ? "wait" : "pointer",
                fontFamily: "var(--e-sans)",
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                opacity: processing ? 0.75 : 1,
                transition: "all 0.22s",
                boxShadow: "0 4px 12px rgba(17,28,20,0.2)",
              }}
            >
              {processing ? (
                <>
                  <LoaderCircle size={13} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Thanh Toán Với {payMethod}
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </GlassCard>
      )}

      <GlassCard style={{ padding: "1.6rem 1.8rem", marginBottom: "1.6rem" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.8rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Quản Lý Đăng Ký</p>
            <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--e-charcoal)", margin: 0 }}>Lịch Sử Thanh Toán Gói</h3>
          </div>
          <button
            type="button"
            onClick={() => void loadTransactions(historyPage)}
            disabled={historyLoading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(154,124,69,0.2)",
              background: "rgba(255,255,255,0.85)",
              color: "var(--e-charcoal)",
              cursor: historyLoading ? "wait" : "pointer",
              fontFamily: "var(--e-sans)",
              fontSize: "0.63rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {historyLoading ? <LoaderCircle size={12} className="animate-spin" /> : <Eye size={12} />}
            Làm mới
          </button>
        </div>

        {historyError && (
          <div style={{ marginBottom: "0.9rem", border: "1px solid rgba(184,74,42,0.28)", background: "rgba(184,74,42,0.06)", padding: "0.75rem 0.9rem", fontSize: "0.72rem", color: "#b84a2a", lineHeight: 1.55, borderRadius: 9, fontFamily: "var(--e-sans)" }}>
            {historyError}
          </div>
        )}

        <div style={{ border: "1px solid rgba(154,124,69,0.12)", borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.78)" }}>
          {historyLoading && transactions.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 140, color: "var(--e-muted)", fontFamily: "var(--e-sans)", fontSize: "0.78rem" }}>
              <LoaderCircle size={14} className="animate-spin" />
              Đang tải lịch sử thanh toán...
            </div>
          ) : transactions.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(248,245,240,0.7)" }}>
                    {["Mã GD", "Gói", "Phương thức", "Số tiền", "Trạng thái", "Đặt lúc", "Hết hạn"].map(head => (
                      <th
                        key={head}
                        style={{
                          textAlign: "left",
                          padding: "11px 12px",
                          fontSize: "0.58rem",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--e-muted)",
                          fontWeight: 700,
                          borderBottom: "1px solid rgba(154,124,69,0.12)",
                          fontFamily: "var(--e-sans)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, index) => {
                    const statusMeta = SUBSCRIPTION_PAYMENT_STATUS_META[tx.status] ?? SUBSCRIPTION_PAYMENT_STATUS_META.pending;
                    return (
                      <tr key={tx._id} style={{ borderBottom: index < transactions.length - 1 ? "1px solid rgba(154,124,69,0.1)" : "none" }}>
                        <td style={{ padding: "10px 12px", fontSize: "0.71rem", color: "var(--e-charcoal)", fontWeight: 700, fontFamily: "var(--e-sans)", whiteSpace: "nowrap" }}>
                          #{tx._id.slice(-8).toUpperCase()}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.74rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)", whiteSpace: "nowrap" }}>{tx.subscriptionPlan}</td>
                        <td style={{ padding: "10px 12px", fontSize: "0.74rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", whiteSpace: "nowrap" }}>{tx.paymentMethod}</td>
                        <td style={{ padding: "10px 12px", fontSize: "0.74rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtVND(tx.amount)}</td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: statusMeta.color, background: statusMeta.bg, border: `1px solid ${statusMeta.border}`, fontFamily: "var(--e-sans)" }}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.72rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", whiteSpace: "nowrap" }}>{fmtDateTime(tx.orderedAt)}</td>
                        <td style={{ padding: "10px 12px", fontSize: "0.72rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", whiteSpace: "nowrap" }}>{fmtDateTime(tx.expiresAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ minHeight: 140, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--e-sans)", color: "var(--e-light-muted)", fontSize: "0.8rem" }}>
              Chưa có giao dịch đăng ký nào.
            </div>
          )}
        </div>

        {historyTotalPages > 1 && (
          <div style={{ marginTop: "0.9rem", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
              disabled={historyPage === 1 || historyLoading}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid rgba(154,124,69,0.2)",
                background: "rgba(255,255,255,0.85)",
                color: "var(--e-charcoal)",
                opacity: historyPage === 1 ? 0.45 : 1,
                cursor: historyPage === 1 ? "not-allowed" : "pointer",
                fontFamily: "var(--e-sans)",
                fontSize: "0.66rem",
                fontWeight: 700,
              }}
            >
              ← Trước
            </button>
            <span style={{ fontSize: "0.67rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)", fontWeight: 700 }}>
              {historyPage}/{historyTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setHistoryPage(prev => Math.min(historyTotalPages, prev + 1))}
              disabled={historyPage === historyTotalPages || historyLoading}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid rgba(154,124,69,0.2)",
                background: "rgba(255,255,255,0.85)",
                color: "var(--e-charcoal)",
                opacity: historyPage === historyTotalPages ? 0.45 : 1,
                cursor: historyPage === historyTotalPages ? "not-allowed" : "pointer",
                fontFamily: "var(--e-sans)",
                fontSize: "0.66rem",
                fontWeight: 700,
              }}
            >
              Sau →
            </button>
          </div>
        )}
      </GlassCard>

      {/* FAQ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
        {[
          { q: "Tôi có thể hủy gói bất kỳ lúc nào không?", a: "Có, bạn có thể hủy bất kỳ lúc nào. Gói sẽ còn hiệu lực đến hết chu kỳ thanh toán hiện tại." },
          { q: "Tin đăng có bị xóa khi hạ cấp không?", a: "Không. Tin đăng hiện tại được giữ nguyên. Bạn chỉ không thể tạo thêm khi vượt giới hạn của gói mới." },
        ].map((faq, i) => (
          <GlassCard key={i} style={{ padding: "1.3rem 1.5rem" }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--e-charcoal)", marginBottom: 7, lineHeight: 1.45, fontFamily: "var(--e-sans)" }}>{faq.q}</p>
            <p style={{ fontSize: "0.72rem", color: "var(--e-muted)", lineHeight: 1.7, margin: 0, fontFamily: "var(--e-sans)" }}>{faq.a}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CREATE VIEW
═══════════════════════════════════════════════════════════ */
interface PropertyFormData {
  title: string; description: string; price: number; address: string;
  location: { type: "Point"; coordinates: [number, number] };
  type: "apartment" | "house" | "villa" | "studio" | "office";
  bedrooms?: number; bathrooms?: number; area?: number; furnished: boolean;
  yearBuilt?: number; amenities: string[]; images?: File[]; ownershipDocuments?: File[];
}

function CreateView({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: PropertyFormData) => {
    try {
      setIsLoading(true);
      const address = data.address.trim();
      const coords = Array.isArray(data.location?.coordinates) ? data.location.coordinates : [];
      const hasValidCoords = coords.length === 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1]) && !(coords[0] === 0 && coords[1] === 0);
      let location = data.location;
      if (!hasValidCoords) {
        const { lat, lng } = await geocodeAddress(address);
        location = { type: "Point", coordinates: [lng, lat] };
      }
      await propertyService.createProperty({ ...data, address, location });
      alert("Tạo bất động sản thành công!");
      onCreated();
    } catch (error: any) {
      const message = error?.message || "Lỗi khi tạo bất động sản";
      const isQuotaError = error instanceof ApiError && error.statusCode === 403 && message.toLowerCase().match(/quota|plan|upgrade|nâng cấp|gói/);
      if (isQuotaError) {
        const goUpgrade = confirm("Bạn đã đạt giới hạn tin đăng. Nâng cấp ngay không?");
        if (goUpgrade) router.push("/provider/dashboard?view=plans");
        return;
      }
      alert(message);
    } finally { setIsLoading(false); }
  };

  return <PropertyForm onSubmit={handleSubmit} isLoading={isLoading} />;
}

/* ═══════════════════════════════════════════════════════════
   EDIT VIEW
═══════════════════════════════════════════════════════════ */
function EditView({ propertyId, onUpdated, onCancel }: {
  propertyId: string; onUpdated: () => void; onCancel: () => void;
}) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    (async () => {
      try { setProperty(await propertyService.getPropertyById(propertyId)); }
      catch { onCancel(); }
      finally { setInitialized(true); }
    })();
  }, [propertyId]);

  const handleSubmit = async (data: PropertyFormData) => {
    if (!property) return;
    try {
      setIsLoading(true);
      const nextAddress = data.address.trim();
      const coords = Array.isArray(data.location?.coordinates) ? data.location.coordinates : [];
      const hasValidCoords = coords.length === 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1]) && !(coords[0] === 0 && coords[1] === 0);
      let nextLocation = data.location;
      if (nextAddress && (!hasValidCoords || nextAddress.toLowerCase() !== (property.address ?? "").trim().toLowerCase())) {
        const { lat, lng } = await geocodeAddress(nextAddress);
        nextLocation = { type: "Point", coordinates: [lng, lat] };
      }
      await propertyService.updateProperty(property._id, { ...data, address: nextAddress, location: nextLocation });
      alert("Cập nhật bất động sản thành công!");
      onUpdated();
    } catch (error: any) {
      const message = error?.message || "Lỗi khi cập nhật bất động sản";
      const isQuotaError = error instanceof ApiError && error.statusCode === 403 && message.toLowerCase().match(/quota|plan|upgrade|nâng cấp|gói/);
      if (isQuotaError) {
        const goUpgrade = confirm("Bạn đã đạt giới hạn. Nâng cấp gói ngay không?");
        if (goUpgrade) router.push("/provider/dashboard?view=plans");
        return;
      }
      alert(message);
    } finally { setIsLoading(false); }
  };

  if (!initialized || !property) return (
    <div style={{ padding: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
        <LoaderCircle size={16} className="animate-spin" /> Đang tải bất động sản…
      </span>
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "absolute", top: "1.4rem", right: "2vw", zIndex: 10,
      }}>
        <ActionBtn variant="ghost" onClick={onCancel}>← Quay lại</ActionBtn>
      </div>
      <PropertyForm initialData={property} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KYC VIEW — redesigned to match card system
═══════════════════════════════════════════════════════════ */
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

function validateFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Chỉ hỗ trợ định dạng JPG và PNG.";
  if (file.size > MAX_FILE_SIZE) return "File phải nhỏ hơn 5MB.";
  return null;
}

function getKycErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Không thể xử lý yêu cầu KYC lúc này.";
}

type DocumentSide = "front" | "back";

interface UploadBoxProps {
  title: string; file: File | null; preview: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File) => void; onClearFile: () => void;
}

function UploadBox({ title, file, preview, inputRef, onSelectFile, onClearFile }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files?.[0]; if (f) onSelectFile(f);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      <p style={{ fontFamily: "var(--e-sans)", fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, margin: 0 }}>{title}</p>
      <div
        role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        style={{
          border: `1px dashed ${isDragging ? "var(--e-gold)" : "rgba(154,124,69,0.25)"}`,
          background: isDragging ? "rgba(154,124,69,0.04)" : "rgba(255,252,248,0.8)",
          cursor: "pointer", borderRadius: 12, overflow: "hidden",
          transition: "border-color 0.25s, background 0.25s", position: "relative",
        }}>
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) onSelectFile(f); }} />
        {preview ? (
          <div style={{ position: "relative" }}>
            <button type="button" onClick={e => { e.stopPropagation(); e.preventDefault(); onClearFile(); }}
              style={{ position: "absolute", top: 10, right: 10, zIndex: 10, width: 28, height: 28, borderRadius: "50%", background: "rgba(17,28,20,0.7)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={12} />
            </button>
            <Image src={preview} alt={title} width={900} height={700} unoptimized style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
          </div>
        ) : (
          <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.6rem", padding: "1.5rem" }}>
            <UploadCloud size={26} color="var(--e-gold)" style={{ opacity: 0.45 }} />
            <p style={{ fontSize: "0.8rem", color: "var(--e-charcoal)", fontWeight: 600, textAlign: "center", fontFamily: "var(--e-sans)", margin: 0 }}>Kéo thả hoặc nhấn để chọn ảnh</p>
            <p style={{ fontSize: "0.67rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", margin: 0 }}>JPG / PNG · Tối đa 5MB</p>
          </div>
        )}
      </div>
      {file && <p style={{ fontSize: "0.66rem", color: "var(--e-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--e-sans)", margin: 0 }}>{file.name}</p>}
    </div>
  );
}

const KYC_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Chờ xét duyệt", color: "#C9A96E", bg: "rgba(140,110,63,0.07)", border: "rgba(140,110,63,0.3)" },
  submitted: { label: "Đã nộp", color: "#1a6fa8", bg: "rgba(26,111,168,0.08)", border: "rgba(26,111,168,0.28)" },
  verified: { label: "Đã xác minh", color: "#2E8B75", bg: "rgba(45,122,79,0.08)", border: "rgba(45,122,79,0.28)" },
  rejected: { label: "Từ chối", color: "#b84a2a", bg: "rgba(184,74,42,0.07)", border: "rgba(184,74,42,0.28)" },
};

function KycView() {
  const { token, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [declaredIdNumber, setDeclaredIdNumber] = useState("");
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!frontFile) { setFrontPreview(null); return; }
    const url = URL.createObjectURL(frontFile); setFrontPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) { setBackPreview(null); return; }
    const url = URL.createObjectURL(backFile); setBackPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [backFile]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setPageLoading(true);
      try { setProfile(await userService.getMe(token)); }
      catch (err) { setErrorMessage(getKycErrorMessage(err)); }
      finally { setPageLoading(false); }
    })();
  }, [token]);

  const canSubmit = useMemo(() => Boolean(frontFile && backFile && token && !submitting), [backFile, frontFile, submitting, token]);

  const handleSelectFile = (side: DocumentSide, file: File) => {
    const err = validateFile(file);
    if (err) { setErrorMessage(err); return; }
    setErrorMessage(null); setSuccessMessage(null);
    if (side === "front") setFrontFile(file);
    else setBackFile(file);
  };

  const handleClearFile = (side: DocumentSide) => {
    setErrorMessage(null); setSuccessMessage(null);
    if (side === "front") { setFrontFile(null); if (frontInputRef.current) frontInputRef.current.value = ""; }
    else { setBackFile(null); if (backInputRef.current) backInputRef.current.value = ""; }
  };

  const handleSubmit = async () => {
    if (!token || !frontFile || !backFile) { setErrorMessage("Vui lòng tải lên cả mặt trước và mặt sau."); return; }
    setSubmitting(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const res = await userService.submitKycDocuments(token, frontFile, backFile, declaredIdNumber);
      setProfile(await userService.getMe(token));
      setSuccessMessage(res.message || "Nộp hồ sơ KYC thành công.");
      setFrontFile(null); setBackFile(null); setDeclaredIdNumber("");
      await refreshProfile();
    } catch (err) { setErrorMessage(getKycErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  if (pageLoading) return (
    <div style={{ padding: "5rem 2vw", display: "flex", alignItems: "center", gap: 8, color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
      <LoaderCircle size={16} className="animate-spin" /> Đang tải hồ sơ KYC…
    </div>
  );

  if (!profile) return (
    <div style={{ padding: "5rem 2vw", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "1.6rem", fontWeight: 500, color: "var(--e-charcoal)" }}>Không thể tải hồ sơ KYC</h1>
      <p style={{ marginTop: "0.8rem", fontSize: "0.85rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{errorMessage || "Vui lòng thử lại sau."}</p>
    </div>
  );

  const statusKey = (profile.kycStatus ?? "pending").toLowerCase();
  const statusMeta = KYC_STATUS_CONFIG[statusKey] ?? KYC_STATUS_CONFIG.pending;

  return (
    <div style={{ padding: "2.5rem 2vw" }}>
      <SectionHeader
        eyebrow="Xác Minh Danh Tính"
        title={<>Hồ Sơ <span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)", fontSize: "clamp(1rem, 2vw, 1.4rem)" }}>KYC Của Tôi</span></>}
      />

      {/* Status cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.8rem", marginBottom: "1.5rem" }}>
        {[
          {
            label: "Trạng thái KYC",
            value: (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.78rem", fontWeight: 700, color: statusMeta.color, background: statusMeta.bg, border: `1px solid ${statusMeta.border}`, padding: "4px 11px", borderRadius: 20, fontFamily: "var(--e-sans)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusMeta.color, flexShrink: 0 }} />
                {statusMeta.label}
              </span>
            ),
          },
          {
            label: "Xác minh tài khoản",
            value: profile.isVerified
              ? <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#2E8B75", fontSize: "0.84rem", fontWeight: 700, fontFamily: "var(--e-sans)" }}><CheckCircle2 size={15} /> Đã xác minh</span>
              : <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--e-light-muted)", fontSize: "0.84rem", fontFamily: "var(--e-sans)" }}><AlertTriangle size={15} /> Chưa xác minh</span>,
          },
          {
            label: "Vai trò",
            value: <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--e-charcoal)", textTransform: "capitalize", fontFamily: "var(--e-sans)" } as React.CSSProperties}>{profile.role}</span>,
          },
        ].map(item => (
          <GlassCard key={item.label} style={{ padding: "1.2rem 1.4rem" }}>
            <p style={{ fontFamily: "var(--e-sans)", fontSize: "0.54rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: "0.6rem" }}>{item.label}</p>
            {item.value}
          </GlassCard>
        ))}
      </div>

      {/* Rejection reason */}
      {profile.kycRejectionReason && (
        <div style={{ marginBottom: "1.5rem", border: "1px solid rgba(184,74,42,0.28)", background: "rgba(184,74,42,0.05)", padding: "1rem 1.2rem", borderRadius: 12 }}>
          <p style={{ fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b84a2a", fontWeight: 700, marginBottom: 5, fontFamily: "var(--e-sans)" }}>Lý do từ chối</p>
          <p style={{ fontSize: "0.8rem", color: "#b84a2a", lineHeight: 1.65, fontFamily: "var(--e-sans)", margin: 0 }}>{profile.kycRejectionReason}</p>
        </div>
      )}

      {/* Upload section */}
      <GlassCard style={{ padding: "2rem 2.2rem", marginBottom: "1.2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 5, fontFamily: "var(--e-sans)" }}>Tải Lên Tài Liệu</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.3rem", fontWeight: 500, color: "var(--e-charcoal)", marginBottom: "0.4rem" }}>
            Nộp Hồ Sơ <span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)" }}>CCCD</span>
          </h3>
          <p style={{ fontSize: "0.78rem", color: "var(--e-light-muted)", lineHeight: 1.7, fontFamily: "var(--e-sans)", margin: 0 }}>Tải ảnh chụp rõ nét mặt trước và mặt sau CCCD. Định dạng JPG, PNG. Tối đa 5MB/ảnh.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem", marginBottom: "1.6rem" }}>
          <UploadBox title="CCCD — Mặt Trước" file={frontFile} preview={frontPreview} inputRef={frontInputRef} onSelectFile={f => handleSelectFile("front", f)} onClearFile={() => handleClearFile("front")} />
          <UploadBox title="CCCD — Mặt Sau" file={backFile} preview={backPreview} inputRef={backInputRef} onSelectFile={f => handleSelectFile("back", f)} onClearFile={() => handleClearFile("back")} />
        </div>

        {/* ID number input */}
        <div style={{ maxWidth: 420, marginBottom: "1.5rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.56rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700 }}>Số CCCD</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", border: "1px solid rgba(154,124,69,0.2)", padding: "0 12px", background: "rgba(255,252,248,0.8)", borderRadius: 10, transition: "border-color 0.2s" }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = "var(--e-gold)")}
              onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(154,124,69,0.2)")}>
              <IdCard size={14} color="var(--e-gold)" style={{ flexShrink: 0, opacity: 0.7 }} />
              <input type="text" value={declaredIdNumber} onChange={e => setDeclaredIdNumber(e.target.value)} placeholder="Nhập số CCCD"
                style={{ flex: 1, border: "none", background: "none", padding: "10px 0", fontFamily: "var(--e-sans)", fontSize: "0.84rem", color: "var(--e-charcoal)", outline: "none" }} />
            </div>
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button type="button" disabled={!canSubmit} onClick={handleSubmit} style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "10px 22px", background: "var(--e-gold)", color: "#fff", border: "none",
            borderRadius: 10, cursor: canSubmit ? "pointer" : "not-allowed",
            fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            opacity: canSubmit ? 1 : 0.45, transition: "all 0.25s",
            boxShadow: "0 4px 14px rgba(201,169,110,0.3)",
          }}>
            {submitting ? <LoaderCircle size={14} className="animate-spin" /> : <FileUp size={14} />}
            {submitting ? "Đang xử lý…" : "Nộp Hồ Sơ KYC"}
          </button>
          <span style={{ fontSize: "0.68rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}></span>
        </div>

        {errorMessage && (
          <div style={{ marginTop: "1.1rem", border: "1px solid rgba(184,74,42,0.28)", background: "rgba(184,74,42,0.06)", padding: "0.8rem 1rem", fontSize: "0.78rem", color: "#b84a2a", lineHeight: 1.6, borderRadius: 9, fontFamily: "var(--e-sans)" }}>{errorMessage}</div>
        )}
        {successMessage && (
          <div style={{ marginTop: "1.1rem", border: "1px solid rgba(45,122,79,0.28)", background: "rgba(45,122,79,0.06)", padding: "0.8rem 1rem", fontSize: "0.78rem", color: "#2d7a4f", lineHeight: 1.6, borderRadius: 9, fontFamily: "var(--e-sans)" }}>{successMessage}</div>
        )}
      </GlassCard>

      {/* Documents submitted */}
      <GlassCard style={{ padding: "2rem 2.2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.4rem" }}>
          <ShieldCheck size={18} color="var(--e-gold)" />
          <div>
            <p style={{ fontSize: "0.55rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 3, fontFamily: "var(--e-sans)" }}>Tài Liệu Đã Nộp</p>
            <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.15rem", fontWeight: 500, color: "var(--e-charcoal)", margin: 0 }}>Hồ Sơ <span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)" }}>Đã Tải Lên</span></h3>
          </div>
        </div>

        {profile.kycDocuments?.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            {profile.kycDocuments.map((docUrl, idx) => (
              <a key={`${docUrl}-${idx}`} href={docUrl} target="_blank" rel="noreferrer"
                style={{ display: "block", overflow: "hidden", position: "relative", borderRadius: 12, border: "1px solid rgba(154,124,69,0.15)" }}>
                <Image src={docUrl} alt={`KYC document ${idx + 1}`} width={900} height={700} unoptimized
                  style={{ width: "100%", height: 200, objectFit: "cover", display: "block", transition: "transform 0.5s" }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.04)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1rem 1.1rem", background: "linear-gradient(to top, rgba(17,28,20,0.7) 0%, transparent 100%)" }}>
                  <p style={{ fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold-light)", fontWeight: 700, fontFamily: "var(--e-sans)", margin: 0 }}>Tài liệu {idx + 1}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ padding: "2.5rem 2rem", textAlign: "center", border: "1px dashed rgba(154,124,69,0.2)", background: "rgba(255,252,248,0.6)", borderRadius: 12 }}>
            <p style={{ fontSize: "0.95rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Chưa có tài liệu nào được tải lên</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAV ITEMS
═══════════════════════════════════════════════════════════ */
const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: "dashboard", label: "Tổng Quan", icon: <LayoutDashboard size={14} /> },
  { view: "properties", label: "Bất Động Sản", icon: <Building2 size={14} /> },
  { view: "create", label: "Đăng Tin Mới", icon: <Plus size={14} /> },
  { view: "plans", label: "Gói Dịch Vụ", icon: <Layers size={14} /> },
  { view: "kyc", label: "Xác Minh KYC", icon: <ShieldCheck size={14} /> },
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function ProviderDashboard() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);

  useEffect(() => {
    const q = router.query.view as string | undefined;
    if (q && ["dashboard", "properties", "plans", "create", "edit", "kyc"].includes(q))
      setView(q as View);
  }, [router.query.view]);

  const handleSetView = useCallback((newView: View) => {
    setView(newView);
    void router.replace(
      { pathname: "/provider/dashboard", query: newView === "dashboard" ? {} : { view: newView } },
      undefined, { shallow: true }
    );
  }, [router]);

  const fetchProperties = useCallback(async () => {
    if (!user || user.role !== "provider") return;
    try {
      const res = await propertyService.getAllProperties({ ownerId: user._id, limit: 100 });
      setProperties(res.data.properties);
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => {
    if (isAuthLoading) return;
    (async () => {
      try {
        if (!user || user.role !== "provider") { router.push("/"); return; }
        await fetchProperties();
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [router, isAuthLoading, fetchProperties]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bất động sản này?")) return;
    try { await propertyService.deleteProperty(id); setProperties(prev => prev.filter(p => p._id !== id)); }
    catch (err) { console.error(err); alert("Lỗi khi xóa bất động sản"); }
  };

  const handlePropertyCreated = useCallback(async () => { await fetchProperties(); handleSetView("properties"); }, [fetchProperties, handleSetView]);
  const handleEditProperty = useCallback((id: string) => { setEditPropertyId(id); handleSetView("edit"); }, [handleSetView]);
  const handlePropertyUpdated = useCallback(async () => { await fetchProperties(); setEditPropertyId(null); handleSetView("properties"); }, [fetchProperties, handleSetView]);

  const stats = {
    total: properties.length,
    approved: properties.filter(p => p.status === "approved").length,
    pending: properties.filter(p => p.status === "pending").length,
    avgPrice: properties.length > 0 ? properties.reduce((s, p) => s + p.price, 0) / properties.length : 0,
  };

  if (loading) return (
    <div className="estoria" style={{ minHeight: "100vh", background: "var(--e-cream)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--e-sans)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "2px solid rgba(154,124,69,0.2)", borderTopColor: "var(--e-gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        <p style={{ marginTop: "1rem", fontSize: "0.78rem", color: "var(--e-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>Đang tải…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head><title>Dashboard — Estoria Provider</title></Head>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.4); }
      `}</style>

      <div className="estoria" style={{ minHeight: "100vh", display: "flex", overflow: "hidden", fontFamily: "var(--e-sans)", background: "var(--e-cream)" }}>

        {/* ── Sidebar ── */}
        <aside style={{ width: 256, display: "flex", flexDirection: "column", height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 50, backgroundImage: "url('https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&q=85')", backgroundSize: "cover", backgroundPosition: "center", boxShadow: "4px 0 24px rgba(0,0,0,0.12)" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(17,28,20,0.95), rgba(17,28,20,0.92))", backdropFilter: "blur(12px)", zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", borderRight: "1px solid rgba(212,175,55,0.1)" }}>

            {/* Brand */}
            <div style={{ padding: "2rem 2rem 1.5rem", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
              <Link href="/" style={{ textDecoration: "none", display: "block" }}>
                <span style={{ fontFamily: "var(--e-serif)", fontSize: "1.9rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
                  Esto<span style={{ color: "var(--e-gold-light)" }}>ria</span>
                </span>
              </Link>
              <div style={{ fontSize: "0.52rem", textTransform: "uppercase", letterSpacing: "0.28em", color: "var(--e-gold-light)", fontWeight: 700, marginTop: 5, fontFamily: "var(--e-sans)" }}>Provider Portal</div>
            </div>

            {/* Nav */}
            <nav className="custom-scrollbar" style={{ flex: 1, padding: "1.8rem 1rem", display: "flex", flexDirection: "column", gap: "0.3rem", overflowY: "auto" }}>
              {NAV_ITEMS.map(item => {
                const isActive = view === item.view;
                const badge = item.view === "properties" && stats.pending > 0 ? stats.pending : undefined;
                return (
                  <button key={item.view} onClick={() => handleSetView(item.view)} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14,
                    padding: "11px 18px", borderRadius: 12, border: "none",
                    cursor: "pointer", fontFamily: "var(--e-sans)", textAlign: "left",
                    transition: "all 0.25s",
                    background: isActive ? "rgba(212,175,55,0.1)" : "transparent",
                    boxShadow: isActive ? "inset 0 0 0 1px rgba(212,175,55,0.2)" : "none",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                    position: "relative",
                  }}>
                    {isActive && <div style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 3px 3px 0", background: "var(--e-gold-light)", boxShadow: "0 0 10px var(--e-gold)" }} />}
                    <span style={{ color: isActive ? "var(--e-gold-light)" : "rgba(255,255,255,0.4)", transition: "color 0.2s", flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: "0.8rem", fontWeight: isActive ? 700 : 500, letterSpacing: "0.02em", flex: 1 }}>{item.label}</span>
                    {badge != null && (
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, background: "var(--e-gold)", color: "#fff", padding: "2px 7px", borderRadius: 6, boxShadow: "0 0 8px rgba(212,175,55,0.4)" }}>{badge}</span>
                    )}
                  </button>
                );
              })}

              <div style={{ height: 1, background: "rgba(212,175,55,0.1)", margin: "1.5rem 0.5rem" }} />

              <a href="/profile/settings" style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 18px", borderRadius: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none", transition: "all 0.2s", fontFamily: "var(--e-sans)" }}>
                <Settings size={14} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: "0.78rem", fontWeight: 500 }}>Cài Đặt</span>
              </a>
            </nav>

            {/* User footer */}
            <div style={{ padding: "1.2rem 1.4rem", borderTop: "1px solid rgba(212,175,55,0.1)", background: "rgba(0,0,0,0.2)" }}>
              <Link href="/profile/settings" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg, var(--e-gold), var(--e-gold-light))", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: "0 3px 10px rgba(201,169,110,0.35)" }}>
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "0.73rem", fontWeight: 700, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--e-sans)" }}>{user?.name}</p>
                  <p style={{ fontSize: "0.61rem", color: "rgba(228,201,138,0.7)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--e-sans)" }}>{user?.email}</p>
                </div>
              </Link>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main style={{ flex: 1, marginLeft: 256, minHeight: "100vh", overflowY: "auto", position: "relative" }}>
          {/* Background */}
          <div style={{ position: "fixed", top: 0, left: 256, right: 0, bottom: 0, backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px) opacity(0.05)", zIndex: 0, pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, minHeight: "100%", display: "flex", flexDirection: "column", padding: "2rem 2.5rem" }}>
            <div style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", flex: 1 }}>
              {view === "dashboard" && <ViewWrapper><DashboardView provider={user} stats={stats} properties={properties} recentProperties={properties.slice(0, 5)} onNavigate={handleSetView} /></ViewWrapper>}
              {view === "properties" && <ViewWrapper><PropertiesView properties={properties} onDelete={handleDelete} onEdit={handleEditProperty} /></ViewWrapper>}
              {view === "plans" && <ViewWrapper><PlansView currentPlan={getUserPlan(user)} listingsUsed={stats.total} /></ViewWrapper>}
              {view === "create" && <ViewWrapper><CreateView onCreated={handlePropertyCreated} /></ViewWrapper>}
              {view === "edit" && editPropertyId && <ViewWrapper><EditView propertyId={editPropertyId} onUpdated={handlePropertyUpdated} onCancel={() => handleSetView("properties")} /></ViewWrapper>}
              {view === "kyc" && <ViewWrapper><KycView /></ViewWrapper>}
            </div>

            <footer style={{ marginTop: "4rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(154,124,69,0.12)", textAlign: "center", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
              © {new Date().getFullYear()} Estoria Luxury Real Estate — Provider Management System
            </footer>
          </div>
        </main>
      </div>
    </>
  );
}
