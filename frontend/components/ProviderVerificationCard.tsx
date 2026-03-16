import React, { useState } from "react";
import Image from "next/image";
import { CheckCircle, XCircle } from "lucide-react";
import type { User } from "@/types/user";

interface ProviderVerificationCardProps {
  provider: User;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ProviderVerificationCard({
  provider,
  onApprove,
  onReject,
  isLoading = false,
}: ProviderVerificationCardProps) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }
    await onReject(rejectReason);
  };

  const kycDocuments = provider.kycDocuments || [];
  const extractedData = provider.kycExtractedData || {};

  return (
    <div className="glass-panel overflow-hidden p-0">
      {/* Provider Info */}
      <div className="p-5 border-b border-boundary bg-surface/50">
        <div className="flex gap-4 items-center">
          {provider.avatar && (
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-background-light shadow-sm">
              <Image src={provider.avatar} alt={provider.name} fill className="object-cover" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-lg text-text-primary">{provider.name}</h3>
            <p className="text-sm text-text-secondary">{provider.email}</p>
            <p className="text-sm text-text-secondary">{provider.phone}</p>
            <div className="mt-2 inline-block">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full border shadow-sm backdrop-blur-md ${
                  provider.kycStatus === "verified"
                    ? "border-emerald-200/60 bg-emerald-100/70 text-emerald-700"
                    : provider.kycStatus === "submitted" || provider.kycStatus === "reviewing"
                      ? "border-amber-200/60 bg-amber-100/70 text-amber-700"
                      : "border-rose-200/60 bg-rose-100/70 text-rose-700"
                }`}
              >
                {provider.kycStatus === "pending" && "Chưa gửi"}
                {provider.kycStatus === "submitted" && "Đã gửi"}
                {provider.kycStatus === "reviewing" && "Đang xem xét"}
                {provider.kycStatus === "verified" && "Đã xác nhận"}
                {provider.kycStatus === "rejected" && "Bị từ chối"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KYC Documents */}
      {kycDocuments.length > 0 && (
        <div className="p-5 border-b border-boundary">
          <h4 className="font-semibold text-text-primary mb-3">Tài liệu KYC</h4>
          <div className="grid grid-cols-2 gap-3">
            {kycDocuments.map((doc, idx) => (
              <div key={idx} className="relative h-40 bg-background-light rounded-xl overflow-hidden shadow-sm">
                <Image src={doc} alt={`Document ${idx + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Data */}
      {Object.keys(extractedData).length > 0 && (
        <div className="p-5 border-b border-boundary">
          <h4 className="font-semibold text-text-primary mb-3">Dữ liệu trích xuất</h4>
          <div className="space-y-2 text-sm bg-surface border border-boundary rounded-xl p-4 shadow-sm">
            {Object.entries(extractedData).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b border-boundary/50 last:border-0 pb-2 last:pb-0 mb-2 last:mb-0">
                <span className="text-text-secondary capitalize">{key}</span>
                <span className="font-semibold text-text-primary">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KYC Rejection Reason */}
      {provider.kycRejectionReason && (
        <div className="p-5 border-b border-boundary bg-accent/5 backdrop-blur-sm">
          <h4 className="font-semibold text-accent mb-2">Lý do từ chối</h4>
          <p className="text-sm text-accent max-w-none">{provider.kycRejectionReason}</p>
        </div>
      )}

       {/* Verification Actions */}
       <div className="p-5 space-y-3 bg-surface/30">
         {!showRejectReason ? (
           <div className="flex gap-3">
             <button
               onClick={onApprove}
               disabled={isLoading}
               className="flex-1 glass-button-primary justify-center gap-2 bg-emerald-600 hover:bg-emerald-500"
             >
               <CheckCircle size={18} />
               Phê duyệt
             </button>
             <button
               onClick={() => setShowRejectReason(true)}
               disabled={isLoading}
               className="flex-1 glass-button-primary justify-center gap-2 bg-accent hover:bg-rose-400"
             >
               <XCircle size={18} />
               Từ chối
             </button>
           </div>
         ) : (
           <div className="space-y-3">
             <textarea
               value={rejectReason}
               onChange={(e) => setRejectReason(e.target.value)}
               placeholder="Nhập lý do từ chối..."
               rows={3}
               className="w-full glass-input-wrapper resize-none py-2 px-3 text-sm text-text-primary"
             />
             <div className="flex gap-3">
               <button
                 onClick={handleReject}
                 disabled={isLoading}
                 className="flex-1 glass-button-primary justify-center bg-accent hover:bg-rose-400"
               >
                 Xác nhận từ chối
               </button>
               <button
                 onClick={() => {
                   setShowRejectReason(false);
                   setRejectReason("");
                 }}
                 disabled={isLoading}
                 className="flex-1 glass-button justify-center"
               >
                 Hủy
               </button>
             </div>
           </div>
         )}
       </div>
    </div>
  );
}
