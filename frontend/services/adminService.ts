import { requestJson } from "@/services/apiClient";
import type { SubscriptionTransaction } from "@/services/paymentService";
import type { Property } from "@/types/property";
import type { User } from "@/types/user";

interface DashboardStatsResponse {
  status: string;
  data: {
    totalUsers: number;
    totalProviders: number;
    totalProperties: number;
    totalPropertyApprovals: number;
    totalPropertyRejections: number;
    totalVerifiedProviders: number;
    totalPendingProviders: number;
    totalRejectedProviders: number;
    pendingPropertiesCount: number;
    activePaidProviders: number;
    subscriptionSales: {
      totalSold: number;
      totalRevenue: number;
      byPlan: {
        Pro: { totalSold: number; totalRevenue: number };
        ProPlus: { totalSold: number; totalRevenue: number };
      };
      byPaymentMethod: {
        VNPay: { totalSold: number; totalRevenue: number };
        PayPal: { totalSold: number; totalRevenue: number };
      };
    };
  };
}

// Shape thực tế từ API:
// { status: "success", data: { totalUsers, totalProviders, totalPendingProviders, ... } }
interface DashboardStatsApiResponse {
  status: string;
  data: {
    totalUsers: number;
    totalProviders: number;
    totalPendingProviders: number;
    totalVerifiedProviders: number;
    totalRejectedProviders: number;
    totalProperties?: number;
    totalPropertyApprovals?: number;
    totalPropertyRejections?: number;
    pendingPropertiesCount?: number;
    activePaidProviders?: number;
    subscriptionSales?: {
      totalSold?: number;
      totalRevenue?: number;
      byPlan?: {
        Pro?: { totalSold?: number; totalRevenue?: number };
        ProPlus?: { totalSold?: number; totalRevenue?: number };
      };
      byPaymentMethod?: {
        VNPay?: { totalSold?: number; totalRevenue?: number };
        PayPal?: { totalSold?: number; totalRevenue?: number };
      };
    };
    // fallback nếu API dùng tên khác
    properties?: {
      total?: number;
      pending?: number;
      approved?: number;
      rejected?: number;
    } | number;
  };
}

interface PendingPropertiesResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    properties: Property[];
  };
}

interface PendingProvidersResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    providers: User[];
  };
}

interface ProviderSubscriptionsResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    provider: User;
    subscriptions: SubscriptionTransaction[];
  };
}

interface ModeratePropertyPayload {
  status: "approved" | "rejected";
  rejectionReason?: string;
}

interface VerifyProviderPayload {
  isVerified: boolean;
  kycRejectionReason?: string;
}

interface AdminModerateResponse {
  status: string;
  message?: string;
  data: { property?: Property };
}

interface AdminVerifyResponse {
  status: string;
  message?: string;
  data: { provider: User };
}

export const adminService = {
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const response = await requestJson<DashboardStatsApiResponse>("/admin/dashboard", {
      method: "GET",
    });

    // API trả: { status, data: { totalUsers, totalProviders, totalPendingProviders, ... } }
    const d = response.data;

    const props = d?.properties;
    const isObj = props !== null && typeof props === "object";

    return {
      status: response.status ?? "success",
      data: {
        totalUsers: d?.totalUsers ?? 0,
        totalProviders: d?.totalProviders ?? 0,
        totalProperties:
          d?.totalProperties ??
          (isObj ? (props as any)?.total ?? 0 : typeof props === "number" ? props : 0),
        totalPropertyApprovals:
          d?.totalPropertyApprovals ?? (isObj ? (props as any)?.approved ?? 0 : 0),
        totalPropertyRejections:
          d?.totalPropertyRejections ?? (isObj ? (props as any)?.rejected ?? 0 : 0),
        totalVerifiedProviders: d?.totalVerifiedProviders ?? 0,
        totalPendingProviders: d?.totalPendingProviders ?? 0,
        totalRejectedProviders: d?.totalRejectedProviders ?? 0,
        activePaidProviders: d?.activePaidProviders ?? 0,
        pendingPropertiesCount:
          d?.pendingPropertiesCount ?? (isObj ? (props as any)?.pending ?? 0 : 0),
        subscriptionSales: {
          totalSold: d?.subscriptionSales?.totalSold ?? 0,
          totalRevenue: d?.subscriptionSales?.totalRevenue ?? 0,
          byPlan: {
            Pro: {
              totalSold: d?.subscriptionSales?.byPlan?.Pro?.totalSold ?? 0,
              totalRevenue: d?.subscriptionSales?.byPlan?.Pro?.totalRevenue ?? 0,
            },
            ProPlus: {
              totalSold: d?.subscriptionSales?.byPlan?.ProPlus?.totalSold ?? 0,
              totalRevenue: d?.subscriptionSales?.byPlan?.ProPlus?.totalRevenue ?? 0,
            },
          },
          byPaymentMethod: {
            VNPay: {
              totalSold: d?.subscriptionSales?.byPaymentMethod?.VNPay?.totalSold ?? 0,
              totalRevenue: d?.subscriptionSales?.byPaymentMethod?.VNPay?.totalRevenue ?? 0,
            },
            PayPal: {
              totalSold: d?.subscriptionSales?.byPaymentMethod?.PayPal?.totalSold ?? 0,
              totalRevenue: d?.subscriptionSales?.byPaymentMethod?.PayPal?.totalRevenue ?? 0,
            },
          },
        },
      },
    };
  },

  async getPendingProperties(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return requestJson<PendingPropertiesResponse>(
      `/admin/properties/pending?${params.toString()}`,
      { method: "GET" }
    );
  },

  async getPendingProviders(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return requestJson<PendingProvidersResponse>(
      `/admin/providers/pending?${params.toString()}`,
      { method: "GET" }
    );
  },

  async moderateProperty(propertyId: string, payload: ModeratePropertyPayload) {
    return requestJson<AdminModerateResponse>(
      `/admin/properties/${propertyId}/moderate`,
      { method: "PATCH", body: payload }
    );
  },

  async verifyProvider(providerId: string, payload: VerifyProviderPayload) {
    return requestJson<AdminVerifyResponse>(
      `/admin/providers/${providerId}/verify`,
      { method: "PATCH", body: payload }
    );
  },

  async getProviderSubscriptions(providerId: string, page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    return requestJson<ProviderSubscriptionsResponse>(
      `/admin/providers/${providerId}/subscriptions?${params.toString()}`,
      { method: "GET" }
    );
  },
};

export default adminService;
