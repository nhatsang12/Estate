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
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/apiClient";
import propertyService from "@/services/propertyService";
import { userService } from "@/services/userService";
import { geocodeAddress } from "@/services/geocodeService";
import PropertyForm from "@/components/PropertyForm";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
import type { Property } from "@/types/property";
import type { SubscriptionPlan, User } from "@/types/user";

/* ═══════════════════════════════════════════════════════════
   SHARED CONSTANTS
═══════════════════════════════════════════════════════════ */
const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Math.round(n));

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  approved: { label: "Đã duyệt", icon: <CheckCircle size={13} />, color: "#2E8B75", bg: "rgba(46,139,117,0.08)", border: "rgba(46,139,117,0.3)" },
  pending: { label: "Đang chờ", icon: <Clock size={13} />, color: "var(--e-gold)", bg: "rgba(212,175,55,0.07)", border: "rgba(212,175,55,0.3)" },
  rejected: { label: "Bị từ chối", icon: <XCircle size={13} />, color: "#b84a2a", bg: "rgba(184,74,42,0.07)", border: "rgba(184,74,42,0.3)" },
};

type View = "dashboard" | "properties" | "plans" | "create" | "edit" | "kyc";

/* ═══════════════════════════════════════════════════════════
   VIEW WRAPPER
═══════════════════════════════════════════════════════════ */
function ViewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
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
  const [timeFilter, setTimeFilter] = useState("all");

  const pieData = [
    { name: "Đã duyệt", value: stats.approved, color: "#2d7a4f" },
    { name: "Chờ duyệt", value: stats.pending, color: "var(--e-gold)" },
    { name: "Từ chối", value: stats.total - stats.approved - stats.pending, color: "#b84a2a" }
  ].filter(d => d.value > 0);

  const barData = properties
    .slice(0, 7)
    .map(p => ({ name: p.title.substring(0, 15) + (p.title.length > 15 ? "…" : ""), Giá: p.price }));

  const mockViews = timeFilter === "all" ? 24500 : timeFilter === "month" ? 8200 : 1540;
  const mockLeads = timeFilter === "all" ? 342 : timeFilter === "month" ? 124 : 28;

  const STATS_CARDS = [
    { label: "Tổng BĐS", value: stats.total, icon: <BedDouble size={20} /> },
    { label: "Lượt Xem", value: mockViews.toLocaleString("vi-VN"), icon: <Eye size={20} /> },
    { label: "Tương Tác", value: mockLeads.toLocaleString("vi-VN"), icon: <MousePointerClick size={20} /> },
    { label: "Đã Duyệt", value: stats.approved, icon: <CheckCircle size={20} /> },
    { label: "Chờ Duyệt", value: stats.pending, icon: <Clock size={20} /> },
    { label: "Trung Bình Giá", value: stats.avgPrice > 0 ? fmtVND(stats.avgPrice) : "0 ₫", icon: <DollarSign size={20} /> },
  ];

  return (
    <div style={{ padding: "2.5rem 2.5vw" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.8rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Provider Dashboard</p>
          <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.8rem", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.2 }}>
            Xin chào,{" "}
            <span style={{ fontFamily: "var(--e-sans)", color: "var(--e-light-muted)", fontSize: "1.4rem", fontWeight: 400 }}>{provider?.name}</span>
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--e-muted)", marginTop: 6, fontFamily: "var(--e-sans)" }}>
            Quản lý bất động sản và theo dõi hiệu suất của bạn.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.9)", padding: "6px", borderRadius: "12px", border: "1px solid rgba(154,124,69,0.15)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: "8px", borderRight: "1px solid rgba(154,124,69,0.12)", paddingRight: "8px" }}>
            <Calendar size={14} color="var(--e-gold)" />
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--e-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--e-sans)" }}>Thời gian</span>
          </div>
          {(["all", "month", "week"] as const).map(f => (
            <button key={f} onClick={() => setTimeFilter(f)}
              style={{ padding: "6px 14px", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", transition: "all 0.2s", background: timeFilter === f ? "var(--e-charcoal)" : "transparent", color: timeFilter === f ? "#fff" : "var(--e-light-muted)" }}
            >
              {f === "all" ? "Tất Cả" : f === "month" ? "Tháng Này" : "Tuần Này"}
            </button>
          ))}
        </div>
      </div>

      {/* KYC Warning */}
      {provider?.kycStatus && provider.kycStatus !== "verified" && (
        <div style={{ background: "rgba(154,124,69,0.06)", border: "1px solid rgba(154,124,69,0.2)", padding: "1rem 1.3rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
            <AlertTriangle size={18} color="var(--e-gold)" />
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--e-charcoal)", marginBottom: 2, fontFamily: "var(--e-sans)" }}>Tài khoản chưa được xác minh KYC</div>
              <div style={{ fontSize: "0.72rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Hoàn thành KYC để đăng tin và tiếp cận khách hàng.</div>
            </div>
          </div>
          <button onClick={() => onNavigate("kyc")} style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: "var(--e-gold)", background: "none", border: "1px solid rgba(154,124,69,0.35)", padding: "7px 16px", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.2s" }}>
            Xác Minh Ngay →
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {STATS_CARDS.map((card) => (
          <div key={card.label} className="e-glass-card" style={{ padding: "1.5rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, margin: 0, fontFamily: "var(--e-sans)" }}>{card.label}</p>
              <div style={{ color: "var(--e-gold)", opacity: 0.85 }}>{card.icon}</div>
            </div>
            <p style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.3rem, 1.8vw, 1.9rem)", fontWeight: 600, color: "var(--e-charcoal)", lineHeight: 1, margin: 0, letterSpacing: "-0.02em" }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Đăng Tin Mới", view: "create" as View, primary: true, icon: <Plus size={16} /> },
          { label: "Quản Lý BĐS", view: "properties" as View, primary: false, icon: null },
          { label: "Nâng Cấp Gói", view: "plans" as View, primary: false, icon: null },
        ].map((btn) => (
          <button key={btn.label} onClick={() => onNavigate(btn.view)}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "1rem", background: btn.primary ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", color: btn.primary ? "#fff" : "var(--e-charcoal)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", border: btn.primary ? "none" : "1px solid rgba(154,124,69,0.2)", borderRadius: "10px", cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.25s", boxShadow: btn.primary ? "0 4px 14px rgba(26,24,20,0.15)" : "none", backdropFilter: "blur(8px)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; if (btn.primary) e.currentTarget.style.background = "var(--e-gold)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; if (btn.primary) e.currentTarget.style.background = "var(--e-charcoal)"; }}
          >{btn.icon}{btn.label}</button>
        ))}
      </div>

      {/* Charts */}
      {properties.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div className="e-glass-card" style={{ padding: "1.8rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
            <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1.5rem" }}>Biến Động Giá Trị Bất Động Sản</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.04)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--e-muted)", fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tickFormatter={(val: any) => `${(Number(val) / 1000000000).toFixed(1)} Tỷ`} tick={{ fontSize: 10, fill: "var(--e-muted)" }} axisLine={false} tickLine={false} dx={-10} />
                  <RechartsTooltip
                    formatter={(value: any) => [fmtVND(Number(value)), "Giá Trị"]}
                    cursor={{ fill: "rgba(154,124,69,0.03)" }}
                    contentStyle={{ borderRadius: "12px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", boxShadow: "0 8px 24px rgba(0,0,0,0.06)", fontFamily: "var(--e-sans)" }}
                    itemStyle={{ color: "var(--e-charcoal)", fontWeight: 600 }}
                  />
                  <Bar dataKey="Giá" fill="url(#goldGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--e-gold)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="var(--e-gold-light)" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="e-glass-card" style={{ padding: "1.8rem", display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
            <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.15rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "1rem" }}>Phân Bổ Trạng Thái</h3>
            <div style={{ flex: 1, minHeight: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                    {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ fontFamily: "var(--e-sans)", fontSize: "0.8rem" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              {pieData.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.72rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent properties */}
      <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: "14px", border: "1px solid rgba(154,124,69,0.15)", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", backdropFilter: "blur(8px)" }}>
        <div style={{ padding: "1.2rem 1.6rem", borderBottom: "1px solid rgba(154,124,69,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Danh Sách</p>
            <h2 style={{ fontFamily: "var(--e-sans)", fontSize: "1rem", fontWeight: 700, color: "var(--e-charcoal)", margin: 0 }}>Bất Động Sản Gần Đây</h2>
          </div>
          <button onClick={() => onNavigate("properties")}
            style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-gold)", background: "none", border: "1px solid rgba(154,124,69,0.3)", borderRadius: "8px", padding: "6px 14px", cursor: "pointer", fontFamily: "var(--e-sans)", fontWeight: 700, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--e-gold)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--e-gold)"; }}
          >Xem Tất Cả →</button>
        </div>
        {recentProperties.length > 0 ? (
          <div>
            {recentProperties.map((p, i) => {
              const meta = STATUS_META[p.status ?? "pending"] ?? STATUS_META.pending;
              return (
                <div key={p._id}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.6rem", borderBottom: i < recentProperties.length - 1 ? "1px solid rgba(154,124,69,0.07)" : "none", transition: "background 0.2s", gap: "1rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(154,124,69,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                    <div style={{ width: 50, height: 50, borderRadius: "10px", background: "var(--e-beige)", backgroundImage: p.images?.[0] ? `url(${p.images[0]})` : "none", backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: 3, fontFamily: "var(--e-sans)" }}>{p.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{p.address}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <div style={{ fontFamily: "var(--e-serif)", fontSize: "0.95rem", fontWeight: 600, color: "var(--e-charcoal)" }}>{fmtVND(p.price)}</div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: "3px 10px", borderRadius: "6px", fontFamily: "var(--e-sans)" }}>
                      {meta.icon}{meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.92rem", color: "var(--e-light-muted)", marginBottom: "1.2rem", fontFamily: "var(--e-sans)" }}>Chưa có bất động sản nào</p>
            <button onClick={() => onNavigate("create")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 24px", background: "var(--e-charcoal)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--e-sans)" }}>
              <Plus size={14} /> Đăng Tin Đầu Tiên
            </button>
          </div>
        )}
      </div>
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

function PropertiesView({ properties, onDelete, onEdit }: { properties: Property[]; onDelete: (id: string) => void; onEdit: (id: string) => void; }) {
  const [filter, setFilter] = useState<FilterType>("all");
  const filtered = properties.filter((p) => filter === "all" || p.status === filter);
  const counts = { all: properties.length, pending: properties.filter(p => p.status === "pending").length, approved: properties.filter(p => p.status === "approved").length, rejected: properties.filter(p => p.status === "rejected").length };

  return (
    <div style={{ padding: "2.5rem 2.5vw" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Nhà Cung Cấp</p>
          <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0 }}>
            Quản Lý{" "}<span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)", fontSize: "clamp(1.1rem, 2vw, 1.5rem)" }}>Bất Động Sản</span>
          </h2>
        </div>
        <button style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, padding: "10px 20px", background: "var(--e-gold)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: "var(--e-sans)", boxShadow: "0 4px 14px rgba(154,124,69,0.3)", transition: "all 0.25s" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = "var(--e-charcoal)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.background = "var(--e-gold)"; }}
        ><Plus size={14} /> Tạo Mới</button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {FILTERS.map(({ value, label }) => (
          <button key={value} onClick={() => setFilter(value)}
            style={{ padding: "0.5rem 1.2rem", borderRadius: "10px", border: filter === value ? "none" : "1px solid rgba(154,124,69,0.18)", background: filter === value ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", color: filter === value ? "#fff" : "var(--e-light-muted)", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.2s", boxShadow: filter === value ? "0 4px 12px rgba(26,24,20,0.1)" : "none", backdropFilter: "blur(8px)" }}
          >
            {label} <span style={{ marginLeft: 6, fontSize: "0.68rem", opacity: 0.7 }}>({counts[value]})</span>
          </button>
        ))}
      </div>

      <div>
        {filtered.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filtered.map((property) => {
              const meta = STATUS_META[property.status ?? "pending"] ?? STATUS_META.pending;
              return (
                <div key={property._id} className="e-glass-card" style={{ padding: "1.5rem 1.8rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, padding: "3px 10px", borderRadius: "6px", marginBottom: "0.6rem", fontFamily: "var(--e-sans)" }}>
                        {meta.icon}{meta.label}
                      </span>
                      <h3 style={{ fontFamily: "var(--e-sans)", fontSize: "1rem", fontWeight: 700, color: "var(--e-charcoal)", marginBottom: "0.25rem", lineHeight: 1.3 }}>{property.title}</h3>
                      <p style={{ fontSize: "0.74rem", color: "var(--e-light-muted)", marginBottom: "0.8rem", fontFamily: "var(--e-sans)" }}>{property.address}</p>
                      <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                        {[{ icon: <DollarSign size={12} />, text: fmtVND(property.price) }, { icon: <Ruler size={12} />, text: `${property.area} m²` }, { icon: <BedDouble size={12} />, text: `${property.bedrooms ?? 0} phòng ngủ` }].map(({ icon, text }) => (
                          <span key={text} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
                            <span style={{ color: "var(--e-gold)" }}>{icon}</span>{text}
                          </span>
                        ))}
                      </div>
                      {property.rejectionReason && property.status === "rejected" && (
                        <div style={{ marginTop: "0.8rem", border: "1px solid rgba(184,74,42,0.28)", background: "rgba(184,74,42,0.05)", padding: "0.6rem 0.9rem", borderRadius: "8px" }}>
                          <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b84a2a", fontWeight: 700, marginBottom: 3, fontFamily: "var(--e-sans)" }}>Lý do từ chối</p>
                          <p style={{ fontSize: "0.74rem", color: "#b84a2a", lineHeight: 1.6, fontFamily: "var(--e-sans)" }}>{property.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                      <Link href={`/properties/${property._id}`}
                        style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, padding: "7px 14px", border: "1px solid rgba(0,0,0,0.1)", color: "var(--e-charcoal)", background: "transparent", textDecoration: "none", fontFamily: "var(--e-sans)", transition: "all 0.2s", display: "inline-block", borderRadius: "8px" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--e-charcoal)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--e-charcoal)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--e-charcoal)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; }}
                      >Xem</Link>
                      <button onClick={() => onEdit(property._id)}
                        style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, padding: "7px 14px", border: "1px solid rgba(0,0,0,0.1)", color: "var(--e-charcoal)", background: "transparent", cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.2s", borderRadius: "8px" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--e-gold)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "var(--e-gold)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--e-charcoal)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; }}
                      >Sửa</button>
                      <button onClick={() => onDelete(property._id)}
                        style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, padding: "7px 14px", border: "1px solid rgba(184,74,42,0.25)", color: "#b84a2a", background: "transparent", cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.2s", borderRadius: "8px" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#b84a2a"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#b84a2a"; }}
                      >Xóa</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "4rem 2rem", background: "rgba(255,255,255,0.85)", borderRadius: "14px", border: "1px solid rgba(154,124,69,0.15)", backdropFilter: "blur(8px)" }}>
            <p style={{ fontSize: "1rem", color: "var(--e-light-muted)", marginBottom: "1.2rem", fontFamily: "var(--e-sans)" }}>
              Không có bất động sản{filter !== "all" ? ` ở trạng thái "${FILTERS.find(f => f.value === filter)?.label}"` : " nào"}
            </p>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 22px", background: "var(--e-charcoal)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--e-sans)" }}>
              <Plus size={14} /> Tạo Bất Động Sản Đầu Tiên
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PLANS VIEW
═══════════════════════════════════════════════════════════ */
const PLANS_DATA = [
  { plan: "Free" as SubscriptionPlan, name: "Free", price: "0₫", priceUnit: "mãi mãi", features: ["Tối đa 3 tin đăng", "Hình ảnh cơ bản", "Hiển thị trên bản đồ", "Hỗ trợ email"] },
  { plan: "Pro" as SubscriptionPlan, name: "Pro", price: "299,000₫", priceUnit: "/ tháng", features: ["Tối đa 20 tin đăng", "Ưu tiên duyệt tin", "Thống kê lượt xem", "Hỗ trợ ưu tiên", "Badge xác minh"] },
  { plan: "ProPlus" as SubscriptionPlan, name: "Pro Plus", price: "599,000₫", priceUnit: "/ tháng", features: ["Tin đăng không giới hạn", "Duyệt tin tức thì", "Hiển thị nổi bật", "Phân tích chi tiết", "Hỗ trợ 24/7", "API tích hợp"] },
];
const PLAN_LIMITS: Record<string, number | string> = { Free: 3, Pro: 20, ProPlus: "∞" };

function PlansView({ currentPlan, listingsUsed, onCheckout }: { currentPlan: SubscriptionPlan; listingsUsed: number; onCheckout?: (plan: SubscriptionPlan, method: "VNPay" | "PayPal") => void; }) {
  const [selected, setSelected] = useState<SubscriptionPlan | null>(null);
  const [payMethod, setPayMethod] = useState<"VNPay" | "PayPal">("VNPay");
  const limit = PLAN_LIMITS[currentPlan];

  return (
    <div style={{ padding: "2.5rem 2.5vw" }}>
      <div style={{ marginBottom: "1.8rem" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Gói Dịch Vụ</p>
        <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 500, color: "var(--e-charcoal)", lineHeight: 1.2, margin: 0 }}>
          Gói phù hợp với{" "}<span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)", fontSize: "clamp(1.1rem, 2vw, 1.5rem)" }}>nhu cầu của bạn</span>
        </h2>
      </div>

      <div className="e-glass-card-dark" style={{ padding: "1.6rem 2rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)" }}>
        <div>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", marginBottom: 5, fontFamily: "var(--e-sans)" }}>Gói hiện tại</p>
          <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.4rem", fontWeight: 600, color: "var(--e-charcoal)", margin: 0 }}>{currentPlan}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.68rem", color: "var(--e-muted)", marginBottom: 6, fontFamily: "var(--e-sans)" }}>
            Tin đã đăng: <span style={{ color: "var(--e-gold)", fontWeight: 700 }}>{listingsUsed} / {limit}</span>
          </div>
          <div style={{ width: 160, height: 4, background: "rgba(0,0,0,0.06)", borderRadius: "2px" }}>
            <div style={{ height: "100%", background: "var(--e-gold)", borderRadius: "2px", width: limit === "∞" ? "30%" : `${Math.min(100, (listingsUsed / (limit as number)) * 100)}%`, transition: "width 0.4s" }} />
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid rgba(154,124,69,0.2)", borderRadius: "16px", padding: "1rem", background: "rgba(255,252,248,0.6)", marginBottom: "1.5rem", backdropFilter: "blur(6px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {PLANS_DATA.map((p) => {
            const isCurrent = currentPlan === p.plan;
            const isSelected = selected === p.plan;
            return (
              <div key={p.plan} className={isCurrent ? "e-glass-card-dark" : "e-glass-card"}
                style={{ border: isSelected && !isCurrent ? "2px solid var(--e-gold)" : "none", padding: "1.8rem", cursor: isCurrent ? "default" : "pointer", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}
                onClick={() => !isCurrent && setSelected(p.plan)}
              >
                {isCurrent && <div style={{ position: "absolute", top: "1rem", right: "1rem", fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, background: "rgba(154,124,69,0.08)", padding: "3px 8px", borderRadius: "6px", fontFamily: "var(--e-sans)" }}>✦ Hiện tại</div>}
                <p style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: "0.8rem", fontFamily: "var(--e-sans)" }}>Gói</p>
                <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.5rem", fontWeight: 600, color: "var(--e-charcoal)", marginBottom: "0.2rem" }}>{p.name}</p>
                <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.9rem", fontWeight: 700, color: "var(--e-gold)", lineHeight: 1 }}>{p.price}</p>
                <p style={{ fontSize: "0.68rem", color: "var(--e-light-muted)", marginBottom: "1.2rem", fontFamily: "var(--e-sans)" }}>{p.priceUnit}</p>
                <div style={{ height: 1, background: "rgba(154,124,69,0.1)", marginBottom: "1.2rem" }} />
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ display: "flex", gap: 7, fontSize: "0.74rem", color: "var(--e-light-muted)", lineHeight: 1.5, fontFamily: "var(--e-sans)" }}>
                      <span style={{ color: "var(--e-gold)", flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && (
                  <button style={{ marginTop: "1.4rem", width: "100%", padding: "10px", background: isSelected ? "var(--e-gold)" : "transparent", color: isSelected ? "#fff" : "var(--e-charcoal)", border: isSelected ? "none" : "1px solid rgba(0,0,0,0.1)", borderRadius: "10px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.2s" }}
                    onClick={(e) => { e.stopPropagation(); setSelected(p.plan); }}
                  >{isSelected ? "Đã Chọn ✓" : "Chọn Gói"}</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selected && selected !== currentPlan && (
        <div className="e-glass-card" style={{ padding: "1.8rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: "1rem", fontFamily: "var(--e-sans)" }}>Thanh toán qua</p>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.2rem" }}>
            {(["VNPay", "PayPal"] as const).map((m) => (
              <button key={m} onClick={() => setPayMethod(m)} style={{ padding: "0.6rem 1.5rem", borderRadius: "10px", border: payMethod === m ? "none" : "1px solid rgba(154,124,69,0.18)", background: payMethod === m ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", color: payMethod === m ? "#fff" : "var(--e-light-muted)", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.2s" }}>{m}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <p style={{ fontSize: "0.72rem", color: "var(--e-light-muted)", margin: 0, fontFamily: "var(--e-sans)" }}>
              Đang chọn: <span style={{ fontWeight: 700, color: "var(--e-charcoal)" }}>{PLANS_DATA.find(pp => pp.plan === selected)?.name}</span>
              {" — "}<span style={{ fontWeight: 700, color: "var(--e-gold)" }}>{PLANS_DATA.find(pp => pp.plan === selected)?.price}</span>
            </p>
            <button onClick={() => onCheckout?.(selected, payMethod)}
              style={{ padding: "11px 28px", background: "var(--e-gold)", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", transition: "all 0.25s", boxShadow: "0 4px 14px rgba(154,124,69,0.3)" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.background = "var(--e-charcoal)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.background = "var(--e-gold)"; }}
            >Thanh Toán →</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, marginBottom: "1rem", fontFamily: "var(--e-sans)" }}>Câu Hỏi Thường Gặp</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[
            { q: "Tôi có thể hủy gói bất kỳ lúc nào không?", a: "Có, bạn có thể hủy bất kỳ lúc nào. Gói sẽ còn hiệu lực đến hết chu kỳ thanh toán." },
            { q: "Tin đăng có bị xóa khi hạ cấp không?", a: "Không, tin đăng hiện tại sẽ được giữ nguyên. Bạn chỉ không thể tạo thêm khi vượt giới hạn." },
          ].map((faq, i) => (
            <div key={i} className="e-glass-card" style={{ padding: "1.5rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--e-charcoal)", marginBottom: 6, fontFamily: "var(--e-sans)" }}>{faq.q}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--e-light-muted)", lineHeight: 1.7, fontFamily: "var(--e-sans)" }}>{faq.a}</div>
            </div>
          ))}
        </div>
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
      if (!hasValidCoords) { const { lat, lng } = await geocodeAddress(address); location = { type: "Point", coordinates: [lng, lat] }; }
      await propertyService.createProperty({ ...data, address, location });
      alert("Tạo bất động sản thành công!");
      onCreated();
    } catch (error: any) {
      const message = error?.message || "Lỗi khi tạo bất động sản";
      const isQuotaError = error instanceof ApiError && error.statusCode === 403 && message.toLowerCase().match(/quota|plan|upgrade|nâng cấp|gói/);
      if (isQuotaError) { const goUpgrade = confirm("Bạn đã đạt giới hạn tin đăng. Nâng cấp ngay không?"); if (goUpgrade) router.push("/subscription/plans"); return; }
      alert(message);
    } finally { setIsLoading(false); }
  };

  return <div style={{ padding: "2.5rem 2.5vw" }}><PropertyForm onSubmit={handleSubmit} isLoading={isLoading} /></div>;
}

/* ═══════════════════════════════════════════════════════════
   EDIT VIEW
═══════════════════════════════════════════════════════════ */
function EditView({ propertyId, onUpdated, onCancel }: { propertyId: string; onUpdated: () => void; onCancel: () => void; }) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!propertyId) return;
    const loadProperty = async () => {
      try { const prop = await propertyService.getPropertyById(propertyId); setProperty(prop); }
      catch (error) { console.error("Error loading property:", error); onCancel(); }
      finally { setInitialized(true); }
    };
    void loadProperty();
  }, [propertyId]);

  const handleSubmit = async (data: PropertyFormData) => {
    if (!property) return;
    try {
      setIsLoading(true);
      const nextAddress = data.address.trim();
      const coords = Array.isArray(data.location?.coordinates) ? data.location.coordinates : [];
      const hasValidCoords = coords.length === 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1]) && !(coords[0] === 0 && coords[1] === 0);
      let nextLocation = data.location;
      if (nextAddress && (!hasValidCoords || !property.address || nextAddress.toLowerCase() !== property.address.trim().toLowerCase())) {
        const { lat, lng } = await geocodeAddress(nextAddress); nextLocation = { type: "Point", coordinates: [lng, lat] };
      }
      await propertyService.updateProperty(property._id, { ...data, address: nextAddress, location: nextLocation });
      alert("Cập nhật bất động sản thành công!"); onUpdated();
    } catch (error: any) {
      const message = error?.message || "Lỗi khi cập nhật bất động sản";
      const isQuotaError = error instanceof ApiError && error.statusCode === 403 && message.toLowerCase().match(/quota|plan|upgrade|nâng cấp|gói/);
      if (isQuotaError) { const goUpgrade = confirm("Bạn đã đạt giới hạn. Nâng cấp gói ngay không?"); if (goUpgrade) router.push("/subscription/plans"); return; }
      alert(message);
    } finally { setIsLoading(false); }
  };

  if (!initialized || !property) return (
    <div style={{ padding: "2.5rem 2.5vw", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
        <LoaderCircle size={16} className="animate-spin" /> Đang tải bất động sản…
      </div>
    </div>
  );

  return (
    <div style={{ padding: "2.5rem 2.5vw" }}>
      <div style={{ marginBottom: "2rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.12)" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Quản Lý Tin</p>
          <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 500, color: "var(--e-charcoal)", lineHeight: 1.2, margin: 0 }}>
            Chỉnh sửa{" "}<span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)", fontSize: "clamp(1.1rem, 2vw, 1.6rem)" }}>tin đăng của bạn</span>
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <button onClick={onCancel} style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: "var(--e-light-muted)", background: "none", border: "1px solid rgba(0,0,0,0.1)", padding: "7px 16px", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--e-charcoal)"; e.currentTarget.style.borderColor = "var(--e-charcoal)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--e-light-muted)"; e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)"; }}
          >← Quay lại</button>
          <span style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold)", border: "1px solid rgba(154,124,69,0.3)", padding: "4px 10px", background: "rgba(154,124,69,0.06)", borderRadius: "6px", fontFamily: "var(--e-sans)" }}>Cập nhật thông tin</span>
        </div>
      </div>
      <PropertyForm initialData={property} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KYC VIEW
═══════════════════════════════════════════════════════════ */
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
function validateFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only JPG and PNG images are supported.";
  if (file.size > MAX_FILE_SIZE) return "File size must be 5MB or less.";
  return null;
}
function getKycErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to process KYC action right now.";
}
type DocumentSide = "front" | "back";
interface UploadBoxProps { title: string; file: File | null; preview: string | null; inputRef: RefObject<HTMLInputElement | null>; onSelectFile: (file: File) => void; onClearFile: () => void; }

function UploadBox({ title, file, preview, inputRef, onSelectFile, onClearFile }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setIsDragging(false); const f = event.dataTransfer.files?.[0]; if (f) onSelectFile(f); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <p style={{ fontFamily: "var(--e-sans)", fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700 }}>{title}</p>
      <div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        style={{ border: `1px dashed ${isDragging ? "var(--e-gold)" : "rgba(154,124,69,0.25)"}`, background: isDragging ? "rgba(154,124,69,0.04)" : "rgba(255,252,248,0.8)", cursor: "pointer", transition: "border-color 0.25s, background 0.25s", position: "relative", overflow: "hidden", borderRadius: "12px" }}
      >
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelectFile(f); }} />
        {preview ? (
          <div style={{ position: "relative" }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClearFile(); }}
              style={{ position: "absolute", top: "0.7rem", right: "0.7rem", zIndex: 10, width: 28, height: 28, borderRadius: "50%", background: "rgba(17,28,20,0.75)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              aria-label={`Remove ${title} image`}><X size={13} /></button>
            <Image src={preview} alt={title} width={900} height={700} unoptimized style={{ width: "100%", height: 240, objectFit: "cover", display: "block" }} />
          </div>
        ) : (
          <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.6rem", padding: "1.5rem" }}>
            <UploadCloud size={26} color="var(--e-gold)" style={{ opacity: 0.5 }} />
            <p style={{ fontSize: "0.82rem", color: "var(--e-charcoal)", fontWeight: 600, textAlign: "center", fontFamily: "var(--e-sans)" }}>Kéo thả hoặc nhấn để chọn ảnh</p>
            <p style={{ fontSize: "0.68rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>JPG / PNG · Tối đa 5MB</p>
          </div>
        )}
      </div>
      {file && <p style={{ fontSize: "0.68rem", color: "var(--e-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--e-sans)" }}>{file.name}</p>}
    </div>
  );
}

const KYC_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Chờ xét duyệt", color: "var(--e-gold)", bg: "rgba(140,110,63,0.07)", border: "rgba(140,110,63,0.3)" },
  approved: { label: "Đã duyệt", color: "#2d7a4f", bg: "rgba(45,122,79,0.08)", border: "rgba(45,122,79,0.3)" },
  rejected: { label: "Từ chối", color: "#b84a2a", bg: "rgba(184,74,42,0.07)", border: "rgba(184,74,42,0.3)" },
};

function KycView() {
  const { user, token, refreshProfile } = useAuth();
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

  useEffect(() => { if (!frontFile) { setFrontPreview(null); return; } const url = URL.createObjectURL(frontFile); setFrontPreview(url); return () => URL.revokeObjectURL(url); }, [frontFile]);
  useEffect(() => { if (!backFile) { setBackPreview(null); return; } const url = URL.createObjectURL(backFile); setBackPreview(url); return () => URL.revokeObjectURL(url); }, [backFile]);
  useEffect(() => {
    if (!token) return;
    const load = async () => { setPageLoading(true); setErrorMessage(null); try { setProfile(await userService.getMe(token)); } catch (err) { setErrorMessage(getKycErrorMessage(err)); } finally { setPageLoading(false); } };
    void load();
  }, [token]);

  const canSubmit = useMemo(() => Boolean(frontFile && backFile && token && !submitting), [backFile, frontFile, submitting, token]);
  const handleSelectFile = (side: DocumentSide, file: File) => { const err = validateFile(file); if (err) { setErrorMessage(err); return; } setErrorMessage(null); setSuccessMessage(null); if (side === "front") { setFrontFile(file); return; } setBackFile(file); };
  const handleClearFile = (side: DocumentSide) => { setErrorMessage(null); setSuccessMessage(null); if (side === "front") { setFrontFile(null); if (frontInputRef.current) frontInputRef.current.value = ""; return; } setBackFile(null); if (backInputRef.current) backInputRef.current.value = ""; };
  const handleSubmit = async () => {
    if (!token || !frontFile || !backFile) { setErrorMessage("Vui lòng tải lên cả mặt trước và mặt sau."); return; }
    setSubmitting(true); setErrorMessage(null); setSuccessMessage(null);
    try { const res = await userService.submitKycDocuments(token, frontFile, backFile, declaredIdNumber); setProfile(await userService.getMe(token)); setSuccessMessage(res.message || "Nộp hồ sơ KYC thành công."); setFrontFile(null); setBackFile(null); setDeclaredIdNumber(""); await refreshProfile(); }
    catch (err) { setErrorMessage(getKycErrorMessage(err)); }
    finally { setSubmitting(false); }
  };

  if (pageLoading) return <div style={{ padding: "5rem 5vw", display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}><LoaderCircle size={16} className="animate-spin" /> Đang tải hồ sơ KYC…</div>;
  if (!profile) return <div style={{ padding: "5rem 5vw", textAlign: "center" }}><h1 style={{ fontFamily: "var(--e-serif)", fontSize: "1.6rem", fontWeight: 500, color: "var(--e-charcoal)" }}>Không thể tải hồ sơ KYC</h1><p style={{ marginTop: "0.8rem", fontSize: "0.85rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{errorMessage || "Vui lòng thử lại sau."}</p></div>;

  const statusKey = (profile.kycStatus ?? "pending").toLowerCase();
  const statusMeta = KYC_STATUS_META[statusKey] ?? KYC_STATUS_META.pending;

  return (
    <div style={{ padding: "2.5rem 2.5vw" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Xác Minh Danh Tính</p>
        <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 500, color: "var(--e-charcoal)", lineHeight: 1.15, margin: 0 }}>
          Hồ Sơ{" "}<span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)", fontSize: "clamp(1rem, 2vw, 1.4rem)" }}>KYC Của Tôi</span>
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Trạng thái", value: <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 700, color: statusMeta.color, background: statusMeta.bg, border: `1px solid ${statusMeta.border}`, padding: "4px 10px", borderRadius: "6px", fontFamily: "var(--e-sans)" }}>{statusMeta.label}</span> },
          { label: "Xác minh", value: profile.isVerified ? <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#5fc48a", fontSize: "0.88rem", fontWeight: 700, fontFamily: "var(--e-sans)" }}><CheckCircle2 size={15} /> Đã xác minh</span> : <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--e-light-muted)", fontSize: "0.88rem", fontWeight: 600, fontFamily: "var(--e-sans)" }}><AlertTriangle size={15} /> Chưa xác minh</span> },
          { label: "Vai trò", value: <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--e-charcoal)", textTransform: "capitalize", fontFamily: "var(--e-sans)" } as React.CSSProperties}>{profile.role}</span> },
        ].map((item) => (
          <div key={item.label} className="e-glass-card" style={{ padding: "1.2rem 1.5rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
            <p style={{ fontFamily: "var(--e-sans)", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: "0.6rem" }}>{item.label}</p>
            {item.value}
          </div>
        ))}
      </div>

      {profile.kycRejectionReason && (
        <div style={{ marginBottom: "1.5rem", border: "1px solid rgba(184,74,42,0.3)", background: "rgba(184,74,42,0.06)", padding: "1rem 1.2rem", borderRadius: "10px" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b84a2a", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Lý do từ chối</p>
          <p style={{ fontSize: "0.8rem", color: "#b84a2a", lineHeight: 1.65, fontFamily: "var(--e-sans)" }}>{profile.kycRejectionReason}</p>
        </div>
      )}

      <section className="e-glass-card" style={{ padding: "2.5rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Tải Lên Tài Liệu</p>
        <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "1.4rem", fontWeight: 500, color: "var(--e-charcoal)", marginBottom: "0.5rem" }}>
          Nộp Hồ Sơ <span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)" }}>CCCD</span>
        </h2>
        <p style={{ fontSize: "0.8rem", color: "var(--e-light-muted)", lineHeight: 1.75, maxWidth: 560, marginBottom: "2rem", fontFamily: "var(--e-sans)" }}>Tải ảnh chụp rõ nét mặt trước và mặt sau CCCD. Định dạng JPG, PNG. Tối đa 5MB/ảnh.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.8rem" }}>
          <UploadBox title="CCCD — Mặt Trước" file={frontFile} preview={frontPreview} inputRef={frontInputRef} onSelectFile={(f) => handleSelectFile("front", f)} onClearFile={() => handleClearFile("front")} />
          <UploadBox title="CCCD — Mặt Sau" file={backFile} preview={backPreview} inputRef={backInputRef} onSelectFile={(f) => handleSelectFile("back", f)} onClearFile={() => handleClearFile("back")} />
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: 420 }}>
          <span style={{ fontFamily: "var(--e-sans)", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700 }}>Số CCCD (Không bắt buộc)</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", border: "1px solid rgba(154,124,69,0.2)", padding: "0 12px", background: "rgba(255,252,248,0.8)", transition: "border-color 0.2s", borderRadius: "10px" }}>
            <IdCard size={15} color="var(--e-gold)" style={{ flexShrink: 0, opacity: 0.7 }} />
            <input type="text" value={declaredIdNumber} onChange={(e) => setDeclaredIdNumber(e.target.value)} placeholder="Nhập số CCCD để tăng độ chính xác OCR"
              style={{ flex: 1, border: "none", background: "none", padding: "11px 0", fontFamily: "var(--e-sans)", fontSize: "0.85rem", color: "var(--e-charcoal)", outline: "none" }}
              onFocus={(e) => (e.currentTarget.parentElement!.style.borderColor = "var(--e-gold)")}
              onBlur={(e) => (e.currentTarget.parentElement!.style.borderColor = "rgba(154,124,69,0.2)")} />
          </div>
        </label>
        <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
          <button type="button" disabled={!canSubmit} onClick={handleSubmit}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", background: "var(--e-gold)", color: "#fff", border: "none", borderRadius: "10px", cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "var(--e-sans)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: canSubmit ? 1 : 0.45, transition: "all 0.25s", boxShadow: "0 4px 14px rgba(154,124,69,0.3)" }}>
            {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}
            {submitting ? "Đang xử lý…" : "Nộp Hồ Sơ KYC"}
          </button>
          <span style={{ fontSize: "0.7rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>OCR sẽ chạy tự động sau khi nộp.</span>
        </div>
        {errorMessage && <div style={{ marginTop: "1.2rem", border: "1px solid rgba(184,74,42,0.3)", background: "rgba(184,74,42,0.06)", padding: "0.8rem 1rem", fontSize: "0.8rem", color: "#b84a2a", lineHeight: 1.6, borderRadius: "8px", fontFamily: "var(--e-sans)" }}>{errorMessage}</div>}
        {successMessage && <div style={{ marginTop: "1.2rem", border: "1px solid rgba(45,122,79,0.3)", background: "rgba(45,122,79,0.06)", padding: "0.8rem 1rem", fontSize: "0.8rem", color: "#2d7a4f", lineHeight: 1.6, borderRadius: "8px", fontFamily: "var(--e-sans)" }}>{successMessage}</div>}
      </section>

      <section className="e-glass-card" style={{ padding: "2.5rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
        <p style={{ fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Tài Liệu Đã Nộp</p>
        <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "1.4rem", fontWeight: 500, color: "var(--e-charcoal)", marginBottom: "0.4rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <ShieldCheck size={20} color="var(--e-gold)" style={{ flexShrink: 0 }} />
          Hồ Sơ <span style={{ fontFamily: "var(--e-sans)", fontWeight: 400, color: "var(--e-light-muted)" }}>Đã Tải Lên</span>
        </h2>
        {profile.kycDocuments?.length ? (
          <div style={{ marginTop: "1.8rem", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            {profile.kycDocuments.map((docUrl, idx) => (
              <a key={`${docUrl}-${idx}`} href={docUrl} target="_blank" rel="noreferrer" style={{ display: "block", overflow: "hidden", background: "#f8fafc", position: "relative", borderRadius: "12px", border: "1px solid rgba(154,124,69,0.15)" }}>
                <Image src={docUrl} alt={`KYC document ${idx + 1}`} width={900} height={700} unoptimized style={{ width: "100%", height: 220, objectFit: "cover", display: "block", transition: "transform 0.6s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")} />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1rem", background: "linear-gradient(to top, rgba(17,28,20,0.75) 0%, transparent 100%)" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold-light)", fontWeight: 700, fontFamily: "var(--e-sans)" }}>Tài liệu {idx + 1}</p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: "1.5rem", padding: "3rem 2rem", textAlign: "center", border: "1px dashed rgba(154,124,69,0.2)", background: "rgba(255,252,248,0.6)", borderRadius: "12px" }}>
            <p style={{ fontSize: "1rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Chưa có tài liệu nào được tải lên</p>
          </div>
        )}
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ─── NAV_ITEMS: dùng Lucide icons, giống Admin Dashboard ───
═══════════════════════════════════════════════════════════ */
const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: "dashboard", label: "Tổng Quan", icon: <LayoutDashboard size={14} /> },
  { view: "properties", label: "Bất Động Sản", icon: <Building2 size={14} /> },
  { view: "create", label: "Đăng Tin Mới", icon: <Plus size={14} /> },
  { view: "plans", label: "Gói Dịch Vụ", icon: <Layers size={14} /> },
  { view: "kyc", label: "Xác Minh KYC", icon: <ShieldCheck size={14} /> },
];

export default function ProviderDashboard() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("dashboard");
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null);

  useEffect(() => {
    const queryView = router.query.view as string | undefined;
    if (queryView && ["dashboard", "properties", "plans", "create", "edit", "kyc"].includes(queryView))
      setView(queryView as View);
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
    const init = async () => {
      try {
        if (!user || user.role !== "provider") { router.push("/"); return; }
        await fetchProperties();
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (!isAuthLoading) void init();
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

  /* Badge counts for nav items */
  const pendingCount = stats.pending;

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
      <Head><title>Dashboard — Estoria Provider</title></Head>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .e-glass-card {
          background: #ffffff;
          border: 1px solid var(--e-beige);
          border-radius: 12px;
          box-shadow: 0 10px 40px -10px rgba(0,0,0,0.04);
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1);
          position: relative;
        }
        .e-glass-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 45px -10px rgba(154,124,69,0.12);
          border-color: rgba(154,124,69,0.3);
        }
        .e-glass-card-dark {
          background: #ffffff;
          border: 1px solid var(--e-gold);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(154,124,69,0.1);
          position: relative;
          overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.16,1,0.3,1), box-shadow 0.3s cubic-bezier(0.16,1,0.3,1);
        }
        .e-glass-card-dark::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(201,169,110,0.08), transparent 70%);
          pointer-events: none;
        }
        .e-glass-card-dark:hover { transform: translateY(-3px); box-shadow: 0 16px 40px rgba(154,124,69,0.15); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.2); border-radius: 10px; }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.4); }
      `}</style>

      <div className="estoria min-h-screen flex overflow-hidden font-[var(--e-sans)] bg-[var(--e-cream)]">

        {/* ════════════════════════════════════════════
            SIDEBAR — synced với Admin Dashboard style
        ════════════════════════════════════════════ */}
        <aside
          className="w-64 flex flex-col h-screen fixed top-0 left-0 z-50 shadow-2xl overflow-hidden"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1600&q=85')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Gradient overlay — identical to admin */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#111c14]/95 to-[#111c14]/90 backdrop-blur-md pointer-events-none z-0" />

          <div className="relative z-10 flex flex-col h-full border-r border-[#D4AF37]/10">

            {/* ── Brand ── */}
            <div className="p-8 pb-6 border-b border-[#D4AF37]/10">
              <Link href="/" className="flex items-center gap-2 no-underline group block">
                <span className="text-3xl font-extrabold text-white tracking-tighter" style={{ fontFamily: "var(--e-serif)" }}>
                  Esto<span className="text-[var(--e-gold-light)] group-hover:text-white transition-colors duration-500">ria</span>
                </span>
              </Link>
              <div
                className="text-[0.55rem] uppercase tracking-[0.25em] text-[var(--e-gold-light)] font-bold mt-2 ml-0.5"
                style={{ fontFamily: "var(--e-sans)" }}
              >
                Provider Portal
              </div>
            </div>

            {/* ── Navigation ── */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
              {NAV_ITEMS.map((item) => {
                const isActive = view === item.view;
                /* badge: pending properties on "properties" view */
                const badge =
                  item.view === "properties" && pendingCount > 0 ? pendingCount : undefined;

                return (
                  <button
                    key={item.view}
                    onClick={() => handleSetView(item.view)}
                    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden
                      ${isActive
                        ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20 shadow-lg text-white"
                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                    style={{ fontFamily: "var(--e-sans)" }}
                  >
                    {/* Active left bar */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--e-gold-light)] shadow-[0_0_10px_var(--e-gold)]" />
                    )}

                    <span className={`transition-transform duration-300 z-10 ${isActive ? "text-[var(--e-gold-light)] scale-110" : "group-hover:scale-110"}`}>
                      {item.icon}
                    </span>
                    <span className={`text-[0.8rem] font-semibold tracking-wide flex-1 text-left z-10 ${isActive ? "opacity-100" : "opacity-90"}`}>
                      {item.label}
                    </span>

                    {badge != null && (
                      <span
                        className="z-10"
                        style={{
                          fontSize: "0.6rem", fontWeight: 700,
                          background: "var(--e-gold)", color: "#fff",
                          padding: "2px 7px", borderRadius: "6px",
                          minWidth: 24, textAlign: "center",
                          boxShadow: "0 0 10px rgba(212,175,55,0.4)",
                        }}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="h-px bg-[#D4AF37]/10 my-8 mx-2" />

              {/* Settings link */}
              <a
                href="/profile/settings"
                className="flex items-center gap-4 px-5 py-3.5 text-white/40 hover:text-[var(--e-gold-light)] hover:bg-[#D4AF37]/5 rounded-xl transition-all duration-300 border border-transparent"
                style={{ fontFamily: "var(--e-sans)" }}
              >
                <Settings size={14} className="opacity-90" />
                <span className="text-[0.8rem] font-medium tracking-wide">Cài Đặt</span>
              </a>
            </nav>

            {/* ── User footer ── */}
            <div className="p-5 border-t border-[#D4AF37]/10 bg-black/20">
              <Link
                href="/profile/settings"
                className="flex items-center gap-3 no-underline group"
              >
                <div
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--e-gold)] to-[var(--e-gold-light)] flex items-center justify-center text-white text-[1.1rem] font-bold shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform"
                  style={{ fontFamily: "var(--e-serif)" }}
                >
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.75rem] font-bold text-white truncate leading-tight mb-0.5" style={{ fontFamily: "var(--e-sans)" }}>
                    {user?.name}
                  </p>
                  <p className="text-[0.63rem] text-[var(--e-gold-light)]/80 truncate mt-0 mb-0 tracking-wider" style={{ fontFamily: "var(--e-sans)" }}>
                    {user?.email}
                  </p>
                </div>
              </Link>
            </div>

          </div>
        </aside>

        {/* ════════════════════════════════════════════
            MAIN CONTENT — synced subtle bg như admin
        ════════════════════════════════════════════ */}
        <main className="flex-1 ml-64 min-h-screen relative overflow-y-auto">

          {/* Subtle background — identical treatment to admin */}
          <div style={{
            position: "fixed",
            top: 0, left: "16rem", right: 0, bottom: 0,
            backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px) opacity(0.06)",
            zIndex: 0,
            pointerEvents: "none",
          }} />

          <div className="relative z-10 min-h-full flex flex-col p-8 lg:p-12">
            <div className="w-full max-w-6xl mx-auto flex-1">

              {view === "dashboard" && (
                <ViewWrapper>
                  <DashboardView
                    provider={user}
                    stats={stats}
                    properties={properties}
                    recentProperties={properties.slice(0, 5)}
                    onNavigate={handleSetView}
                  />
                </ViewWrapper>
              )}
              {view === "properties" && (
                <ViewWrapper>
                  <PropertiesView properties={properties} onDelete={handleDelete} onEdit={handleEditProperty} />
                </ViewWrapper>
              )}
              {view === "plans" && (
                <ViewWrapper>
                  <PlansView
                    currentPlan={user?.subscription?.plan ?? "Free"}
                    listingsUsed={user?.listingsCount ?? 0}
                  />
                </ViewWrapper>
              )}
              {view === "create" && (
                <ViewWrapper>
                  <CreateView onCreated={handlePropertyCreated} />
                </ViewWrapper>
              )}
              {view === "edit" && editPropertyId && (
                <ViewWrapper>
                  <EditView
                    propertyId={editPropertyId}
                    onUpdated={handlePropertyUpdated}
                    onCancel={() => handleSetView("properties")}
                  />
                </ViewWrapper>
              )}
              {view === "kyc" && (
                <ViewWrapper>
                  <KycView />
                </ViewWrapper>
              )}

            </div>

            <footer className="mt-16 pt-8 border-t border-[var(--e-beige)] text-center text-[0.68rem] uppercase tracking-widest text-[var(--e-muted)] font-medium pb-8" style={{ fontFamily: "var(--e-sans)" }}>
              &copy; {new Date().getFullYear()} Estoria Luxury Real Estate — Provider Management System
            </footer>
          </div>
        </main>

      </div>
    </>
  );
}