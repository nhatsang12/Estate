const LEGACY_REASON_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Name mismatch/gi, "Tên không trùng khớp"],
  [/ID number mismatch/gi, "Số căn cước không trùng khớp"],
  [/Declared ID number is required/gi, "Vui lòng nhập số căn cước công dân"],
  [
    /ID number differs between CCCD front\/back/gi,
    "Số căn cước trên mặt trước và mặt sau không trùng khớp",
  ],
  [/Face mismatch/gi, "Khuôn mặt không trùng khớp"],
  [/No face detected in portrait/gi, "Không nhận diện được khuôn mặt ở ảnh chân dung"],
  [/No face detected on CCCD front/gi, "Không nhận diện được khuôn mặt trên CCCD"],
  [/Unable to extract full name/gi, "Không trích xuất được họ tên từ CCCD"],
  [/Unable to extract ID number/gi, "Không trích xuất được số căn cước từ CCCD"],
  [/OCR processing issue/gi, "Hệ thống OCR xử lý không ổn định"],
  [/KYC rejected by automated checks/gi, "Hồ sơ bị từ chối bởi kiểm tra tự động"],
  [/Điểm khuôn mặt quá thấp\s*\([^)]*\)/gi, ""],
];

export function translateKycRejectionReason(reason?: string | null) {
  if (!reason) return "";

  let translated = String(reason);

  for (const [pattern, replacement] of LEGACY_REASON_REPLACEMENTS) {
    translated = translated.replace(pattern, replacement);
  }

  translated = translated
    .replace(/,\s*,/g, ", ")
    .replace(/^,\s*|\s*,$/g, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return translated;
}
