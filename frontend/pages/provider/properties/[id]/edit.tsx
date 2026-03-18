import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";

import PropertyForm from "@/components/PropertyForm";
import { geocodeAddress } from "@/services/geocodeService";
import propertyService from "@/services/propertyService";
import { ApiError } from "@/services/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import type { Property } from "@/types/property";

interface PropertyFormData {
  title: string;
  description: string;
  price: number;
  address: string;
  location: { type: "Point"; coordinates: [number, number] };
  type: "apartment" | "house" | "villa" | "studio" | "office";
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  furnished: boolean;
  yearBuilt?: number;
  amenities: string[];
  images?: File[];
  ownershipDocuments?: File[];
}

// ─── Inline CSS (shared with create.tsx) ─────────────────────────────────────
const STYLES = `
  @keyframes _spin  { to { transform: rotate(360deg); } }
  @keyframes _fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  ._edit-page {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 100vh;
    background: #f4f3f0;
  }

  /* ── Sidebar ── */
  ._sidebar {
    background: #1a1814;
    padding: 2.5rem 1.8rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: none;
    animation: _fadeUp 0.5s ease both;
  }
  ._sidebar::-webkit-scrollbar { display: none; }

  ._sb-eyebrow {
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #9a7c45;
    margin-bottom: 6px;
  }
  ._sb-title {
    font-family: var(--e-serif);
    font-size: 1.4rem;
    font-weight: 500;
    color: #fff;
    line-height: 1.25;
    margin: 0;
  }
  ._sb-title em {
    font-style: italic;
    color: #c9a96e;
    font-weight: 400;
  }
  ._sb-divider {
    height: 1px;
    background: rgba(255,255,255,0.07);
  }

  /* Property info card */
  ._prop-card {
    border: 1px solid rgba(255,255,255,0.08);
    padding: 1.2rem;
  }
  ._prop-label {
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    margin-bottom: 7px;
  }
  ._prop-title {
    font-family: var(--e-serif);
    font-size: 0.95rem;
    color: #fff;
    line-height: 1.5;
    margin: 0 0 5px;
  }
  ._prop-addr {
    font-size: 0.68rem;
    color: rgba(255,255,255,0.3);
    line-height: 1.5;
  }

  /* Tips */
  ._tips-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  ._tip-item {
    display: flex;
    gap: 9px;
    font-size: 0.72rem;
    color: rgba(255,255,255,0.28);
    line-height: 1.55;
  }
  ._tip-dot { color: #9a7c45; flex-shrink: 0; margin-top: 1px; }

  /* Back btn */
  ._back-btn {
    margin-top: auto;
    width: 100%;
    padding: 11px;
    background: transparent;
    color: rgba(255,255,255,0.35);
    border: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: color 0.2s, border-color 0.2s;
    font-family: var(--e-sans);
  }
  ._back-btn:hover { color: #fff; border-color: rgba(255,255,255,0.28); }

  /* ── Main area ── */
  ._main {
    padding: 3rem 2.8rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    animation: _fadeUp 0.55s ease both 0.1s;
    opacity: 0;
    animation-fill-mode: both;
  }
  ._main-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e8e6e1;
  }
  ._main-heading {
    font-family: var(--e-serif);
    font-size: clamp(1.6rem, 2.5vw, 2.2rem);
    font-weight: 500;
    color: #1a1814;
    line-height: 1.2;
    margin: 0;
  }
  ._main-heading em {
    font-style: italic;
    font-weight: 400;
    color: #7a7568;
  }
  ._step-badge {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #9a7c45;
    border: 1px solid rgba(154,124,69,0.3);
    padding: 4px 10px;
    background: rgba(154,124,69,0.06);
    white-space: nowrap;
  }
  ._form-wrap {
    background: #ffffff;
    padding: 2.2rem;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04);
  }

  /* Spinner */
  ._spinner {
    width: 36px; height: 36px;
    border: 2px solid #9a7c45;
    border-top-color: transparent;
    border-radius: 50%;
    animation: _spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }
`;

export default function EditProperty() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthLoading } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!router.isReady || !id || typeof id !== "string") return;
    if (isAuthLoading) return;
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadProperty = async () => {
      try {
        if (!user || user.role !== "provider") {
          router.push("/");
          return;
        }
        const prop = await propertyService.getPropertyById(id);
        setProperty(prop);
      } catch (error) {
        console.error("Error loading property:", error);
        router.push("/provider/properties");
      } finally {
        setInitialized(true);
      }
    };

    loadProperty();
  }, [router.isReady, id, isAuthLoading]);

  const handleSubmit = async (data: PropertyFormData) => {
    if (!property) return;
    try {
      setIsLoading(true);

      const nextAddress = data.address.trim();
      const coords = Array.isArray(data.location?.coordinates)
        ? data.location.coordinates
        : [];
      const hasValidCoords =
        coords.length === 2 &&
        Number.isFinite(coords[0]) &&
        Number.isFinite(coords[1]) &&
        !(coords[0] === 0 && coords[1] === 0);

      let nextLocation = data.location;
      if (
        nextAddress &&
        (!hasValidCoords ||
          !property.address ||
          nextAddress.toLowerCase() !== property.address.trim().toLowerCase())
      ) {
        const { lat, lng } = await geocodeAddress(nextAddress);
        nextLocation = { type: "Point", coordinates: [lng, lat] };
      }

      await propertyService.updateProperty(property._id, {
        ...data,
        address: nextAddress,
        location: nextLocation,
      });

      alert("Cập nhật bất động sản thành công!");
      router.push("/provider/properties");
    } catch (error: any) {
      console.error("Status:", error?.statusCode);
  console.error("Message:", error?.message);
      const message = error?.message || "Lỗi khi cập nhật bất động sản";
      const isQuotaError =
        error instanceof ApiError &&
        error.statusCode === 403 &&
        message.toLowerCase().match(/quota|plan|upgrade|nâng cấp|gói/);

      if (isQuotaError) {
        const goUpgrade = confirm("Bạn đã đạt giới hạn. Nâng cấp gói ngay không?");
        if (goUpgrade) router.push("/subscription/plans");
        return;
      }

      console.error("Error updating property:", error);
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared sidebar ─────────────────────────────────────────────────────────
  const Sidebar = () => (
    <aside className="_sidebar">
      <div>
        <div className="_sb-eyebrow">Quản lý tin</div>
        <h1 className="_sb-title">
          Chỉnh sửa<br />
          <em>bất động sản</em>
        </h1>
      </div>

      <div className="_sb-divider" />

      {/* Property info */}
      {property && (
        <div className="_prop-card">
          <div className="_prop-label">Đang chỉnh sửa</div>
          <p className="_prop-title">{property.title}</p>
          {property.address && (
            <div className="_prop-addr">{property.address}</div>
          )}
        </div>
      )}

      <div className="_sb-divider" />

      {/* Tips */}
      <div>
        <div className="_prop-label" style={{ marginBottom: 12 }}>Lưu ý</div>
        <div className="_tips-list">
          {[
            "Cập nhật giá theo thị trường để tăng lượt xem",
            "Hình ảnh chất lượng cao tăng 3× tỷ lệ liên hệ",
            "Mô tả chi tiết giúp lọc đúng khách hàng",
          ].map((tip, i) => (
            <div key={i} className="_tip-item">
              <span className="_tip-dot">✦</span>
              {tip}
            </div>
          ))}
        </div>
      </div>

      {/* Back */}
      <button className="_back-btn" onClick={() => router.push("/provider/properties")}>
        ← Quay lại
      </button>
    </aside>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (!initialized || !property) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="_edit-page">
          <Sidebar />
          <main className="_main" style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div className="_spinner" />
              <p style={{ fontFamily: "var(--e-serif)", color: "#7a7568", fontSize: "0.85rem" }}>
                Đang tải...
              </p>
            </div>
          </main>
        </div>
      </>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="_edit-page">
        <Sidebar />

        <main className="_main">
          {/* Header */}
          <div className="_main-header">
            <h2 className="_main-heading">
              Chỉnh sửa tin đăng<br />
              <em>của bạn</em>
            </h2>
            <span className="_step-badge">Cập nhật thông tin</span>
          </div>

          {/* Form */}
          <div className="_form-wrap">
            <PropertyForm
              initialData={property}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    </>
  );
}