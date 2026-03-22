import React from "react";
import type { KycStatus } from "@/types/user";
import { Clock, Send, Eye, ShieldCheck, ShieldAlert } from "lucide-react";

interface KycStatusBadgeProps {
  status?: KycStatus;
}

const STATUS_CONFIG: Record<KycStatus, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  pending: { label: "Chưa Gửi", icon: Clock, color: "var(--e-muted)", bg: "rgba(0,0,0,0.03)", border: "rgba(0,0,0,0.1)" },
  submitted: { label: "Đã Gửi", icon: Send, color: "var(--e-charcoal)", bg: "rgba(26,23,20,0.05)", border: "rgba(26,23,20,0.15)" },
  reviewing: { label: "Đang Xem Xét", icon: Eye, color: "var(--e-gold)", bg: "rgba(154,124,69,0.08)", border: "rgba(154,124,69,0.25)" },
  verified: { label: "Đã Xác Minh", icon: ShieldCheck, color: "#2E8B75", bg: "rgba(46,139,117,0.08)", border: "rgba(46,139,117,0.25)" },
  rejected: { label: "Bị Từ Chối", icon: ShieldAlert, color: "#b84a2a", bg: "rgba(184,74,42,0.08)", border: "rgba(184,74,42,0.25)" },
};

export default function KycStatusBadge({ status = "pending" }: KycStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 8px", borderRadius: "6px",
      background: config.bg, color: config.color,
      border: `1px solid ${config.border}`,
      fontFamily: "var(--e-sans)", fontSize: "0.62rem",
      fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
      whiteSpace: "nowrap", flexShrink: 0
    }}>
      <Icon size={12} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}