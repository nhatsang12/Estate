import { useCallback, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, Heart, LoaderCircle, MapPin, Trash2 } from "lucide-react";
import LuxuryFooter from "@/components/LuxuryFooter";
import LuxuryNavbar from "@/components/LuxuryNavbar";
import { useAuth } from "@/contexts/AuthContext";
import favoriteService, { type FavoriteItem } from "@/services/favoriteService";
import { formatVNDShort } from "@/utils/formatPrice";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Không thể tải danh sách yêu thích.";
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, isAuthLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [favoritePendingDelete, setFavoritePendingDelete] = useState<FavoriteItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await favoriteService.getMyFavorites(1, 100);
      setFavorites(response.data?.favorites || []);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      void router.replace(`/auth/login?redirect=${encodeURIComponent("/favorites")}`);
      return;
    }
    void fetchFavorites();
  }, [fetchFavorites, isAuthLoading, router, user]);

  const validFavorites = useMemo(
    () => favorites.filter((item) => item.property && item.property._id),
    [favorites]
  );

  const handleRemove = async (favorite: FavoriteItem): Promise<boolean> => {
    if (!favorite?._id && !favorite?.propertyId) return false;
    const targetId = favorite._id || favorite.propertyId;
    try {
      setRemovingId(targetId);
      await favoriteService.removeFavorite(targetId);
      setFavorites((prev) =>
        prev.filter(
          (item) =>
            item._id !== favorite._id &&
            item.propertyId !== favorite.propertyId
        )
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("favorites:changed"));
      }
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      setRemovingId(null);
    }
  };

  const openDeleteConfirm = (favorite: FavoriteItem) => {
    if (removingId) return;
    setFavoritePendingDelete(favorite);
  };

  const closeDeleteConfirm = () => {
    if (removingId) return;
    setFavoritePendingDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!favoritePendingDelete) return;
    const removed = await handleRemove(favoritePendingDelete);
    if (removed) {
      setFavoritePendingDelete(null);
    }
  };

  const handlePostClick = () => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("estate_manager_token")
        : null;
    void router.push(token ? "/provider/properties/create" : "/auth/login?redirect=/provider/properties/create");
  };

  return (
    <>
      <Head>
        <title>Yêu thích | Estoria</title>
      </Head>

      <div className="estoria min-h-screen" style={{ background: "#F2F5F8" }}>
        <LuxuryNavbar variant="light" onPostClick={handlePostClick} />

        <main style={{ padding: "8rem 5vw 5rem" }}>
          <div style={{ maxWidth: 1240, margin: "0 auto" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(154,124,69,0.16)",
                borderRadius: 16,
                padding: "1.3rem 1.5rem",
                boxShadow: "0 10px 40px rgba(17,28,20,0.05)",
                marginBottom: "1.25rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.58rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--e-gold)",
                  fontWeight: 700,
                  fontFamily: "var(--e-sans)",
                }}
              >
                Danh Sách Cá Nhân
              </p>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.8rem",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontFamily: "var(--e-serif)",
                    fontSize: "clamp(1.6rem, 2.4vw, 2.2rem)",
                    color: "var(--e-charcoal)",
                    fontWeight: 500,
                  }}
                >
                  Bất Động Sản Yêu Thích
                </h1>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(154,124,69,0.2)",
                    background: "rgba(255,255,255,0.9)",
                    color: "var(--e-charcoal)",
                    fontFamily: "var(--e-sans)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  <Heart size={14} color="#b84a2a" />
                  {validFavorites.length} mục
                </div>
              </div>
            </div>

            {errorMessage ? (
              <div
                style={{
                  marginBottom: "1rem",
                  border: "1px solid rgba(184,74,42,0.28)",
                  background: "rgba(184,74,42,0.06)",
                  color: "#b84a2a",
                  padding: "0.85rem 1rem",
                  borderRadius: 12,
                  fontSize: "0.84rem",
                  fontFamily: "var(--e-sans)",
                }}
              >
                {errorMessage}
              </div>
            ) : null}

            {loading ? (
              <div
                style={{
                  minHeight: 260,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 16,
                  border: "1px solid rgba(154,124,69,0.14)",
                  background: "rgba(255,255,255,0.86)",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.84rem",
                    color: "var(--e-muted)",
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  <LoaderCircle size={16} className="animate-spin" />
                  Đang tải danh sách yêu thích...
                </span>
              </div>
            ) : validFavorites.length === 0 ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px dashed rgba(154,124,69,0.24)",
                  background: "rgba(255,255,255,0.86)",
                  textAlign: "center",
                  padding: "3rem 1.5rem",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--e-serif)",
                    fontSize: "1.2rem",
                    color: "var(--e-charcoal)",
                  }}
                >
                  Bạn chưa có bất động sản yêu thích nào
                </p>
                <p
                  style={{
                    margin: "0.6rem 0 0",
                    fontSize: "0.84rem",
                    color: "var(--e-muted)",
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  Nhấn biểu tượng trái tim ở trang chi tiết để lưu lại bất động sản phù hợp.
                </p>
                <Link
                  href="/#listings"
                  style={{
                    marginTop: "1.25rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--e-charcoal)",
                    background: "var(--e-charcoal)",
                    color: "var(--e-white)",
                    textDecoration: "none",
                    fontSize: "0.72rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  Khám phá bất động sản <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {validFavorites.map((favorite) => {
                  const property = favorite.property!;
                  const image = property.images?.[0] || "";
                  const removing =
                    removingId === favorite._id || removingId === favorite.propertyId;

                  return (
                    <article
                      key={favorite._id}
                      style={{
                        overflow: "hidden",
                        borderRadius: 14,
                        border: "1px solid rgba(154,124,69,0.16)",
                        background: "rgba(255,255,255,0.92)",
                        boxShadow: "0 10px 30px rgba(17,28,20,0.06)",
                      }}
                    >
                      <div style={{ position: "relative", height: 210, background: "#e9ecef" }}>
                        {image ? (
                          <Image
                            src={image}
                            alt={property.title}
                            fill
                            unoptimized
                            style={{ objectFit: "cover" }}
                          />
                        ) : null}
                      </div>

                      <div style={{ padding: "1rem 1rem 1.1rem" }}>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            lineHeight: 1.4,
                            color: "var(--e-charcoal)",
                            fontWeight: 600,
                            fontFamily: "var(--e-sans)",
                          }}
                        >
                          {property.title}
                        </h2>
                        <p
                          style={{
                            margin: "0.45rem 0 0",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 6,
                            color: "var(--e-muted)",
                            fontSize: "0.8rem",
                            fontFamily: "var(--e-sans)",
                            lineHeight: 1.55,
                          }}
                        >
                          <MapPin size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                          <span>{property.address}</span>
                        </p>
                        <p
                          style={{
                            margin: "0.7rem 0 0",
                            color: "var(--e-charcoal)",
                            fontSize: "1.05rem",
                            fontWeight: 700,
                            fontFamily: "var(--e-serif)",
                          }}
                        >
                          {formatVNDShort(property.price)}
                        </p>

                        <div style={{ marginTop: "0.85rem", display: "flex", gap: 8 }}>
                          <Link
                            href={`/properties/${property._id}`}
                            style={{
                              flex: 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "9px 12px",
                              borderRadius: 9,
                              border: "1px solid rgba(154,124,69,0.2)",
                              textDecoration: "none",
                              color: "var(--e-charcoal)",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              fontFamily: "var(--e-sans)",
                              background: "rgba(255,255,255,0.92)",
                            }}
                          >
                            Xem chi tiết
                          </Link>
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(favorite)}
                            disabled={removing}
                            style={{
                              width: 42,
                              height: 38,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 9,
                              border: "1px solid rgba(184,74,42,0.24)",
                              color: "#b84a2a",
                              background: "rgba(184,74,42,0.06)",
                              cursor: removing ? "not-allowed" : "pointer",
                              opacity: removing ? 0.6 : 1,
                            }}
                            aria-label="Xóa khỏi yêu thích"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {favoritePendingDelete ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 220,
              background: "rgba(17,28,20,0.42)",
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
            onClick={closeDeleteConfirm}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "min(460px, 100%)",
                borderRadius: 16,
                border: "1px solid rgba(154,124,69,0.2)",
                background: "rgba(255,255,255,0.98)",
                boxShadow: "0 18px 48px rgba(17,28,20,0.2)",
                padding: "1.2rem 1.3rem 1.1rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.58rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--e-gold)",
                  fontWeight: 700,
                  fontFamily: "var(--e-sans)",
                }}
              >
                Xác Nhận Xóa
              </p>
              <h3
                style={{
                  margin: "0.45rem 0 0",
                  fontFamily: "var(--e-serif)",
                  fontSize: "1.25rem",
                  color: "var(--e-charcoal)",
                  fontWeight: 500,
                }}
              >
                Xóa khỏi danh sách yêu thích?
              </h3>
              <p
                style={{
                  margin: "0.55rem 0 0",
                  fontSize: "0.86rem",
                  lineHeight: 1.65,
                  color: "var(--e-muted)",
                  fontFamily: "var(--e-sans)",
                }}
              >
                {favoritePendingDelete.property?.title || "Bất động sản này"} sẽ bị xóa khỏi mục yêu thích của bạn.
              </p>

              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  disabled={Boolean(removingId)}
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(154,124,69,0.2)",
                    background: "rgba(255,255,255,0.9)",
                    color: "var(--e-charcoal)",
                    padding: "9px 14px",
                    fontSize: "0.7rem",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    fontFamily: "var(--e-sans)",
                    cursor: removingId ? "not-allowed" : "pointer",
                    opacity: removingId ? 0.6 : 1,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmDelete()}
                  disabled={Boolean(removingId)}
                  style={{
                    borderRadius: 10,
                    border: "1px solid rgba(184,74,42,0.26)",
                    background: "rgba(184,74,42,0.08)",
                    color: "#b84a2a",
                    padding: "9px 14px",
                    fontSize: "0.7rem",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    fontWeight: 700,
                    fontFamily: "var(--e-sans)",
                    cursor: removingId ? "not-allowed" : "pointer",
                    opacity: removingId ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {removingId ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Xóa Yêu Thích
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <LuxuryFooter />
      </div>
    </>
  );
}
