import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { paymentService, type SubscriptionPlan, type PaymentMethod } from "@/services/paymentService";
import { useAuth } from "@/contexts/AuthContext";
import { Lock } from "lucide-react";

export default function SubscriptionCheckout() {
  const router = useRouter();
  const { plan } = router.query;
  const { user, isAuthLoading } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
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

  if (!plan || (plan !== "Pro" && plan !== "ProPlus")) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center">
            <p className="text-red-600 mb-4">Gói không hợp lệ</p>
            <button
              onClick={() => router.push("/subscription/plans")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              ← Quay lại gói dịch vụ
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const selectedPlan = paymentService.SUBSCRIPTION_PLANS[plan as SubscriptionPlan];
  const planType = plan as SubscriptionPlan;

  const handleCheckout = async () => {
    if (!paymentMethod) {
      setError("Vui lòng chọn phương thức thanh toán");
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const response = await paymentService.createCheckout(
        {
          subscriptionPlan: planType,
          paymentMethod,
        },
        true // redirect=true
      );
      // The response should contain a redirect URL
      if (response.data?.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      }
    } catch (error: any) {
      setError(error.message || "Lỗi khi tạo checkout");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Thanh toán</h1>
        <p className="text-gray-600 mb-8">Hoàn thành thanh toán để nâng cấp gói dịch vụ</p>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
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
              {/* VNPay */}
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                style={{ borderColor: paymentMethod === "VNPay" ? "#2563eb" : "#d1d5db" }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="VNPay"
                  checked={paymentMethod === "VNPay"}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-semibold text-gray-900">VNPay</span>
                  <p className="text-sm text-gray-600">Chuyển khoản ngân hàng, ví điện tử (0₫ phí)</p>
                </span>
              </label>

              {/* PayPal */}
              <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                style={{ borderColor: paymentMethod === "PayPal" ? "#2563eb" : "#d1d5db" }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="PayPal"
                  checked={paymentMethod === "PayPal"}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3">
                  <span className="font-semibold text-gray-900">PayPal</span>
                  <p className="text-sm text-gray-600">Thẻ tín dụng, tài khoản PayPal</p>
                </span>
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/subscription/plans")}
              className="flex-1 px-6 py-2 bg-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              ← Quay lại
            </button>
            <button
              onClick={handleCheckout}
              disabled={!paymentMethod || processing}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {processing ? "Đang xử lý..." : "Thanh toán ngay"}
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
