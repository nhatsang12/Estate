import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import {
  CheckCircle, XCircle, LoaderCircle, RefreshCcw,
  ShieldCheck, ShieldAlert, CheckCircle2, UserRoundSearch,
  Clock, Home, Users, FileText, Key, DollarSign,
  BedDouble, Ruler, MapPin, ChevronDown, ChevronUp,
  SlidersHorizontal, Search, Phone,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { adminService } from "@/services/adminService";
import { userService } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import KycStatusBadge from "@/components/KycStatusBadge";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
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

/* ═══════════════════════════════════════════════════════════
   ANIMATED SELECT — position: fixed dropdown
   Thoát khỏi mọi overflow container
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

  // SSR safe — portal cần document
  useEffect(() => { setMounted(true); }, []);

  // Click outside
  useEffect(() => {
    function outside(e: MouseEvent) {
      if (buttonRef.current?.contains(e.target as Node)) return;
      if (dropRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  // Cập nhật vị trí khi scroll/resize
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

  // Dropdown render thẳng vào document.body qua portal
  const dropdown = (
    <div ref={dropRef} style={{
      position: "fixed",
      top: dropPos.top,
      left: dropPos.left,
      width: dropPos.width,
      zIndex: 99999,
      background: "#fff",
      border: "1px solid rgba(154,124,69,0.2)",
      borderRadius: "10px",
      boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      transformOrigin: "top center",
      transition: "opacity 0.18s ease, transform 0.18s ease",
      opacity: open ? 1 : 0,
      transform: open ? "scaleY(1) translateY(0)" : "scaleY(0.9) translateY(-6px)",
      pointerEvents: open ? "auto" : "none",
      overflow: "hidden",
    }}>
      {options.map((opt, i) => (
        <button key={opt.value} type="button"
          onClick={() => { onChange(opt.value); setOpen(false); }}
          style={{
            width: "100%", textAlign: "left", padding: "10px 14px",
            border: "none",
            background: opt.value === value ? "rgba(154,124,69,0.07)" : "transparent",
            color: opt.value === value ? "var(--e-gold)" : "var(--e-charcoal)",
            fontFamily: "var(--e-sans)", fontSize: "0.83rem",
            fontWeight: opt.value === value ? 700 : 400,
            cursor: "pointer", transition: "background 0.15s",
            borderBottom: i < options.length - 1 ? "1px solid rgba(154,124,69,0.06)" : "none",
          }}
          onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = "rgba(154,124,69,0.04)"; }}
          onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = "transparent"; }}
        >
          {opt.label}
        </button>
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
          boxShadow: open ? "0 0 0 3px rgba(154,124,69,0.08)" : "none",
          textAlign: "left",
        }}>
        {Icon && <Icon size={13} style={{ color: open ? "var(--e-gold)" : "var(--e-light-muted)", flexShrink: 0 }} />}
        <span style={{ flex: 1 }}>{activeLabel}</span>
        <ChevronDown size={13} style={{
          color: open ? "var(--e-gold)" : "var(--e-light-muted)",
          transition: "transform 0.25s",
          transform: open ? "rotate(180deg)" : "none",
          flexShrink: 0,
        }} />
      </button>

      {/* Portal — render vào body, không bị clip bởi bất kỳ container nào */}
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

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)" }}>
        <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Admin Dashboard</p>
        <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          Bảng <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Điều Khiển</em>
        </h1>
      </div>

      {/* Alerts */}
      {((stats?.pendingPropertiesCount ?? 0) > 0 || (stats?.totalPendingProviders ?? 0) > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: (stats?.pendingPropertiesCount ?? 0) > 0 && (stats?.totalPendingProviders ?? 0) > 0 ? "1fr 1fr" : "1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {(stats?.pendingPropertiesCount ?? 0) > 0 && (
            <button onClick={() => onNavigate("properties")}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.4rem", background: "rgba(154,124,69,0.07)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "10px", cursor: "pointer", transition: "background 0.2s", textAlign: "left", fontFamily: "var(--e-sans)" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(154,124,69,0.13)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(154,124,69,0.07)"}
            >
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
              onMouseLeave={e => e.currentTarget.style.background = "rgba(154,124,69,0.07)"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--e-gold)", display: "flex" }}><UserRoundSearch size={16} /></span>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--e-charcoal)" }}>{stats?.totalPendingProviders} provider chờ xác minh</span>
              </div>
              <span style={{ fontSize: "0.65rem", color: "var(--e-gold)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Xác Minh →</span>
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Tổng Người Dùng" value={stats?.totalUsers || 0} icon={<Users size={20} />} accent />
        <StatCard label="Nhà Cung Cấp" value={stats?.totalProviders || 0} icon={<Home size={20} />} />
        <StatCard label="Tổng Bất Động Sản" value={stats?.totalProperties || 0} icon={<FileText size={20} />} />
        <StatCard label="Chờ Phê Duyệt" value={stats?.pendingPropertiesCount || 0} icon={<Clock size={20} />} warn />
      </div>

      {/* Charts row 1 */}
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

      {/* Charts row 2 */}
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

      {/* Quick Actions */}
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
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,252,248,0.7)"; e.currentTarget.style.borderColor = "rgba(154,124,69,0.12)"; e.currentTarget.style.transform = "none"; }}
            >
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
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 20px 56px rgba(154,124,69,0.11)";
        e.currentTarget.style.borderColor = "rgba(201,169,110,0.35)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = "rgba(154,124,69,0.15)";
      }}>

      {/* Gold accent bar on top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: "linear-gradient(90deg, var(--e-gold), transparent 70%)",
      }} />

      {/* ── Main Grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr auto", minHeight: 168 }}>

        {/* Thumbnail */}
        <div style={{ position: "relative", overflow: "hidden", background: "#f0ede8" }}>
          {property.images?.[0] ? (
            <img src={property.images[0]} alt="" style={{
              width: "100%", height: "100%", objectFit: "cover",
              display: "block", transition: "transform 0.55s ease",
            }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <Home size={28} color="var(--e-light-muted)" />
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(26,24,20,0.35) 0%, transparent 55%)" }} />
          <span style={{
            position: "absolute", top: 12, left: 12,
            fontSize: "0.5rem", letterSpacing: "0.18em", textTransform: "uppercase",
            fontWeight: 700, color: "#fff", fontFamily: "var(--e-sans)",
            background: "rgba(26,24,20,0.55)", backdropFilter: "blur(6px)",
            padding: "4px 10px", borderRadius: "6px",
          }}>{property.type}</span>
          {(property.images?.length ?? 0) > 1 && (
            <span style={{
              position: "absolute", bottom: 10, left: 12,
              fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase",
              fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "var(--e-sans)",
            }}>{property.images!.length} ảnh</span>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "1.4rem 1.6rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.7rem" }}>
          <div>
            {/* Status + Price */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase",
                fontWeight: 700, padding: "4px 11px", borderRadius: "20px",
                color: "var(--e-gold)", background: "rgba(212,175,55,0.08)",
                border: "1px solid rgba(212,175,55,0.3)", fontFamily: "var(--e-sans)",
              }}>
                <Clock size={8} /> Chờ duyệt
              </span>
              <span style={{
                fontFamily: "var(--e-serif)", fontSize: "1.05rem", fontWeight: 600,
                color: "var(--e-charcoal)", letterSpacing: "-0.01em", whiteSpace: "nowrap",
              }}>{fmtVND(property.price)}</span>
            </div>

            <h3 style={{
              fontFamily: "var(--e-sans)", fontSize: "1rem", fontWeight: 700,
              color: "var(--e-charcoal)", lineHeight: 1.35, marginTop: "0.55rem", marginBottom: 0,
            }}>{property.title}</h3>
            <p style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: "0.73rem", color: "var(--e-muted)",
              marginTop: "0.3rem", fontFamily: "var(--e-sans)",
            }}>
              <MapPin size={12} color="var(--e-gold)" style={{ flexShrink: 0 }} />
              {property.address}
            </p>
          </div>

          <div>
            {/* Owner mini */}
            {owner && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0.55rem 0.9rem", marginBottom: "0.8rem",
                background: "rgba(154,124,69,0.04)", border: "1px solid rgba(154,124,69,0.1)",
                borderRadius: "10px",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "8px",
                  background: "linear-gradient(135deg, var(--e-gold), var(--e-gold-light))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                  fontFamily: "var(--e-serif)",
                }}>
                  {owner.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{owner.name}</div>
                  <div style={{ fontSize: "0.67rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{owner.email}</div>
                </div>
              </div>
            )}

            {/* Meta chips */}
            <div style={{
              display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
              paddingTop: "0.8rem", borderTop: "1px solid rgba(154,124,69,0.08)",
            }}>
              {[
                `${property.area} m²`,
                `${property.bedrooms ?? 0} phòng ngủ`,
                `${property.bathrooms ?? 0} WC`,
                property.furnished ? "Đầy đủ nội thất" : "Chưa có nội thất",
              ].map(text => (
                <span key={text} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: "0.71rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)",
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--e-gold)", flexShrink: 0 }} />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          gap: "0.45rem", padding: "1.2rem 1.2rem 1.2rem 1rem",
          borderLeft: "1px solid rgba(154,124,69,0.1)",
          background: "rgba(248,245,240,0.45)", minWidth: 112,
        }}>
          {[
            { label: "Duyệt", icon: <CheckCircle size={13} />, style: { color: "#fff", background: "#2E8B75", borderColor: "#2E8B75", boxShadow: "0 3px 12px rgba(46,139,117,0.25)" }, onClick: onApprove },
            { label: "Từ chối", icon: <XCircle size={13} />, style: { color: "#b84a2a", background: "rgba(184,74,42,0.04)", borderColor: "rgba(184,74,42,0.25)" }, onClick: () => setRejecting(v => !v) },
            { label: "Chi tiết", icon: <ChevronDown size={12} />, style: { color: "var(--e-charcoal)", background: "rgba(255,255,255,0.8)", borderColor: "rgba(154,124,69,0.2)" }, onClick: () => setExpanded(v => !v) },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} disabled={isLoading && btn.label === "Duyệt"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 14px", fontSize: "0.61rem", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                borderRadius: "9px", cursor: "pointer", transition: "all 0.22s",
                border: "1px solid", fontFamily: "var(--e-sans)", ...btn.style,
              }}>
              {btn.icon}{btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reject panel */}
      <div style={{
        borderTop: rejecting ? "1px solid rgba(184,74,42,0.15)" : "none",
        background: "rgba(184,74,42,0.02)",
        maxHeight: rejecting ? 130 : 0, overflow: "hidden",
        transition: "max-height 0.35s ease",
        padding: rejecting ? "1rem 1.8rem" : "0 1.8rem",
      }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Nhập lý do từ chối tin đăng này..."
            style={{
              flex: 1, padding: "10px 12px",
              border: "1px solid rgba(184,74,42,0.28)", borderRadius: "9px",
              background: "#fff", fontFamily: "var(--e-sans)", fontSize: "0.83rem",
              color: "var(--e-charcoal)", outline: "none", resize: "none", minHeight: 62,
            }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <button onClick={handleReject} style={{ padding: "9px 18px", background: "#b84a2a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Xác Nhận</button>
            <button onClick={() => { setRejecting(false); setReason(""); }} style={{ padding: "9px 18px", background: "transparent", color: "var(--e-muted)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Hủy</button>
          </div>
        </div>
      </div>

      {/* Expand detail */}
      <div style={{
        borderTop: expanded ? "1px solid rgba(154,124,69,0.1)" : "none",
        background: "rgba(248,245,240,0.5)",
        maxHeight: expanded ? 900 : 0, overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)",
        padding: expanded ? "1.4rem 1.8rem" : "0 1.8rem",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.4rem" }}>
          {/* Left */}
          <div>
            <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>Mô Tả</p>
            <p style={{ fontSize: "0.79rem", color: "var(--e-muted)", lineHeight: 1.75, fontFamily: "var(--e-sans)" }}>{property.description || "Chưa có mô tả."}</p>
            {(property.amenities?.length ?? 0) > 0 && (
              <>
                <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, margin: "1.2rem 0 7px", fontFamily: "var(--e-sans)" }}>Tiện Ích</p>
                <div>
                  {property.amenities?.map(a => (
                    <span key={a} style={{ display: "inline-block", padding: "3px 10px", margin: 2, background: "rgba(154,124,69,0.07)", border: "1px solid rgba(154,124,69,0.15)", borderRadius: "6px", fontSize: "0.68rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{a}</span>
                  ))}
                </div>
              </>
            )}
            {owner && (
              <>
                <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, margin: "1.2rem 0 7px", fontFamily: "var(--e-sans)" }}>Chủ Sở Hữu</p>
                <div style={{ padding: "0.8rem 1rem", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(154,124,69,0.12)", borderRadius: "8px" }}>
                  <p style={{ fontWeight: 700, color: "var(--e-charcoal)", fontSize: "0.84rem", marginBottom: 3, fontFamily: "var(--e-sans)" }}>{owner.name}</p>
                  <p style={{ fontSize: "0.76rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{owner.email}</p>
                </div>
              </>
            )}
          </div>

          {/* Right */}
          <div>
            {(property.images?.length ?? 0) > 0 && (
              <>
                <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>Hình Ảnh</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.4rem", marginBottom: "1rem" }}>
                  {property.images!.slice(0, 6).map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", height: 68, borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(154,124,69,0.15)" }}>
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s" }}
                        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.07)"}
                        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                    </a>
                  ))}
                </div>
              </>
            )}
            {(property.ownershipDocuments?.length ?? 0) > 0 && (
              <>
                <p style={{ fontSize: "0.54rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 7, fontFamily: "var(--e-sans)" }}>Giấy Tờ Pháp Lý</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  {property.ownershipDocuments?.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(154,124,69,0.15)" }}>
                      {isImageUrl(url) ? (
                        <img src={url} alt="" style={{ width: "100%", height: 72, objectFit: "cover", display: "block", transition: "transform 0.3s" }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                      ) : (
                        <div style={{ height: 72, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--e-cream)", fontSize: "0.72rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>PDF</div>
                      )}
                      <div style={{ padding: "0.4rem 0.6rem", background: "#fff", fontSize: "0.68rem", color: "var(--e-charcoal)", fontFamily: "var(--e-sans)", fontWeight: 600 }}>Giấy tờ {i + 1}</div>
                    </a>
                  ))}
                </div>
              </>
            )}
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
    try {
      const res = await adminService.getPendingProperties(page, 20);
      setProperties(res.data.properties);
      setTotalPages(res.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...properties];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") list = list.filter(p => p.type === typeFilter);
    if (sortBy === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [properties, search, typeFilter, sortBy]);

  const handleApprove = (id: string) => async () => {
    setProcessedId(id);
    try { await adminService.moderateProperty(id, { status: "approved" }); setProperties(p => p.filter(x => x._id !== id)); alert("Phê duyệt thành công"); }
    catch (e: any) { alert(e.message || "Lỗi"); }
    finally { setProcessedId(null); }
  };

  const handleReject = (id: string) => async (reason: string) => {
    setProcessedId(id);
    try { await adminService.moderateProperty(id, { status: "rejected", rejectionReason: reason }); setProperties(p => p.filter(x => x._id !== id)); alert("Đã từ chối"); }
    catch (e: any) { alert(e.message || "Lỗi"); }
    finally { setProcessedId(null); }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Quản Lý Bất Động Sản</p>
          <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Duyệt <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Tin Đăng</em>
          </h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold)", border: "1px solid rgba(154,124,69,0.3)", padding: "5px 12px", background: "rgba(154,124,69,0.06)", borderRadius: "6px", fontFamily: "var(--e-sans)", display: "flex", alignItems: "center" }}>
            {filtered.length} đang chờ
          </span>
          <button onClick={() => setShowFilters(v => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: showFilters ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: showFilters ? "#fff" : "var(--e-charcoal)", transition: "all 0.2s" }}>
            <SlidersHorizontal size={13} /> Bộ Lọc
          </button>
        </div>
      </div>

      {/* Filter panel — overflow: visible so dropdowns show */}
      <div style={{
        maxHeight: showFilters ? 500 : 0,
        overflow: showFilters ? "visible" : "hidden",
        transition: "max-height 0.35s ease",
        marginBottom: showFilters ? "1.2rem" : 0,
      }}>
        <div className="e-glass-card" style={{ padding: "1.2rem 1.4rem", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(8px)", display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>Tìm Kiếm</label>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--e-light-muted)" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc địa chỉ..."
                style={{ width: "100%", padding: "9px 12px 9px 30px", border: "1px solid rgba(154,124,69,0.25)", borderRadius: "8px", background: "rgba(255,255,255,0.92)", fontFamily: "var(--e-sans)", fontSize: "0.84rem", color: "var(--e-charcoal)", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "var(--e-gold)"}
                onBlur={e => e.target.style.borderColor = "rgba(154,124,69,0.25)"}
              />
            </div>
          </div>
          <AnimatedSelect label="Loại Hình" value={typeFilter} onChange={v => setTypeFilter(v as PropFilter)} icon={Home}
            options={[
              { value: "all", label: "Tất cả" }, { value: "apartment", label: "Căn hộ" },
              { value: "house", label: "Nhà phố" }, { value: "villa", label: "Biệt thự" },
              { value: "studio", label: "Studio" }, { value: "office", label: "Văn phòng" },
            ]}
          />
          <AnimatedSelect label="Sắp Xếp" value={sortBy} onChange={setSortBy} icon={SlidersHorizontal}
            options={[
              { value: "newest", label: "Mới nhất" }, { value: "oldest", label: "Cũ nhất" },
              { value: "price_asc", label: "Giá tăng dần" }, { value: "price_desc", label: "Giá giảm dần" },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
          <LoaderCircle size={16} className="animate-spin" /> Đang tải…
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filtered.map(p => (
              <PropertyModerationRow key={p._id} property={p} onApprove={handleApprove(p._id)} onReject={handleReject(p._id)} isLoading={processedId === p._id} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>← Trước</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 38, height: 38, borderRadius: "8px", border: "none", background: p === page ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", color: p === page ? "#fff" : "var(--e-charcoal)", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.8rem", fontWeight: 700 }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>Sau →</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "5rem 2rem", background: "rgba(255,255,255,0.85)", borderRadius: "14px", border: "1px solid rgba(154,124,69,0.15)", backdropFilter: "blur(8px)" }}>

          <p style={{ fontSize: "1rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
            {search || typeFilter !== "all" ? "Không tìm thấy kết quả phù hợp" : "Không có bất động sản chờ duyệt"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROVIDER MODERATION ROW
═══════════════════════════════════════════════════════════ */
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
    try {
      const res = await adminService.getPendingProviders(page, 20);
      setProviders(res.data.providers);
      setTotalPages(res.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    let list = [...providers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
    }
    if (kycFilter !== "all") list = list.filter(p => (p.kycStatus || "pending") === kycFilter);
    if (sortBy === "name_asc") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "name_desc") list.sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }, [providers, search, kycFilter, sortBy]);

  const handleApprove = (id: string) => async () => {
    setProcessedId(id);
    try { await adminService.verifyProvider(id, { isVerified: true }); setProviders(p => p.filter(x => x._id !== id)); alert("Xác minh thành công"); }
    catch (e: any) { alert(e.message || "Lỗi"); }
    finally { setProcessedId(null); }
  };

  const handleReject = (id: string) => async (reason: string) => {
    setProcessedId(id);
    try { await adminService.verifyProvider(id, { isVerified: false, kycRejectionReason: reason }); setProviders(p => p.filter(x => x._id !== id)); alert("Đã từ chối"); }
    catch (e: any) { alert(e.message || "Lỗi"); }
    finally { setProcessedId(null); }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Quản Lý Đối Tác</p>
          <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1 }}>
            Xác Minh <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Nhà Cung Cấp</em>
          </h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold)", border: "1px solid rgba(154,124,69,0.3)", padding: "5px 12px", background: "rgba(154,124,69,0.06)", borderRadius: "6px", fontFamily: "var(--e-sans)", display: "flex", alignItems: "center" }}>
            {filtered.length} đang chờ
          </span>
          <button onClick={() => setShowFilters(v => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: showFilters ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: showFilters ? "#fff" : "var(--e-charcoal)", transition: "all 0.2s" }}>
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
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tên hoặc email..."
                style={{ width: "100%", padding: "9px 12px 9px 30px", border: "1px solid rgba(154,124,69,0.25)", borderRadius: "8px", background: "rgba(255,255,255,0.92)", fontFamily: "var(--e-sans)", fontSize: "0.84rem", color: "var(--e-charcoal)", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "var(--e-gold)"}
                onBlur={e => e.target.style.borderColor = "rgba(154,124,69,0.25)"} />
            </div>
          </div>
          <AnimatedSelect label="Trạng Thái KYC" value={kycFilter} onChange={setKycFilter} icon={ShieldCheck}
            options={[{ value: "all", label: "Tất cả" }, { value: "pending", label: "Chờ xử lý" }, { value: "submitted", label: "Đã nộp" }, { value: "reviewing", label: "Đang xem xét" }, { value: "rejected", label: "Từ chối" }]} />
          <AnimatedSelect label="Sắp Xếp" value={sortBy} onChange={setSortBy} icon={SlidersHorizontal}
            options={[{ value: "newest", label: "Mới nhất" }, { value: "oldest", label: "Cũ nhất" }, { value: "name_asc", label: "Tên A→Z" }, { value: "name_desc", label: "Tên Z→A" }]} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
          <LoaderCircle size={16} className="animate-spin" /> Đang tải…
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {filtered.map(p => (
              <ProviderModerationRow key={p._id} provider={p} onApprove={handleApprove(p._id)} onReject={handleReject(p._id)} isLoading={processedId === p._id} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>← Trước</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                style={{ width: 38, height: 38, borderRadius: "8px", border: "none", background: p === page ? "var(--e-charcoal)" : "rgba(255,255,255,0.85)", color: p === page ? "#fff" : "var(--e-charcoal)", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.8rem", fontWeight: 700 }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid rgba(154,124,69,0.2)", background: "rgba(255,255,255,0.85)", color: "var(--e-charcoal)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, fontFamily: "var(--e-sans)", fontSize: "0.74rem", fontWeight: 600 }}>Sau →</button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "5rem 2rem", background: "rgba(255,255,255,0.85)", borderRadius: "14px", border: "1px solid rgba(154,124,69,0.15)", backdropFilter: "blur(8px)" }}>
          <CheckCircle size={36} style={{ color: "#2E8B75", marginBottom: "1rem" }} />
          <p style={{ fontSize: "1rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
            {search || kycFilter !== "all" ? "Không tìm thấy kết quả phù hợp" : "Không có nhà cung cấp chờ xác minh"}
          </p>
        </div>
      )}
    </div>
  );
}
function ProviderModerationRow({ provider, onApprove, onReject, isLoading }: {
  provider: User; onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>; isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const handleReject = async () => {
    if (!reason.trim()) { alert("Vui lòng nhập lý do từ chối."); return; }
    await onReject(reason);
  };

  const AVATAR_GRADIENTS = [
    "linear-gradient(135deg, var(--e-gold), var(--e-gold-light))",
    "linear-gradient(135deg, #7b9e6e, #a8c896)",
    "linear-gradient(135deg, #7e6a9e, #a89cc8)",
  ];
  const avatarGrad = AVATAR_GRADIENTS[(provider.name?.charCodeAt(0) ?? 0) % 3];

  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(154,124,69,0.15)", borderRadius: "18px",
      overflow: "hidden", position: "relative",
      transition: "box-shadow 0.35s cubic-bezier(0.16,1,0.3,1), border-color 0.3s",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 20px 56px rgba(154,124,69,0.11)"; e.currentTarget.style.borderColor = "rgba(201,169,110,0.35)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(154,124,69,0.15)"; }}>

      {/* Gold top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--e-gold), transparent 70%)" }} />

      {/* ── Main Grid: avatar col | body | actions ── */}
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", minHeight: 130, alignItems: "stretch" }}>

        {/* Avatar column */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(160deg, rgba(201,169,110,0.07) 0%, rgba(201,169,110,0.02) 100%)",
          borderRight: "1px solid rgba(154,124,69,0.08)", padding: "1.2rem 0.8rem",
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: "14px", background: avatarGrad,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--e-serif)", fontSize: "1.3rem", fontWeight: 600, color: "#fff",
            boxShadow: "0 4px 14px rgba(201,169,110,0.3)", flexShrink: 0,
          }}>
            {provider.name?.charAt(0)?.toUpperCase()}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "1.3rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.6rem" }}>
          <div>
            {/* Name + status */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>
                {provider.name}
              </span>
              <KycStatusBadge status={provider.kycStatus || "pending"} />
            </div>
            <p style={{ fontSize: "0.73rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{provider.email}</p>
          </div>

          {/* Meta chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", flexWrap: "wrap" }}>
            {provider.phone && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
                <Phone size={12} color="var(--e-gold)" /> {provider.phone}
              </span>
            )}
            {provider.address && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
                <MapPin size={12} color="var(--e-gold)" /> {provider.address}
              </span>
            )}
            {(provider.kycDocuments?.length ?? 0) > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: "#1a6fa8", fontFamily: "var(--e-sans)" }}>
                <FileText size={12} /> {provider.kycDocuments!.length} tài liệu CCCD
              </span>
            )}
          </div>
        </div>

        {/* Actions — identical to PropertyModerationRow */}
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          gap: "0.42rem", padding: "1.1rem 1.1rem 1.1rem 0.9rem",
          borderLeft: "1px solid rgba(154,124,69,0.1)",
          background: "rgba(248,245,240,0.45)", minWidth: 108,
        }}>
          {[
            { label: "Xác minh", icon: <ShieldCheck size={13} />, cls: "approve", onClick: onApprove },
            { label: "Từ chối", icon: <XCircle size={13} />, cls: "reject", onClick: () => setRejecting(v => !v) },
            { label: "Tài liệu", icon: <ChevronDown size={12} />, cls: "detail", onClick: () => setExpanded(v => !v) },
          ].map(btn => (
            <button key={btn.label} onClick={btn.onClick} disabled={isLoading && btn.cls === "approve"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 14px", fontSize: "0.61rem", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                borderRadius: "9px", cursor: "pointer", transition: "all 0.22s",
                whiteSpace: "nowrap", border: "1px solid", fontFamily: "var(--e-sans)",
                ...(btn.cls === "approve" ? { color: "#fff", background: "#2E8B75", borderColor: "#2E8B75", boxShadow: "0 3px 12px rgba(46,139,117,0.25)" }
                  : btn.cls === "reject" ? { color: "#b84a2a", background: "rgba(184,74,42,0.04)", borderColor: "rgba(184,74,42,0.25)" }
                    : { color: "var(--e-charcoal)", background: "rgba(255,255,255,0.8)", borderColor: "rgba(154,124,69,0.2)" }),
              }}>
              {isLoading && btn.cls === "approve" ? <LoaderCircle size={12} className="animate-spin" /> : btn.icon}
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reject slide panel */}
      <div style={{ maxHeight: rejecting ? 130 : 0, overflow: "hidden", transition: "max-height 0.35s ease" }}>
        <div style={{ borderTop: "1px solid rgba(184,74,42,0.15)", background: "rgba(184,74,42,0.025)", padding: "1rem 1.6rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Nhập lý do từ chối provider này..."
              style={{ flex: 1, padding: "10px 12px", border: "1px solid rgba(184,74,42,0.28)", borderRadius: "9px", background: "#fff", fontFamily: "var(--e-sans)", fontSize: "0.83rem", color: "var(--e-charcoal)", outline: "none", resize: "none", minHeight: 58 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.38rem" }}>
              <button onClick={handleReject} style={{ padding: "9px 18px", background: "#b84a2a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.64rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Xác Nhận</button>
              <button onClick={() => { setRejecting(false); setReason(""); }} style={{ padding: "9px 18px", background: "transparent", color: "var(--e-muted)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.64rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Hủy</button>
            </div>
          </div>
        </div>
      </div>

      {/* Docs slide panel */}
      <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ borderTop: "1px solid rgba(154,124,69,0.1)", background: "rgba(248,245,240,0.5)", padding: "1.3rem 1.6rem" }}>
          <p style={{ fontSize: "0.53rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 10, fontFamily: "var(--e-sans)" }}>Tài Liệu CCCD</p>
          {provider.kycDocuments?.length ? (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {provider.kycDocuments.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  style={{ display: "block", width: 160, height: 108, borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(154,124,69,0.2)" }}>
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.35s" }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.06)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                </a>
              ))}
            </div>
          ) : <p style={{ fontSize: "0.82rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Chưa có tài liệu KYC.</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   KYC VIEW
═══════════════════════════════════════════════════════════ */
function KycView() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>("submitted");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("provider");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const selectedUser = useMemo(() => users.find(u => u._id === selectedUserId) || null, [selectedUserId, users]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      const res = await userService.getUsersForKycReview(token, { role: roleFilter, kycStatus: statusFilter, sort: sortOrder, limit: 100 });
      setUsers(res.data.users);
      if (res.data.users.length === 0) setSelectedUserId(null);
      else if (!res.data.users.some(u => u._id === selectedUserId)) setSelectedUserId(res.data.users[0]._id);
    } catch (err) { setErrorMessage(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [roleFilter, selectedUserId, sortOrder, statusFilter, token]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => { setRejectionReason(selectedUser?.kycRejectionReason || ""); }, [selectedUser]);

  const handleApprove = async () => {
    if (!token || !selectedUser) return;
    setActionLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      await userService.updateUserKycStatus(token, selectedUser._id, { isVerified: true, kycStatus: "verified" });
      setSuccessMessage("Đã duyệt KYC thành công."); await loadUsers();
    } catch (err) { setErrorMessage(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!token || !selectedUser) return;
    if (!rejectionReason.trim()) { setErrorMessage("Vui lòng nhập lý do từ chối."); return; }
    setActionLoading(true); setErrorMessage(null); setSuccessMessage(null);
    try {
      await userService.updateUserKycStatus(token, selectedUser._id, { isVerified: false, kycStatus: "rejected", kycRejectionReason: rejectionReason.trim() });
      setSuccessMessage("Đã từ chối KYC."); await loadUsers();
    } catch (err) { setErrorMessage(getErrorMessage(err)); }
    finally { setActionLoading(false); }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <div style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(154,124,69,0.15)", display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Quản Trị Người Dùng</p>
          <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2rem, 3vw, 2.8rem)", fontWeight: 500, color: "var(--e-charcoal)", margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Quản Lý <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Hồ Sơ KYC</em>
          </h2>
        </div>
        <button onClick={() => void loadUsers()}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(154,124,69,0.2)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--e-charcoal)", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--e-charcoal)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.85)"; e.currentTarget.style.color = "var(--e-charcoal)"; }}
        >
          <RefreshCcw size={13} /> Làm Mới
        </button>
      </div>

      {/* Filters */}
      <div className="e-glass-card" style={{ padding: "1.4rem", marginBottom: "1.5rem", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", overflow: "visible" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <AnimatedSelect label="Trạng Thái" value={statusFilter} onChange={v => setStatusFilter(v as KycStatusFilter)} icon={ShieldCheck}
            options={[
              { value: "all", label: "Tất cả" }, { value: "submitted", label: "Đã nộp" },
              { value: "reviewing", label: "Đang xem xét" }, { value: "rejected", label: "Từ chối" },
              { value: "verified", label: "Đã xác minh" }, { value: "pending", label: "Chờ" },
            ]}
          />
          <AnimatedSelect label="Vai Trò" value={roleFilter} onChange={v => setRoleFilter(v as RoleFilter)} icon={Users}
            options={[{ value: "provider", label: "Provider" }, { value: "user", label: "Người dùng" }]}
          />
          <AnimatedSelect label="Sắp Xếp" value={sortOrder} onChange={v => setSortOrder(v as SortOrder)} icon={SlidersHorizontal}
            options={[{ value: "newest", label: "Mới nhất" }, { value: "oldest", label: "Cũ nhất" }]}
          />
        </div>
      </div>

      {errorMessage && <div style={{ marginBottom: "1rem", border: "1px solid rgba(184,74,42,0.3)", background: "rgba(184,74,42,0.06)", padding: "0.8rem 1rem", fontSize: "0.82rem", color: "#b84a2a", borderRadius: "8px", fontFamily: "var(--e-sans)" }}>{errorMessage}</div>}
      {successMessage && <div style={{ marginBottom: "1rem", border: "1px solid rgba(45,122,79,0.3)", background: "rgba(45,122,79,0.06)", padding: "0.8rem 1rem", fontSize: "0.82rem", color: "#2d7a4f", borderRadius: "8px", fontFamily: "var(--e-sans)" }}>{successMessage}</div>}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh", gap: "0.6rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
          <LoaderCircle size={16} className="animate-spin" /> Đang tải…
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem", alignItems: "start" }}>
          {/* List */}
          <div className="e-glass-card" style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", overflow: "hidden" }}>
            <div style={{ padding: "1.2rem 1.6rem", borderBottom: "1px solid rgba(154,124,69,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserRoundSearch size={16} color="var(--e-gold)" />
                <h3 style={{ fontFamily: "var(--e-sans)", fontSize: "0.95rem", fontWeight: 700, color: "var(--e-charcoal)", margin: 0 }}>Hàng Chờ KYC</h3>
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{users.length} hồ sơ</span>
            </div>
            {users.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(154,124,69,0.1)" }}>
                      {["Người dùng", "Vai trò", "KYC", "Xác minh", "Ngày tạo"].map(h => (
                        <th key={h} style={{ padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, fontFamily: "var(--e-sans)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} onClick={() => setSelectedUserId(u._id)}
                        style={{ borderBottom: "1px solid rgba(154,124,69,0.06)", cursor: "pointer", background: u._id === selectedUserId ? "rgba(154,124,69,0.06)" : "transparent", transition: "background 0.15s" }}
                        onMouseEnter={e => { if (u._id !== selectedUserId) e.currentTarget.style.background = "rgba(154,124,69,0.03)"; }}
                        onMouseLeave={e => { if (u._id !== selectedUserId) e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "0.9rem 1rem" }}>
                          <p style={{ fontWeight: 700, color: "var(--e-charcoal)", margin: 0, fontFamily: "var(--e-sans)", fontSize: "0.84rem" }}>{u.name}</p>
                          <p style={{ fontSize: "0.7rem", color: "var(--e-light-muted)", margin: 0, fontFamily: "var(--e-sans)" }}>{u.email}</p>
                        </td>
                        <td style={{ padding: "0.9rem 1rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)", fontSize: "0.78rem" }}>{u.role}</td>
                        <td style={{ padding: "0.9rem 1rem" }}><KycStatusBadge status={u.kycStatus} /></td>
                        <td style={{ padding: "0.9rem 1rem" }}>
                          {u.isVerified
                            ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#2E8B75", fontSize: "0.78rem", fontFamily: "var(--e-sans)", fontWeight: 600 }}><CheckCircle2 size={12} /> Có</span>
                            : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--e-light-muted)", fontSize: "0.78rem", fontFamily: "var(--e-sans)" }}><ShieldAlert size={12} /> Không</span>
                          }
                        </td>
                        <td style={{ padding: "0.9rem 1rem", fontSize: "0.7rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.9rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Không tìm thấy hồ sơ nào.</p>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedUser ? (
            <>
              {/* Header với name + status */}
              <div style={{
                padding: "1.3rem 1.6rem", borderBottom: "1px solid rgba(154,124,69,0.1)",
                background: "linear-gradient(135deg, rgba(201,169,110,0.04), rgba(255,255,255,0))",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem",
              }}>
                <div>
                  <div style={{ fontFamily: "var(--e-serif)", fontSize: "1.2rem", fontWeight: 500, color: "var(--e-charcoal)", marginBottom: 3 }}>{selectedUser.name}</div>
                  <div style={{ fontSize: "0.76rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>{selectedUser.email} · {selectedUser.role}</div>
                </div>
                <KycStatusBadge status={selectedUser.kycStatus} />
              </div>

              <div style={{ padding: "1.4rem 1.6rem", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                {/* Info grid */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem",
                  padding: "1rem 1.1rem", background: "rgba(154,124,69,0.03)",
                  border: "1px solid rgba(154,124,69,0.09)", borderRadius: "12px",
                }}>
                  {[
                    { label: "Địa chỉ", value: selectedUser.address || "N/A" },
                    { label: "Điện thoại", value: selectedUser.phone || "Chưa có" },
                    { label: "Vai trò", value: selectedUser.role },
                    { label: "Xác minh", value: selectedUser.isVerified ? "Đã xác minh" : "Chưa xác minh", color: selectedUser.isVerified ? "#2E8B75" : undefined },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 3, fontFamily: "var(--e-sans)" }}>{item.label}</div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: item.color ?? "var(--e-charcoal)", fontFamily: "var(--e-sans)" }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* KYC docs */}
                {selectedUser.kycDocuments?.length ? (
                  <div>
                    <p style={{ fontSize: "0.53rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Tài Liệu CCCD</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      {selectedUser.kycDocuments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer"
                          style={{ display: "block", overflow: "hidden", borderRadius: "9px", border: "1px solid rgba(154,124,69,0.15)" }}>
                          <img src={url} alt={`KYC ${i + 1}`} style={{ width: "100%", height: 90, objectFit: "cover", display: "block", transition: "transform 0.3s" }}
                            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : <p style={{ fontSize: "0.8rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Chưa có tài liệu.</p>}

                {/* OCR */}
                <div>
                  <p style={{ fontSize: "0.53rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--e-gold)", fontWeight: 700, marginBottom: 8, fontFamily: "var(--e-sans)" }}>Dữ Liệu OCR</p>
                  <pre style={{ maxHeight: 96, overflowY: "auto", background: "var(--e-charcoal)", color: "#a8b8c8", padding: "0.9rem 1rem", borderRadius: "10px", fontSize: "0.68rem", margin: 0, lineHeight: 1.65 }}>
                    {prettyJson(selectedUser.kycExtractedData)}
                  </pre>
                </div>

                {/* Rejection reason display */}
                {selectedUser.kycRejectionReason && (
                  <div style={{ padding: "0.8rem 1rem", borderRadius: "9px", border: "1px solid rgba(184,74,42,0.28)", background: "rgba(184,74,42,0.05)" }}>
                    <p style={{ fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b84a2a", fontWeight: 700, marginBottom: 4, fontFamily: "var(--e-sans)" }}>Lý Do Từ Chối Trước</p>
                    <p style={{ fontSize: "0.78rem", color: "#b84a2a", lineHeight: 1.6, fontFamily: "var(--e-sans)" }}>{selectedUser.kycRejectionReason}</p>
                  </div>
                )}

                {/* Reason textarea */}
                <div>
                  <label style={{ display: "block", fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-muted)", fontWeight: 700, marginBottom: 6, fontFamily: "var(--e-sans)" }}>
                    Lý do từ chối (bắt buộc nếu từ chối)
                  </label>
                  <textarea rows={3} value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Nhập lý do nếu cần từ chối hồ sơ KYC này..."
                    style={{
                      width: "100%", padding: "10px 12px",
                      border: "1px solid rgba(154,124,69,0.25)", borderRadius: "9px",
                      background: "rgba(255,252,248,0.9)", fontFamily: "var(--e-sans)", fontSize: "0.83rem",
                      color: "var(--e-charcoal)", outline: "none", resize: "none", minHeight: 68,
                      transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "var(--e-gold)"}
                    onBlur={e => e.target.style.borderColor = "rgba(154,124,69,0.25)"} />
                </div>

                {/* Action buttons */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button onClick={() => void handleApprove()} disabled={actionLoading}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, background: "#2E8B75", color: "#fff", border: "none", borderRadius: "9px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: actionLoading ? 0.7 : 1, boxShadow: "0 3px 12px rgba(46,139,117,0.25)", transition: "background 0.2s" }}
                    onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.background = "#1e6b57"; }}
                    onMouseLeave={e => { if (!actionLoading) e.currentTarget.style.background = "#2E8B75"; }}>
                    {actionLoading ? <LoaderCircle size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Duyệt KYC
                  </button>
                  <button onClick={() => void handleReject()} disabled={actionLoading}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 11, background: "rgba(184,74,42,0.06)", color: "#b84a2a", border: "1px solid rgba(184,74,42,0.3)", borderRadius: "9px", cursor: "pointer", fontFamily: "var(--e-sans)", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: actionLoading ? 0.7 : 1, transition: "all 0.2s" }}
                    onMouseEnter={e => { if (!actionLoading) { e.currentTarget.style.background = "#b84a2a"; e.currentTarget.style.color = "#fff"; } }}
                    onMouseLeave={e => { if (!actionLoading) { e.currentTarget.style.background = "rgba(184,74,42,0.06)"; e.currentTarget.style.color = "#b84a2a"; } }}>
                    {actionLoading ? <LoaderCircle size={13} className="animate-spin" /> : <XCircle size={13} />} Từ Chối
                  </button>
                </div>

                {/* Feedback banners */}
                {errorMessage && <div style={{ padding: "0.7rem 1rem", borderRadius: "8px", fontSize: "0.78rem", color: "#b84a2a", background: "rgba(184,74,42,0.06)", border: "1px solid rgba(184,74,42,0.25)", fontFamily: "var(--e-sans)" }}>{errorMessage}</div>}
                {successMessage && <div style={{ padding: "0.7rem 1rem", borderRadius: "8px", fontSize: "0.78rem", color: "#2E8B75", background: "rgba(46,139,117,0.07)", border: "1px solid rgba(46,139,117,0.25)", fontFamily: "var(--e-sans)" }}>{successMessage}</div>}
              </div>
            </>
          ) : (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <p style={{ fontSize: "0.88rem", color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>Chọn người dùng để xem chi tiết KYC.</p>
            </div>
          )}
        </div>

      )
      }
    </div >
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
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (!isAuthLoading) void init();
  }, [router, user, isAuthLoading]);

  // Handle scroll for fake LuxuryNavbar sync if needed (Navbar expects page scroll)
  // We're letting the window scroll naturally.

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

        {/* ── Luxury Vertical Sidebar ── */}
        <aside className="w-64 flex flex-col h-screen fixed top-0 left-0 z-50 shadow-2xl overflow-hidden"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85')", backgroundSize: "cover", backgroundPosition: "center" }}>

          <div className="absolute inset-0 bg-gradient-to-b from-[#111c14]/95 to-[#111c14]/90 backdrop-blur-md pointer-events-none z-0" />

          <div className="relative z-10 flex flex-col h-full border-r border-[#D4AF37]/10">
            {/* Header/Brand */}
            <div className="p-8 pb-6 border-b border-[#D4AF37]/10">
              <Link href="/" className="flex items-center gap-2 no-underline group block">
                <span className="text-3xl font-extrabold text-white tracking-tighter" style={{ fontFamily: "var(--e-serif)" }}>
                  Esto<span className="text-[var(--e-gold-light)] group-hover:text-white transition-colors duration-500">ria</span>
                </span>
              </Link>
              <div className="text-[0.55rem] uppercase tracking-[0.25em] text-[var(--e-gold-light)] font-bold mt-2 ml-0.5" style={{ fontFamily: "var(--e-sans)" }}>
                Hệ Thống Quản Trị
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
              {NAV_ITEMS.map(item => {
                const isActive = view === item.view;
                const badge = item.view === "properties" ? stats?.pendingPropertiesCount : item.view === "providers" ? stats?.totalPendingProviders : undefined;
                return (
                  <button key={item.view} onClick={() => handleSetView(item.view)}
                    className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive ? "bg-[#D4AF37]/10 border border-[#D4AF37]/20 shadow-lg text-white" : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"}`}
                    style={{ fontFamily: "var(--e-sans)" }}>

                    {/* Active vertical bar */}
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--e-gold-light)] shadow-[0_0_10px_var(--e-gold)]" />}

                    <span className={`transition-transform duration-300 z-10 ${isActive ? "text-[var(--e-gold-light)] scale-110" : "group-hover:scale-110"}`}>{item.icon}</span>
                    <span className={`text-[0.8rem] font-semibold tracking-wide flex-1 text-left z-10 ${isActive ? "opacity-100" : "opacity-90"}`}>{item.label}</span>

                    {badge != null && badge > 0 && (
                      <span className="z-10" style={{ fontSize: "0.6rem", fontWeight: 700, background: "var(--e-gold)", color: "#fff", padding: "2px 7px", borderRadius: "6px", minWidth: 24, textAlign: "center", boxShadow: '0 0 10px rgba(212,175,55,0.4)' }}>{badge}</span>
                    )}
                  </button>
                );
              })}

              <div className="h-px bg-[#D4AF37]/10 my-8 mx-2" />
              <a href="/" className="flex items-center gap-4 px-5 py-3.5 text-white/40 hover:text-[var(--e-gold-light)] hover:bg-[#D4AF37]/5 rounded-xl transition-all duration-300 border border-transparent" style={{ fontFamily: "var(--e-sans)" }}>
                <span className="opacity-90">←</span>
                <span className="text-[0.8rem] font-medium tracking-wide">Về Trang Chủ</span>
              </a>
            </nav>

            {/* User Footer */}
            <div className="p-5 border-t border-[#D4AF37]/10 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--e-gold)] to-[var(--e-gold-light)] flex items-center justify-center text-white text-[1.1rem] font-bold shadow-lg flex-shrink-0" style={{ fontFamily: "var(--e-serif)" }}>
                  {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.75rem] font-bold text-white truncate leading-tight mb-0.5" style={{ fontFamily: "var(--e-sans)" }}>{user?.name || "Administrator"}</p>
                  <p className="text-[0.63rem] text-[var(--e-gold-light)]/80 truncate mt-0 mb-0 tracking-wider" style={{ fontFamily: "var(--e-sans)" }}>{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 ml-64 min-h-screen relative overflow-y-auto">
          {/* Subtle background layer to prevent completely flat white */}
          <div style={{ position: "fixed", top: 0, left: "16rem", right: 0, bottom: 0, backgroundImage: "url('https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=1600&q=85')", backgroundSize: "cover", backgroundPosition: "center", filter: "blur(20px) opacity(0.06)", zIndex: 0, pointerEvents: 'none' }} />

          <div className="relative z-10 min-h-full flex flex-col p-8 lg:p-12">
            <div className="w-full max-w-7xl mx-auto flex-1">
              {/* Context Header Area could go here if needed, but the Views handle their own headers */}
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