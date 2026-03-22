import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2, Home, Castle, LayoutDashboard, Briefcase,
  Waves, Dumbbell, Wind, Car, Trees, ShieldCheck, Wifi,
  AirVent, ChefHat, WashingMachine,
  Bed, Bath, Ruler, CalendarDays, MapPin, DollarSign,
  ImageIcon, FileText, ChevronLeft, ChevronRight,
  Check, Loader2, X, UploadCloud, FileUp,
} from "lucide-react";
import type { Property, PropertyType } from "@/types/property";
import {
  geocodeAddress,
  searchAddressSuggestions,
  type GeocodeSuggestion,
} from "@/services/geocodeService";

const AddressMap = dynamic(() => import("@/components/AddressMap"), { ssr: false });

/* ─────────────────────────── Types ─────────────────────────── */
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

/* ─────────────────────────── Constants ─────────────────────────── */
const PROPERTY_TYPES: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
  { value: "apartment", label: "Căn Hộ", icon: <Building2 size={14} /> },
  { value: "house", label: "Nhà Riêng", icon: <Home size={14} /> },
  { value: "villa", label: "Biệt Thự", icon: <Castle size={14} /> },
  { value: "studio", label: "Studio", icon: <LayoutDashboard size={14} /> },
  { value: "office", label: "Văn Phòng", icon: <Briefcase size={14} /> },
];

const AMENITIES_OPTIONS: { label: string; icon: React.ReactNode }[] = [
  { label: "Hồ bơi", icon: <Waves size={14} /> },
  { label: "Phòng gym", icon: <Dumbbell size={14} /> },
  { label: "Ban công", icon: <Wind size={14} /> },
  { label: "Bãi đỗ xe", icon: <Car size={14} /> },
  { label: "Sân vườn", icon: <Trees size={14} /> },
  { label: "Bảo vệ 24/7", icon: <ShieldCheck size={14} /> },
  { label: "WiFi", icon: <Wifi size={14} /> },
  { label: "Điều hoà", icon: <AirVent size={14} /> },
  { label: "Bếp đầy đủ", icon: <ChefHat size={14} /> },
  { label: "Máy giặt", icon: <WashingMachine size={14} /> },
];

const STEPS = [
  { id: "basic", num: "01", label: "Thông Tin Cơ Bản", sub: "Tiêu đề, giá, địa chỉ" },
  { id: "detail", num: "02", label: "Chi Tiết & Tiện Ích", sub: "Quy mô, nội thất, amenities" },
  { id: "media", num: "03", label: "Hình Ảnh & Giấy Tờ", sub: "Upload ảnh và tài liệu" },
];

/* ─────────────────────────── Component ─────────────────────────── */
export default function PropertyForm({ initialData, onSubmit, isLoading = false }: PropertyFormProps) {
  const [formData, setFormData] = useState<PropertyFormData>(
    initialData ? {
      title: initialData.title, description: initialData.description,
      price: initialData.price, address: initialData.address,
      location: initialData.location ?? { type: "Point", coordinates: [0, 0] },
      type: initialData.type, bedrooms: initialData.bedrooms,
      bathrooms: initialData.bathrooms, area: initialData.area,
      furnished: initialData.furnished ?? false, yearBuilt: initialData.yearBuilt,
      amenities: initialData.amenities ?? [],
    } : {
      title: "", description: "", price: 0, address: "",
      location: { type: "Point", coordinates: [0, 0] },
      type: "apartment", bedrooms: 1, bathrooms: 1, area: 0,
      furnished: false, yearBuilt: new Date().getFullYear(), amenities: [],
    }
  );

  const [errors, setErrors] = useState<Partial<Record<keyof PropertyFormData, string>>>({});
  const [activeStep, setActiveStep] = useState("basic");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images ?? []);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);

  const suggestionTimeoutRef = useRef<number | null>(null);
  const blurTimeoutRef = useRef<number | null>(null);

  const coordinates = formData.location?.coordinates || [0, 0];
  const mapLat = coordinates[1];
  const mapLng = coordinates[0];
  const hasValidCoords =
    Number.isFinite(mapLat) && Number.isFinite(mapLng) && !(mapLat === 0 && mapLng === 0);

  useEffect(() => { if (initialData && hasValidCoords) setShowMap(true); }, [hasValidCoords, initialData]);

  useEffect(() => {
    const next = imageFiles.map(f => URL.createObjectURL(f));
    setImagePreviews(next);
    return () => { next.forEach(u => URL.revokeObjectURL(u)); };
  }, [imageFiles]);

  useEffect(() => {
    const query = formData.address.trim();
    if (!showSuggestions || query.length < 4 || query === lastSelectedAddress) {
      setSuggestions([]); setIsSuggesting(false); return;
    }
    if (suggestionTimeoutRef.current) window.clearTimeout(suggestionTimeoutRef.current);
    suggestionTimeoutRef.current = window.setTimeout(async () => {
      setIsSuggesting(true);
      try { setSuggestions(await searchAddressSuggestions(query, 6)); }
      catch { setSuggestions([]); }
      finally { setIsSuggesting(false); }
    }, 350);
    return () => { if (suggestionTimeoutRef.current) window.clearTimeout(suggestionTimeoutRef.current); };
  }, [formData.address, lastSelectedAddress, showSuggestions]);

  const handleSelectSuggestion = (s: GeocodeSuggestion) => {
    if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current);
    setFormData(p => ({ ...p, address: s.displayName, location: { type: "Point", coordinates: [s.lng, s.lat] } }));
    setLastSelectedAddress(s.displayName);
    setShowSuggestions(false); setSuggestions([]); setShowMap(true);
  };

  const handleMapSelect = (lat: number, lng: number) => {
    setFormData(p => ({ ...p, location: { type: "Point", coordinates: [lng, lat] } }));
    setShowMap(true);
  };

  const handleLocateAddress = async () => {
    const address = formData.address.trim();
    if (!address) { setLocateError("Vui lòng nhập địa chỉ trước."); setShowMap(true); return; }
    setIsLocating(true); setLocateError(null); setShowSuggestions(false);
    try {
      const r = await geocodeAddress(address);
      setFormData(p => ({ ...p, address: r.displayName || address, location: { type: "Point", coordinates: [r.lng, r.lat] } }));
      setLastSelectedAddress(r.displayName || address); setShowMap(true);
    } catch (e) {
      setLocateError(e instanceof Error ? e.message : "Không thể xác định vị trí."); setShowMap(true);
    } finally { setIsLocating(false); }
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!formData.title.trim()) e.title = "Tiêu đề bắt buộc";
    if (!formData.description.trim()) e.description = "Mô tả bắt buộc";
    if (formData.price < 0) e.price = "Giá phải là số dương";
    if (!formData.address.trim()) e.address = "Địa chỉ bắt buộc";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = { ...formData };
    if (imageFiles.length > 0) payload.images = imageFiles;
    if (documentFiles.length > 0) payload.ownershipDocuments = documentFiles;
    if (initialData) payload.existingImages = existingImages;
    try { await onSubmit(payload); } catch (err) { console.error(err); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImageFiles(p => [...p, ...files].slice(0, 10));
    e.target.value = "";
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setDocumentFiles(p => [...p, ...files].slice(0, 5));
    e.target.value = "";
  };

  const toggleAmenity = (a: string) =>
    setFormData(p => ({
      ...p,
      amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a],
    }));

  const completedFields = [
    formData.title, formData.description, formData.address,
    formData.price > 0, formData.area && formData.area > 0,
  ].filter(Boolean).length;
  const progress = Math.round((completedFields / 5) * 100);
  const stepIdx = STEPS.findIndex(s => s.id === activeStep);

  /* ─── Render ─── */
  return (
    <>
      <style>{FORM_CSS}</style>

      <div className="pf-page">

        {/* ── Page header ── */}
        <div className="pf-page-header">
          <div className="pf-page-header-inner">
            <div>
              <div className="e-section-label">
                {initialData ? "Chỉnh Sửa Bất Động Sản" : "Đăng Tin Mới"}
              </div>
              <h1 className="pf-page-title">
                {formData.title || <><em>Tạo tin đăng</em> bất động sản</>}
              </h1>
            </div>
            <div className="pf-progress-stack">
              <div className="pf-progress-meta">
                <span className="pf-progress-label">Hoàn thành hồ sơ</span>
                <span className="pf-progress-pct">{progress}%</span>
              </div>
              <div className="pf-progress-bar-wrap">
                <div className="pf-progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="pf-layout">

          {/* ── Sidebar ── */}
          <aside className="pf-sidebar">
            <div className="pf-sidebar-sticky">

              {/* Summary card */}
              {(formData.price > 0 || (formData.area && formData.area > 0)) && (
                <div className="pf-summary-card">
                  {formData.price > 0 && (
                    <div className="pf-summary-row">
                      <span className="pf-summary-lbl">Giá niêm yết</span>
                      <span className="pf-summary-val pf-summary-price">
                        {(formData.price / 1_000_000).toFixed(0)} tr ₫
                      </span>
                    </div>
                  )}
                  {!!formData.area && (
                    <div className="pf-summary-row">
                      <span className="pf-summary-lbl">Diện tích</span>
                      <span className="pf-summary-val">{formData.area} m²</span>
                    </div>
                  )}
                  {!!formData.bedrooms && (
                    <div className="pf-summary-row">
                      <span className="pf-summary-lbl">Phòng ngủ</span>
                      <span className="pf-summary-val">{formData.bedrooms} PN</span>
                    </div>
                  )}
                  <div className="pf-summary-type">
                    <span className="pf-summary-type-icon">
                      {PROPERTY_TYPES.find(t => t.value === formData.type)?.icon}
                    </span>
                    {PROPERTY_TYPES.find(t => t.value === formData.type)?.label}
                  </div>
                </div>
              )}

              {/* Step nav */}
              <nav className="pf-step-list">
                {STEPS.map((step, i) => {
                  const isActive = step.id === activeStep;
                  const isDone = i < stepIdx;
                  return (
                    <button key={step.id} type="button"
                      className={`pf-step-item${isActive ? " pf-step-active" : ""}${isDone ? " pf-step-done" : ""}`}
                      onClick={() => setActiveStep(step.id)}>
                      <span className="pf-step-num">
                        {isDone ? <Check size={11} strokeWidth={3} /> : step.num}
                      </span>
                      <span className="pf-step-content">
                        <span className="pf-step-title">{step.label}</span>
                        <span className="pf-step-sub">{step.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Amenities preview */}
              {formData.amenities.length > 0 && (
                <div className="pf-amenity-preview">
                  <span className="pf-amenity-preview-lbl">Tiện ích đã chọn</span>
                  <div className="pf-amenity-preview-list">
                    {formData.amenities.map(a => {
                      const found = AMENITIES_OPTIONS.find(o => o.label === a);
                      return (
                        <span key={a} className="pf-amenity-tag">
                          <span className="pf-amenity-tag-icon">{found?.icon}</span>
                          {a}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="pf-main">

            {/* Section heading */}
            <div className="pf-section-head">
              <span className="pf-big-num">{STEPS[stepIdx].num}</span>
              <div>
                <div className="e-section-label">{STEPS[stepIdx].label}</div>
                <p className="pf-section-sub">{STEPS[stepIdx].sub}</p>
              </div>
            </div>

            {/* ────────── STEP 01 ────────── */}
            {activeStep === "basic" && (
              <div className="pf-fields">
                <div className="pf-field">
                  <label className="e-form-label">Tiêu Đề <span className="pf-req">*</span></label>
                  <input type="text"
                    className={`e-form-input${errors.title ? " error" : ""}`}
                    placeholder="Ví dụ: Căn hộ cao cấp view sông, 3PN đầy đủ nội thất"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                  {errors.title && <p className="e-form-error">{errors.title}</p>}
                </div>

                <div className="pf-field">
                  <label className="e-form-label">Mô Tả <span className="pf-req">*</span></label>
                  <textarea
                    className={`pf-textarea${errors.description ? " error" : ""}`}
                    rows={5}
                    placeholder="Mô tả đặc điểm nổi bật, vị trí, tiện ích xung quanh..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                  {errors.description && <p className="e-form-error">{errors.description}</p>}
                </div>

                <div className="pf-field-row">
                  <div className="pf-field">
                    <label className="e-form-label">
                      <DollarSign size={13} className="pf-label-icon" />
                      Giá Niêm Yết <span className="pf-req">*</span>
                    </label>
                    <div className="pf-input-suffix-wrap">
                      <input type="number"
                        className={`e-form-input${errors.price ? " error" : ""}`}
                        placeholder="0" min={0} style={{ paddingRight: 54 }}
                        value={formData.price === 0 ? "" : formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value === "" ? 0 : Number(e.target.value) })}
                      />
                      <span className="pf-suffix-lbl">VNĐ</span>
                    </div>
                    {errors.price && <p className="e-form-error">{errors.price}</p>}
                    {formData.price > 0 && (
                      <p className="e-form-hint">≈ {formData.price.toLocaleString("vi-VN")} ₫</p>
                    )}
                  </div>

                  <div className="pf-field">
                    <label className="e-form-label">
                      <Building2 size={13} className="pf-label-icon" />
                      Loại Bất Động Sản
                    </label>
                    <div className="pf-type-grid">
                      {PROPERTY_TYPES.map(t => (
                        <button key={t.value} type="button"
                          className={`pf-type-btn${formData.type === t.value ? " pf-type-btn-on" : ""}`}
                          onClick={() => setFormData({ ...formData, type: t.value })}>
                          <span className="pf-type-btn-icon">{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pf-field">
                  <label className="e-form-label">
                    <MapPin size={13} className="pf-label-icon" />
                    Địa Chỉ <span className="pf-req">*</span>
                  </label>
                  <div className="pf-addr-row">
                    <input type="text"
                      className={`e-form-input${errors.address ? " error" : ""}`}
                      style={{ flex: 1 }}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                      value={formData.address}
                      onChange={e => {
                        setFormData({ ...formData, address: e.target.value });
                        setShowSuggestions(true); setLastSelectedAddress(""); setShowMap(false); setLocateError(null);
                      }}
                      onFocus={() => { if (blurTimeoutRef.current) window.clearTimeout(blurTimeoutRef.current); setShowSuggestions(true); }}
                      onBlur={() => { blurTimeoutRef.current = window.setTimeout(() => setShowSuggestions(false), 180); }}
                    />
                    <button type="button" className="pf-map-btn" onClick={handleLocateAddress} disabled={isLocating}>
                      {isLocating ? <Loader2 size={14} className="pf-spin-icon" /> : <MapPin size={14} />}
                      {isLocating ? "Đang tìm..." : "Bản đồ"}
                    </button>
                  </div>
                  {errors.address && <p className="e-form-error">{errors.address}</p>}
                  <p className="e-form-hint">Chọn địa chỉ từ gợi ý để xác định toạ độ chính xác hơn.</p>

                  {showSuggestions && (
                    <div className="pf-suggestions">
                      {isSuggesting && (
                        <div className="pf-suggest-row pf-suggest-muted">
                          <Loader2 size={13} className="pf-spin-icon" /> Đang tìm kiếm...
                        </div>
                      )}
                      {!isSuggesting && suggestions.length === 0 && formData.address.trim().length >= 4 && (
                        <div className="pf-suggest-row pf-suggest-muted">Không tìm thấy địa chỉ phù hợp.</div>
                      )}
                      {suggestions.map(s => (
                        <button key={s.id} type="button" className="pf-suggest-row"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => handleSelectSuggestion(s)}>
                          <MapPin size={12} className="pf-suggest-pin" />
                          {s.displayName}
                        </button>
                      ))}
                    </div>
                  )}

                  {showMap && (
                    <div className="pf-map-panel">
                      <p className="pf-map-label">
                        <MapPin size={12} /> Xác nhận vị trí trên bản đồ
                      </p>
                      <div className="pf-map-frame">
                        <AddressMap
                          lat={hasValidCoords ? mapLat : undefined}
                          lng={hasValidCoords ? mapLng : undefined}
                          onSelect={handleMapSelect}
                        />
                      </div>
                      {hasValidCoords && (
                        <p className="e-form-hint" style={{ marginTop: 8 }}>
                          Toạ độ: {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
                        </p>
                      )}
                      {locateError && <p className="e-form-error">{locateError}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ────────── STEP 02 ────────── */}
            {activeStep === "detail" && (
              <div className="pf-fields">
                <div className="pf-field">
                  <label className="e-form-label">Thông Số Kỹ Thuật</label>
                  <div className="pf-specs-grid">
                    {[
                      { icon: <Bed size={18} />, label: "Phòng ngủ", key: "bedrooms" },
                      { icon: <Bath size={18} />, label: "Phòng tắm", key: "bathrooms" },
                      { icon: <Ruler size={18} />, label: "Diện tích (m²)", key: "area" },
                    ].map(({ icon, label, key }) => (
                      <div key={key} className="pf-spec-card">
                        <div className="pf-spec-icon">{icon}</div>
                        <label className="pf-spec-lbl">{label}</label>
                        <input type="number" className="pf-spec-input" min={0}
                          value={(formData[key as keyof PropertyFormData] as number) ?? 0}
                          onChange={e => setFormData({ ...formData, [key]: Number(e.target.value) })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pf-field-row">
                  <div className="pf-field">
                    <label className="e-form-label">
                      <CalendarDays size={13} className="pf-label-icon" />
                      Năm Xây Dựng
                    </label>
                    <input type="number" className="e-form-input"
                      min={1900} max={new Date().getFullYear()}
                      value={formData.yearBuilt ?? new Date().getFullYear()}
                      onChange={e => setFormData({ ...formData, yearBuilt: Number(e.target.value) })}
                    />
                  </div>
                  <div className="pf-field">
                    <label className="e-form-label">Tình Trạng Nội Thất</label>
                    <button type="button"
                      className={`pf-toggle${formData.furnished ? " pf-toggle-on" : ""}`}
                      onClick={() => setFormData({ ...formData, furnished: !formData.furnished })}>
                      <span className="pf-toggle-track"><span className="pf-toggle-thumb" /></span>
                      <span className="pf-toggle-lbl">
                        {formData.furnished ? "Đã hoàn thiện nội thất" : "Chưa có nội thất"}
                      </span>
                      {formData.furnished && <Check size={13} className="pf-toggle-check" />}
                    </button>
                  </div>
                </div>

                <div className="pf-field">
                  <label className="e-form-label">
                    <Wifi size={13} className="pf-label-icon" />
                    Tiện Ích Tích Hợp
                  </label>
                  <div className="pf-amenities">
                    {AMENITIES_OPTIONS.map(({ label, icon }) => {
                      const on = formData.amenities.includes(label);
                      return (
                        <button key={label} type="button"
                          className={`pf-amenity-btn${on ? " pf-amenity-on" : ""}`}
                          onClick={() => toggleAmenity(label)}>
                          <span className="pf-amenity-btn-icon">{icon}</span>
                          {label}
                          {on && <Check size={11} className="pf-amenity-check" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ────────── STEP 03 ────────── */}
            {activeStep === "media" && (
              <div className="pf-fields">
                <div className="pf-field">
                  <label className="e-form-label">
                    <ImageIcon size={13} className="pf-label-icon" />
                    Hình Ảnh
                  </label>
                  <label className="pf-dropzone">
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: "none" }} />
                    <UploadCloud size={28} className="pf-drop-icon" strokeWidth={1.5} />
                    <p className="pf-drop-title">Kéo & thả hoặc <span>chọn ảnh</span></p>
                    <p className="pf-drop-hint">Tối đa 10 ảnh · Mỗi ảnh ≤ 5MB · JPG, PNG, WEBP</p>
                  </label>

                  {existingImages.length > 0 && (
                    <div className="pf-img-sec">
                      <span className="pf-img-sec-lbl">Ảnh đã đăng · {existingImages.length}</span>
                      <div className="pf-img-grid">
                        {existingImages.map((url, i) => (
                          <div key={`${url}-${i}`} className="pf-thumb">
                            <img src={url} alt="" />
                            <button type="button" className="pf-thumb-del"
                              onClick={() => setExistingImages(p => p.filter((_, j) => j !== i))}>
                              <X size={10} strokeWidth={3} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="e-form-hint">Nhấn X để xoá ảnh cũ. Ảnh mới sẽ được ghép thêm.</p>
                    </div>
                  )}

                  {initialData?.images?.length && existingImages.length === 0 && (
                    <p className="e-form-error" style={{ marginTop: 8 }}>Tất cả ảnh cũ đã xoá. Hãy thêm ảnh mới.</p>
                  )}

                  {imagePreviews.length > 0 && (
                    <div className="pf-img-sec">
                      <span className="pf-img-sec-lbl pf-img-new">Ảnh mới · {imagePreviews.length}</span>
                      <div className="pf-img-grid">
                        {imagePreviews.map((url, i) => (
                          <div key={`${url}-${i}`} className="pf-thumb pf-thumb-new">
                            <img src={url} alt="" />
                            <button type="button" className="pf-thumb-del"
                              onClick={() => setImageFiles(p => p.filter((_, j) => j !== i))}>
                              <X size={10} strokeWidth={3} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pf-field">
                  <label className="e-form-label">
                    <FileText size={13} className="pf-label-icon" />
                    Giấy Tờ Pháp Lý
                  </label>
                  <label className="pf-dropzone pf-dropzone-sm">
                    <input type="file" accept=".pdf,image/*" multiple onChange={handleDocumentChange} style={{ display: "none" }} />
                    <FileUp size={22} className="pf-drop-icon" strokeWidth={1.5} />
                    <p className="pf-drop-title">Chọn giấy tờ pháp lý</p>
                    <p className="pf-drop-hint">Tối đa 5 file · PDF hoặc ảnh</p>
                  </label>

                  {initialData?.ownershipDocuments?.length ? (
                    <div className="pf-doc-sec">
                      <span className="pf-img-sec-lbl">Giấy tờ đã tải lên</span>
                      {initialData.ownershipDocuments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="pf-doc-link">
                          <FileText size={13} /> Giấy tờ {i + 1}
                        </a>
                      ))}
                      <p className="e-form-hint">File mới sẽ được thêm vào.</p>
                    </div>
                  ) : null}

                  {documentFiles.length > 0 && (
                    <div className="pf-doc-sec">
                      <span className="pf-img-sec-lbl">File mới · {documentFiles.length}</span>
                      {documentFiles.map((f, i) => (
                        <div key={i} className="pf-doc-row">
                          <FileText size={13} className="pf-doc-file-icon" />
                          <span>{f.name}</span>
                          <button type="button" className="pf-doc-del"
                            onClick={() => setDocumentFiles(p => p.filter((_, j) => j !== i))}>
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Footer nav ── */}
            <div className="pf-nav-footer">
              <button type="button" className="pf-btn-prev" disabled={stepIdx === 0}
                onClick={() => { const p = STEPS[stepIdx - 1]; if (p) setActiveStep(p.id); }}>
                <ChevronLeft size={15} /> Trước
              </button>

              <div className="pf-dots">
                {STEPS.map((_, i) => (
                  <span key={i}
                    className={`pf-dot${i === stepIdx ? " pf-dot-active" : i < stepIdx ? " pf-dot-done" : ""}`}
                  />
                ))}
              </div>

              {stepIdx < STEPS.length - 1 ? (
                <button type="button" className="pf-btn-next"
                  onClick={() => { const n = STEPS[stepIdx + 1]; if (n) setActiveStep(n.id); }}>
                  Tiếp theo <ChevronRight size={15} />
                </button>
              ) : (
                <button type="button" className="pf-btn-submit" disabled={isLoading} onClick={handleSubmit}>
                  {isLoading
                    ? <><Loader2 size={14} className="pf-spin-icon" /> Đang lưu...</>
                    : <><Check size={14} strokeWidth={3} /> {initialData ? "Cập Nhật Tin" : "Đăng Tin Ngay"}</>
                  }
                </button>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Styles
   KEY CHANGE: tất cả surface dùng #ffffff (trắng thuần) thay vì
   #f8faf8 / var(--e-cream) → tạo contrast rõ ràng trên nền kem.
   Border tối hơn: rgba(154,124,69,0.22) thay vì var(--e-beige).
───────────────────────────────────────────────────────────── */
const FORM_CSS = `
  @keyframes pf-spin { to { transform: rotate(360deg); } }

  /* ── Page wrapper — transparent, kế thừa nền dashboard ── */
  .pf-page {
    font-family: var(--e-sans);
    -webkit-font-smoothing: antialiased;

  }

  /* ── Header ── */
  .pf-page-header {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(154,124,69,0.18);
    border-radius: 14px;
    padding: 2rem 2.2rem;
    margin-bottom: 1.5rem;
    backdrop-filter: blur(8px);
    box-shadow: 0 2px 16px rgba(0,0,0,0.04);
  }
  .pf-page-header-inner {
    display: flex; align-items: flex-end;
    justify-content: space-between; gap: 2rem; flex-wrap: wrap;
  }
  .pf-page-title {
    font-family: var(--e-serif);
    font-size: clamp(1.5rem, 2.8vw, 2.2rem);
    font-weight: 500; color: var(--e-charcoal);
    margin: 0.4rem 0 0; line-height: 1.15;
  }
  .pf-page-title em { font-style: italic; font-weight: 400; color: var(--e-muted); }

  .pf-progress-stack { min-width: 200px; }
  .pf-progress-meta  { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 7px; }
  .pf-progress-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--e-light-muted); font-weight: 600; }
  .pf-progress-pct   { font-family: var(--e-serif); font-size: 1rem; font-weight: 600; color: var(--e-gold); }
  .pf-progress-bar-wrap { height: 2px; background: rgba(154,124,69,0.15); overflow: hidden; border-radius: 2px; }
  .pf-progress-bar   { height: 100%; background: linear-gradient(90deg, var(--e-gold), var(--e-gold-light)); transition: width 0.5s cubic-bezier(0.34,1.56,0.64,1); }

  /* ── Layout ── */
  
  .pf-layout {
    display: grid; grid-template-columns: 240px 1fr;
    gap: 1.5rem; align-items: flex-start;
    overflow: clip;
}
 
.pf-sidebar {
  min-width: 0;
  min-height: 1px;
}

  /* ── Sidebar ── */
  .pf-sidebar-sticky {
    position: sticky; top: 2rem;
    display: flex; flex-direction: column; gap: 1rem;
  }

  /* Summary card */
  .pf-summary-card {
    background: #ffffff;
    border: 1px solid rgba(154,124,69,0.2);
    border-radius: 12px;
    padding: 1.2rem 1.4rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .pf-summary-row {
    display: flex; justify-content: space-between; align-items: baseline;
    padding-bottom: 0.7rem; margin-bottom: 0.7rem;
    border-bottom: 1px solid rgba(154,124,69,0.1);
  }
  .pf-summary-row:last-of-type { border-bottom: none; padding-bottom: 0; margin-bottom: 0.5rem; }
  .pf-summary-lbl  { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--e-light-muted); font-weight: 600; }
  .pf-summary-val  { font-size: 0.9rem; font-weight: 700; color: var(--e-charcoal); }
  .pf-summary-price { color: var(--e-gold); font-family: var(--e-serif); font-size: 1.05rem; }
  .pf-summary-type { display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: var(--e-muted); font-weight: 500; padding-top: 4px; }
  .pf-summary-type-icon { color: var(--e-gold); display: flex; align-items: center; }

  /* Step list */
  .pf-step-list {
    background: #ffffff;
    border: 1px solid rgba(154,124,69,0.2);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .pf-step-item {
    display: flex; align-items: center; gap: 12px;
    padding: 1rem 1.2rem; background: transparent; border: none;
    border-bottom: 1px solid rgba(154,124,69,0.08); cursor: pointer;
    text-align: left; transition: background 0.15s; font-family: var(--e-sans); width: 100%;
  }
  .pf-step-item:last-child { border-bottom: none; }
  .pf-step-item:hover   { background: rgba(154,124,69,0.04); }
  .pf-step-active       { background: rgba(154,124,69,0.06) !important; }
  .pf-step-num {
    width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.62rem; font-weight: 800; letter-spacing: 0.03em;
    background: #fff; border: 1.5px solid rgba(154,124,69,0.25); color: var(--e-muted);
    transition: all 0.2s;
  }
  .pf-step-active .pf-step-num { background: var(--e-charcoal); border-color: var(--e-charcoal); color: #fff; }
  .pf-step-done   .pf-step-num { background: var(--e-gold);     border-color: var(--e-gold);     color: #fff; }
  .pf-step-content { display: flex; flex-direction: column; gap: 1px; }
  .pf-step-title   { font-size: 0.76rem; font-weight: 600; color: var(--e-charcoal); }
  .pf-step-sub     { font-size: 0.62rem; color: var(--e-light-muted); }

  /* Amenity preview */
  .pf-amenity-preview {
    background: #ffffff;
    border: 1px solid rgba(154,124,69,0.2);
    border-radius: 12px;
    padding: 1rem 1.2rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.04);
  }
  .pf-amenity-preview-lbl {
    display: block; font-size: 0.58rem; text-transform: uppercase;
    letter-spacing: 0.14em; color: var(--e-light-muted); font-weight: 600; margin-bottom: 8px;
  }
  .pf-amenity-preview-list { display: flex; flex-wrap: wrap; gap: 5px; }
  .pf-amenity-tag {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 0.64rem; background: rgba(154,124,69,0.06);
    border: 1px solid rgba(154,124,69,0.18);
    border-radius: 6px;
    padding: 3px 8px; color: var(--e-charcoal); font-weight: 500;
  }
  .pf-amenity-tag-icon { color: var(--e-gold); display: flex; align-items: center; }

  /* ── Main card — WHITE with gold border ── */
  .pf-main {
    background: #ffffff;
    border: 1px solid rgba(154,124,69,0.22);
    border-radius: 16px;
    padding: 2.2rem 2.5rem;
    box-shadow: 0 4px 24px rgba(0,0,0,0.05);
   
  }

  .pf-section-head {
    display: flex; align-items: flex-start; gap: 1rem;
    margin-bottom: 2rem; padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(154,124,69,0.12);
  }
  .pf-big-num {
    font-family: var(--e-serif); font-size: 3.5rem; font-weight: 200;
    color: rgba(154,124,69,0.2); line-height: 1; letter-spacing: 0;
    user-select: none; margin-top: 0px; flex-shrink: 0;
    min-width: 72px;
  }
  .pf-section-sub { font-size: 0.78rem; color: var(--e-light-muted); margin: 4px 0 0; }

  /* Fields */
  .pf-fields    { display: flex; flex-direction: column; gap: 1.8rem; }
  .pf-field     { display: flex; flex-direction: column; gap: 8px; }
  .pf-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4rem; }
  .pf-req       { color: var(--e-gold); }
  .pf-label-icon { display: inline-flex; vertical-align: middle; margin-right: 4px; color: var(--e-muted); }

  /* Inputs — white background, visible border */
  .e-form-input, .pf-textarea {
    width: 100%; padding: 11px 16px; font-size: 0.93rem;
    border: 1.5px solid rgba(154,124,69,0.25);
    background: #ffffff;
    font-family: var(--e-sans); color: var(--e-charcoal);
    transition: all 0.2s; outline: none; border-radius: 10px;
  }
  .e-form-input::placeholder, .pf-textarea::placeholder { color: rgba(100,90,75,0.38); }
  .e-form-input:focus, .pf-textarea:focus {
    border-color: var(--e-gold);
    box-shadow: 0 0 0 3px rgba(212,175,55,0.12);
    background: #fffdf8;
  }
  .e-form-input.error, .pf-textarea.error { border-color: #e53e3e; background: #fff5f5; }

  .pf-textarea { resize: vertical; min-height: 130px; }

  .e-form-label {
    font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.14em; color: var(--e-charcoal);
    display: flex; align-items: center; gap: 4px;
  }
  .e-form-hint  { font-size: 0.7rem; color: var(--e-light-muted); margin: 2px 0 0; }
  .e-form-error { font-size: 0.72rem; color: #e53e3e; margin: 2px 0 0; }
  .e-section-label {
    font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.18em;
    color: var(--e-gold); font-weight: 700;
  }

  /* Price suffix */
  .pf-input-suffix-wrap { position: relative; }
  .pf-suffix-lbl {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em;
    color: var(--e-light-muted); pointer-events: none;
  }

  /* Type chips */
  .pf-type-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .pf-type-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px; font-size: 0.7rem; font-weight: 600;
    font-family: var(--e-sans); cursor: pointer; transition: all 0.2s;
    background: #ffffff; border: 1.5px solid rgba(154,124,69,0.22);
    border-radius: 8px; color: var(--e-muted);
  }
  .pf-type-btn:hover    { border-color: rgba(154,124,69,0.5); color: var(--e-charcoal); }
  .pf-type-btn-on       { background: var(--e-charcoal); border-color: var(--e-charcoal); color: #fff; }
  .pf-type-btn-icon     { display: flex; align-items: center; }

  /* Address row */
  .pf-addr-row { display: flex; gap: 8px; }
  .pf-map-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 18px; background: #ffffff;
    border: 1.5px solid rgba(154,124,69,0.28); border-radius: 10px;
    color: var(--e-charcoal); font-size: 0.72rem; font-weight: 600;
    cursor: pointer; font-family: var(--e-sans); white-space: nowrap; transition: all 0.2s;
  }
  .pf-map-btn:hover    { border-color: var(--e-charcoal); background: rgba(154,124,69,0.04); }
  .pf-map-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Suggestions */
  .pf-suggestions {
    border: 1.5px solid rgba(154,124,69,0.22); background: #ffffff;
    border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,0.1);
    margin-top: 4px; max-height: 230px; overflow-y: auto; overflow: hidden;
  }
  .pf-suggest-row {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; font-size: 0.8rem; color: var(--e-charcoal);
    background: transparent; border: none;
    border-bottom: 1px solid rgba(154,124,69,0.08);
    cursor: pointer; text-align: left; width: 100%;
    font-family: var(--e-sans); transition: background 0.15s;
  }
  .pf-suggest-row:last-child { border-bottom: none; }
  .pf-suggest-row:hover      { background: rgba(154,124,69,0.05); }
  .pf-suggest-muted          { color: var(--e-light-muted); cursor: default; }
  .pf-suggest-pin            { color: var(--e-gold); flex-shrink: 0; }

  /* Map panel */
  .pf-map-panel {
    margin-top: 12px; background: rgba(154,124,69,0.03);
    border: 1.5px solid rgba(154,124,69,0.18); border-radius: 12px; padding: 16px;
  }
  .pf-map-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.14em;
    font-weight: 600; color: var(--e-muted); margin-bottom: 12px;
  }
  .pf-map-frame { overflow: hidden; border: 1px solid rgba(154,124,69,0.18); border-radius: 8px; }

  /* Spec cards */
  .pf-specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .pf-spec-card {
    border: 1.5px solid rgba(154,124,69,0.22); background: #ffffff;
    border-radius: 12px; padding: 1.2rem;
    display: flex; flex-direction: column; gap: 6px;
    transition: border-color 0.2s; box-shadow: 0 1px 6px rgba(0,0,0,0.03);
  }
  .pf-spec-card:focus-within { border-color: var(--e-gold); box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
  .pf-spec-icon { color: var(--e-gold); display: flex; }
  .pf-spec-lbl  { font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; color: var(--e-light-muted); }
  .pf-spec-input {
    background: transparent; border: none; outline: none; width: 100%;
    font-family: var(--e-sans); font-size: 1.5rem; font-weight: 700;
    color: var(--e-charcoal); padding: 0;
  }
  .pf-spec-input::-webkit-inner-spin-button { opacity: 0.25; }

  /* Toggle */
  .pf-toggle {
    display: flex; align-items: center; gap: 12px;
    background: #ffffff; border: 1.5px solid rgba(154,124,69,0.22);
    border-radius: 10px; padding: 12px 16px; cursor: pointer; width: 100%;
    font-family: var(--e-sans); text-align: left; transition: all 0.2s;
  }
  .pf-toggle-on         { background: rgba(212,175,55,0.05); border-color: rgba(212,175,55,0.4); }
  .pf-toggle-track      { width: 36px; height: 20px; background: rgba(154,124,69,0.2); position: relative; flex-shrink: 0; transition: background 0.2s; border-radius: 10px; }
  .pf-toggle-on .pf-toggle-track { background: var(--e-gold); }
  .pf-toggle-thumb      { position: absolute; width: 14px; height: 14px; background: #ffffff; top: 3px; left: 3px; transition: transform 0.2s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .pf-toggle-on .pf-toggle-thumb { transform: translateX(16px); }
  .pf-toggle-lbl        { font-size: 0.82rem; font-weight: 600; color: var(--e-charcoal); flex: 1; }
  .pf-toggle-check      { color: var(--e-gold); flex-shrink: 0; }

  /* Amenities */
  .pf-amenities { display: flex; flex-wrap: wrap; gap: 8px; }
  .pf-amenity-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px; background: #ffffff;
    border: 1.5px solid rgba(154,124,69,0.22); border-radius: 8px;
    font-size: 0.76rem; font-weight: 500;
    color: var(--e-charcoal); cursor: pointer; transition: all 0.2s; font-family: var(--e-sans);
  }
  .pf-amenity-btn:hover { border-color: rgba(154,124,69,0.5); background: rgba(154,124,69,0.04); }
  .pf-amenity-on        { background: var(--e-charcoal); border-color: var(--e-charcoal); color: #fff; }
  .pf-amenity-btn-icon  { display: flex; align-items: center; }
  .pf-amenity-check     { margin-left: 2px; }

  /* Dropzone */
  .pf-dropzone {
    display: flex; flex-direction: column; align-items: center;
    padding: 2.5rem 2rem;
    border: 2px dashed rgba(154,124,69,0.28);
    background: rgba(154,124,69,0.03);
    border-radius: 12px;
    cursor: pointer; gap: 8px; text-align: center; transition: all 0.2s;
  }
  .pf-dropzone:hover        { border-color: var(--e-gold); background: rgba(212,175,55,0.06); }
  .pf-dropzone-sm           { padding: 1.8rem; }
  .pf-drop-icon             { color: rgba(154,124,69,0.4); margin-bottom: 4px; transition: color 0.2s; }
  .pf-dropzone:hover .pf-drop-icon { color: var(--e-gold); }
  .pf-drop-title            { font-size: 0.9rem; font-weight: 600; color: var(--e-charcoal); margin: 0; }
  .pf-drop-title span       { color: var(--e-gold); text-decoration: underline; }
  .pf-drop-hint             { font-size: 0.7rem; color: var(--e-light-muted); margin: 0; }

  /* Image grid */
  .pf-img-sec     { margin-top: 1rem; }
  .pf-img-sec-lbl { display: block; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--e-light-muted); font-weight: 600; margin-bottom: 10px; }
  .pf-img-new     { color: var(--e-gold) !important; }
  .pf-img-grid    { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
  .pf-thumb {
    position: relative; aspect-ratio: 1; overflow: hidden;
    border: 1.5px solid rgba(154,124,69,0.2); border-radius: 8px;
    background: rgba(154,124,69,0.04);
  }
  .pf-thumb img    { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pf-thumb-new    { border-color: rgba(212,175,55,0.45); }
  .pf-thumb-del {
    position: absolute; top: 5px; right: 5px;
    width: 22px; height: 22px; background: var(--e-charcoal); color: #fff;
    border: none; border-radius: 4px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: background 0.2s;
  }
  .pf-thumb-del:hover { background: #c0392b; }

  /* Docs */
  .pf-doc-sec  { margin-top: 1rem; display: flex; flex-direction: column; gap: 6px; }
  .pf-doc-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--e-gold); text-decoration: none; font-weight: 500; }
  .pf-doc-link:hover { text-decoration: underline; }
  .pf-doc-row {
    display: flex; align-items: center; gap: 9px;
    background: #ffffff; border: 1.5px solid rgba(154,124,69,0.2); border-radius: 8px;
    padding: 9px 12px; font-size: 0.78rem; color: var(--e-charcoal);
  }
  .pf-doc-file-icon { color: var(--e-muted); flex-shrink: 0; }
  .pf-doc-row span  { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pf-doc-del       { display: flex; align-items: center; background: transparent; border: none; color: var(--e-light-muted); cursor: pointer; padding: 2px; transition: color 0.2s; }
  .pf-doc-del:hover { color: #c0392b; }

  /* Navigation footer */
  .pf-nav-footer {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 2.5rem; padding-top: 2rem;
    border-top: 1px solid rgba(154,124,69,0.12);
  }
  .pf-dots        { display: flex; gap: 6px; }
  .pf-dot         { width: 6px; height: 6px; background: rgba(154,124,69,0.2); border-radius: 3px; transition: all 0.3s; }
  .pf-dot-active  { width: 22px; background: var(--e-charcoal); }
  .pf-dot-done    { background: var(--e-gold); }

  .pf-btn-prev, .pf-btn-next, .pf-btn-submit {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 11px 24px; font-family: var(--e-sans);
    font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; cursor: pointer; transition: all 0.25s;
    border: 1.5px solid; border-radius: 10px;
  }
  .pf-btn-prev { background: #ffffff; border-color: rgba(154,124,69,0.25); color: var(--e-muted); }
  .pf-btn-prev:hover:not(:disabled) { border-color: var(--e-charcoal); color: var(--e-charcoal); }
  .pf-btn-prev:disabled { opacity: 0.3; cursor: not-allowed; }

  .pf-btn-next { background: #ffffff; border-color: var(--e-charcoal); color: var(--e-charcoal); }
  .pf-btn-next:hover { background: var(--e-charcoal); color: #fff; }

  .pf-btn-submit { background: var(--e-gold); border-color: var(--e-gold); color: #fff; box-shadow: 0 4px 18px rgba(212,175,55,0.32); }
  .pf-btn-submit:hover:not(:disabled) { background: var(--e-charcoal); border-color: var(--e-charcoal); box-shadow: 0 6px 24px rgba(26,24,20,0.22); }
  .pf-btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

  .pf-spin-icon { animation: pf-spin 0.8s linear infinite; }

  /* Responsive */
  @media (max-width: 900px) {
    .pf-layout         { grid-template-columns: 1fr; }
    .pf-sidebar-sticky { position: static; flex-direction: row; flex-wrap: wrap; }
  }
  @media (max-width: 640px) {
    .pf-field-row  { grid-template-columns: 1fr; }
    .pf-specs-grid { grid-template-columns: 1fr 1fr; }
    .pf-main       { padding: 1.4rem; }
    .pf-big-num    { font-size: 2.5rem; }
  }
`;