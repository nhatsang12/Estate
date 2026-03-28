import { requestJson } from "@/services/apiClient";
import type { KycStatus, User } from "@/types/user";

interface MeResponse {
  status: string;
  data: {
    user: User;
  };
}

interface UpdateMePayload {
  name?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

interface SubmitKycResponse {
  status: string;
  message: string;
  data: {
    userId: string;
    kycStatus: KycStatus;
    isVerified: boolean;
    kycRejectionReason: string | null;
    kycDocuments: string[];
    kycPortraitUrl: string;
    kycExtractedData: Record<string, unknown> | null;
    kycComparisonResult: Record<string, unknown> | null;
    kycFaceComparisonResult: Record<string, unknown> | null;
  };
}

interface AdminUsersResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    users: User[];
  };
}

interface AdminUpdateKycResponse {
  status: string;
  message?: string;
  data: {
    user: User;
  };
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResponse {
  status: string;
  message: string;
}

interface DeclaredIdAvailabilityResponse {
  status: string;
  data: {
    declaredIdNumber: string;
    available: boolean;
  };
}

export interface KycReviewFilters {
  role?: "user" | "provider";
  page?: number;
  limit?: number;
  kycStatus?: KycStatus | "all";
  sort?: "newest" | "oldest";
}

export interface UpdateUserKycStatusPayload {
  isVerified: boolean;
  kycStatus: KycStatus;
  kycRejectionReason?: string;
}

function buildKycReviewQuery(filters?: KycReviewFilters) {
  const params = new URLSearchParams();

  if (filters?.role) {
    params.set("role", filters.role);
  }
  if (filters?.page) {
    params.set("page", String(filters.page));
  }
  if (filters?.limit) {
    params.set("limit", String(filters.limit));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export const userService = {
  async getMe(token: string) {
    const response = await requestJson<MeResponse>("/users/me", {
      method: "GET",
      token,
    });
    return response.data.user;
  },

  async updateMe(token: string, payload: UpdateMePayload) {
    const response = await requestJson<MeResponse, UpdateMePayload>("/users/me", {
      method: "PATCH",
      token,
      body: payload,
    });
    return response.data.user;
  },

  async submitKycDocuments(
    token: string,
    cccdFront: File,
    cccdBack: File,
    portrait: File,
    declaredIdNumber: string
  ) {
    const formData = new FormData();
    formData.append("cccdFront", cccdFront);
    formData.append("cccdBack", cccdBack);
    formData.append("portrait", portrait);

    formData.append("declaredIdNumber", declaredIdNumber.trim());

    return requestJson<SubmitKycResponse, FormData>("/users/kyc/submit", {
      method: "PATCH",
      token,
      body: formData,
    });
  },

  async checkDeclaredIdAvailability(token: string, declaredIdNumber: string) {
    const normalized = declaredIdNumber.replace(/\D/g, "");
    const query = new URLSearchParams({ declaredIdNumber: normalized }).toString();
    const response = await requestJson<DeclaredIdAvailabilityResponse>(
      `/users/kyc/declared-id/check?${query}`,
      {
        method: "GET",
        token,
      }
    );
    return response.data;
  },

  async getKycStatus(token: string) {
    const user = await this.getMe(token);
    return {
      kycStatus: user.kycStatus ?? "pending",
      isVerified: user.isVerified ?? false,
      kycRejectionReason: user.kycRejectionReason ?? "",
      kycDocuments: user.kycDocuments ?? [],
      kycPortraitUrl: user.kycPortraitUrl ?? "",
      kycExtractedData: user.kycExtractedData ?? null,
      kycComparisonResult: user.kycComparisonResult ?? null,
      kycFaceComparisonResult: user.kycFaceComparisonResult ?? null,
    };
  },

  async getUsersForKycReview(token: string, filters?: KycReviewFilters) {
    const query = buildKycReviewQuery(filters);
    const response = await requestJson<AdminUsersResponse>(`/users${query}`, {
      method: "GET",
      token,
    });

    let users = response.data.users;
    if (filters?.kycStatus && filters.kycStatus !== "all") {
      users = users.filter((user) => user.kycStatus === filters.kycStatus);
    }

    if (filters?.sort === "oldest") {
      users = users.slice().sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else {
      users = users.slice().sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    return {
      ...response,
      data: {
        users,
      },
    };
  },

  async updateUserKycStatus(
    token: string,
    userId: string,
    statusData: UpdateUserKycStatusPayload
  ) {
    const payload: UpdateUserKycStatusPayload = {
      isVerified: statusData.isVerified,
      kycStatus: statusData.kycStatus,
      ...(statusData.kycRejectionReason
        ? { kycRejectionReason: statusData.kycRejectionReason }
        : {}),
    };

    const response = await requestJson<
      AdminUpdateKycResponse,
      UpdateUserKycStatusPayload
    >(`/admin/providers/${userId}/verify`, {
      method: "PATCH",
      token,
      body: payload,
    });

    return response.data.user;
  },

  async changePassword(token: string, payload: ChangePasswordPayload) {
    const response = await requestJson<ChangePasswordResponse, ChangePasswordPayload>(
      "/users/change-password",
      {
        method: "PATCH",
        token,
        body: payload,
      }
    );
    return response.message;
  },
};

export default userService;

