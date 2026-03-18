import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import propertyService from "@/services/propertyService";
import { useAuth } from "@/contexts/AuthContext";
import type { Property } from "@/types/property";
import Link from "next/link";
import {
  Plus,
  DollarSign,
  Ruler,
  BedDouble,
  CheckCircle,
  Clock,
  XCircle,
  LoaderCircle,
} from "lucide-react";

type FilterType = "all" | "pending" | "approved" | "rejected";

const FILTERS: { value: FilterType; label: string }[] = [
  { value: "all", label: "Tất Cả" },
  { value: "pending", label: "Đang Chờ" },
  { value: "approved", label: "Đã Duyệt" },
  { value: "rejected", label: "Bị Từ Chối" },
];

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  approved: {
    label: "Đã duyệt",
    icon: <CheckCircle size={13} />,
    color: "#2d7a4f",
    bg: "rgba(45,122,79,0.08)",
    border: "rgba(45,122,79,0.3)",
  },
  pending: {
    label: "Đang chờ",
    icon: <Clock size={13} />,
    color: "var(--e-gold)",
    bg: "rgba(140,110,63,0.07)",
    border: "rgba(140,110,63,0.3)",
  },
  rejected: {
    label: "Bị từ chối",
    icon: <XCircle size={13} />,
    color: "#b84a2a",
    bg: "rgba(184,74,42,0.07)",
    border: "rgba(184,74,42,0.3)",
  },
};

export default function ProviderProperties() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    const load = async () => {
      try {
        if (!user || user.role !== "provider") {
          router.push("/");
          return;
        }
        const response = await propertyService.getAllProperties({ ownerId: user._id, limit: 100 });
        setProperties(response.data.properties);
      } catch (err) {
        console.error("Error loading properties:", err);
      } finally {
        setLoading(false);
      }
    };
    if (!isAuthLoading) void load();
  }, [router, user, isAuthLoading]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bất động sản này?")) return;
    try {
      await propertyService.deleteProperty(id);
      setProperties((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("Error deleting property:", err);
      alert("Lỗi khi xóa bất động sản");
    }
  };

  const filtered = properties.filter((p) => filter === "all" || p.status === filter);

  const counts = {
    all: properties.length,
    pending: properties.filter((p) => p.status === "pending").length,
    approved: properties.filter((p) => p.status === "approved").length,
    rejected: properties.filter((p) => p.status === "rejected").length,
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="estoria" style={{ background: "var(--e-cream)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
          <LoaderCircle size={16} className="animate-spin" />
          Đang tải danh sách…
        </div>
      </div>
    );
  }

  return (
    <div className="estoria" style={{ background: "var(--e-cream)", minHeight: "100vh" }}>

      {/* ── Page header ── */}
      <div style={{ background: "var(--e-charcoal)", padding: "4rem 5vw 0", borderBottom: "1px solid rgba(140,110,63,0.25)" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap", paddingBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "2rem" }}>
            <span style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(4rem, 7vw, 6rem)", fontWeight: 200, color: "rgba(255,255,255,0.12)", lineHeight: 1, letterSpacing: "-0.04em", userSelect: "none" }}>
              {String(properties.length).padStart(2, "0")}
            </span>
            <div>
              <div className="e-section-label" style={{ color: "var(--e-gold-light)" }}>
                Nhà Cung Cấp
              </div>
              <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 500, color: "var(--e-white)", lineHeight: 1.15, margin: 0 }}>
                Quản Lý <em style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.45)" }}>Bất Động Sản</em>
              </h1>
            </div>
          </div>

          <Link
            href="/provider/properties/create"
            className="e-btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <Plus size={15} />
            Tạo Mới
          </Link>
        </div>

        {/* Filter tabs as stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "rgba(255,255,255,0.08)" }}>
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              style={{
                background: filter === value ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                border: "none",
                borderBottom: filter === value ? "2px solid var(--e-gold)" : "2px solid transparent",
                padding: "1.2rem 1.5rem",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.2s, border-color 0.2s",
              }}
            >
              <p style={{ fontFamily: "var(--e-sans)", fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: "0.45rem" }}>
                {label}
              </p>
              <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.7rem", fontWeight: 500, color: filter === value ? "var(--e-gold-light)" : "var(--e-white)", lineHeight: 1 }}>
                {counts[value]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ padding: "3rem 5vw" }}>
        {filtered.length > 0 ? (
          <div style={{ display: "grid", gap: "2px", background: "var(--e-beige)" }}>
            {filtered.map((property) => {
              const meta = STATUS_META[property.status ?? "pending"] ?? STATUS_META.pending;
              return (
                <div
                  key={property._id}
                  style={{ background: "var(--e-white)", padding: "1.8rem 2rem", transition: "box-shadow 0.25s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 24px rgba(17,28,20,0.07)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem", flexWrap: "wrap" }}>

                    {/* Left */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase",
                        fontWeight: 700, color: meta.color, background: meta.bg,
                        border: `1px solid ${meta.border}`, padding: "3px 9px", marginBottom: "0.7rem",
                      }}>
                        {meta.icon}{meta.label}
                      </span>

                      <h3 style={{ fontFamily: "var(--e-serif)", fontSize: "1.2rem", fontWeight: 500, color: "var(--e-charcoal)", marginBottom: "0.3rem", lineHeight: 1.3 }}>
                        {property.title}
                      </h3>
                      <p style={{ fontSize: "0.78rem", color: "var(--e-muted)", marginBottom: "1rem" }}>
                        {property.address}
                      </p>

                      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                        {[
                          { icon: <DollarSign size={13} />, text: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(property.price) },
                          { icon: <Ruler size={13} />, text: `${property.area} m²` },
                          { icon: <BedDouble size={13} />, text: `${property.bedrooms ?? 0} phòng ngủ` },
                        ].map(({ icon, text }) => (
                          <span key={text} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem", color: "var(--e-muted)" }}>
                            <span style={{ color: "var(--e-gold)" }}>{icon}</span>
                            {text}
                          </span>
                        ))}
                      </div>

                      {property.rejectionReason && property.status === "rejected" && (
                        <div style={{ marginTop: "1rem", border: "1px solid rgba(184,74,42,0.3)", background: "rgba(184,74,42,0.05)", padding: "0.7rem 1rem" }}>
                          <p style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b84a2a", fontWeight: 700, marginBottom: 4 }}>Lý do từ chối</p>
                          <p style={{ fontSize: "0.78rem", color: "#b84a2a", lineHeight: 1.6 }}>{property.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      {([
                        { href: `/properties/${property._id}`, label: "Xem", accent: "var(--e-charcoal)", accentBorder: "var(--e-beige)" },
                        { href: `/provider/properties/${property._id}/edit`, label: "Sửa", accent: "var(--e-gold)", accentBorder: "var(--e-gold)" },
                      ] as const).map(({ href, label, accent, accentBorder }) => (
                        <Link
                          key={href}
                          href={href}
                          style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, padding: "8px 16px", border: `1px solid ${accentBorder}`, color: accent, background: "transparent", textDecoration: "none", fontFamily: "var(--e-sans)", transition: "background 0.2s, color 0.2s, border-color 0.2s", display: "inline-block" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = accent; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = accent; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = accent; e.currentTarget.style.borderColor = accentBorder; }}
                        >
                          {label}
                        </Link>
                      ))}
                      <button
                        onClick={() => handleDelete(property._id)}
                        style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, padding: "8px 16px", border: "1px solid rgba(184,74,42,0.35)", color: "#b84a2a", background: "transparent", cursor: "pointer", fontFamily: "var(--e-sans)", transition: "background 0.2s, color 0.2s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#b84a2a"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#b84a2a"; }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "var(--e-white)", border: "1px solid var(--e-beige)" }}>
            <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.3rem", fontWeight: 400, fontStyle: "italic", color: "var(--e-muted)", marginBottom: "1.5rem" }}>
              Không có bất động sản{filter !== "all" ? ` ở trạng thái "${FILTERS.find((f) => f.value === filter)?.label}"` : " nào"}
            </p>
            <Link
              href="/provider/properties/create"
              className="e-btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
            >
              <Plus size={15} />
              Tạo Bất Động Sản Đầu Tiên
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}