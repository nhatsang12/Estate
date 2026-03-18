import { requestJson } from "@/services/apiClient";
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
  };
}

interface DashboardStatsApiResponse {
  status: string;
  data: {
    stats: {
      users: number;
      providers: number;
      pendingProviders: number;
      verifiedProviders?: number;
      rejectedProviders?: number;
      properties: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
      };
    };
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
  data: {
    property?: Property;
  };
}

interface AdminVerifyResponse {
  status: string;
  message?: string;
  data: {
    provider: User;
  };
}

export const adminService = {
  async getDashboardStats() {
    const response = await requestJson<DashboardStatsApiResponse>("/admin/dashboard", {
      method: "GET",
    });

    const stats = response.data.stats;
    const totalProviders = stats.providers ?? 0;
    const totalPendingProviders = stats.pendingProviders ?? 0;
    const totalVerifiedProviders =
      stats.verifiedProviders ?? Math.max(totalProviders - totalPendingProviders, 0);
    const totalRejectedProviders = stats.rejectedProviders ?? 0;

    return {
      status: response.status,
      data: {
        totalUsers: stats.users ?? 0,
        totalProviders,
        totalProperties: stats.properties?.total ?? 0,
        totalPropertyApprovals: stats.properties?.approved ?? 0,
        totalPropertyRejections: stats.properties?.rejected ?? 0,
        totalVerifiedProviders,
        totalPendingProviders,
        totalRejectedProviders,
        pendingPropertiesCount: stats.properties?.pending ?? 0,
      },
    } as DashboardStatsResponse;
  },

  async getPendingProperties(page: number = 1, limit: number = 20) {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    return requestJson<PendingPropertiesResponse>(`/admin/properties/pending${query}`, {
      method: "GET",
    });
  },

  async getPendingProviders(page: number = 1, limit: number = 20) {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    return requestJson<PendingProvidersResponse>(`/admin/providers/pending${query}`, {
      method: "GET",
    });
  },

  async moderateProperty(propertyId: string, payload: ModeratePropertyPayload) {
    return requestJson<AdminModerateResponse>(`/admin/properties/${propertyId}/moderate`, {
      method: "PATCH",
      body: payload,
    });
  },

  async verifyProvider(providerId: string, payload: VerifyProviderPayload) {
    return requestJson<AdminVerifyResponse>(`/admin/providers/${providerId}/verify`, {
      method: "PATCH",
      body: payload,
    });
  },
};

export default adminService;
