import { requestJson } from "@/services/apiClient";
import type { Property } from "@/types/property";

export interface FavoriteItem {
  _id: string;
  userId: string;
  propertyId: string;
  property: Property | null;
  createdAt?: string;
  updatedAt?: string;
}

interface FavoritesListResponse {
  status: string;
  results: number;
  total?: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    favorites: FavoriteItem[];
    propertyIds: string[];
  };
}

interface FavoriteSingleResponse {
  status: string;
  data: {
    favorite: FavoriteItem;
  };
}

interface RemoveFavoriteResponse {
  status: string;
  data: {
    removedId: string;
    propertyId: string;
  };
}

interface FavoriteStatusResponse {
  status: string;
  data: {
    isFavorite: boolean;
    favoriteId: string | null;
    propertyId: string;
  };
}

export const favoriteService = {
  async getMyFavorites(page = 1, limit = 20) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return requestJson<FavoritesListResponse>(`/favorites?${params.toString()}`, {
      method: "GET",
    });
  },

  async addFavorite(propertyId: string) {
    return requestJson<FavoriteSingleResponse, { propertyId: string }>("/favorites", {
      method: "POST",
      body: { propertyId },
    });
  },

  async removeFavorite(id: string) {
    return requestJson<RemoveFavoriteResponse>(`/favorites/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  async getFavoriteStatus(propertyId: string) {
    return requestJson<FavoriteStatusResponse>(
      `/favorites/property/${encodeURIComponent(propertyId)}/status`,
      {
        method: "GET",
      }
    );
  },
};

export default favoriteService;
