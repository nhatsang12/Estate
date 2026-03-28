"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Bath,
  BedDouble,
  Building2,
  MapPin,
  ArrowUpRight,
  Ruler,
  Heart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import favoriteService from "@/services/favoriteService";
import type { Property } from "@/types/property";
import { formatVNDShort } from "@/utils/formatPrice";
import { optimizeCloudinaryUrl } from "@/utils/imageOptimization";

interface ListingCardProps {
  property: Property;
}

function formatNumber(value?: number) {
  if (value === undefined || value === null) return "N/A";
  return new Intl.NumberFormat("en-US").format(value);
}

const typeLabel: Record<string, string> = {
  apartment: "Căn hộ",
  office: "Văn phòng",
  house: "Nhà phố",
  villa: "Biệt thự",
  land: "Đất nền",
};

export default function ListingCard({ property }: ListingCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const mainImage = property.images?.[0];
  const optimizedImage = mainImage ? optimizeCloudinaryUrl(mainImage, 640) : null;
  const [saved, setSaved] = useState(false);
  const [favoriteProcessing, setFavoriteProcessing] = useState(false);
  const isRental = property.type === "apartment" || property.type === "office";

  useEffect(() => {
    let cancelled = false;
    const resolveFavoriteState = async () => {
      if (!property?._id || !user || user.role === "admin") {
        setSaved(false);
        return;
      }

      try {
        const response = await favoriteService.getFavoriteStatus(property._id);
        if (!cancelled) {
          setSaved(Boolean(response.data?.isFavorite));
        }
      } catch {
        if (!cancelled) {
          setSaved(false);
        }
      }
    };

    void resolveFavoriteState();
    return () => {
      cancelled = true;
    };
  }, [property?._id, user]);

  const emitFavoritesChanged = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("favorites:changed"));
    }
  };

  const handleToggleFavorite = async () => {
    if (!property?._id || favoriteProcessing) return;

    if (!user) {
      void router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (user.role === "admin") return;

    try {
      setFavoriteProcessing(true);
      if (saved) {
        await favoriteService.removeFavorite(property._id);
        setSaved(false);
      } else {
        await favoriteService.addFavorite(property._id);
        setSaved(true);
      }
      emitFavoritesChanged();
    } catch (error) {
      console.error("Favorite toggle failed:", error);
    } finally {
      setFavoriteProcessing(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        .lc-root {
          font-family: 'DM Sans', sans-serif;
        }

        .lc-card {
          position: relative;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(18px) saturate(160%);
          -webkit-backdrop-filter: blur(18px) saturate(160%);
          box-shadow:
            0 2px 0 rgba(255,255,255,0.9) inset,
            0 1px 3px rgba(0,0,0,0.06),
            0 8px 32px rgba(30,41,80,0.08);
          overflow: hidden;
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.35s ease;
          will-change: transform;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .lc-card:hover {
          transform: translateY(-5px) scale(1.008);
          box-shadow:
            0 2px 0 rgba(255,255,255,0.9) inset,
            0 2px 8px rgba(0,0,0,0.06),
            0 20px 50px rgba(30,41,80,0.14);
        }

        /* Image section */
        .lc-image-wrap {
          position: relative;
          overflow: hidden;
          height: 210px;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .lc-image-wrap { height: 175px; }
        }

        .lc-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .lc-card:hover .lc-image-wrap img {
          transform: scale(1.06);
        }

        /* Gradient overlay on image */
        .lc-image-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            170deg,
            transparent 40%,
            rgba(15, 23, 60, 0.45) 100%
          );
          pointer-events: none;
        }

        /* Type badge */
        .lc-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 2;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #1e2950;
          background: rgba(255, 255, 255, 0.78);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 100px;
          padding: 4px 10px;
        }

        /* Save button */
        .lc-save {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                      background 0.2s ease;
          color: #94a3b8;
        }

        .lc-save:hover { transform: scale(1.12); }
        .lc-save.saved { color: #e0445a; background: rgba(255,255,255,0.92); }

        /* Content */
        .lc-body {
          padding: 16px 18px 18px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 0;
        }

        .lc-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 19px;
          font-weight: 600;
          line-height: 1.25;
          color: #0f172a;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0;
        }

        @media (max-width: 640px) {
          .lc-title { font-size: 17px; }
        }

        .lc-price-row {
          margin-top: 8px;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .lc-price {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px;
          font-weight: 700;
          color: #2d3c8e;
          letter-spacing: -0.01em;
        }

        @media (max-width: 640px) {
          .lc-price { font-size: 19px; }
        }

        .lc-price-unit {
          font-size: 12px;
          font-weight: 400;
          color: #64748b;
          font-style: italic;
          font-family: 'DM Sans', sans-serif;
        }

        .lc-address {
          margin-top: 8px;
          display: flex;
          align-items: flex-start;
          gap: 5px;
          color: #64748b;
          font-size: 12.5px;
          line-height: 1.45;
        }

        .lc-address svg { margin-top: 1px; flex-shrink: 0; color: #94a3b8; }

        .lc-address span {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Divider */
        .lc-divider {
          margin: 14px 0 12px;
          border: none;
          border-top: 1px solid rgba(148, 163, 184, 0.2);
        }

        /* Stats */
        .lc-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }

        .lc-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 8px 6px;
          background: rgba(241, 245, 255, 0.7);
          border: 1px solid rgba(199, 210, 254, 0.4);
          border-radius: 14px;
          text-align: center;
        }

        .lc-stat-icon {
          color: #6272c3;
        }

        .lc-stat-val {
          font-size: 12px;
          font-weight: 500;
          color: #1e2950;
          line-height: 1;
        }

        .lc-stat-label {
          font-size: 9.5px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        /* CTA */
        .lc-cta {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 100%;
          padding: 11px 20px;
          border-radius: 14px;
          background: linear-gradient(135deg, #2d3c8e 0%, #4355b9 100%);
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.02em;
          text-decoration: none;
          transition: opacity 0.2s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.25s ease;
          box-shadow: 0 4px 16px rgba(45,60,142,0.28);
          position: relative;
          overflow: hidden;
        }

        .lc-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%);
          pointer-events: none;
        }

        .lc-cta:hover {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(45,60,142,0.36);
        }

        .lc-cta:active { transform: translateY(0); }

        .lc-cta-icon {
          transition: transform 0.25s ease;
        }

        .lc-cta:hover .lc-cta-icon {
          transform: translate(2px, -2px);
        }

        .lc-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #e8ecf7 0%, #d5daf0 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8896c8;
        }
      `}</style>

      <article className="lc-root lc-card">
        {/* Image */}
        <div className="lc-image-wrap">
          {mainImage ? (
            <Image
              src={optimizedImage || mainImage}
              alt={property.title}
              width={640}
              height={420}
              unoptimized
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="lc-placeholder">
              <Building2 size={28} />
            </div>
          )}

          <span className="lc-badge">
            {typeLabel[property.type] ?? property.type}
          </span>

          <button
            className={`lc-save${saved ? " saved" : ""}`}
            onClick={() => void handleToggleFavorite()}
            disabled={favoriteProcessing}
            aria-label="Lưu bất động sản"
            style={{
              cursor: favoriteProcessing ? "not-allowed" : "pointer",
              opacity: favoriteProcessing ? 0.7 : 1,
            }}
          >
            <Heart size={15} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Body */}
        <div className="lc-body">
          <h3 className="lc-title">{property.title}</h3>

          <div className="lc-price-row">
            <span className="lc-price">{formatVNDShort(property.price)}</span>
            {isRental && <span className="lc-price-unit">/ tháng</span>}
          </div>

          <p className="lc-address">
            <MapPin size={13} />
            <span>{property.address}</span>
          </p>

          <hr className="lc-divider" />

          <div className="lc-stats">
            <div className="lc-stat">
              <BedDouble size={14} className="lc-stat-icon" />
              <span className="lc-stat-val">{formatNumber(property.bedrooms)}</span>
              <span className="lc-stat-label">Phòng ngủ</span>
            </div>
            <div className="lc-stat">
              <Bath size={14} className="lc-stat-icon" />
              <span className="lc-stat-val">{formatNumber(property.bathrooms)}</span>
              <span className="lc-stat-label">Phòng tắm</span>
            </div>
            <div className="lc-stat">
              <Ruler size={14} className="lc-stat-icon" />
              <span className="lc-stat-val">{formatNumber(property.area)}</span>
              <span className="lc-stat-label">m²</span>
            </div>
          </div>

          <div style={{ marginTop: "auto" }}>
            <Link href={`/properties/${property._id}`} className="lc-cta">
              Xem chi tiết
              <ArrowUpRight size={15} className="lc-cta-icon" />
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
