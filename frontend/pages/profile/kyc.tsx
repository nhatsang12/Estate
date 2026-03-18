import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, RefObject } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  IdCard,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import KycStatusBadge from "@/components/KycStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/apiClient";
import { userService } from "@/services/userService";
import type { User } from "@/types/user";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

type DocumentSide = "front" | "back";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Unable to process KYC action right now.";
}

function validateFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only JPG and PNG images are supported.";
  if (file.size > MAX_FILE_SIZE) return "File size must be 5MB or less.";
  return null;
}

interface UploadBoxProps {
  title: string;
  file: File | null;
  preview: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelectFile: (file: File) => void;
  onClearFile: () => void;
}

function UploadBox({ title, file, preview, inputRef, onSelectFile, onClearFile }: UploadBoxProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) onSelectFile(droppedFile);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <p
        style={{
          fontFamily: "var(--e-sans)",
          fontSize: "0.62rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--e-gold)",
          fontWeight: 600,
        }}
      >
        {title}
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        style={{
          border: `1px dashed ${isDragging ? "var(--e-gold)" : "var(--e-sand)"}`,
          background: isDragging ? "rgba(140,110,63,0.04)" : "var(--e-cream)",
          cursor: "pointer",
          transition: "border-color 0.25s, background 0.25s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSelectFile(f);
          }}
        />

        {preview ? (
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClearFile(); }}
              style={{
                position: "absolute",
                top: "0.7rem",
                right: "0.7rem",
                zIndex: 10,
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "rgba(17,28,20,0.75)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.2s",
              }}
              aria-label={`Remove ${title} image`}
            >
              <X size={13} />
            </button>
            <Image
              src={preview}
              alt={title}
              width={900}
              height={700}
              unoptimized
              style={{ width: "100%", height: 240, objectFit: "cover", display: "block" }}
            />
          </div>
        ) : (
          <div
            style={{
              height: 240,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              padding: "1.5rem",
            }}
          >
            <UploadCloud size={26} color="var(--e-light-muted)" />
            <p style={{ fontSize: "0.82rem", color: "var(--e-charcoal)", fontWeight: 500, textAlign: "center" }}>
              Kéo thả hoặc nhấn để chọn ảnh
            </p>
            <p style={{ fontSize: "0.7rem", color: "var(--e-light-muted)" }}>JPG / PNG · Tối đa 5MB</p>
          </div>
        )}
      </div>

      {file && (
        <p style={{ fontSize: "0.7rem", color: "var(--e-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {file.name}
        </p>
      )}
    </div>
  );
}

/* ─── Status colour map ─── */
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "Chờ xét duyệt", color: "var(--e-gold)", bg: "rgba(140,110,63,0.07)", border: "rgba(140,110,63,0.3)" },
  approved: { label: "Đã duyệt", color: "#2d7a4f", bg: "rgba(45,122,79,0.08)", border: "rgba(45,122,79,0.3)" },
  rejected: { label: "Từ chối", color: "#b84a2a", bg: "rgba(184,74,42,0.07)", border: "rgba(184,74,42,0.3)" },
};

export default function UserKycPage() {
  const router = useRouter();
  const { user, token, isAuthLoading, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [declaredIdNumber, setDeclaredIdNumber] = useState("");

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!frontFile) { setFrontPreview(null); return; }
    const url = URL.createObjectURL(frontFile);
    setFrontPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) { setBackPreview(null); return; }
    const url = URL.createObjectURL(backFile);
    setBackPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [backFile]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user || !token) { void router.replace("/"); return; }
    if (user.role === "admin") { void router.replace("/admin/kyc-management"); return; }

    const load = async () => {
      setPageLoading(true);
      setErrorMessage(null);
      try {
        setProfile(await userService.getMe(token));
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setPageLoading(false);
      }
    };
    void load();
  }, [isAuthLoading, router, token, user]);

  const canSubmit = useMemo(
    () => Boolean(frontFile && backFile && token && !submitting),
    [backFile, frontFile, submitting, token]
  );

  const handleSelectFile = (side: DocumentSide, file: File) => {
    const err = validateFile(file);
    if (err) { setErrorMessage(err); return; }
    setErrorMessage(null);
    setSuccessMessage(null);
    if (side === "front") { setFrontFile(file); return; }
    setBackFile(file);
  };

  const handleClearFile = (side: DocumentSide) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (side === "front") {
      setFrontFile(null);
      if (frontInputRef.current) frontInputRef.current.value = "";
      return;
    }
    setBackFile(null);
    if (backInputRef.current) backInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!token || !frontFile || !backFile) {
      setErrorMessage("Vui lòng tải lên cả mặt trước và mặt sau.");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await userService.submitKycDocuments(token, frontFile, backFile, declaredIdNumber);
      setProfile(await userService.getMe(token));
      setSuccessMessage(res.message || "Nộp hồ sơ KYC thành công.");
      setFrontFile(null);
      setBackFile(null);
      setDeclaredIdNumber("");
      await refreshProfile();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Loading state ── */
  if (isAuthLoading || pageLoading) {
    return (

      <div className="estoria" style={{ padding: "5rem 5vw", display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--e-muted)", fontFamily: "var(--e-sans)", fontSize: "0.85rem" }}>
        <LoaderCircle size={16} className="animate-spin" />
        Đang tải hồ sơ KYC…
      </div>

    );
  }

  if (!profile) {
    return (

      <div className="estoria" style={{ padding: "5rem 5vw", textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--e-serif)", fontSize: "1.8rem", fontWeight: 500, color: "var(--e-charcoal)" }}>
          Không thể tải hồ sơ KYC
        </h1>
        <p style={{ marginTop: "0.8rem", fontSize: "0.85rem", color: "var(--e-muted)" }}>
          {errorMessage || "Vui lòng thử lại sau."}
        </p>
      </div>

    );
  }

  const statusKey = (profile.kycStatus ?? "pending").toLowerCase();
  const statusMeta = STATUS_META[statusKey] ?? STATUS_META.pending;

  return (

    <div className="estoria" style={{ background: "var(--e-cream)", minHeight: "100vh" }}>

      {/* ── Page header strip (mirrors index section headers) ── */}
      <div
        style={{
          background: "var(--e-charcoal)",
          padding: "4rem 5vw 3rem",
          borderBottom: "1px solid rgba(140,110,63,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: "2rem" }}>
          <span
            style={{
              fontFamily: "var(--e-serif)",
              fontSize: "clamp(4rem, 7vw, 6rem)",
              fontWeight: 200,
              color: "rgba(255,255,255,0.12)",
              lineHeight: 1,
              letterSpacing: "-0.04em",
              userSelect: "none",
            }}
          >
            KYC
          </span>
          <div>
            <div className="e-section-label" style={{ color: "var(--e-gold-light)" }}>
              Xác Minh Danh Tính
            </div>
            <h1
              style={{
                fontFamily: "var(--e-serif)",
                fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
                fontWeight: 500,
                color: "var(--e-white)",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Hồ Sơ <em style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.45)" }}>Của Tôi</em>
            </h1>
          </div>
        </div>

        {/* Status cards row */}
        <div
          style={{
            marginTop: "2.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            background: "rgba(255,255,255,0.08)",
          }}
        >
          {[
            {
              label: "Trạng thái",
              value: (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: statusMeta.color,
                    background: statusMeta.bg,
                    border: `1px solid ${statusMeta.border}`,
                    padding: "4px 10px",
                  }}
                >
                  {statusMeta.label}
                </span>
              ),
            },
            {
              label: "Xác minh",
              value: profile.isVerified ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#5fc48a", fontSize: "0.9rem", fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> Đã xác minh
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", fontWeight: 600 }}>
                  <AlertTriangle size={15} /> Chưa xác minh
                </span>
              ),
            },
            {
              label: "Vai trò",
              value: (
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--e-white)", textTransform: "capitalize" }}>
                  {profile.role}
                </span>
              ),
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "rgba(255,255,255,0.04)",
                padding: "1.2rem 1.5rem",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--e-sans)",
                  fontSize: "0.6rem",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.35)",
                  fontWeight: 600,
                  marginBottom: "0.6rem",
                }}
              >
                {item.label}
              </p>
              {item.value}
            </div>
          ))}
        </div>

        {/* Rejection reason */}
        {profile.kycRejectionReason && (
          <div
            style={{
              marginTop: "1.5rem",
              border: "1px solid rgba(184,74,42,0.4)",
              background: "rgba(184,74,42,0.08)",
              padding: "1rem 1.2rem",
            }}
          >
            <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#e07a5f", fontWeight: 600, marginBottom: 6 }}>
              Lý do từ chối
            </p>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>
              {profile.kycRejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* ── Main content ── */}
      <div style={{ padding: "4rem 5vw", display: "grid", gap: "3rem" }}>

        {/* ── Section: Submit documents ── */}
        <section
          style={{
            background: "var(--e-white)",
            border: "1px solid var(--e-beige)",
            padding: "2.5rem",
          }}
        >
          {/* Section label */}
          <div className="e-section-label" style={{ marginBottom: "0.6rem" }}>
            Tải Lên Tài Liệu
          </div>
          <h2
            style={{
              fontFamily: "var(--e-serif)",
              fontSize: "1.6rem",
              fontWeight: 500,
              color: "var(--e-charcoal)",
              marginBottom: "0.5rem",
            }}
          >
            Nộp Hồ Sơ <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>CCCD</em>
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--e-muted)", lineHeight: 1.75, maxWidth: 560, marginBottom: "2rem" }}>
            Tải ảnh chụp rõ nét mặt trước và mặt sau CCCD. Định dạng JPG, PNG. Tối đa 5MB/ảnh.
            Đảm bảo chữ rõ ràng và 4 góc thẻ hiện đầy đủ.
          </p>

          {/* Upload grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
              marginBottom: "1.8rem",
            }}
          >
            <UploadBox
              title="CCCD — Mặt Trước"
              file={frontFile}
              preview={frontPreview}
              inputRef={frontInputRef}
              onSelectFile={(f) => handleSelectFile("front", f)}
              onClearFile={() => handleClearFile("front")}
            />
            <UploadBox
              title="CCCD — Mặt Sau"
              file={backFile}
              preview={backPreview}
              inputRef={backInputRef}
              onSelectFile={(f) => handleSelectFile("back", f)}
              onClearFile={() => handleClearFile("back")}
            />
          </div>

          {/* ID number input */}
          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxWidth: 420 }}>
            <span
              style={{
                fontFamily: "var(--e-sans)",
                fontSize: "0.62rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--e-light-muted)",
                fontWeight: 600,
              }}
            >
              Số CCCD (Không bắt buộc)
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                border: "1px solid var(--e-beige)",
                padding: "0 12px",
                background: "var(--e-cream)",
                transition: "border-color 0.2s",
              }}
            >
              <IdCard size={15} color="var(--e-light-muted)" style={{ flexShrink: 0 }} />
              <input
                type="text"
                value={declaredIdNumber}
                onChange={(e) => setDeclaredIdNumber(e.target.value)}
                placeholder="Nhập số CCCD để tăng độ chính xác OCR"
                style={{
                  flex: 1,
                  border: "none",
                  background: "none",
                  padding: "11px 0",
                  fontFamily: "var(--e-sans)",
                  fontSize: "0.85rem",
                  color: "var(--e-charcoal)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.parentElement!.style.borderColor = "var(--e-gold)")}
                onBlur={(e) => (e.currentTarget.parentElement!.style.borderColor = "var(--e-beige)")}
              />
            </div>
          </label>

          {/* Submit row */}
          <div style={{ marginTop: "2rem", display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="e-btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: canSubmit ? 1 : 0.45,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}
              {submitting ? "Đang xử lý…" : "Nộp Hồ Sơ KYC"}
            </button>
            <span style={{ fontSize: "0.72rem", color: "var(--e-light-muted)" }}>
              OCR sẽ chạy tự động sau khi nộp.
            </span>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div
              style={{
                marginTop: "1.2rem",
                border: "1px solid rgba(184,74,42,0.35)",
                background: "rgba(184,74,42,0.06)",
                padding: "0.8rem 1rem",
                fontSize: "0.82rem",
                color: "#b84a2a",
                lineHeight: 1.6,
              }}
            >
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div
              style={{
                marginTop: "1.2rem",
                border: "1px solid rgba(45,122,79,0.3)",
                background: "rgba(45,122,79,0.06)",
                padding: "0.8rem 1rem",
                fontSize: "0.82rem",
                color: "#2d7a4f",
                lineHeight: 1.6,
              }}
            >
              {successMessage}
            </div>
          )}
        </section>

        {/* ── Section: Uploaded documents ── */}
        <section
          style={{
            background: "var(--e-white)",
            border: "1px solid var(--e-beige)",
            padding: "2.5rem",
          }}
        >
          <div className="e-section-label" style={{ marginBottom: "0.6rem" }}>
            Tài Liệu Đã Nộp
          </div>
          <h2
            style={{
              fontFamily: "var(--e-serif)",
              fontSize: "1.6rem",
              fontWeight: 500,
              color: "var(--e-charcoal)",
              marginBottom: "0.4rem",
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <ShieldCheck size={20} color="var(--e-gold)" style={{ flexShrink: 0 }} />
            Hồ Sơ <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--e-muted)" }}>Đã Tải Lên</em>
          </h2>

          {profile.kycDocuments?.length ? (
            <div
              style={{
                marginTop: "1.8rem",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "2px",
                background: "var(--e-beige)",
              }}
            >
              {profile.kycDocuments.map((docUrl, idx) => (
                <a
                  key={`${docUrl}-${idx}`}
                  href={docUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "block", overflow: "hidden", background: "var(--e-dark)", position: "relative" }}
                >
                  <Image
                    src={docUrl}
                    alt={`KYC document ${idx + 1}`}
                    width={900}
                    height={700}
                    unoptimized
                    style={{
                      width: "100%",
                      height: 220,
                      objectFit: "cover",
                      display: "block",
                      transition: "transform 0.6s var(--e-ease)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "1rem",
                      background: "linear-gradient(to top, rgba(17,28,20,0.75) 0%, transparent 100%)",
                    }}
                  >
                    <p style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--e-gold-light)", fontWeight: 600 }}>
                      Tài liệu {idx + 1}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "3rem 2rem",
                textAlign: "center",
                border: "1px dashed var(--e-sand)",
                background: "var(--e-cream)",
              }}
            >
              <p style={{ fontFamily: "var(--e-serif)", fontSize: "1.1rem", fontWeight: 400, color: "var(--e-muted)", fontStyle: "italic" }}>
                Chưa có tài liệu nào được tải lên
              </p>
            </div>
          )}
        </section>
      </div>
    </div>

  );
}