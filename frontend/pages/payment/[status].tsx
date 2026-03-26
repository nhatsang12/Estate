import { useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/router";
import { AlertTriangle, CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";

type PaymentStatus = "success" | "failed" | "cancelled" | "error";

interface StatusMeta {
  title: string;
  description: string;
  icon: ReactNode;
  accent: string;
  softBg: string;
  softBorder: string;
  iconBg: string;
  iconColor: string;
}

const STATUS_META: Record<PaymentStatus, StatusMeta> = {
  success: {
    title: "Thanh toán thành công",
    description: "Gói dịch vụ của bạn đã được kích hoạt. Hệ thống đang cập nhật quyền truy cập mới.",
    icon: <CheckCircle2 size={24} />,
    accent: "#2E8B75",
    softBg: "rgba(45,122,79,0.08)",
    softBorder: "rgba(45,122,79,0.25)",
    iconBg: "rgba(45,122,79,0.14)",
    iconColor: "#2E8B75",
  },
  failed: {
    title: "Thanh toán thất bại",
    description: "Giao dịch chưa hoàn tất. Bạn có thể thử lại hoặc chuyển sang phương thức khác.",
    icon: <XCircle size={24} />,
    accent: "#B84A2A",
    softBg: "rgba(184,74,42,0.08)",
    softBorder: "rgba(184,74,42,0.25)",
    iconBg: "rgba(184,74,42,0.14)",
    iconColor: "#B84A2A",
  },
  cancelled: {
    title: "Bạn đã hủy thanh toán",
    description: "Không có khoản phí nào được ghi nhận. Bạn có thể tiếp tục thanh toán bất cứ lúc nào.",
    icon: <Clock3 size={24} />,
    accent: "#C9A96E",
    softBg: "rgba(201,169,110,0.10)",
    softBorder: "rgba(201,169,110,0.30)",
    iconBg: "rgba(201,169,110,0.16)",
    iconColor: "#A07E3B",
  },
  error: {
    title: "Đã xảy ra lỗi hệ thống",
    description: "Chúng tôi chưa thể xác nhận trạng thái giao dịch. Vui lòng thử lại sau ít phút.",
    icon: <AlertTriangle size={24} />,
    accent: "#44608C",
    softBg: "rgba(68,96,140,0.08)",
    softBorder: "rgba(68,96,140,0.24)",
    iconBg: "rgba(68,96,140,0.14)",
    iconColor: "#44608C",
  },
};

function getSingleQuery(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatReason(reason: string | undefined) {
  if (!reason) return "N/A";
  return reason.replace(/_/g, " ");
}

export default function PaymentResultPage() {
  const router = useRouter();
  const { user } = useAuth();

  const statusParam = getSingleQuery(router.query.status);
  const normalizedStatus: PaymentStatus =
    statusParam === "success" || statusParam === "failed" || statusParam === "cancelled" || statusParam === "error"
      ? statusParam
      : "error";

  const meta = STATUS_META[normalizedStatus];
  const transactionId = getSingleQuery(router.query.transactionId);
  const paymentMethod = getSingleQuery(router.query.paymentMethod);
  const responseCode = getSingleQuery(router.query.responseCode);
  const reason = getSingleQuery(router.query.reason);

  const returnPath = useMemo(() => {
    if (user?.role === "provider") {
      return "/provider/dashboard?view=plans";
    }
    return "/";
  }, [user?.role]);

  const returnLabel = user?.role === "provider" ? "Quay về Provider Dashboard" : "Quay về trang chủ";

  useEffect(() => {
    if (normalizedStatus !== "success") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void router.replace(returnPath);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [normalizedStatus, returnPath, router]);

  return (
    <Layout>
      <div className="estoria relative px-4 py-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-60"
          style={{
            background:
              "radial-gradient(circle at 12% 20%, rgba(212,175,55,0.14), transparent 45%), radial-gradient(circle at 88% 12%, rgba(154,124,69,0.10), transparent 40%)",
          }}
        />

        <div
          className="mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-white/90 backdrop-blur-md"
          style={{
            borderColor: "rgba(154,124,69,0.16)",
            boxShadow: "0 14px 45px rgba(17,28,20,0.08)",
            animation: "status-slide-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          <div className="relative p-6 sm:p-8">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
              style={{
                background: `linear-gradient(90deg, ${meta.accent}, rgba(154,124,69,0.15), transparent 85%)`,
              }}
            />

            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p
                  className="mb-2 text-[0.58rem] font-bold uppercase"
                  style={{
                    letterSpacing: "0.18em",
                    color: "var(--e-gold)",
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  Kết Quả Thanh Toán
                </p>
                <h1
                  className="m-0 text-[clamp(1.5rem,2.5vw,2rem)]"
                  style={{
                    fontFamily: "var(--e-serif)",
                    color: "var(--e-charcoal)",
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {meta.title}
                </h1>
                <p
                  className="mt-2 max-w-2xl text-sm"
                  style={{
                    color: "var(--e-muted)",
                    lineHeight: 1.75,
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  {meta.description}
                </p>
              </div>

              <div
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border"
                style={{
                  background: meta.iconBg,
                  color: meta.iconColor,
                  borderColor: meta.softBorder,
                }}
              >
                {meta.icon}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: "rgba(154,124,69,0.16)",
                  background: "rgba(255,255,255,0.85)",
                }}
              >
                <p
                  className="mb-3 text-[0.58rem] font-bold uppercase"
                  style={{
                    letterSpacing: "0.14em",
                    color: "var(--e-light-muted)",
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  Chi Tiết Giao Dịch
                </p>
                <div className="space-y-2.5 text-sm" style={{ color: "var(--e-muted)", fontFamily: "var(--e-sans)" }}>
                  <p><span className="font-semibold text-[var(--e-charcoal)]">Mã giao dịch:</span> {transactionId || "N/A"}</p>
                  <p><span className="font-semibold text-[var(--e-charcoal)]">Phương thức:</span> {paymentMethod || "N/A"}</p>
                  <p><span className="font-semibold text-[var(--e-charcoal)]">Mã phản hồi:</span> {responseCode || "N/A"}</p>
                  <p><span className="font-semibold text-[var(--e-charcoal)]">Lý do:</span> {formatReason(reason)}</p>
                </div>
              </div>

              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: meta.softBorder,
                  background: meta.softBg,
                }}
              >
                <p
                  className="mb-3 text-[0.58rem] font-bold uppercase"
                  style={{
                    letterSpacing: "0.14em",
                    color: meta.accent,
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  Trạng Thái
                </p>
                <p
                  className="text-sm"
                  style={{
                    color: "var(--e-charcoal)",
                    lineHeight: 1.75,
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  {normalizedStatus === "success"
                    ? "Hệ thống sẽ tự động đưa bạn quay lại dashboard để tiếp tục quản lý gói dịch vụ."
                    : "Bạn có thể quay lại khu vực gói dịch vụ để thử thanh toán lại khi sẵn sàng."}
                </p>
              </div>
            </div>

            {normalizedStatus === "success" ? (
              <div className="mt-5">
                <p className="mb-2 text-xs" style={{ color: "var(--e-light-muted)", fontFamily: "var(--e-sans)" }}>
                  Tự động chuyển hướng sau 5 giây
                </p>
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ background: "rgba(154,124,69,0.14)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${meta.accent}, rgba(201,169,110,0.9))`,
                      animation: "status-progress 5s linear forwards",
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void router.push(returnPath)}
                className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all"
                style={{
                  borderColor: "var(--e-charcoal)",
                  background: "var(--e-charcoal)",
                  color: "var(--e-white)",
                  fontFamily: "var(--e-sans)",
                }}
              >
                {returnLabel}
              </button>

              {normalizedStatus !== "success" ? (
                <button
                  type="button"
                  onClick={() => void router.push("/provider/dashboard?view=plans")}
                  className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    borderColor: "rgba(154,124,69,0.24)",
                    background: "rgba(255,255,255,0.88)",
                    color: "var(--e-charcoal)",
                    fontFamily: "var(--e-sans)",
                  }}
                >
                  <RotateCcw size={14} />
                  Thử thanh toán lại
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes status-slide-up {
            from {
              opacity: 0;
              transform: translateY(12px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes status-progress {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}
