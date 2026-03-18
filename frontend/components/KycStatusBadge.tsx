import React from "react";
import type { KycStatus } from "@/types/user";

interface KycStatusBadgeProps {
  status?: KycStatus;
}

const STATUS_LABEL: Record<KycStatus, string> = {
  pending: "Chưa Gửi",
  submitted: "Đã Gửi",
  reviewing: "Đang Xem Xét",
  verified: "Đã Xác Minh",
  rejected: "Bị Từ Chối",
};

export default function KycStatusBadge({ status = "pending" }: KycStatusBadgeProps) {
  return (
    <span className={`e-kyc-badge ${status}`}>
      <span className="e-kyc-badge-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}