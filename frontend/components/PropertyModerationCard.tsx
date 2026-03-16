import React, { useState } from "react";
import Image from "next/image";
import { CheckCircle, XCircle } from "lucide-react";
import type { Property } from "@/types/property";

interface PropertyModerationCardProps {
  property: Property;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export default function PropertyModerationCard({
  property,
  onApprove,
  onReject,
  isLoading = false,
}: PropertyModerationCardProps) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối");
      return;
    }
    await onReject(rejectReason);
  };

  return (
    <div className="glass-panel overflow-hidden p-0">
      {/* Property Images */}
      <div className="grid grid-cols-3 gap-2 p-4 border-b border-boundary bg-surface/50">
        {property.images?.slice(0, 3).map((img, idx) => (
          <div key={idx} className="relative h-24 bg-background-light rounded-xl overflow-hidden">
            <Image src={img} alt={`Property ${idx + 1}`} fill className="object-cover" />
          </div>
        ))}
      </div>

      {/* Property Details */}
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-lg text-text-primary">{property.title}</h3>
          <p className="text-sm text-text-secondary">{property.address}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-boundary bg-surface p-2.5 shadow-sm">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Giá</p>
            <p className="font-semibold text-primary-dark">
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(property.price)}
            </p>
          </div>
          <div className="rounded-xl border border-boundary bg-surface p-2.5 shadow-sm">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Loại</p>
            <p className="font-semibold text-text-primary capitalize">{property.type}</p>
          </div>
          <div className="rounded-xl border border-boundary bg-surface p-2.5 shadow-sm">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Phòng ngủ</p>
            <p className="font-semibold text-text-primary">{property.bedrooms || 0}</p>
          </div>
          <div className="rounded-xl border border-boundary bg-surface p-2.5 shadow-sm">
            <p className="text-text-secondary text-xs uppercase tracking-wide">Diện tích</p>
            <p className="font-semibold text-text-primary">{property.area} m²</p>
          </div>
        </div>

        <div>
          <p className="text-text-secondary text-sm font-medium mb-1">Mô tả</p>
          <p className="text-sm text-text-primary line-clamp-3 leading-relaxed">{property.description}</p>
        </div>

        {property.amenities && property.amenities.length > 0 && (
          <div>
            <p className="text-text-secondary text-sm font-medium mb-2">Tiện ích</p>
            <div className="flex flex-wrap gap-1.5">
              {property.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="border border-boundary bg-surface text-text-primary px-2.5 py-1 rounded-lg text-xs font-medium shadow-sm"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Owner Info */}
        {typeof property.ownerId !== "string" && property.ownerId && (
          <div className="border-t border-boundary pt-4">
            <p className="text-text-secondary text-sm font-medium mb-2">Chủ sở hữu</p>
            <div className="text-sm bg-surface border border-boundary rounded-xl p-3 shadow-sm">
              <p className="font-semibold text-text-primary mb-1">{property.ownerId.name}</p>
              <p className="text-text-secondary">{property.ownerId.email}</p>
              <p className="text-text-secondary">{property.ownerId.phone}</p>
            </div>
          </div>
        )}

         {/* Moderation Actions */}
         <div className="border-t border-boundary pt-4 space-y-3 mt-4">
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
    </div>
  );
}
