import { useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  IdCard,
  LoaderCircle,
  Lock,
  ShieldCheck,
  UploadCloud,
  UserCircle2,
  X,
} from "lucide-react";

import LuxuryNavbar from "@/components/LuxuryNavbar";
import LuxuryFooter from "@/components/LuxuryFooter";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/services/apiClient";
import { userService } from "@/services/userService";
import type { User } from "@/types/user";
import { translateKycRejectionReason } from "@/utils/kycRejectionReason";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

type DocumentSide = "front" | "back" | "portrait";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Không thể xử lý yêu cầu KYC lúc này.";
}

function validateFile(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Chỉ hỗ trợ ảnh JPG hoặc PNG.";
  if (file.size > MAX_FILE_SIZE) return "Kích thước ảnh tối đa là 5MB.";
  return null;
}

function normalizeDeclaredIdNumber(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function isValidDeclaredIdNumber(value: string) {
  const digits = normalizeDeclaredIdNumber(value);
  return digits.length === 9 || digits.length === 12;
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
  const isSelfieBox = title.toLowerCase().includes("selfie");

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) onSelectFile(droppedFile);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[var(--e-gold)] font-semibold">
        {title}
      </p>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`relative overflow-hidden rounded-2xl border border-dashed transition-colors ${
          isDragging
            ? "border-[var(--e-gold)] bg-[rgba(140,110,63,0.06)]"
            : "border-[var(--e-sand)] bg-[var(--e-cream)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            if (selected) onSelectFile(selected);
          }}
        />

        {preview ? (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClearFile();
              }}
              className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-[rgba(17,28,20,0.75)] text-white flex items-center justify-center hover:bg-[rgba(17,28,20,0.9)] transition-colors"
              aria-label={`Xóa ảnh ${title}`}
            >
              <X size={13} />
            </button>
            <Image
              src={preview}
              alt={title}
              width={900}
              height={700}
              unoptimized
              className="block h-60 w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-60 px-6 py-8 flex flex-col items-center justify-center text-center gap-2.5">
            <UploadCloud size={26} color="var(--e-light-muted)" />
            <p className="text-[0.82rem] text-[var(--e-charcoal)] font-medium">
              Kéo thả hoặc nhấn để chọn ảnh
            </p>
            <p className="text-[0.7rem] text-[var(--e-light-muted)]">JPG / PNG · Tối đa 5MB</p>
            {isSelfieBox ? (
              <p className="text-[0.7rem] text-[var(--e-muted)]">Ảnh selfie rõ mặt, không đeo khẩu trang/kính râm.</p>
            ) : null}
          </div>
        )}
      </div>

      {file ? (
        <p className="text-[0.7rem] text-[var(--e-muted)] truncate">{file.name}</p>
      ) : (
        <span className="h-[1rem]" />
      )}
    </div>
  );
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: {
    label: "Chưa nộp",
    color: "var(--e-gold)",
    bg: "rgba(140,110,63,0.08)",
    border: "rgba(140,110,63,0.35)",
  },
  submitted: {
    label: "Đã nộp",
    color: "var(--e-gold)",
    bg: "rgba(140,110,63,0.08)",
    border: "rgba(140,110,63,0.35)",
  },
  reviewing: {
    label: "Đang xem xét",
    color: "#9a7c45",
    bg: "rgba(154,124,69,0.1)",
    border: "rgba(154,124,69,0.36)",
  },
  verified: {
    label: "Đã xác minh",
    color: "#2d7a4f",
    bg: "rgba(45,122,79,0.09)",
    border: "rgba(45,122,79,0.36)",
  },
  approved: {
    label: "Đã xác minh",
    color: "#2d7a4f",
    bg: "rgba(45,122,79,0.09)",
    border: "rgba(45,122,79,0.36)",
  },
  rejected: {
    label: "Bị từ chối",
    color: "#b84a2a",
    bg: "rgba(184,74,42,0.09)",
    border: "rgba(184,74,42,0.36)",
  },
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
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [declaredIdNumber, setDeclaredIdNumber] = useState("");
  const [checkingDeclaredId, setCheckingDeclaredId] = useState(false);
  const [declaredIdInUse, setDeclaredIdInUse] = useState(false);
  const [declaredIdCheckError, setDeclaredIdCheckError] = useState<string | null>(null);
  const [checkedDeclaredId, setCheckedDeclaredId] = useState("");

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!frontFile) {
      setFrontPreview(null);
      return;
    }
    const url = URL.createObjectURL(frontFile);
    setFrontPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [frontFile]);

  useEffect(() => {
    if (!backFile) {
      setBackPreview(null);
      return;
    }
    const url = URL.createObjectURL(backFile);
    setBackPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [backFile]);

  useEffect(() => {
    if (!portraitFile) {
      setPortraitPreview(null);
      return;
    }
    const url = URL.createObjectURL(portraitFile);
    setPortraitPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [portraitFile]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user || !token) {
      void router.replace("/");
      return;
    }
    if (user.role === "admin") {
      void router.replace("/admin/kyc-management");
      return;
    }

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

  const normalizedDeclaredId = useMemo(
    () => normalizeDeclaredIdNumber(declaredIdNumber),
    [declaredIdNumber]
  );
  const hasValidDeclaredId = useMemo(
    () => isValidDeclaredIdNumber(declaredIdNumber),
    [declaredIdNumber]
  );

  useEffect(() => {
    if (!token) {
      setCheckingDeclaredId(false);
      setDeclaredIdInUse(false);
      setDeclaredIdCheckError(null);
      return;
    }

    if (!normalizedDeclaredId || !hasValidDeclaredId) {
      setCheckingDeclaredId(false);
      setDeclaredIdInUse(false);
      setDeclaredIdCheckError(null);
      setCheckedDeclaredId("");
      return;
    }

    let cancelled = false;
    setCheckingDeclaredId(true);
    setDeclaredIdCheckError(null);

    const timer = window.setTimeout(async () => {
      try {
        const result = await userService.checkDeclaredIdAvailability(token, normalizedDeclaredId);
        if (cancelled) return;
        setCheckedDeclaredId(normalizedDeclaredId);
        setDeclaredIdInUse(!result.available);
      } catch (err) {
        if (cancelled) return;
        setCheckedDeclaredId("");
        setDeclaredIdInUse(false);
        setDeclaredIdCheckError(getErrorMessage(err));
      } finally {
        if (!cancelled) setCheckingDeclaredId(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hasValidDeclaredId, normalizedDeclaredId, token]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        frontFile &&
          backFile &&
          portraitFile &&
          hasValidDeclaredId &&
          checkedDeclaredId === normalizedDeclaredId &&
          !declaredIdInUse &&
          !checkingDeclaredId &&
          token &&
          !submitting
      ),
    [backFile, checkedDeclaredId, checkingDeclaredId, declaredIdInUse, frontFile, hasValidDeclaredId, normalizedDeclaredId, portraitFile, submitting, token]
  );

  const handleSelectFile = (side: DocumentSide, file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    if (side === "front") {
      setFrontFile(file);
      return;
    }
    if (side === "back") {
      setBackFile(file);
      return;
    }
    setPortraitFile(file);
  };

  const handleClearFile = (side: DocumentSide) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (side === "front") {
      setFrontFile(null);
      if (frontInputRef.current) frontInputRef.current.value = "";
      return;
    }
    if (side === "back") {
      setBackFile(null);
      if (backInputRef.current) backInputRef.current.value = "";
      return;
    }
    setPortraitFile(null);
    if (portraitInputRef.current) portraitInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!token || !frontFile || !backFile || !portraitFile) {
      setErrorMessage("Vui lòng tải lên mặt trước, mặt sau CCCD và ảnh chân dung.");
      return;
    }
    if (!hasValidDeclaredId) {
      setErrorMessage("Vui lòng nhập số CCCD hợp lệ (9 hoặc 12 số).");
      return;
    }
    if (declaredIdInUse) {
      setErrorMessage("Số CCCD này đã có người sử dụng. Vui lòng kiểm tra lại.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await userService.submitKycDocuments(
        token,
        frontFile,
        backFile,
        portraitFile,
        normalizedDeclaredId
      );
      setProfile(await userService.getMe(token));
      setSuccessMessage(response.message || "Nộp hồ sơ KYC thành công.");
      setFrontFile(null);
      setBackFile(null);
      setPortraitFile(null);
      setDeclaredIdNumber("");
      if (frontInputRef.current) frontInputRef.current.value = "";
      if (backInputRef.current) backInputRef.current.value = "";
      if (portraitInputRef.current) portraitInputRef.current.value = "";
      await refreshProfile();
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderLoading = () => (
    <div className="estoria min-h-screen flex flex-col">
      <LuxuryNavbar variant="light" onPostClick={() => router.push("/provider/properties/create")} />
      <main className="flex-1 flex items-center justify-center pt-24 pb-16">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--e-beige)] bg-white/90 shadow-sm">
            <LoaderCircle size={18} className="animate-spin text-[var(--e-gold)]" />
          </div>
          <p className="mt-4 text-[0.82rem] text-[var(--e-muted)]">Đang tải hồ sơ KYC...</p>
        </div>
      </main>
      <LuxuryFooter />
    </div>
  );

  if (isAuthLoading || pageLoading) return renderLoading();

  if (!profile) {
    return (
      <div className="estoria min-h-screen flex flex-col">
        <LuxuryNavbar variant="light" onPostClick={() => router.push("/provider/properties/create")} />
        <main className="flex-1 flex items-center justify-center pt-24 pb-16">
          <div className="glass-panel p-8 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm text-center max-w-xl">
            <h1 className="font-[var(--e-serif)] text-[1.7rem] text-[var(--e-charcoal)] mb-2">
              Không thể tải hồ sơ KYC
            </h1>
            <p className="text-[0.84rem] text-[var(--e-muted)]">
              {errorMessage || "Vui lòng thử lại sau."}
            </p>
          </div>
        </main>
        <LuxuryFooter />
      </div>
    );
  }

  const statusKey = String(profile.kycStatus || "pending").toLowerCase();
  const statusMeta = STATUS_META[statusKey] || STATUS_META.pending;

  return (
    <div className="estoria min-h-screen flex flex-col">
      <LuxuryNavbar variant="light" onPostClick={() => router.push("/provider/properties/create")} />

      <main className="flex-1 pt-32 pb-20 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              'url("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed",
            filter: "sepia(0.08) saturate(1.1) brightness(0.9)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none z-0 bg-[var(--e-cream)]/72 backdrop-blur-[10px]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[var(--e-cream)] to-transparent pointer-events-none z-0" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--e-cream)] to-transparent pointer-events-none z-0" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: "2rem",
              marginBottom: "3rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--e-serif)",
                fontSize: "clamp(4rem, 7vw, 7rem)",
                fontWeight: 200,
                color: "var(--e-beige)",
                lineHeight: 1,
                letterSpacing: "-0.04em",
                userSelect: "none",
              }}
            >
            </span>
            <div>
              <div className="e-section-label">Xác Minh Danh Tính</div>
              <h2 className="e-section-title text-[var(--e-charcoal)]" style={{ margin: 0 }}>
                Hồ Sơ KYC
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--e-muted)", marginTop: "0.3rem" }}>
                Đồng bộ thông tin danh tính để kích hoạt đầy đủ quyền lợi tài khoản
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <aside className="xl:col-span-4 space-y-6">
              <div className="glass-panel p-7 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <div className="w-14 h-14 rounded-full border border-[var(--e-beige)] bg-[var(--e-cream)] flex items-center justify-center mb-4">
                  <ShieldCheck size={24} color="var(--e-gold)" />
                </div>
                <h3 className="font-[var(--e-serif)] text-[1.45rem] text-[var(--e-charcoal)] mb-1">
                  Trạng Thái KYC
                </h3>
                <p className="text-[0.74rem] text-[var(--e-muted)] mb-5">
                  Hệ thống tự động kiểm tra hồ sơ CCCD sau khi bạn nộp tài liệu.
                </p>

                <div className="space-y-3 border-t border-[var(--e-beige)] pt-5">
                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--e-muted)] font-semibold mb-2">
                      Trạng thái hồ sơ
                    </p>
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[0.72rem] font-semibold border"
                      style={{
                        color: statusMeta.color,
                        background: statusMeta.bg,
                        borderColor: statusMeta.border,
                      }}
                    >
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: statusMeta.color }}
                      />
                      {statusMeta.label}
                    </span>
                  </div>

                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--e-muted)] font-semibold mb-1.5">
                      Xác minh tài khoản
                    </p>
                    {profile.isVerified ? (
                      <p className="flex items-center gap-2 text-[0.82rem] font-semibold text-emerald-700">
                        <CheckCircle2 size={14} /> Đã xác minh
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-[0.82rem] font-semibold text-[var(--e-light-muted)]">
                        <AlertTriangle size={14} /> Chưa xác minh
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-[0.62rem] uppercase tracking-[0.16em] text-[var(--e-muted)] font-semibold mb-1.5">
                      Vai trò
                    </p>
                    <p className="text-[0.9rem] font-semibold text-[var(--e-charcoal)] capitalize">
                      {profile.role}
                    </p>
                  </div>
                </div>

      {profile.kycRejectionReason ? (
        <div className="mt-4 border border-[rgba(184,74,42,0.35)] bg-[rgba(184,74,42,0.08)] rounded-xl p-3.5">
          <p className="text-[0.58rem] uppercase tracking-[0.16em] text-[#b84a2a] font-semibold mb-1.5">
            Lý do từ chối
          </p>
          <p className="text-[0.8rem] text-[#a84f32] leading-relaxed">
            {translateKycRejectionReason(profile.kycRejectionReason)}
          </p>
        </div>
      ) : null}
              </div>

              <div className="glass-panel p-5 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <h4 className="text-[0.7rem] uppercase tracking-[0.14em] text-[var(--e-muted)] font-semibold mb-3">
                  Điều hướng nhanh
                </h4>
                <div className="space-y-1.5">
                  <Link
                    href="/profile/settings"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.82rem] text-[var(--e-charcoal)] hover:bg-[var(--e-cream)] transition-colors"
                  >
                    <UserCircle2 size={16} className="text-[var(--e-gold)]" />
                    Cài đặt hồ sơ
                  </Link>
                  <Link
                    href="/profile/change-password"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.82rem] text-[var(--e-charcoal)] hover:bg-[var(--e-cream)] transition-colors"
                  >
                    <Lock size={16} className="text-[var(--e-gold)]" />
                    Đổi mật khẩu
                  </Link>
                  {profile.role === "provider" ? (
                    <Link
                      href="/provider/dashboard"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[0.82rem] text-[var(--e-charcoal)] hover:bg-[var(--e-cream)] transition-colors"
                    >
                      <ArrowLeft size={16} className="text-[var(--e-gold)]" />
                      Về trang Provider
                    </Link>
                  ) : null}
                </div>
              </div>
            </aside>

            <section className="xl:col-span-8 space-y-6">
              <div className="glass-panel p-7 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <div className="mb-6">
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[var(--e-gold)] font-semibold mb-2">
                    Tải Lên Tài Liệu
                  </p>
                  <h3 className="font-[var(--e-serif)] text-[1.55rem] text-[var(--e-charcoal)] mb-1">
                    Nộp Hồ Sơ CCCD
                  </h3>
                  <p className="text-[0.8rem] text-[var(--e-muted)] leading-relaxed max-w-2xl">
                    Vui lòng tải ảnh rõ nét mặt trước, mặt sau CCCD và ảnh chân dung.
                    Định dạng JPG/PNG, tối đa 5MB mỗi ảnh. Với ảnh chân dung, vui lòng dùng ảnh selfie rõ mặt.
                    Số CCCD nhập tay là bắt buộc để đối chiếu.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
                  <UploadBox
                    title="CCCD - Mặt Trước"
                    file={frontFile}
                    preview={frontPreview}
                    inputRef={frontInputRef}
                    onSelectFile={(f) => handleSelectFile("front", f)}
                    onClearFile={() => handleClearFile("front")}
                  />
                  <UploadBox
                    title="CCCD - Mặt Sau"
                    file={backFile}
                    preview={backPreview}
                    inputRef={backInputRef}
                    onSelectFile={(f) => handleSelectFile("back", f)}
                    onClearFile={() => handleClearFile("back")}
                  />
                  <UploadBox
                    title="Ảnh Selfie (Chân Dung)"
                    file={portraitFile}
                    preview={portraitPreview}
                    inputRef={portraitInputRef}
                    onSelectFile={(f) => handleSelectFile("portrait", f)}
                    onClearFile={() => handleClearFile("portrait")}
                  />
                </div>

                <label className="block max-w-xl mb-5">
                  <span className="block text-[0.62rem] uppercase tracking-[0.17em] text-[var(--e-light-muted)] font-semibold mb-2">
                    Số CCCD (Bắt buộc)
                  </span>
                  <div className="flex items-center gap-2.5 rounded-xl border border-[var(--e-beige)] bg-[var(--e-cream)] px-3">
                    <IdCard size={15} color="var(--e-light-muted)" />
                    <input
                      type="text"
                      value={declaredIdNumber}
                      onChange={(e) => setDeclaredIdNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="Nhập số CCCD (9 hoặc 12 số)"
                      className="h-11 flex-1 bg-transparent border-none outline-none text-[0.85rem] text-[var(--e-charcoal)] placeholder:text-[var(--e-light-muted)]"
                    />
                  </div>
                  {declaredIdNumber && !hasValidDeclaredId ? (
                    <p className="mt-2 text-[0.72rem] text-[#b84a2a]">
                      Số CCCD phải gồm 9 hoặc 12 chữ số.
                    </p>
                  ) : null}
                  {hasValidDeclaredId && checkingDeclaredId ? (
                    <p className="mt-2 text-[0.72rem] text-[var(--e-muted)]">Đang kiểm tra số CCCD...</p>
                  ) : null}
                  {hasValidDeclaredId && !checkingDeclaredId && declaredIdInUse ? (
                    <p className="mt-2 text-[0.72rem] text-[#b84a2a]">
                      Số CCCD này đã có tài khoản sử dụng.
                    </p>
                  ) : null}
                  {hasValidDeclaredId && !checkingDeclaredId && !declaredIdInUse && !declaredIdCheckError ? (
                    <p className="mt-2 text-[0.72rem] text-[#2d7a4f]">Số CCCD hợp lệ và chưa bị trùng.</p>
                  ) : null}
                  {hasValidDeclaredId && !checkingDeclaredId && declaredIdCheckError ? (
                    <p className="mt-2 text-[0.72rem] text-[var(--e-muted)]">
                      Không thể kiểm tra trùng ngay lúc này. Bạn vẫn có thể nộp hồ sơ.
                    </p>
                  ) : null}
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={handleSubmit}
                    className="e-btn-primary inline-flex items-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}
                    {submitting ? "Đang xử lý..." : "Nộp Hồ Sơ KYC"}
                  </button>
                  <p className="text-[0.74rem] text-[var(--e-light-muted)]">
                    Không chuyển trang khi đang xử lí hồ sơ.
                    Kết quả sẽ được cập nhật ngay sau khi hệ thống xử lý xong.
                  </p>
                </div>

                {errorMessage ? (
                  <div className="mt-4 rounded-xl border border-[rgba(184,74,42,0.35)] bg-[rgba(184,74,42,0.07)] px-4 py-3 text-[0.82rem] text-[#b84a2a]">
                    {errorMessage}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="mt-4 rounded-xl border border-[rgba(45,122,79,0.35)] bg-[rgba(45,122,79,0.08)] px-4 py-3 text-[0.82rem] text-[#2d7a4f]">
                    {successMessage}
                  </div>
                ) : null}
              </div>

              <div className="glass-panel p-7 border border-[var(--e-beige)] bg-white rounded-2xl shadow-sm">
                <div className="mb-4">
                  <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[var(--e-gold)] font-semibold mb-2">
                    Tài Liệu Đã Nộp
                  </p>
                  <h3 className="font-[var(--e-serif)] text-[1.45rem] text-[var(--e-charcoal)]">
                    Hồ Sơ Hiện Tại
                  </h3>
                </div>

                {((profile.kycDocuments?.length ?? 0) > 0 || Boolean(profile.kycPortraitUrl)) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {(profile.kycDocuments ?? []).map((docUrl, idx) => (
                      <a
                        key={`${docUrl}-${idx}`}
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block overflow-hidden rounded-xl border border-[var(--e-beige)] group"
                      >
                        <Image
                          src={docUrl}
                          alt={`KYC document ${idx + 1}`}
                          width={900}
                          height={700}
                          unoptimized
                          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(17,28,20,0.78)] to-transparent px-3 py-2.5">
                          <p className="text-[0.58rem] uppercase tracking-[0.14em] text-[var(--e-gold-light)] font-semibold">
                            Tài liệu {idx + 1}
                          </p>
                        </div>
                      </a>
                    ))}

                    {profile.kycPortraitUrl ? (
                      <a
                        href={profile.kycPortraitUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block overflow-hidden rounded-xl border border-[var(--e-beige)] group"
                      >
                        <Image
                          src={profile.kycPortraitUrl}
                          alt="KYC portrait"
                          width={900}
                          height={700}
                          unoptimized
                          className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(17,28,20,0.78)] to-transparent px-3 py-2.5">
                          <p className="text-[0.58rem] uppercase tracking-[0.14em] text-[var(--e-gold-light)] font-semibold">
                            Ảnh chân dung
                          </p>
                        </div>
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--e-sand)] bg-[var(--e-cream)] px-6 py-12 text-center">
                    <p className="font-[var(--e-serif)] italic text-[1.05rem] text-[var(--e-muted)]">
                      Chưa có tài liệu nào được tải lên
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <LuxuryFooter />
    </div>
  );
}
