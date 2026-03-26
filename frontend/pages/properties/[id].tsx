import { useState, useEffect, useRef } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Waves, Dumbbell, Wind, Car, Trees, ShieldCheck, Wifi, AirVent, ChefHat, WashingMachine } from "lucide-react";
import { Bath, BedDouble, Building2, CalendarClock, CheckCircle2, Mail, MapPin, Phone, Maximize2, Sparkles, ArrowRight } from "lucide-react";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
import LuxuryListingCard from "@/components/LuxuryListingCard";
import { useAuth } from "@/contexts/AuthContext";
import { useMessaging } from "@/contexts/MessagingContext";
import { ApiError } from "@/services/apiClient";
import { propertyService } from "@/services/propertyService";
import type { Property, PropertyOwner } from "@/types/property";

const AddressMap = dynamic(() => import("@/components/AddressMap"), { ssr: false });

const TYPE_LABEL_VI: Record<string, string> = {
  apartment: "Căn Hộ", house: "Nhà Phố",
  villa: "Biệt Thự", studio: "Studio", office: "Văn Phòng",
};

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Hồ bơi": <Waves size={16} />, "Phòng gym": <Dumbbell size={16} />,
  "Ban công": <Wind size={16} />, "Bãi đỗ xe": <Car size={16} />,
  "Sân vườn": <Trees size={16} />, "Bảo vệ 24/7": <ShieldCheck size={16} />,
  "WiFi": <Wifi size={16} />, "Điều hoà": <AirVent size={16} />,
  "Bếp đầy đủ": <ChefHat size={16} />, "Máy giặt": <WashingMachine size={16} />,
};

interface PropertyDetailPageProps {
  property: Property | null;
  errorMessage: string | null;
  recommendations: Property[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(amount);
}
function isPopulatedOwner(owner: PropertyOwner): owner is Exclude<PropertyOwner, string> {
  return typeof owner !== "string";
}

const GLOBAL_STYLE = `
  .e-reveal { opacity:0; transform:translateY(20px); transition:all 0.8s cubic-bezier(0.22,1,0.36,1); }
  .e-reveal.visible { opacity:1; transform:translateY(0); }
  .e-hero-overlay {
    background:
      radial-gradient(ellipse at center, transparent 28%, rgba(0,0,0,0.65) 100%),
      linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%),
      linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 42%);
  }
  .e-sticky-sidebar { position:sticky; top:100px; }
  .e-detail-section { padding:3rem 0; border-bottom:1px solid var(--e-beige); }
  .e-category-tag { font-size:0.65rem; letter-spacing:0.15em; text-transform:uppercase; color:var(--e-gold); font-weight:700; }
  .e-h2 { font-family:var(--e-serif); font-size:1.8rem; font-weight:500; color:var(--e-charcoal); margin-bottom:1.5rem; }
  .e-prose { font-size:1rem; line-height:1.8; color:var(--e-muted); font-weight:300; }
  .e-contact-input {
    width:100%; padding:12px 16px; font-family:inherit; font-size:0.9rem;
    border:1px solid var(--e-beige); background:var(--e-white);
    outline:none; transition:all 0.25s; border-radius:0; box-sizing:border-box;
  }
  .e-contact-input:focus { border-color:var(--e-gold); background:var(--e-cream); }
  .e-btn-primary {
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:14px 28px; background:var(--e-charcoal); color:var(--e-white);
    border:1px solid var(--e-charcoal); font-size:0.72rem; font-weight:700;
    letter-spacing:0.12em; text-transform:uppercase; cursor:pointer;
    transition:all 0.3s; text-decoration:none; width:100%; border-radius:0;
  }
  .e-btn-primary:hover { background:var(--e-gold); border-color:var(--e-gold); }
  .e-btn-outline {
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:14px 28px; background:transparent; color:var(--e-charcoal);
    border:1px solid var(--e-beige); font-size:0.72rem; font-weight:700;
    letter-spacing:0.12em; text-transform:uppercase; cursor:pointer;
    transition:all 0.3s; text-decoration:none; width:100%; border-radius:0;
  }
  .e-btn-outline:hover { border-color:var(--e-charcoal); background:var(--e-cream); }
  .e-gold-divider { height:3px; background:linear-gradient(90deg, var(--e-gold), rgba(200,168,75,0.25), transparent); }
  .e-stats-bar { display:flex; align-items:stretch; border-bottom:1px solid var(--e-beige); background:var(--e-white); overflow-x:auto; }
  .e-stats-bar-item { flex:1; min-width:130px; display:flex; flex-direction:column; gap:4px; padding:1.25rem 1.6rem; border-right:1px solid var(--e-beige); }
  .e-stats-bar-item:last-child { border-right:none; }
  .e-stats-bar-label { font-size:0.57rem; font-weight:700; letter-spacing:0.18em; text-transform:uppercase; color:var(--e-muted); opacity:0.65; }
  .e-stats-bar-value { font-family:var(--e-serif); font-size:1rem; font-weight:500; color:var(--e-charcoal); }
  .e-stats-bar-gold { color:var(--e-gold) !important; }

  /* Thumbnail strip — ẩn scrollbar */
  .e-thumb-strip {
    display:flex; gap:6px; overflow-x:auto; max-width:340px;
    scrollbar-width:none; -ms-overflow-style:none;
  }
  .e-thumb-strip::-webkit-scrollbar { display:none; }

  /* ── Crossfade + Ken Burns slideshow ── */
  .e-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    /* fade duration */
    transition: opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: opacity, transform;
  }
  /* Ken Burns: zoom in slowly while visible */
  .e-slide img {
    transition: transform 4s ease-out;
    transform: scale(1.08);
  }
  .e-slide.active {
    opacity: 1;
  }
  .e-slide.active img {
    transform: scale(1);
  }
  /* outgoing slide: keep fading out smoothly */
  .e-slide.leaving {
    opacity: 0;
    transition: opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

export default function PropertyDetailPage({ property, errorMessage, recommendations }: PropertyDetailPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { openPropertyPrefill } = useMessaging();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [prevImageIndex, setPrevImageIndex] = useState<number | null>(null);
  const [contactFeedback, setContactFeedback] = useState<string | null>(null);
  const reveals = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1 }
    );
    reveals.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const images = property?.images?.length ? property.images : [];

  // Auto-advance + track previous for "leaving" class
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => {
        setPrevImageIndex(prev);
        return (prev + 1) % images.length;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  // Clear "leaving" state after transition ends (1.4s)
  useEffect(() => {
    if (prevImageIndex === null) return;
    const t = setTimeout(() => setPrevImageIndex(null), 1500);
    return () => clearTimeout(t);
  }, [prevImageIndex]);

  const handleSetIndex = (i: number) => {
    if (i === activeImageIndex) return;
    setPrevImageIndex(activeImageIndex);
    setActiveImageIndex(i);
  };

  const handlePostClick = () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("estate_manager_token") : null;
    router.push(token ? "/provider/properties/create" : "/auth/login?redirect=/provider/properties/create");
  };

  if (!property) {
    return (
      <div className="estoria min-h-screen bg-white">
        <style>{GLOBAL_STYLE}</style>
        <LuxuryNavbar variant="light" onPostClick={handlePostClick} />
        <main style={{ padding: "8rem 5vw", textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "2rem", marginBottom: "1.5rem" }}>
            {errorMessage || "Không tìm thấy bất động sản"}
          </h1>
          <Link href="/" className="e-btn-primary" style={{ width: "auto", display: "inline-flex" }}>
            Quay lại trang chủ
          </Link>
        </main>
        <LuxuryFooter />
      </div>
    );
  }

  const owner = isPopulatedOwner(property.ownerId) ? property.ownerId : null;
  const pricePerSqm = property.area && property.area > 0 ? Math.round(property.price / property.area) : null;
  const coords = property.location?.coordinates ?? [];
  const hasMapCoords = Number.isFinite(coords[1]) && Number.isFinite(coords[0]) && !(coords[1] === 0 && coords[0] === 0);
  const typeVI = TYPE_LABEL_VI[property.type] ?? "Bất Động Sản";
  const recCount = Math.min(recommendations.length, 4);
  const shortAddress = (() => {
    const parts = (property.address || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    return parts.length > 3 ? parts.slice(0, 3).join(", ") + "…" : property.address;
  })();
  const handleContactOwner = () => {
    if (!owner?._id) {
      setContactFeedback("Hiện chưa xác định được thông tin chủ sở hữu.");
      return;
    }

    if (!user) {
      void router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (user.role !== "user" && user.role !== "provider") {
      setContactFeedback("Tài khoản hiện tại chưa được hỗ trợ chat trực tiếp.");
      return;
    }

    if (String(user._id) === String(owner._id)) {
      setContactFeedback("Bạn đang xem chính tin đăng của mình.");
      return;
    }

    openPropertyPrefill({
      receiverId: String(owner._id),
      receiverName: owner.name,
      property: {
        propertyId: property._id,
        title: property.title,
        address: property.address,
        price: property.price,
        description: property.description,
        imageUrl: property.images?.[0] || "",
      },
    });

    setContactFeedback("Đã mở khung chat. Vui lòng xác nhận nội dung trước khi gửi.");
  };

  return (
    <>
      <Head><title>{property.title} — Estoria Luxury Portal</title></Head>
      <style>{GLOBAL_STYLE}</style>
      <div className="estoria min-h-screen" style={{ background: "var(--e-white)" }}>
        <LuxuryNavbar onPostClick={handlePostClick} />

        {/* 01 HERO */}
        <section style={{ position: "relative", height: "100vh", minHeight: "620px", overflow: "hidden" }}>

          {/* Crossfade + Ken Burns image stack */}
          <div style={{ position: "absolute", inset: 0 }}>
            {images.length > 0 ? (
              images.map((src: string, i: number) => {
                const isActive = i === activeImageIndex;
                const isLeaving = i === prevImageIndex;
                const cls = ["e-slide", isActive ? "active" : "", isLeaving ? "leaving" : ""].filter(Boolean).join(" ");
                return (
                  <div key={i} className={cls}>
                    <Image
                      src={src}
                      alt={property.title}
                      fill
                      priority={i === 0}
                      unoptimized
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                );
              })
            ) : (
              <div style={{ width: "100%", height: "100%", background: "var(--e-charcoal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={80} color="var(--e-gold)" opacity={0.2} />
              </div>
            )}
          </div>

          <div className="e-hero-overlay" style={{ position: "absolute", inset: 0, zIndex: 1 }} />

          {/* Hero text */}
          <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "flex-end", padding: "0 5vw 140px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", maxWidth: "720px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ padding: "4px 12px", borderRadius: "30px", fontSize: "0.6rem", color: "white", textTransform: "uppercase", letterSpacing: "0.15em", border: "1px solid rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.28)" }}>{typeVI}</span>
                <span style={{ padding: "4px 12px", borderRadius: "30px", fontSize: "0.6rem", color: "var(--e-gold)", textTransform: "uppercase", letterSpacing: "0.15em", border: "1px solid var(--e-gold)", background: "rgba(0,0,0,0.28)" }}>Luxury Collection</span>
              </div>
              <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)", color: "white", lineHeight: 1.05, margin: 0 }}>{property.title}</h1>
              <div style={{ fontSize: "1.35rem", fontWeight: 600, color: "var(--e-gold)", lineHeight: 1 }}>{formatCurrency(property.price)}</div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                <MapPin size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
                <span>{shortAddress}</span>
              </div>
            </div>
          </div>

          {/* Specs + thumbnails */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10, background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.65) 50%, transparent 100%)", padding: "1.5rem 5vw", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "2rem" }}>
            <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap" }}>
              {[
                { icon: <BedDouble size={20} />, label: "Phòng ngủ", value: property.bedrooms },
                { icon: <Bath size={20} />, label: "Phòng tắm", value: property.bathrooms },
                { icon: <Maximize2 size={20} />, label: "Diện tích", value: `${property.area} m²` },
                { icon: <CalendarClock size={20} />, label: "Xây dựng", value: property.yearBuilt || "2024" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", color: "white" }}>
                  <div style={{ color: "var(--e-gold)" }}>{s.icon}</div>
                  <div>
                    <div style={{ fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.5 }}>{s.label}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 500 }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Thumbnail strip — scrollbar ẩn */}
            {images.length > 1 && (
              <div className="e-thumb-strip">
                {images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleSetIndex(i)}
                    style={{
                      position: "relative", width: "64px", height: "42px", flexShrink: 0,
                      padding: 0, borderRadius: "3px", cursor: "pointer", overflow: "hidden",
                      border: `2px solid ${activeImageIndex === i ? "var(--e-gold)" : "rgba(255,255,255,0.2)"}`,
                      outline: "none", background: "none", boxShadow: "none",
                      transition: "border-color 0.4s",
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    {activeImageIndex !== i && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", transition: "background 0.4s" }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 02 STATS BRIDGE BAR */}
        <div className="e-gold-divider" />
        <div className="e-stats-bar">
          {[
            { label: "Mã BĐS", value: property._id?.slice(-8).toUpperCase() ?? "—" },
            { label: "Loại hình", value: typeVI },
            { label: "Diện tích", value: property.area ? `${property.area} m²` : "—" },
            { label: "Giá", value: formatCurrency(property.price), gold: true },
            { label: "Trạng thái", value: "Còn Trống" },
          ].map((item, i) => (
            <div key={i} className="e-stats-bar-item">
              <span className="e-stats-bar-label">{item.label}</span>
              <span className={`e-stats-bar-value${item.gold ? " e-stats-bar-gold" : ""}`}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 03 MAIN CONTENT */}
        <main style={{ padding: "4rem 5vw 5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "5rem", alignItems: "start" }}>
            <div>
              {/* Overview */}
              <div ref={(el) => { reveals.current[0] = el; }} className="e-reveal e-detail-section" style={{ paddingTop: 0 }}>
                <div className="e-category-tag" style={{ marginBottom: "0.75rem" }}>Premium Listing</div>
                <h2 className="e-h2">Giới Thiệu Tổng Quan</h2>
                <p className="e-prose">{property.description || "Bất động sản cao cấp này hiện đại, sang trọng và đầy đủ tiện nghi, tọa lạc tại một trong những vị trí đắc địa nhất. Với không gian rộng rãi, thiết kế tinh tế và tầm nhìn tuyệt đẹp, đây chắc chắn là sự lựa chọn hoàn hảo cho phong cách sống thượng lưu."}</p>
              </div>

              {/* Amenities */}
              <div ref={(el) => { reveals.current[1] = el; }} className="e-reveal e-detail-section">
                <div className="e-category-tag" style={{ marginBottom: "0.75rem" }}>Tiện Ích</div>
                <h2 className="e-h2">Tiện Nghi Nổi Bật</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "0.75rem" }}>
                  {(property.amenities?.length ? property.amenities : ["Hồ bơi", "Bảo vệ 24/7", "Sân vườn", "Điều hoà", "Bãi đỗ xe", "Phòng gym"]).map((item: string, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 15px", background: "var(--e-cream)", border: "1px solid var(--e-beige)" }}>
                      <div style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--e-beige)", color: "var(--e-gold)", flexShrink: 0 }}>
                        {AMENITY_ICONS[item] ?? <Sparkles size={15} />}
                      </div>
                      <span style={{ fontSize: "0.85rem", color: "var(--e-charcoal)", fontWeight: 500 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map */}
              <div ref={(el) => { reveals.current[2] = el; }} className="e-reveal e-detail-section">
                <div className="e-category-tag" style={{ marginBottom: "0.75rem" }}>Vị Trí</div>
                <h2 className="e-h2">Vị Trí Đắc Địa</h2>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "1.25rem", color: "var(--e-muted)" }}>
                  <MapPin size={18} color="var(--e-gold)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{property.address}</span>
                </div>
                {hasMapCoords ? (
                  <div style={{ height: "240px", overflow: "hidden", border: "1px solid var(--e-beige)" }}>
                    <AddressMap lat={coords[1]} lng={coords[0]} interactive={false} />
                  </div>
                ) : (
                  <div style={{ height: "150px", background: "var(--e-cream)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--e-beige)", color: "var(--e-muted)", fontSize: "0.85rem" }}>
                    Bản đồ hiện đang được cập nhật
                  </div>
                )}
              </div>

              {/* Legal */}
              <div ref={(el) => { reveals.current[3] = el; }} className="e-reveal e-detail-section" style={{ borderBottom: "none" }}>
                <div className="e-category-tag" style={{ marginBottom: "0.75rem" }}>Pháp Lý</div>
                <h2 className="e-h2">Thông Tin Pháp Lý</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {[
                    { label: "Trạng Thái", value: "Sổ Hồng Riêng / Chính Chủ" },
                    { label: "Loại Hình", value: `${typeVI} Cao Cấp` },
                    { label: "Năm Xây", value: String(property.yearBuilt || "2024") },
                    { label: "Diện Tích", value: property.area ? `${property.area} m²` : "—" },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: "1.2rem 1.4rem", background: "var(--e-cream)", border: "1px solid var(--e-beige)" }}>
                      <div style={{ fontSize: "0.58rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--e-muted)", marginBottom: "0.35rem" }}>{item.label}</div>
                      <div style={{ fontSize: "1rem", fontFamily: "var(--e-serif)", color: "var(--e-charcoal)" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky sidebar */}
            <aside className="e-sticky-sidebar">
              <div style={{ background: "var(--e-white)", border: "1px solid var(--e-beige)", boxShadow: "0 8px 40px -8px rgba(26,23,20,0.08)" }}>
                {/* Price */}
                <div style={{ padding: "2rem", textAlign: "center", borderBottom: "1px solid var(--e-beige)" }}>
                  <div className="e-category-tag" style={{ marginBottom: "0.5rem" }}>Liên Hệ Tư Vấn</div>
                  <div style={{ fontFamily: "var(--e-serif)", fontSize: "1.85rem", color: "var(--e-charcoal)", lineHeight: 1.1 }}>{formatCurrency(property.price)}</div>
                  {pricePerSqm && <div style={{ fontSize: "0.76rem", color: "var(--e-muted)", marginTop: "5px" }}>≈ {pricePerSqm.toLocaleString()} ₫ / m²</div>}
                </div>

                {/* Agent */}
                <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid var(--e-beige)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1.2rem" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "50%", flexShrink: 0, background: "var(--e-charcoal)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "var(--e-serif)", fontSize: "1rem" }}>
                      {owner?.name?.[0]?.toUpperCase() || "A"}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--e-charcoal)" }}>{owner?.name || "Premium Agent"}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--e-gold)", letterSpacing: "0.04em" }}>Đại Lý Chuyên Nghiệp</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <a href={`tel:${owner?.phone}`} className="e-btn-primary"><Phone size={15} /> Gọi Ngay</a>
                    <a href={`mailto:${owner?.email}`} className="e-btn-outline"><Mail size={15} /> Gửi Email</a>
                  </div>
                </div>

                {/* Form */}
                <div style={{ padding: "1.5rem 2rem 2rem" }}>
                  <div style={{ fontSize: "0.67rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--e-muted)", marginBottom: "0.9rem" }}>  Hoặc</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    <button type="button" onClick={handleContactOwner} className="e-btn-primary">Chat với chủ sở hữu <ArrowRight size={15} /></button>
                  </div>
                  {contactFeedback && (
                    <div style={{ marginTop: "0.65rem", padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "0.8rem", textAlign: "center" }}>
                      {contactFeedback}
                    </div>
                  )}
                </div>
              </div>

              {/* Verified badge */}
              <div style={{ marginTop: "0.85rem", padding: "1rem 1.2rem", border: "1px solid rgba(184,151,74,0.3)", background: "rgba(200,168,75,0.04)", display: "flex", alignItems: "center", gap: "11px" }}>
                <CheckCircle2 size={20} color="var(--e-gold)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--e-charcoal)" }}>Tin Đăng Đã Xác Thực</div>
                  <div style={{ fontSize: "0.63rem", color: "var(--e-muted)", marginTop: "2px" }}>Pháp lý và thông tin đã được kiểm soát bởi Estoria</div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* 04 RECOMMENDATIONS */}
        {recommendations.length > 0 && (
          <section style={{ padding: "5rem 5vw", background: "#F2F5F8", borderTop: "1px solid var(--e-beige)" }}>
            <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
                <div className="e-category-tag">Gợi Ý Cho Bạn</div>
                <h2 className="e-h2" style={{ fontSize: "2.2rem", marginTop: "0.75rem", marginBottom: 0 }}>Bất Động Sản Tương Tự</h2>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${recCount}, minmax(0, 1fr))`, gap: "1.75rem", alignItems: "stretch", maxWidth: recCount === 1 ? "320px" : recCount === 2 ? "680px" : "100%", margin: "0 auto" }}>
                  {recommendations.slice(0, 4).map((rec: Property) => (
                    <div key={rec._id} style={{ height: "100%" }}>
                      <LuxuryListingCard property={rec} />
                    </div>
                  ))}
                </div>
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) return "Bất động sản không tồn tại hoặc đang bị ẩn.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Hiện chưa thể tải chi tiết bất động sản.";
}
