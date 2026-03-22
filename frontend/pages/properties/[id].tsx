import { useState, useEffect, useRef } from "react";
import type { FormEvent } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import {
  Waves, Dumbbell, Wind, Car, Trees, ShieldCheck, Wifi,
  AirVent, ChefHat, WashingMachine,
} from "lucide-react";
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  "Hồ bơi": <Waves size={16} />,
  "Phòng gym": <Dumbbell size={16} />,
  "Ban công": <Wind size={16} />,
  "Bãi đỗ xe": <Car size={16} />,
  "Sân vườn": <Trees size={16} />,
  "Bảo vệ 24/7": <ShieldCheck size={16} />,
  "WiFi": <Wifi size={16} />,
  "Điều hoà": <AirVent size={16} />,
  "Bếp đầy đủ": <ChefHat size={16} />,
  "Máy giặt": <WashingMachine size={16} />,
};
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
  Maximize2,
  Sparkles,
  ArrowRight,
  Share2,
  Heart,
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

// ————— CSS Constants & Global Styles —————
const GLOBAL_STYLE = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes lineGrow {
    from { width: 0; }
    to { width: 100%; }
  }

  .e-reveal { opacity: 0; transform: translateY(20px); transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1); }
  .e-reveal.visible { opacity: 1; transform: translateY(0); }

  .e-hero-overlay {
    background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 30%, rgba(0,0,0,0.85) 100%);
  }

  .e-sticky-sidebar {
    position: sticky;
    top: 100px;
  }

  .e-thumbnail {
    transition: all 0.3s var(--e-ease);
    border: 1px solid transparent;
  }
  .e-thumbnail.active {
    border-color: var(--e-gold);
    transform: scale(1.05);
  }

  .e-glass-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(140, 110, 63, 0.15);
  }

  .e-detail-section {
    padding: 3rem 0;
    border-bottom: 1px solid var(--e-beige);
  }

  .e-category-tag {
    font-size: 0.65rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--e-gold);
    font-weight: 700;
  }

  .e-h2 {
    font-family: var(--e-serif);
    font-size: 1.8rem;
    font-weight: 500;
    color: var(--e-charcoal);
    margin-bottom: 1.5rem;
  }

  .e-prose {
    font-size: 1rem;
    line-height: 1.8;
    color: var(--e-muted);
    font-weight: 300;
  }

  .e-icon-box {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--e-beige);
    color: var(--e-gold);
    transition: all 0.3s;
  }
  .e-icon-box:hover {
    background: var(--e-gold);
    color: var(--e-white);
    border-color: var(--e-gold);
  }

  .e-contact-input {
    width: 100%;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 0.9rem;
    border: 1px solid var(--e-beige);
    background: var(--e-white);
    outline: none;
    transition: all 0.25s;
    border-radius: 4px;
  }
  .e-contact-input:focus {
    border-color: var(--e-gold);
    background: var(--e-cream);
  }

  .e-btn-fill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 28px;
    background: var(--e-charcoal);
    color: var(--e-white);
    border: 1px solid var(--e-charcoal);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.3s;
    text-decoration: none;
    width: 100%;
  }
  .e-btn-fill:hover {
    background: var(--e-gold);
    border-color: var(--e-gold);
  }

  .e-btn-outline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px 28px;
    background: transparent;
    color: var(--e-charcoal);
    border: 1px solid var(--e-beige);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.3s;
    text-decoration: none;
    width: 100%;
  }
  .e-btn-outline:hover {
    border-color: var(--e-charcoal);
    background: var(--e-cream);
  }
`;

export default function PropertyDetailPage({ property, errorMessage, recommendations }: PropertyDetailPageProps) {
  const router = useRouter();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const reveals = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    reveals.current.forEach((el) => el && observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const handlePostClick = () => {
    const token = typeof window !== "undefined" ? window.localStorage.getItem("estate_manager_token") : null;
    if (!token) router.push("/auth/login?redirect=/provider/properties/create");
    else router.push("/provider/properties/create");
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
          <Link href="/" className="e-btn-fill" style={{ width: "auto", display: "inline-flex" }}>
            Quay lại trang chủ
          </Link>
        </main>
        <LuxuryFooter />
      </div>
    );
  }

  const images = property.images?.length ? property.images : [];
  const owner = isPopulatedOwner(property.ownerId) ? property.ownerId : null;
  const pricePerSqm = property.area && property.area > 0 ? Math.round(property.price / property.area) : null;
  const coords = property.location?.coordinates ?? [];
  const hasMapCoords = Number.isFinite(coords[1]) && Number.isFinite(coords[0]) && !(coords[1] === 0 && coords[0] === 0);

  const handleContactSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContactSent(true);
  };

  return (
    <>
      <Head>
        <title>{property.title} — Estoria Luxury Portal</title>
      </Head>
      <style>{GLOBAL_STYLE}</style>

      <div className="estoria min-h-screen bg-white">
        {/* Navbar — Dynamic transparency */}
        <LuxuryNavbar onPostClick={handlePostClick} />

        {/* 01 — CINEMATIC HERO */}
        <section style={{ position: "relative", height: "100vh", minHeight: "600px" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            {images.length > 0 ? (
              <Image
                src={images[activeImageIndex]}
                alt={property.title}
                fill
                priority
                unoptimized
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "var(--e-charcoal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={80} color="var(--e-gold)" opacity={0.2} />
              </div>
            )}
          </div>

          <div className="e-hero-overlay" style={{ position: "absolute", inset: 0, zIndex: 1 }} />

          <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", alignItems: "flex-end", padding: "0 5vw 130px" }}>
            <div style={{ maxWidth: "800px" }}>
              <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
                <span style={{ padding: "6px 14px", border: "1px solid var(--e-white)", borderRadius: "30px", fontSize: "0.62rem", color: "white", textTransform: "uppercase", letterSpacing: "0.15em", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                  {property.type}
                </span>
                <span style={{ padding: "6px 14px", border: "1px solid var(--e-gold)", borderRadius: "30px", fontSize: "0.62rem", color: "var(--e-gold-light)", textTransform: "uppercase", letterSpacing: "0.15em", background: "rgba(140, 110, 63, 0.15)", backdropFilter: "blur(8px)" }}>
                  Luxury Collection
                </span>
              </div>

              <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "clamp(2.5rem, 5vw, 4rem)", color: "white", lineHeight: 1, marginBottom: "1.5rem" }}>
                {property.title}
              </h1>

              <div style={{ display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap", color: "rgba(255,255,255,0.8)" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 500, color: "var(--e-gold-light)" }}>
                  {formatCurrency(property.price)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem" }}>
                  <MapPin size={18} /> {property.address}
                </div>
              </div>
            </div>


          </div>

          {/* BOTTOM OVERLAY (Specs & Thumbnails) */}
          <div style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
            backdropFilter: "blur(12px)",
            padding: "2rem 5vw",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "2rem",
            borderTop: "1px solid rgba(255,255,255,0.1)"
          }}>
            {/* Specs */}
            <div style={{ display: "flex", gap: "3.5rem", flexWrap: "wrap", paddingBottom: "5px" }}>
              {[
                { icon: <BedDouble size={22} />, label: "Phòng ngủ", value: property.bedrooms },
                { icon: <Bath size={22} />, label: "Phòng tắm", value: property.bathrooms },
                { icon: <Maximize2 size={22} />, label: "Diện tích", value: `${property.area} m²` },
                { icon: <CalendarClock size={22} />, label: "Xây dựng", value: property.yearBuilt || "2024" }
              ].map((spec, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "15px", color: "white" }}>
                  <div style={{ color: "var(--e-gold-light)" }}>{spec.icon}</div>
                  <div>
                    <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", opacity: 0.6 }}>{spec.label}</div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 500 }}>{spec.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gallery Thumbnails Overlay */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", maxWidth: "400px", paddingBottom: "5px" }}>
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`e-thumbnail ${activeImageIndex === i ? 'active' : ''}`}
                    style={{
                      position: "relative",
                      width: "70px",
                      height: "45px",
                      flexShrink: 0,
                      padding: 0,
                      border: "1px solid transparent",
                      borderRadius: "4px",
                      cursor: "pointer",
                      overflow: "hidden",
                      borderColor: activeImageIndex === i ? "var(--e-gold)" : "rgba(255,255,255,0.2)"
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {activeImageIndex !== i && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 03 — MAIN CONTENT GRID */}
        <main style={{ padding: "5rem 5vw" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "6rem", alignItems: "start" }}>
            {/* Left Column — Detailed Info */}
            <div>
              <div ref={(el) => { reveals.current[0] = el; }} className="e-reveal e-detail-section" style={{ paddingTop: 0 }}>
                <div className="e-category-tag" style={{ marginBottom: "1rem" }}>Premium Listing</div>
                <h2 className="e-h2">Giới Thiệu Tổng Quan</h2>
                <div className="e-prose">
                  {property.description || "Bất động sản cao cấp này hiện đại, sang trọng và đầy đủ tiện nghi, tọa lạc tại một trong những vị trí đắc địa nhất. Với không gian rộng rãi, thiết kế tinh tế và tầm nhìn tuyệt đẹp, đây chắc chắn là sự lựa chọn hoàn hảo cho phong cách sống thượng lưu."}
                </div>
              </div>

              <div ref={(el) => { reveals.current[1] = el; }} className="e-reveal e-detail-section">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                  {(property.amenities?.length
                    ? property.amenities
                    : ["Hồ bơi", "Bảo vệ 24/7", "Sân vườn", "Điều hoà", "Bãi đỗ xe", "Phòng gym"]
                  ).map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 16px",
                      background: "var(--e-cream)",
                      border: "1px solid var(--e-beige)",
                    }}>
                      <div style={{
                        width: 34, height: 34,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid var(--e-beige)",
                        color: "var(--e-gold)",
                        flexShrink: 0,
                      }}>
                        {AMENITY_ICONS[item] ?? <Sparkles size={16} />}
                      </div>
                      <span style={{ fontSize: "0.88rem", color: "var(--e-charcoal)", fontWeight: 500 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div ref={(el) => { reveals.current[2] = el; }} className="e-reveal e-detail-section" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <h2 className="e-h2">Vị Trí Đắc Địa</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "2rem", color: "var(--e-muted)" }}>
                  <MapPin size={20} color="var(--e-gold)" />
                  <span style={{ fontSize: "1rem" }}>{property.address}</span>
                </div>
                {hasMapCoords ? (
                  <div style={{ height: "320px", background: "var(--e-cream)", border: "none", borderRadius: "0", overflow: "hidden", margin: "0 -2px" }}>
                    <AddressMap lat={coords[1]} lng={coords[0]} interactive={false}  />
                  </div>
                ) : (
                  <div style={{ height: "200px", background: "var(--e-cream)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--e-beige)", color: "var(--e-muted)" }}>
                    Bản đồ hiện đang được cập nhật
                  </div>
                )}
              </div>

              <div ref={(el) => { reveals.current[3] = el; }} className="e-reveal e-detail-section" style={{ borderBottom: "none" }}>
                <h2 className="e-h2">Thông Tin Pháp Lý</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ padding: "1.5rem", background: "var(--e-cream)", border: "1px solid var(--e-beige)" }}>
                    <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>Trạng Thái</div>
                    <div style={{ fontSize: "1.1rem", fontFamily: "var(--e-serif)" }}>Sổ Hồng Riêng / Chính Chủ</div>
                  </div>
                  <div style={{ padding: "1.5rem", background: "var(--e-cream)", border: "1px solid var(--e-beige)" }}>
                    <div style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "0.5rem" }}>Loại Hình</div>
                    <div style={{ fontSize: "1.1rem", fontFamily: "var(--e-serif)" }}>{property.type} Cao Cấp</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Sticky Sidebar */}
            <aside className="e-sticky-sidebar">
              <div className="e-glass-card" style={{ padding: "2.5rem" }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                  <div className="e-category-tag" style={{ marginBottom: "0.5rem" }}>Liên Hệ Tư Vấn</div>
                  <div style={{ fontFamily: "var(--e-serif)", fontSize: "2rem", color: "var(--e-charcoal)" }}>{formatCurrency(property.price)}</div>
                  {pricePerSqm && (
                    <div style={{ fontSize: "0.8rem", color: "var(--e-muted)", marginTop: "4px" }}>
                      ≈ {pricePerSqm.toLocaleString()} ₫ / m²
                    </div>
                  )}
                </div>

                <div style={{ borderTop: "1px solid var(--e-beige)", paddingTop: "2rem", marginBottom: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "var(--e-charcoal)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "var(--e-serif)" }}>
                      {owner?.name?.[0] || "O"}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>{owner?.name || "Premium Agent"}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--e-gold)" }}>Professional Partner</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <a href={`tel:${owner?.phone}`} className="e-btn-fill">
                      <Phone size={16} /> Gọi Ngay
                    </a>
                    <a href={`mailto:${owner?.email}`} className="e-btn-outline">
                      <Mail size={16} /> Gửi Email
                    </a>
                  </div>
                </div>

                <form onSubmit={handleContactSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--e-muted)" }}>Gửi Lời Nhắn</div>
                  <input type="text" placeholder="Tên của bạn" className="e-contact-input" required />
                  <input type="tel" placeholder="Số điện thoại" className="e-contact-input" required />
                  <textarea placeholder="Tôi muốn tư vấn về bất động sản này..." className="e-contact-input" style={{ minHeight: "100px", resize: "none" }} required></textarea>
                  <button type="submit" className="e-btn-fill" style={{ background: "var(--e-gold)", borderColor: "var(--e-gold)" }}>
                    Gửi Yêu Cầu <ArrowRight size={16} />
                  </button>
                </form>

                {contactSent && (
                  <div style={{ marginTop: "1rem", padding: "12px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "0.85rem", textAlign: "center", borderRadius: "4px" }}>
                    Yêu cầu của bạn đã được gửi thành công!
                  </div>
                )}
              </div>

              {/* Security Badge */}
              <div style={{ marginTop: "1.5rem", padding: "1rem", border: "1px dashed var(--e-gold)", display: "flex", alignItems: "center", gap: "12px", color: "var(--e-gold)" }}>
                <CheckCircle2 size={24} />
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>Tin Đăng Đã Xác Thực</div>
                  <div style={{ fontSize: "0.65rem", opacity: 0.8 }}>Pháp lý và thông tin đã được đội ngũ Estoria kiểm soát</div>
                </div>
              </div>
            </aside>
          </div>
        </main>

        {/* 04 — RECOMMENDATIONS */}
        {recommendations.length > 0 && (
          <section style={{ padding: "5rem 5vw", background: "var(--e-cream)", borderTop: "1px solid var(--e-beige)" }}>
            <div style={{ maxWidth: "1240px", margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: "4rem" }}>
                <div className="e-category-tag">Gợi Ý</div>
                <h2 className="e-h2" style={{ fontSize: "2.4rem", marginTop: "1rem" }}>Bất Động Sản Tương Tự</h2>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2.5rem" }}>
                {recommendations.slice(0, 4).map((rec) => (
                  <LuxuryListingCard key={rec._id} property={rec} />
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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.statusCode === 404) return "Bất động sản không tồn tại hoặc đang bị ẩn.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Hiện chưa thể tải chi tiết bất động sản.";
}