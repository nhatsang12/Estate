import { ApiError, requestJson } from "@/services/apiClient";

export type SubscriptionPlan = "Pro" | "ProPlus";
export type SubscriptionTier = "Free" | SubscriptionPlan;
export type PaymentMethod = "VNPay" | "PayPal";
export type TransactionStatus = "pending" | "success" | "failed" | "cancelled";

interface CreateCheckoutPayload {
  subscriptionPlan: SubscriptionPlan;
  paymentMethod: PaymentMethod;
  amount?: number;
}

interface CreateCheckoutResponse {
  status: string;
  data: {
    checkoutUrl: string;
  };
}

export interface SubscriptionTransaction {
  _id: string;
  subscriptionPlan: SubscriptionTier;
  amount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  orderedAt: string;
  expiresAt: string;
  paymentGatewayTransactionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SubscriptionHistoryResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    subscriptions: SubscriptionTransaction[];
  };
}

interface SubscriptionPlanConfig {
  name: string;
  price: number;
  pricingDisplay: string;
  duration: number;
  features: string[];
}

export interface CurrentSubscriptionStatus {
  _id: string | null;
  planType: SubscriptionTier;
  status: "active" | "expired" | "cancelled";
  subscribedAt: string | null;
  expiresAt: string | null;
  durationDays: number;
  transactionId: string | null;
  amount: number;
  paymentMethod: PaymentMethod | "";
  lastRenewedAt: string | null;
  remainingDays: number;
  isActive: boolean;
}

interface SubscriptionStatusResponse {
  status: string;
  data: {
    subscription: CurrentSubscriptionStatus;
  };
}

export const paymentService = {
  async createCheckout(payload: CreateCheckoutPayload, redirect: boolean = false) {
    const params = new URLSearchParams();
    params.set("redirect", String(redirect));
    const query = params.toString() ? `?${params.toString()}` : "";
    return requestJson<CreateCheckoutResponse, CreateCheckoutPayload>(`/payments/create-checkout${query}`, {
      method: "POST",
      body: payload,
    });
  },

  async getMySubscriptions(page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return requestJson<SubscriptionHistoryResponse>(
      `/payments/subscriptions/me?${params.toString()}`,
      { method: "GET" }
    );
  },

  async getMySubscriptionStatus() {
    try {
      const response = await requestJson<SubscriptionStatusResponse>(
        "/payments/subscription-status/me",
        { method: "GET" }
      );
      return response.data.subscription;
    } catch (error) {
      if (
        error instanceof ApiError &&
        ([401, 403, 404, 429].includes(error.statusCode) || error.statusCode >= 500)
      ) {
        return null;
      }
      throw error;
    }
  },

  // Subscription plans pricing
  SUBSCRIPTION_PLANS: {
    Pro: {
      name: "Pro",
      price: 19990000,
      pricingDisplay: "19.990.000₫/tháng",
      duration: 30,
      features: [
        "Đăng tối đa 20 bất động sản",
        "Ưu tiên hiển thị cao",
        "Phân tích chi tiết",
        "Hỗ trợ ưu tiên",
      ],
    },
    ProPlus: {
      name: "Pro Plus",
      price: 99990000,
      pricingDisplay: "99.990.000₫/tháng",
      duration: 30,
      features: [
        "Tin đăng không giới hạn",
        "Ưu tiên hiển thị tối cao",
        "Phân tích chi tiết + AI insights",
        "Hỗ trợ VIP 24/7",
        "Quản lý đại lý",
      ],
    },
  } as Record<SubscriptionPlan, SubscriptionPlanConfig>,
};

export default paymentService;
