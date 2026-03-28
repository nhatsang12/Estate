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
    subscriptionOverview: {
      activeCount: number;
      expiredCount: number;
      expiringSoonCount: number;
      expiringSoon: Array<{
        _id: string;
        planType: "Free" | "Pro" | "ProPlus";
        status: "active" | "expired" | "cancelled";
        expiresAt: string;
        user: {
          _id: string;
          name: string;
          email: string;
          role: "user" | "provider" | "admin";
        } | null;
      }>;
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
    subscriptionOverview?: {
      activeCount?: number;
      expiredCount?: number;
      expiringSoonCount?: number;
      expiringSoon?: Array<{
        _id: string;
        planType: "Free" | "Pro" | "ProPlus";
        status: "active" | "expired" | "cancelled";
        expiresAt: string;
        user?: {
          _id: string;
          name: string;
          email: string;
          role: "user" | "provider" | "admin";
        } | null;
      }>;
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

export interface AdminSubscriptionRecord {
  _id: string;
  planType: "Free" | "Pro" | "ProPlus";
  status: "active" | "expired" | "cancelled";
  subscribedAt: string;
  expiresAt: string;
  durationDays: number;
  transactionId?: {
    _id: string;
    amount: number;
    paymentMethod: "VNPay" | "PayPal";
    status: string;
    orderedAt: string;
  } | null;
  userId?: {
    _id: string;
    name: string;
    email: string;
    role: "user" | "provider" | "admin";
  } | null;
  amount?: number;
  paymentMethod?: "VNPay" | "PayPal" | "";
  lastRenewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AdminSubscriptionsResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    subscriptions: AdminSubscriptionRecord[];
  };
}

interface UpdateSubscriptionStatusResponse {
  status: string;
  data: {
    subscription: AdminSubscriptionRecord;
  };
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
        subscriptionOverview: {
          activeCount: d?.subscriptionOverview?.activeCount ?? 0,
          expiredCount: d?.subscriptionOverview?.expiredCount ?? 0,
          expiringSoonCount: d?.subscriptionOverview?.expiringSoonCount ?? 0,
          expiringSoon: Array.isArray(d?.subscriptionOverview?.expiringSoon)
            ? d.subscriptionOverview.expiringSoon.map((item) => ({
                _id: item._id,
                planType: item.planType,
                status: item.status,
                expiresAt: item.expiresAt,
                user: item.user
                  ? {
                      _id: item.user._id,
                      name: item.user.name,
                      email: item.user.email,
                      role: item.user.role,
                    }
                  : null,
              }))
            : [],
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

  async getSubscriptions(
    page = 1,
    limit = 20,
    filters?: { status?: "active" | "expired" | "cancelled"; planType?: "Free" | "Pro" | "ProPlus" }
  ) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (filters?.status) params.set("status", filters.status);
    if (filters?.planType) params.set("planType", filters.planType);

    return requestJson<AdminSubscriptionsResponse>(
      `/admin/subscriptions?${params.toString()}`,
      { method: "GET" }
    );
  },

  async updateSubscriptionStatus(
    subscriptionId: string,
    status: "active" | "expired" | "cancelled"
  ) {
    return requestJson<UpdateSubscriptionStatusResponse, { status: string }>(
      `/admin/subscriptions/${subscriptionId}/status`,
      {
        method: "PATCH",
        body: { status },
      }
    );
  },
};

export default adminService;
