import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  Bath,
  BedDouble,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Send,
} from "lucide-react";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
import LuxuryListingCard from "@/components/LuxuryListingCard";
import { ApiError } from "@/services/apiClient";
import { propertyService } from "@/services/propertyService";
import type { Property, PropertyOwner } from "@/types/property";

const AddressMap = dynamic(() => import("@/components/AddressMap"), { ssr: false });

interface PropertyDetailPageProps {
  property: Property | null;
  errorMessage: string | null;
  recommendations: Property[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}
function formatNumber(value?: number) {
  if (value === undefined || value === null) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}
function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("vi-VN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}
function isImageUrl(url: string) {
  return /\/image\/upload\//.test(url) || /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url);
}
function isPopulatedOwner(owner: PropertyOwner): owner is Exclude<PropertyOwner, string> {
  return typeof owner !== "string";
}
function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) return "Bất động sản không tồn tại hoặc đang bị ẩn.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Hiện chưa thể tải chi tiết bất động sản.";
}

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  white: "#ffffff",
  offWhite: "#f9f9f8",
  surface: "#f4f3f0",
  border: "#e8e6e1",
  borderLight: "#f0eeea",
  gold: "#9a7c45",
  charcoal: "#1a1814",
  dark: "#2d2a24",
  muted: "#7a7568",
  light: "#b0aa9e",
};

// ─── CSS keyframes (injected once) ─────────────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes _fadeUp {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes _fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes _slideRight {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0);     }
  }
  @keyframes _scaleIn {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1);    }
  }
  @keyframes _lineGrow {
    from { width: 0; }
    to   { width: 2.5rem; }
  }

  /* Hero entrance — staggered */
  ._hero-chip   { animation: _fadeIn   0.5s ease both; }
  ._hero-title  { animation: _fadeUp   0.65s ease both 0.1s; }
  ._hero-price  { animation: _fadeUp   0.65s ease both 0.22s; }
  ._hero-addr   { animation: _fadeUp   0.65s ease both 0.32s; }
  ._hero-card   { animation: _scaleIn  0.55s ease both 0.18s; }

  /* Stats bar cells */
  ._stat-cell   { animation: _fadeUp 0.45s ease both; }

  /* Scroll-reveal */
  ._reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity 0.55s ease, transform 0.55s ease;
  }
  ._reveal.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Thumbnail hover */
  ._thumb:hover { opacity: 1 !important; transform: scale(1.04); }
  ._thumb { transition: transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease !important; }

  /* Button hover */
  ._btn-gold:hover   { background: #b8955a !important; }
  ._btn-outline:hover { background: ${C.offWhite} !important; border-color: ${C.dark} !important; }
  ._btn-dark-outline:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.35) !important; }

  /* Card hover */
  ._doc-card:hover   { border-color: ${C.gold} !important; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
  ._doc-card { transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease; }
  ._pill:hover { background: ${C.surface} !important; border-color: ${C.gold} !important; }
  ._pill { transition: background 0.18s ease, border-color 0.18s ease; }
  ._meta-cell:hover { background: #fdfcfb !important; }
  ._meta-cell { transition: background 0.18s ease; }

  /* Image crossfade */
  ._hero-img { transition: opacity 0.4s ease; }

  /* Gold underline decoration */
  ._section-heading::after {
    content: '';
    display: block;
    height: 1.5px;
    background: ${C.gold};
    margin-top: 6px;
    animation: _lineGrow 0.5s ease both 0.1s;
    opacity: 0.5;
  }

  /* Sidebar float-in */
  ._sidebar { animation: _fadeUp 0.6s ease both 0.3s; }

  /* Form input focus */
  ._form-input:focus  { border-color: ${C.gold} !important; outline: none; box-shadow: 0 0 0 2px rgba(154,124,69,0.12); }
  ._form-input { transition: border-color 0.2s ease, box-shadow 0.2s ease; }

  /* Success banner fade */
  ._success { animation: _fadeUp 0.35s ease both; }

  /* Back link hover */
  ._back-link:hover { color: rgba(255,255,255,0.9) !important; }
  ._back-link { transition: color 0.2s ease; }
`;

// ─── Scroll-reveal hook ────────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ─── RevealSection wrapper ──────────────────────────────────────────────────────
function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="_reveal" style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function PropertyDetailPage({ property, errorMessage, recommendations }: PropertyDetailPageProps) {
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imgVisible, setImgVisible] = useState(true);
  const [contactSent, setContactSent] = useState(false);

  const handlePostClick = () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("estate_manager_token") : null;
    if (!token) router.push("/auth/login?redirect=/provider/properties/create");
    else router.push("/provider/properties/create");
  };

  // Crossfade on image switch
  const switchImage = (idx: number) => {
    if (idx === activeImageIndex) return;
    setImgVisible(false);
    setTimeout(() => { setActiveImageIndex(idx); setImgVisible(true); }, 220);
  };

  // ── Error state ──────────────────────────────────────────────────────────────
  if (!property) {
    return (
      <>
        <Head><title>Chi tiết bất động sản — Estoria</title></Head>
        <style>{GLOBAL_CSS}</style>
        <div className="estoria" style={{ background: C.white, minHeight: "100vh" }}>
          <LuxuryNavbar variant="light" onPostClick={handlePostClick} />
          <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "3rem" }}>
            <div style={{ textAlign: "center", maxWidth: 420, animation: "_fadeUp 0.55s ease both" }}>
              <div style={{ fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, marginBottom: "0.5rem" }}>Không khả dụng</div>
              <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "1.8rem", fontWeight: 500, color: C.charcoal, margin: "0 0 1rem" }}>Bất động sản không tồn tại</h1>
              <p style={{ fontSize: "0.86rem", color: C.muted, lineHeight: 1.8, marginBottom: "1.5rem" }}>{errorMessage || "Bất động sản bạn tìm không tồn tại."}</p>
              <Link href="/" className="_btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", background: C.gold, color: "#fff", textDecoration: "none", fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                <ChevronLeft size={14} />Quay lại danh sách
              </Link>
            </div>
          </main>
          <LuxuryFooter />
        </div>
      </>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const images = property.images?.length ? property.images : [];
  const activeImage = images[activeImageIndex];
  const owner = isPopulatedOwner(property.ownerId) ? property.ownerId : null;
  const ownerPhone = owner?.phone?.trim() || "";
  const ownerEmail = owner?.email?.trim() || "";
  const phoneHref = ownerPhone ? `tel:${ownerPhone.replace(/[^\d+]/g, "")}` : "";
  const providerContactHref = ownerEmail ? `mailto:${ownerEmail}?subject=${encodeURIComponent(`Inquiry about ${property.title}`)}` : "#contact-provider";
  const pricePerSqm = property.area && property.area > 0 ? Math.round(property.price / property.area) : null;
  const coords = property.location?.coordinates ?? [];
  const mapLat = coords[1];
  const mapLng = coords[0];
  const hasMapCoords = Number.isFinite(mapLat) && Number.isFinite(mapLng) && !(mapLat === 0 && mapLng === 0);
  const statusLabelMap: Record<string, string> = { approved: "Đã duyệt", pending: "Chờ duyệt", rejected: "Bị từ chối", available: "Đang bán", rented: "Đã cho thuê", sold: "Đã bán" };
  const statusLabel = statusLabelMap[property.status] ?? "—";

  const handleContactSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setContactSent(true); };

  // ── Shared styles ────────────────────────────────────────────────────────────
  const eyebrow: React.CSSProperties = { fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.gold, marginBottom: "0.4rem" };
  const prose: React.CSSProperties = { fontSize: "0.86rem", color: C.muted, lineHeight: 1.9, fontWeight: 300, whiteSpace: "pre-line", margin: 0 };
  const btnGold: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 16px", background: C.gold, color: "#fff", border: "none", cursor: "pointer", fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none", width: "100%" };
  const btnOutline: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", background: "transparent", color: C.dark, border: `1px solid ${C.border}`, cursor: "pointer", fontSize: "0.67rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", textDecoration: "none", width: "100%" };
  const sectionDivider: React.CSSProperties = { padding: "2rem 0", borderBottom: `1px solid ${C.borderLight}` };

  return (
    <>
      <Head><title>{property.title} — Estoria</title></Head>
      <style>{GLOBAL_CSS}</style>

      <div className="estoria" style={{ background: C.white, minHeight: "100vh" }}>
        <LuxuryNavbar variant="light" onPostClick={handlePostClick} />

        {/* ══ HERO ══════════════════════════════════════════════════════════ */}
        <section style={{ position: "relative", width: "100%", height: "min(88vh, 720px)", overflow: "hidden", background: C.charcoal }}>
          {activeImage ? (
            <Image
              src={activeImage}
              alt={property.title}
              fill unoptimized priority
              className="_hero-img"
              style={{ objectFit: "cover", opacity: imgVisible ? 1 : 0 }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)" }}>
              <Building2 size={56} />
            </div>
          )}

          {/* Overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(20,18,14,0.92) 0%, rgba(20,18,14,0.4) 55%, rgba(20,18,14,0.15) 100%)", zIndex: 1 }} />

          {/* Back */}
          <Link href="/" className="_back-link _hero-chip" style={{ position: "absolute", top: "5rem", left: "2.5rem", zIndex: 10, display: "flex", alignItems: "center", gap: 6, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", textDecoration: "none" }}>
            <ChevronLeft size={13} />Danh sách
          </Link>

          {/* Bottom content */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "flex-end", padding: "0 2.5rem 2.5rem" }}>
            {/* Left */}
            <div>
              <div className="_hero-chip" style={{ marginBottom: "0.5rem" }}>
                {[property.type, statusLabel].map((t, i) => (
                  <span key={i} style={{ display: "inline-block", marginRight: 6, padding: "3px 10px", border: "1px solid rgba(255,255,255,0.2)", fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(4px)" }}>
                    {t}
                  </span>
                ))}
              </div>
              <h1 className="_hero-title" style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.9rem,3.5vw,3rem)", fontWeight: 500, color: "#fff", lineHeight: 1.15, margin: "0 0 0.5rem" }}>
                {property.title}
              </h1>
              <div className="_hero-price" style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(1.1rem,1.8vw,1.5rem)", color: "#c9a96e", marginBottom: "0.5rem" }}>
                {formatCurrency(property.price)}
              </div>
              <div className="_hero-addr" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", color: "rgba(255,255,255,0.45)" }}>
                <MapPin size={13} />{property.address}
              </div>
            </div>

            {/* Quick contact card */}

          </div>
        </section>

        {/* ══ THUMBNAIL STRIP ══════════════════════════════════════════════ */}
        {images.length > 1 && (
          <div style={{ display: "flex", gap: 3, padding: "0.7rem 2.5rem", background: C.charcoal, overflowX: "auto", scrollbarWidth: "none", borderBottom: `3px solid ${C.gold}` }}>
            {images.map((url, idx) => (
              <button
                key={`${url}-${idx}`}
                type="button"
                onClick={() => switchImage(idx)}
                className="_thumb"
                style={{ flexShrink: 0, width: 78, height: 52, overflow: "hidden", border: `2px solid ${idx === activeImageIndex ? C.gold : "transparent"}`, cursor: "pointer", padding: 0, background: "none", opacity: idx === activeImageIndex ? 1 : 0.5 }}
              >
                <img src={url} alt={`${property.title} ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {/* ══ STATS BAR ════════════════════════════════════════════════════ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", background: C.offWhite, borderBottom: `1px solid ${C.border}` }}>
          {[
            { label: "Phòng ngủ", value: formatNumber(property.bedrooms), icon: <BedDouble size={14} color={C.gold} /> },
            { label: "Phòng tắm", value: formatNumber(property.bathrooms), icon: <Bath size={14} color={C.gold} /> },
            { label: "Diện tích", value: `${formatNumber(property.area)} m²`, icon: <Ruler size={14} color={C.gold} /> },
            { label: "Năm xây dựng", value: String(property.yearBuilt || "N/A"), icon: <CalendarClock size={14} color={C.gold} /> },
            { label: "Nội thất", value: property.furnished ? "Có nội thất" : "Không nội thất", icon: null },
          ].map((stat, i) => (
            <div key={i} className="_stat-cell" style={{ padding: "1.1rem 1.6rem", borderRight: i < 4 ? `1px solid ${C.border}` : "none", display: "flex", flexDirection: "column", gap: 5, animationDelay: `${i * 80}ms` }}>
              <div style={{ fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: C.light }}>{stat.label}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--e-serif)", fontSize: "0.95rem", color: C.charcoal }}>
                {stat.icon}{stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* ══ BODY ════════════════════════════════════════════════════════ */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "3rem 2.5rem", display: "grid", gridTemplateColumns: "1fr 320px", gap: "3rem", alignItems: "start" }}>

          {/* ── Article ──────────────────────────────────────────────────── */}
          <article style={{ display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Description */}
            <Reveal style={sectionDivider}>
              <div style={eyebrow}>Về bất động sản này</div>
              <h2 className="_section-heading" style={{ fontFamily: "var(--e-serif)", fontSize: "1.25rem", fontWeight: 500, color: C.charcoal, margin: "0 0 1rem", lineHeight: 1.3 }}>Mô tả chi tiết</h2>
              <p style={prose}>{property.description || "Hiện chưa có mô tả cho bất động sản này."}</p>
            </Reveal>

            {/* Meta */}
            <Reveal delay={60} style={sectionDivider}>
              <div style={eyebrow}>Thông tin</div>
              <h2 className="_section-heading" style={{ fontFamily: "var(--e-serif)", fontSize: "1.25rem", fontWeight: 500, color: C.charcoal, margin: "0 0 1rem", lineHeight: 1.3 }}>Dữ liệu bất động sản</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 1, background: C.borderLight }}>
                {[
                  { label: "Giá / m²", value: pricePerSqm ? `${pricePerSqm.toLocaleString("vi-VN")} ₫` : "N/A" },
                  { label: "Ngày đăng", value: formatDate(property.createdAt) },
                  { label: "Cập nhật", value: formatDate(property.updatedAt) },
                  { label: "Mã tin", value: property._id },
                ].map((m, i) => (
                  <div key={i} className="_meta-cell" style={{ background: C.white, padding: "1rem 1.2rem" }}>
                    <div style={{ fontSize: "0.54rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.light, marginBottom: 5 }}>{m.label}</div>
                    <div style={{ fontFamily: "var(--e-serif)", fontSize: "0.95rem", color: C.charcoal }}>{m.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Amenities */}
            <Reveal delay={80} style={sectionDivider}>
              <div style={eyebrow}>Tiện ích</div>
              <h2 className="_section-heading" style={{ fontFamily: "var(--e-serif)", fontSize: "1.25rem", fontWeight: 500, color: C.charcoal, margin: "0 0 1rem", lineHeight: 1.3 }}>Tiện nghi & đặc điểm</h2>
              {property.amenities?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {property.amenities.map((a, i) => (
                    <span key={a} className="_pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 13px", background: C.offWhite, border: `1px solid ${C.border}`, fontSize: "0.72rem", color: C.dark, fontWeight: 500, animationDelay: `${i * 40}ms` }}>
                      <CheckCircle2 size={11} color={C.gold} />{a}
                    </span>
                  ))}
                </div>
              ) : <p style={prose}>Chưa có tiện ích được cập nhật.</p>}
            </Reveal>

            {/* Map */}
            <Reveal delay={60} style={sectionDivider}>
              <div style={eyebrow}>Vị trí</div>
              <h2 className="_section-heading" style={{ fontFamily: "var(--e-serif)", fontSize: "1.25rem", fontWeight: 500, color: C.charcoal, margin: "0 0 1rem", lineHeight: 1.3 }}>Bản đồ</h2>
              <p style={{ ...prose, marginBottom: "1rem" }}>{property.address}</p>
              {hasMapCoords ? (
                <div style={{ height: 280, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  <AddressMap lat={mapLat} lng={mapLng} interactive={false} />
                </div>
              ) : <p style={prose}>Chưa có tọa độ để hiển thị bản đồ.</p>}
            </Reveal>

            {/* Docs */}
            {property.ownershipDocuments?.length ? (
              <Reveal delay={60} style={sectionDivider}>
                <div style={eyebrow}>Pháp lý</div>
                <h2 className="_section-heading" style={{ fontFamily: "var(--e-serif)", fontSize: "1.25rem", fontWeight: 500, color: C.charcoal, margin: "0 0 1rem", lineHeight: 1.3 }}>Giấy tờ pháp lý</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {property.ownershipDocuments.map((docUrl, idx) => (
                    <a key={`${docUrl}-${idx}`} href={docUrl} target="_blank" rel="noreferrer" className="_doc-card" style={{ display: "block", textDecoration: "none", border: `1px solid ${C.border}`, background: C.white, overflow: "hidden" }}>
                      {isImageUrl(docUrl) ? (
                        <div style={{ position: "relative", height: 110, background: C.surface, overflow: "hidden" }}>
                          <Image src={docUrl} alt={`Giấy tờ ${idx + 1}`} fill style={{ objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", background: C.surface, fontSize: "0.72rem", color: C.muted }}>PDF</div>
                      )}
                      <div style={{ padding: "0.6rem 0.8rem" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: C.charcoal, marginBottom: 2 }}>Giấy tờ {idx + 1}</div>
                        <div style={{ fontSize: "0.64rem", color: C.muted }}>Nhấn để xem</div>
                      </div>
                    </a>
                  ))}
                </div>
              </Reveal>
            ) : null}
          </article>

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <aside id="contact-provider" className="_sidebar" style={{ position: "sticky", top: 100, display: "flex", flexDirection: "column", gap: "1.2rem" }}>

            {/* Price */}
            <div style={{ padding: "1.6rem", background: C.charcoal }}>
              <div style={{ ...eyebrow, color: "#c9a96e", marginBottom: "0.6rem" }}>Mức giá</div>
              <div style={{ fontFamily: "var(--e-serif)", fontSize: "1.7rem", color: "#fff", marginBottom: 4, lineHeight: 1.1 }}>
                {formatCurrency(property.price)}
              </div>
              {pricePerSqm && (
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginBottom: "1rem" }}>
                  ≈ {pricePerSqm.toLocaleString("vi-VN")} ₫ / m²
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <a href={providerContactHref} className="_btn-gold" style={btnGold}><Send size={13} />Gửi yêu cầu</a>
                <a href={phoneHref || "#"} className="_btn-dark-outline" style={{ ...btnOutline, color: "rgba(255,255,255,0.6)", borderColor: "rgba(255,255,255,0.15)", opacity: ownerPhone ? 1 : 0.4, pointerEvents: ownerPhone ? "auto" : "none" }}>
                  <Phone size={13} />Gọi ngay
                </a>
              </div>
            </div>

            {/* Owner */}
            <div style={{ padding: "1.4rem", background: C.white, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={eyebrow}>Người đăng</div>
              {owner ? (
                <>
                  <div style={{ fontFamily: "var(--e-serif)", fontSize: "1.05rem", color: C.charcoal }}>{owner.name}</div>
                  {ownerEmail && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", color: C.muted }}><Mail size={13} color={C.gold} />{ownerEmail}</div>}
                  {ownerPhone && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.76rem", color: C.muted }}><Phone size={13} color={C.gold} />{ownerPhone}</div>}
                  {!ownerEmail && !ownerPhone && <div style={{ fontSize: "0.75rem", color: C.light }}>Thông tin đang cập nhật</div>}
                </>
              ) : (
                <div style={{ fontSize: "0.78rem", color: C.muted }}>Thông tin đang được cập nhật.</div>
              )}
            </div>

            {/* Form */}
            <div style={{ padding: "1.4rem", background: C.offWhite, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={eyebrow}>Đặt lịch xem</div>
              <form onSubmit={handleContactSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {[
                  { label: "Họ và tên", type: "text", placeholder: "Nhập tên của bạn" },
                  { label: "Email", type: "email", placeholder: "email@domain.com" },
                ].map((f) => (
                  <label key={f.label} style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.light }}>
                    {f.label}
                    <input type={f.type} required placeholder={f.placeholder} className="_form-input" style={{ padding: "9px 11px", border: `1px solid ${C.border}`, background: C.white, fontSize: "0.82rem", color: C.charcoal, fontFamily: "inherit" }} />
                  </label>
                ))}
                <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.light }}>
                  Nội dung
                  <textarea required rows={3} placeholder="Tôi muốn đặt lịch xem nhà..." className="_form-input" style={{ padding: "9px 11px", border: `1px solid ${C.border}`, background: C.white, fontSize: "0.82rem", color: C.charcoal, fontFamily: "inherit", resize: "vertical", minHeight: 90 }} />
                </label>
                <button type="submit" className="_btn-gold" style={btnGold}>Gửi yêu cầu <Send size={13} /></button>
              </form>
              {contactSent && (
                <div className="_success" style={{ padding: "0.8rem 1rem", background: C.white, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.gold}`, fontSize: "0.76rem", color: C.muted, lineHeight: 1.6 }}>
                  Yêu cầu đã gửi thành công. Bạn sẽ nhận phản hồi sớm từ người đăng.
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* ══ RECOMMENDATIONS ══════════════════════════════════════════════ */}
        {recommendations.length > 0 && (
          <section style={{ background: C.offWhite, borderTop: `1px solid ${C.border}`, padding: "3rem 2.5rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <Reveal>
                <div style={eyebrow}>Gợi ý</div>
                <h2 style={{ fontFamily: "var(--e-serif)", fontSize: "1.5rem", fontWeight: 500, color: C.charcoal, margin: "0.4rem 0 0" }}>
                  Bất động sản tương tự
                </h2>
              </Reveal>
              <div style={{ marginTop: "1.8rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: "1.2rem" }}>
                {recommendations.map((rec, i) => (
                  <Reveal key={rec._id} delay={i * 80}>
                    <LuxuryListingCard property={rec} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        <LuxuryFooter />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<PropertyDetailPageProps> = async (context) => {
  const idParam = context.params?.id;
  const id = typeof idParam === "string" ? idParam : null;
  if (!id) return { props: { property: null, errorMessage: "Mã bất động sản không hợp lệ.", recommendations: [] } };
  try {
    const property = await propertyService.getPropertyById(id);
    let recommendations: Property[] = [];
    try { recommendations = await propertyService.getRecommendations(id); } catch (e) { console.error(e); }
    return { props: { property, errorMessage: null, recommendations } };
  } catch (error) {
    return { props: { property: null, errorMessage: getErrorMessage(error), recommendations: [] } };
  }
};