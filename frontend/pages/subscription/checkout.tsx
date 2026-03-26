import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { paymentService, type SubscriptionPlan, type PaymentMethod } from "@/services/paymentService";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, Landmark, Loader2, Lock } from "lucide-react";

export default function SubscriptionCheckout() {
  const router = useRouter();
  const { plan, method } = router.query;
  const { user, isAuthLoading } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("VNPay");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.push("/");
      } else {
        setLoading(false);
      }
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    const methodParam = Array.isArray(method) ? method[0] : method;
    if (methodParam === "VNPay" || methodParam === "PayPal") {
      setPaymentMethod(methodParam);
    }
  }, [method]);

  const planParam = Array.isArray(plan) ? plan[0] : plan;
  const isValidPlan = planParam === "Pro" || planParam === "ProPlus";

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-700">Đang tải...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isValidPlan) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">
            <p className="text-red-600 mb-4">Gói không hợp lệ</p>
            <button
              onClick={() => router.push("/provider/dashboard?view=plans")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              ← Quay lại gói dịch vụ
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const planType = planParam as SubscriptionPlan;
  const selectedPlan = paymentService.SUBSCRIPTION_PLANS[planType];

  const handleCheckout = async () => {
    try {
      setProcessing(true);
      setError(null);
      const response = await paymentService.createCheckout(
        {
          subscriptionPlan: planType,
          paymentMethod,
        },
        false // redirect=false: receive checkoutUrl JSON then navigate client-side to avoid CORS on fetch redirect
      );

      const checkoutUrl = response.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      setError("Không nhận được liên kết thanh toán. Vui lòng thử lại sau.");
    } catch (caughtError) {
      const fallbackMessage = "Lỗi khi tạo checkout";
      const message = caughtError instanceof Error ? caughtError.message : fallbackMessage;
      setError(message || fallbackMessage);
    } finally {
      setProcessing(false);
    }
  };

  const paymentOptions: Array<{
    value: PaymentMethod;
    title: string;
    description: string;
    icon: ComponentType<{ size?: number; className?: string }>;
  }> = [
    {
      value: "VNPay",
      title: "VNPay",
      description: "Chuyển khoản ngân hàng, ví điện tử (0₫ phí)",
      icon: Landmark,
    },
    {
      value: "PayPal",
      title: "PayPal",
      description: "Thẻ tín dụng, tài khoản PayPal",
      icon: CreditCard,
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Thanh toán</h1>
        <p className="text-gray-600 mb-8">Hoàn thành thanh toán để nâng cấp gói dịch vụ</p>

        <div className="glass-panel border border-slate-200/70 space-y-6">
          {/* Order Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <h2 className="font-bold text-gray-900 mb-4">Tóm tắt đơn hàng</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Khách hàng:</span>
                <span className="font-semibold">{user?.name || user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Gói:</span>
                <span className="font-semibold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Thời hạn:</span>
                <span className="font-semibold">{selectedPlan.duration} ngày</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold text-gray-900">Tổng cộng:</span>
                <span className="font-bold text-blue-600 text-lg">{selectedPlan.pricingDisplay}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <h2 className="font-bold text-gray-900 mb-4">Chọn phương thức thanh toán</h2>
            <div className="space-y-3">
              {paymentOptions.map((option) => {
                const isSelected = paymentMethod === option.value;
                const OptionIcon = option.icon;

                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                        : "border-slate-200 bg-white/70 hover:border-indigo-300 hover:bg-white/85"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setPaymentMethod(option.value)}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isSelected ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <OptionIcon size={18} />
                    </span>
                    <span>
                      <span className="font-semibold text-gray-900">{option.title}</span>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/provider/dashboard?view=plans")}
              className="glass-button flex-1 justify-center px-6 py-3 font-semibold"
            >
              ← Quay lại
            </button>
            <button
              onClick={handleCheckout}
              disabled={processing}
              className="glass-button-primary flex-1 justify-center px-6 py-3 font-semibold"
            >
              {processing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {paymentMethod === "VNPay" ? <Landmark size={16} /> : <CreditCard size={16} />}
                  {paymentMethod === "VNPay" ? "Thanh toán với VNPay" : "Thanh toán với PayPal"}
                </span>
              )}
            </button>
          </div>

          {/* Security Notice */}
          <div className="p-4 glass-panel border-indigo-200 text-sm text-indigo-800">
            <span className="flex items-center gap-2">
              <Lock size={18} />
              Giao dịch của bạn được bảo mật bằng mã hóa SSL. Chúng tôi không lưu trữ thông tin thẻ của bạn.
            </span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
