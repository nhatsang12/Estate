import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Property, PropertyType } from "@/types/property";
import {
  geocodeAddress,
  searchAddressSuggestions,
  type GeocodeSuggestion,
} from "@/services/geocodeService";

const AddressMap = dynamic(() => import("@/components/AddressMap"), { ssr: false });

interface PropertyFormData {
  title: string;
  description: string;
  price: number;
  address: string;
  location: { type: "Point"; coordinates: [number, number] };
  type: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  furnished: boolean;
  yearBuilt?: number;
  amenities: string[];
  images?: File[];
  ownershipDocuments?: File[];
  existingImages?: string[];
}

interface PropertyFormProps {
  initialData?: Property;
  onSubmit: (data: PropertyFormData) => Promise<void>;
  isLoading?: boolean;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Căn Hộ" },
  { value: "house", label: "Nhà Riêng" },
  { value: "villa", label: "Biệt Thự" },
  { value: "studio", label: "Studio" },
  { value: "office", label: "Văn Phòng" },
];

const AMENITIES_OPTIONS = [
  "Hồ bơi", "Phòng gym", "Ban công", "Bãi đỗ xe",
  "Sân vườn", "Bảo vệ 24/7", "WiFi", "Điều hoà",
  "Bếp đầy đủ", "Máy giặt",
];

const STEPS = [
  { id: "basic", label: "Thông Tin Cơ Bản", icon: "①" },
  { id: "detail", label: "Chi Tiết & Tiện Ích", icon: "②" },
  { id: "media", label: "Hình Ảnh & Giấy Tờ", icon: "③" },
];

export default function PropertyForm({ initialData, onSubmit, isLoading = false }: PropertyFormProps) {
  const [formData, setFormData] = useState<PropertyFormData>(
    initialData
      ? {
        title: initialData.title,
        description: initialData.description,
        price: initialData.price,
        address: initialData.address,
        location: initialData.location ?? { type: "Point", coordinates: [0, 0] },
        type: initialData.type,
        bedrooms: initialData.bedrooms,
        bathrooms: initialData.bathrooms,
        area: initialData.area,
        furnished: initialData.furnished ?? false,
        yearBuilt: initialData.yearBuilt,
        amenities: initialData.amenities ?? [],
      }
      : {
        title: "", description: "", price: 0, address: "",
        location: { type: "Point", coordinates: [0, 0] },
        type: "apartment", bedrooms: 1, bathrooms: 1, area: 0,
        furnished: false, yearBuilt: new Date().getFullYear(), amenities: [],
      }
  );

  const [errors, setErrors] = useState<Partial<Record<keyof PropertyFormData, string>>>({});
  const [activeStep, setActiveStep] = useState<string>("basic");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState("");
  const suggestionTimeoutRef = useRef<number | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images ?? []);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const coordinates = formData.location?.coordinates || [0, 0];
  const mapLat = coordinates[1];
  const mapLng = coordinates[0];
  const hasValidCoords =
    Number.isFinite(mapLat) &&
    Number.isFinite(mapLng) &&
    !(mapLat === 0 && mapLng === 0);

  useEffect(() => {
    if (initialData && hasValidCoords) {
      setShowMap(true);
    }
  }, [hasValidCoords, initialData]);

  useEffect(() => {
    if (imagePreviews.length > 0) {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    }
    const nextPreviews = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(nextPreviews);
    return () => {
      nextPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  useEffect(() => {
    const query = formData.address.trim();
    if (!showSuggestions || query.length < 4 || query === lastSelectedAddress) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    if (suggestionTimeoutRef.current) {
      window.clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = window.setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const results = await searchAddressSuggestions(query, 6);
        setSuggestions(results);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    }, 350);

    return () => {
      if (suggestionTimeoutRef.current) {
        window.clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [formData.address, lastSelectedAddress, showSuggestions]);

  const handleSelectSuggestion = (suggestion: GeocodeSuggestion) => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    setFormData((prev) => ({
      ...prev,
      address: suggestion.displayName,
      location: {
        type: "Point",
        coordinates: [suggestion.lng, suggestion.lat],
      },
    }));
    setLastSelectedAddress(suggestion.displayName);
    setShowSuggestions(false);
    setSuggestions([]);
    setShowMap(true);
  };

  const handleMapSelect = (lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
    }));
    setShowMap(true);
  };

  const handleLocateAddress = async () => {
    const address = formData.address.trim();
    if (!address) {
      setLocateError("Vui lòng nhập địa chỉ trước khi tìm trên bản đồ.");
      setShowMap(true);
      return;
    }

    setIsLocating(true);
    setLocateError(null);
    setShowSuggestions(false);

    try {
      const result = await geocodeAddress(address);
      setFormData((prev) => ({
        ...prev,
        address: result.displayName || address,
        location: {
          type: "Point",
          coordinates: [result.lng, result.lat],
        },
      }));
      setLastSelectedAddress(result.displayName || address);
      setShowMap(true);
    } catch (error) {
      setLocateError(
        error instanceof Error
          ? error.message
          : "Không thể xác định vị trí từ địa chỉ."
      );
      setShowMap(true);
    } finally {
      setIsLocating(false);
    }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!formData.title.trim()) e.title = "Tiêu đề bắt buộc";
    if (!formData.description.trim()) e.description = "Mô tả bắt buộc";
    if (formData.price < 0) e.price = "Giá phải là số dương";
    if (!formData.address.trim()) e.address = "Địa chỉ bắt buộc";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload: PropertyFormData = { ...formData };
    if (imageFiles.length > 0) {
      payload.images = imageFiles;
    }
    if (documentFiles.length > 0) {
      payload.ownershipDocuments = documentFiles;
    }
    // Send existingImages so backend knows which old images to keep
    if (initialData) {
      payload.existingImages = existingImages;
    }
    try {
      await onSubmit(payload);
    } catch (error) {
      console.error("Property form submit failed:", error);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setImageFiles((prev) => {
      const merged = [...prev, ...files];
      return merged.slice(0, 10);
    });

    event.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    setDocumentFiles((prev) => {
      const merged = [...prev, ...files];
      return merged.slice(0, 5);
    });

    event.target.value = "";
  };

  const handleRemoveDocument = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (a: string) =>
    setFormData(p => ({
      ...p,
      amenities: p.amenities.includes(a)
        ? p.amenities.filter(x => x !== a)
        : [...p.amenities, a],
    }));

  const completedFields = [
    formData.title, formData.description, formData.address,
    formData.price > 0, formData.area && formData.area > 0,
  ].filter(Boolean).length;
  const progress = Math.round((completedFields / 5) * 100);

  const stepIdx = STEPS.findIndex(s => s.id === activeStep);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      {/* ── Top summary card ── */}
      <div className="e-glass-card-dark" style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.2rem',
        gap: '1.5rem',
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--e-gold-light)', fontWeight: 700, marginBottom: 4 }}>
            {initialData ? 'Chỉnh Sửa Bất Động Sản' : 'Đăng Tin Mới'}
          </p>
          <p style={{ fontFamily: "var(--e-sans)", fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
            {formData.title || 'Nhập tiêu đề...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          {formData.type && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Loại</p>
              <p style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, fontFamily: "var(--e-sans)" }}>{PROPERTY_TYPES.find(t => t.value === formData.type)?.label}</p>
            </div>
          )}
          {formData.price > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Giá</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--e-gold-light)', fontWeight: 700, fontFamily: "var(--e-sans)" }}>{formData.price.toLocaleString('vi-VN')} ₫</p>
            </div>
          )}
          {formData.area && formData.area > 0 ? (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Diện tích</p>
              <p style={{ fontSize: '0.82rem', color: '#fff', fontWeight: 600, fontFamily: "var(--e-sans)" }}>{formData.area} m²</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Stepper ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        marginBottom: '2rem',
        padding: '0 1rem',
      }}>
        {STEPS.map((step, idx) => {
          const isActive = idx === stepIdx;
          const isDone = idx < stepIdx;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div style={{
                  flex: 1, height: 2, maxWidth: 100,
                  background: isDone ? 'var(--e-gold)' : 'rgba(0,0,0,0.08)',
                  transition: 'background 0.3s',
                }} />
              )}
              <button type="button" onClick={() => setActiveStep(step.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "var(--e-sans)", fontSize: '0.82rem', fontWeight: 700,
                  background: isActive ? 'var(--e-gold)' : isDone ? 'var(--e-charcoal)' : 'var(--e-beige)',
                  color: isActive || isDone ? '#fff' : 'var(--e-muted)',
                  transition: 'all 0.3s',
                  boxShadow: isActive ? '0 4px 14px rgba(154,124,69,0.35)' : 'none',
                }}>
                  {isDone ? '✓' : idx + 1}
                </div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--e-charcoal)' : 'var(--e-muted)',
                  fontFamily: "var(--e-sans)",
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Progress bar ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--e-muted)', fontWeight: 600 }}>Hoàn thành</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--e-gold)', fontWeight: 700 }}>{progress}%</span>
        </div>
        <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2 }}>
          <div style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, var(--e-gold), var(--e-gold-light))', width: `${progress}%`, transition: 'width 0.4s' }} />
        </div>
      </div>

      {/* ── Form card ── */}
      <div className="e-form e-glass-card" style={{
        padding: '2.5rem',
      }}>

        {/* SECTION: Thông tin cơ bản */}
        {activeStep === 'basic' && (
          <div>
            <div className="e-form-section-title">Thông Tin Cơ Bản</div>

            <div className="e-form-group" style={{ marginTop: '1.5rem' }}>
              <label className="e-form-label">Tiêu Đề</label>
              <input type="text"
                className={`e-form-input${errors.title ? ' error' : ''}`}
                value={formData.title}
                placeholder="Nhập tiêu đề bất động sản"
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
              {errors.title && <p className="e-form-error">{errors.title}</p>}
            </div>

            <div className="e-form-group">
              <label className="e-form-label">Mô Tả</label>
              <textarea
                className={`e-form-textarea${errors.description ? ' error' : ''}`}
                value={formData.description} rows={4}
                placeholder="Mô tả chi tiết về bất động sản"
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
              {errors.description && <p className="e-form-error">{errors.description}</p>}
            </div>

            <div className="e-form-grid-2" style={{ marginTop: 20 }}>
              <div className="e-form-group">
                <label className="e-form-label">Giá</label>
                <div className="e-form-price-wrap">
                  <input type="number"
                    className={`e-form-input${errors.price ? ' error' : ''}`}
                    value={formData.price === 0 ? "" : formData.price} placeholder="0" min={0}
                    style={{ paddingRight: 52 }}
                    onChange={e => setFormData({ ...formData, price: e.target.value === "" ? 0 : Number(e.target.value) })}
                  />
                  <span className="e-form-price-unit">VNĐ</span>
                </div>
                {errors.price && <p className="e-form-error">{errors.price}</p>}
                {formData.price > 0 && (
                  <p className="e-form-hint">≈ {formData.price.toLocaleString('vi-VN')} ₫</p>
                )}
              </div>
              <div className="e-form-group" >
                <label className="e-form-label">Loại Bất Động Sản</label>
                <select className="e-form-select" value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as PropertyType })}
                >
                  {PROPERTY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="e-form-group">
              <label className="e-form-label">Địa Chỉ</label>
              <input type="text"
                className={`e-form-input${errors.address ? ' error' : ''}`}
                value={formData.address}
                placeholder="Số nhà, đường, quận, tỉnh thành"
                onChange={e => {
                  setFormData({ ...formData, address: e.target.value });
                  setShowSuggestions(true);
                  setLastSelectedAddress("");
                  setShowMap(false);
                  setLocateError(null);
                }}
                onFocus={() => {
                  if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
                  setShowSuggestions(true);
                }}
                onBlur={() => {
                  if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
                  blurTimeoutRef.current = window.setTimeout(() => setShowSuggestions(false), 180);
                }}
              />
              {errors.address && <p className="e-form-error">{errors.address}</p>}
              <p className="e-form-hint">Chọn gợi ý địa chỉ để hiển thị bản đồ và chỉnh vị trí thủ công.</p>

              <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" onClick={handleLocateAddress} disabled={isLocating}
                  style={{
                    padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)',
                    background: 'var(--e-cream)', fontSize: '0.78rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: "var(--e-sans)", color: 'var(--e-charcoal)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isLocating ? "Đang tìm..." : "Xem trên bản đồ"}
                </button>
                <span style={{ fontSize: '0.72rem', color: 'var(--e-muted)' }}>
                  Click hoặc kéo pin để chọn vị trí chính xác.
                </span>
              </div>

              {showSuggestions && (
                <div className="address-suggestions">
                  {isSuggesting && (
                    <div className="address-suggestion-item muted">Đang gợi ý địa chỉ...</div>
                  )}
                  {!isSuggesting && suggestions.length === 0 && formData.address.trim().length >= 4 && (
                    <div className="address-suggestion-item muted">
                      Không tìm thấy gợi ý phù hợp. Hãy nhập địa chỉ chi tiết hơn.
                    </div>
                  )}
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="address-suggestion-item"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <span className="address-suggestion-title">{suggestion.displayName}</span>
                    </button>
                  ))}
                </div>
              )}

              {showMap && (
                <div className="address-map-panel">
                  <div className="address-map-title">Chọn vị trí chính xác trên bản đồ</div>
                  <AddressMap
                    lat={hasValidCoords ? mapLat : undefined}
                    lng={hasValidCoords ? mapLng : undefined}
                    onSelect={handleMapSelect}
                  />
                  {hasValidCoords && (
                    <div className="address-map-coords">
                      Tọa độ đã chọn: {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
                    </div>
                  )}
                  {locateError && (
                    <div className="address-map-error">{locateError}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: Chi tiết */}
        {activeStep === 'detail' && (
          <div>
            <div className="e-form-section-title">Chi Tiết</div>

            <div className="e-form-group" style={{ marginTop: '1.5rem' }}>
              <label className="e-form-label">Thông Số</label>
              <div className="e-form-grid-3">
                <div className="e-form-grid-cell">
                  <label className="e-form-label" style={{ marginBottom: 6 }}>Phòng ngủ</label>
                  <input type="number" className="e-form-input" min={0}
                    value={formData.bedrooms ?? 0}
                    onChange={e => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                  />
                </div>
                <div className="e-form-grid-cell">
                  <label className="e-form-label" style={{ marginBottom: 6 }}>Phòng tắm</label>
                  <input type="number" className="e-form-input" min={0}
                    value={formData.bathrooms ?? 0}
                    onChange={e => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                  />
                </div>
                <div className="e-form-grid-cell">
                  <label className="e-form-label" style={{ marginBottom: 6 }}>Diện tích (m²)</label>
                  <input type="number" className="e-form-input" min={0}
                    value={formData.area ?? 0}
                    onChange={e => setFormData({ ...formData, area: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="e-form-group">
              <label className="e-form-label">Năm Xây Dựng</label>
              <input type="number" className="e-form-input"
                style={{ maxWidth: 200 }}
                min={1900} max={new Date().getFullYear()}
                value={formData.yearBuilt ?? new Date().getFullYear()}
                onChange={e => setFormData({ ...formData, yearBuilt: Number(e.target.value) })}
              />
            </div>

            <div className="e-form-group">
              <label className="e-form-label">Nội Thất</label>
              <label className="e-form-toggle-wrap">
                <input type="checkbox"
                  checked={formData.furnished}
                  onChange={e => setFormData({ ...formData, furnished: e.target.checked })}
                />
                <span className="e-form-toggle-label">Có nội thất đầy đủ</span>
              </label>
            </div>

            <div className="e-form-group">
              <label className="e-form-label">Tiện Ích</label>
              <div className="e-form-checkbox-group">
                {AMENITIES_OPTIONS.map(a => (
                  <label key={a} className="e-form-checkbox-item">
                    <input type="checkbox"
                      checked={formData.amenities.includes(a)}
                      onChange={() => toggleAmenity(a)}
                    />
                    <span>{a}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION: Hình ảnh & Pháp lý */}
        {activeStep === 'media' && (
          <div>
            <div className="e-form-section-title">Hình Ảnh & Giấy Tờ</div>

            <div className="e-form-group" style={{ marginTop: '1.5rem' }}>
              <label className="e-form-label">Hình Ảnh</label>
              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
                <label style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px dashed rgba(0,0,0,0.15)',
                  background: 'var(--e-cream)', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "var(--e-sans)", color: 'var(--e-charcoal)',
                  transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <input type="file" accept="image/*" multiple
                    onChange={handleImageChange} style={{ display: "none" }}
                  />
                  Chọn ảnh từ máy
                </label>
                <span style={{ fontSize: "0.72rem", color: "var(--e-muted)" }}>
                  Tối đa 10 ảnh, mỗi ảnh ≤ 5MB.
                </span>
              </div>

              {existingImages.length > 0 ? (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-muted)", marginBottom: "0.6rem", fontWeight: 600 }}>Ảnh đã đăng ({existingImages.length})</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                    {existingImages.map((url, idx) => (
                      <div key={`${url}-${idx}`} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", background: "var(--e-cream)" }}>
                        <img src={url} alt={`Ảnh đã đăng ${idx + 1}`} style={{ width: "100%", height: 110, objectFit: "cover" }} />
                        <button type="button" onClick={() => handleRemoveExistingImage(idx)}
                          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, border: "none", background: "rgba(184,74,42,0.85)", color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#b84a2a"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(184,74,42,0.85)"; }}
                          aria-label="Xóa ảnh">✕</button>
                      </div>
                    ))}
                  </div>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--e-muted)" }}>Nhấn ✕ để xóa ảnh cũ. Ảnh mới sẽ được thêm vào cùng ảnh còn lại.</p>
                </div>
              ) : initialData?.images?.length ? (
                <p style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#b84a2a", fontWeight: 600 }}>Tất cả ảnh cũ đã được xóa. Hãy thêm ảnh mới.</p>
              ) : null}

              {imagePreviews.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-muted)", marginBottom: "0.6rem", fontWeight: 600 }}>Ảnh mới chọn</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "8px" }}>
                    {imagePreviews.map((url, idx) => (
                      <div key={`${url}-${idx}`} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)", background: "var(--e-cream)" }}>
                        <img src={url} alt={`Ảnh mới ${idx + 1}`} style={{ width: "100%", height: 110, objectFit: "cover" }} />
                        <button type="button" onClick={() => handleRemoveImage(idx)}
                          style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "0.7rem", cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          aria-label="Xóa ảnh">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="e-form-group">
              <label className="e-form-label">Giấy Tờ Pháp Lý</label>
              <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
                <label style={{
                  padding: '10px 20px', borderRadius: 10, border: '1px dashed rgba(0,0,0,0.15)',
                  background: 'var(--e-cream)', fontSize: '0.8rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "var(--e-sans)", color: 'var(--e-charcoal)',
                  transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <input type="file" accept=".pdf,image/*" multiple
                    onChange={handleDocumentChange} style={{ display: "none" }}
                  />
                  Chọn giấy tờ
                </label>
                <span style={{ fontSize: "0.72rem", color: "var(--e-muted)" }}>
                  Tối đa 5 file (PDF hoặc ảnh).
                </span>
              </div>

              {initialData?.ownershipDocuments?.length ? (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-muted)", marginBottom: "0.6rem", fontWeight: 600 }}>Giấy tờ đã tải lên</p>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {initialData.ownershipDocuments.map((url, idx) => (
                      <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer"
                        style={{ fontSize: "0.78rem", color: "var(--e-gold)", textDecoration: "underline" }}>
                        Giấy tờ {idx + 1}
                      </a>
                    ))}
                  </div>
                  <p style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--e-muted)" }}>File mới sẽ được thêm vào.</p>
                </div>
              ) : null}

              {documentFiles.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--e-muted)", marginBottom: "0.6rem", fontWeight: 600 }}>File mới chọn</p>
                  <div style={{ display: "grid", gap: "6px" }}>
                    {documentFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)", background: "var(--e-cream)" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--e-charcoal)" }}>{file.name}</span>
                        <button type="button" onClick={() => handleRemoveDocument(idx)}
                          style={{ border: "none", background: "transparent", color: "#c0392b", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}>
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Footer navigation ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: '2.5rem', paddingTop: '1.5rem',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}>
          <button type="button"
            onClick={() => {
              const prev = STEPS[stepIdx - 1];
              if (prev) setActiveStep(prev.id);
            }}
            disabled={stepIdx === 0}
            style={{
              padding: '10px 24px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
              fontSize: '0.78rem', fontWeight: 600, cursor: stepIdx === 0 ? 'not-allowed' : 'pointer',
              fontFamily: "var(--e-sans)", color: stepIdx === 0 ? '#bab5b0' : 'var(--e-charcoal)',
              transition: 'all 0.2s', opacity: stepIdx === 0 ? 0.5 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            ← Trước
          </button>

          {stepIdx < STEPS.length - 1 ? (
            <button type="button"
              onClick={() => {
                const next = STEPS[stepIdx + 1];
                if (next) setActiveStep(next.id);
              }}
              style={{
                padding: '10px 24px', borderRadius: 10,
                border: 'none', background: 'var(--e-charcoal)', color: '#fff',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: "var(--e-sans)", transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              Tiếp theo →
            </button>
          ) : (
            <button type="button" className="e-form-submit" disabled={isLoading}
              onClick={handleSubmit}
              style={{ maxWidth: 280 }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  Đang lưu…
                </>
              ) : (
                initialData ? '✓ Cập Nhật' : '✓ Tạo Bất Động Sản'
              )}
            </button>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
