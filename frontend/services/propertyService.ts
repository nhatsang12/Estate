import { ApiError, requestJson } from "@/services/apiClient";
import type { Property, PropertyFilters } from "@/types/property";

interface PropertiesResponse {
  status: string;
  results: number;
  total?: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    properties: Property[];
  };
}

interface PropertyResponse {
  status: string;
  data: {
    property: Property;
  };
}

function appendIfDefined(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) {
    return;
  }
  formData.append(key, String(value));
}

function buildPropertyBody(data: CreatePropertyPayload | UpdatePropertyPayload) {

  // ── Chỉ coi là "có file mới" khi thực sự có File object, không phải string URL ──
  const hasNewImages =
    Array.isArray(data.images) && data.images.some((f) => f instanceof File);
  const hasNewDocs =
    Array.isArray(data.ownershipDocuments) &&
    data.ownershipDocuments.some((f) => f instanceof File);

  if (!hasNewImages && !hasNewDocs) {
    // Không có file mới → gửi JSON, loại bỏ images/docs khỏi payload
    const { images, ownershipDocuments, ...rest } = data as any;
    // Include existingImages if provided (for deleting old images)
    const jsonPayload: any = { ...rest };
    if ('existingImages' in data && (data as any).existingImages !== undefined) {
      jsonPayload.existingImages = (data as any).existingImages;
    }
    return jsonPayload;
  }

  // Có file mới → dùng FormData
  const formData = new FormData();
  appendIfDefined(formData, "title", data.title);
  appendIfDefined(formData, "description", data.description);
  appendIfDefined(formData, "price", data.price);
  appendIfDefined(formData, "address", data.address);
  appendIfDefined(formData, "type", data.type);
  appendIfDefined(formData, "bedrooms", data.bedrooms);
  appendIfDefined(formData, "bathrooms", data.bathrooms);
  appendIfDefined(formData, "area", data.area);
  if (typeof data.furnished === "boolean") {
    formData.append("furnished", String(data.furnished));
  }
  appendIfDefined(formData, "yearBuilt", data.yearBuilt);

  if (Array.isArray(data.amenities)) {
    data.amenities.forEach((amenity) => {
      if (amenity) {
        formData.append("amenities", amenity);
      }
    });
  }

  if (data.location) {
    formData.append("location[type]", data.location.type || "Point");
    if (Array.isArray(data.location.coordinates)) {
      if (data.location.coordinates[0] !== undefined) {
        formData.append("location[coordinates][0]", String(data.location.coordinates[0]));
      }
      if (data.location.coordinates[1] !== undefined) {
        formData.append("location[coordinates][1]", String(data.location.coordinates[1]));
      }
    }
  }

  // ── Chỉ append File object, bỏ qua string URL ──
  if (Array.isArray(data.images)) {
    data.images.forEach((file) => {
      if (file instanceof File) {
        formData.append("images", file);
      }
    });
  }

  if (Array.isArray(data.ownershipDocuments)) {
    data.ownershipDocuments.forEach((file) => {
      if (file instanceof File) {
        formData.append("ownershipDocuments", file);
      }
    });
  }

  // ── Include existingImages if provided (for deleting old images during update) ──
  if ('existingImages' in data && (data as any).existingImages !== undefined) {
    formData.append('existingImages', JSON.stringify((data as any).existingImages));
  }

  return formData;
}

function buildPropertiesQuery(filters?: PropertyFilters) {
  
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();

  if (filters.priceMin !== undefined) {
    params.set("price[gte]", String(filters.priceMin));
  }
  if (filters.priceMax !== undefined) {
    params.set("price[lte]", String(filters.priceMax));
  }
  if (filters.areaMin !== undefined) {
    params.set("area[gte]", String(filters.areaMin));
  }
  if (filters.areaMax !== undefined) {
    params.set("area[lte]", String(filters.areaMax));
  }
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.types && filters.types.length > 0) {
    filters.types.forEach(t => params.append("type", t));
  }
  if (filters.bedrooms !== undefined) {
    params.set("bedrooms", String(filters.bedrooms));
  }
  if (filters.bedroomsGte !== undefined) {
    params.set("bedrooms[gte]", String(filters.bedroomsGte));
  }
  if (filters.bathrooms !== undefined) {
    params.set("bathrooms", String(filters.bathrooms));
  }
  if (filters.bathroomsGte !== undefined) {
    params.set("bathrooms[gte]", String(filters.bathroomsGte));
  }
  if (filters.furnished !== undefined) {
    params.set("furnished", String(filters.furnished));
  }
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.locationText) {
    params.set("locationText", filters.locationText);
  }
  if (filters.ownerId) {
    params.set("ownerId", filters.ownerId);
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.limit !== undefined) {
    params.set("limit", String(filters.limit));
  }
  if (filters.page !== undefined) {
    params.set("page", String(filters.page));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeForKeyword(value?: string) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesNormalizedText(haystack: string, normalizedNeedle: string) {
  if (!normalizedNeedle) return true;
  if (haystack.includes(normalizedNeedle)) return true;
  const tokens = normalizedNeedle.split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

function applyClientSideKeywordFilter(properties: Property[], filters?: PropertyFilters) {
  if (!filters) {
    return properties;
  }

  const keyword = normalizeForKeyword(filters.search?.trim());
  const location = normalizeForKeyword(filters.locationText?.trim());

  if (!keyword && !location) {
    return properties;
  }

  return properties.filter((property) => {
    const haystack = [
      property.title,
      property.address,
      property.description,
      property.type,
      ...(property.amenities || []),
    ]
      .filter(Boolean)
      .join(" ");

    const normalizedHaystack = normalizeForKeyword(haystack);

    const matchesKeyword = keyword
      ? matchesNormalizedText(normalizedHaystack, keyword)
      : true;
    const matchesLocation = location
      ? matchesNormalizedText(normalizedHaystack, location)
      : true;
    return matchesKeyword && matchesLocation;
  });
}

interface CreatePropertyPayload {
  title: string;
  description: string;
  price: number;
  address: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  type: "apartment" | "house" | "villa" | "studio" | "office";
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  furnished: boolean;
  yearBuilt?: number;
  amenities?: string[];
  images?: File[];
  ownershipDocuments?: File[];
}

interface UpdatePropertyPayload extends Partial<CreatePropertyPayload> {
  existingImages?: string[];
}

interface MyPropertiesResponse {
  status: string;
  results: number;
  totalPages?: number;
  currentPage?: number;
  data: {
    properties: Property[];
  };
}

interface RecommendationsResponse {
  status: string;
  results?: number;
  data: {
    recommendations: Property[];
  };
}

interface MarkSoldResponse {
  status: string;
  message?: string;
  data: {
    property: Property;
  };
}

interface PropertyVisibilityResponse {
  status: string;
  message?: string;
  data: {
    property: Property;
  };
}

interface ProviderSalesStatsResponse {
  status: string;
  data: {
    totalSoldProperties: number;
    totalSoldValue: number;
    latestSoldAt: string | null;
    recentSold: Property[];
  };
}

export interface FilterOptionsData {
  types: { value: string; label: string }[];
  tabs: string[];
  bedrooms: string[];
  bathrooms: string[];
}

interface FilterOptionsResponse {
  status: string;
  data: {
    filters: FilterOptionsData;
  };
}

function stripHeavyPropertyFields(property: Property): Property {
  const normalized = { ...(property as unknown as Record<string, unknown>) };
  delete (normalized as { embedding?: unknown }).embedding;
  return normalized as unknown as Property;
}

function sanitizePropertyList(properties: Property[]) {
  return properties.map(stripHeavyPropertyFields);
}

export const propertyService = {
  async getAllProperties(filters?: PropertyFilters) {
    const query = buildPropertiesQuery(filters);
    const response = await requestJson<PropertiesResponse>(`/properties${query}`, {
      method: "GET",
    });

    const sanitized = sanitizePropertyList(response.data.properties);

    return {
      ...response,
      data: {
        ...response.data,
        properties: applyClientSideKeywordFilter(sanitized, filters),
      },
    };
  },

  async getFilterOptions() {
    const response = await requestJson<FilterOptionsResponse>("/properties/filters", {
      method: "GET",
    });
    return response.data.filters;
  },

  async getPropertyById(id: string) {
    const response = await requestJson<PropertyResponse>(`/properties/${id}`, {
      method: "GET",
    });
    return stripHeavyPropertyFields(response.data.property);
  },

  async createProperty(data: CreatePropertyPayload) {
    const body = buildPropertyBody(data);
    const response = await requestJson<PropertyResponse>("/properties", {
      method: "POST",
      body,
    });
    return response.data.property;
  },

  async updateProperty(id: string, data: UpdatePropertyPayload) {
    const body = buildPropertyBody(data);
    const response = await requestJson<PropertyResponse>(`/properties/${id}`, {
      method: "PATCH",
      body,
    });
    return response.data.property;
  },

  async resubmitForApproval(propertyId: string) {
    const response = await requestJson<PropertyResponse, { status: string; rejectionReason: string }>(
      `/properties/${encodeURIComponent(propertyId)}`,
      {
        method: "PATCH",
        body: {
          status: "pending",
          rejectionReason: "",
        },
      }
    );
    return response.data.property;
  },

  async deleteProperty(id: string) {
    return requestJson(`/properties/${id}`, {
      method: "DELETE",
    });
  },

  async getMyProperties(filters?: PropertyFilters) {
    const query = buildPropertiesQuery(filters);
    const response = await requestJson<MyPropertiesResponse>(`/properties${query}`, {
      method: "GET",
    });
    return sanitizePropertyList(response.data.properties);
  },

  async getRecommendations(propertyId: string) {
    const response = await requestJson<RecommendationsResponse>(
      `/properties/${propertyId}/recommendations`,
      { method: "GET" }
    );
    return sanitizePropertyList(response.data.recommendations);
  },

  async markAsSold(propertyId: string, soldAt?: string) {
    const response = await requestJson<MarkSoldResponse, { soldAt?: string }>(
      `/properties/${encodeURIComponent(propertyId)}/mark-sold`,
      {
        method: "PATCH",
        body: soldAt ? { soldAt } : {},
      }
    );
    return response.data.property;
  },

  async setVisibility(propertyId: string, hidden: boolean) {
    const response = await requestJson<PropertyVisibilityResponse, { hidden: boolean }>(
      `/properties/${encodeURIComponent(propertyId)}/visibility`,
      {
        method: "PATCH",
        body: { hidden },
      }
    );
    return response.data.property;
  },

  async getMySalesStats() {
    try {
      const response = await requestJson<ProviderSalesStatsResponse>(
        "/properties/sales/stats/me",
        { method: "GET" }
      );
      return response.data;
    } catch (error) {
      if (
        error instanceof ApiError &&
        ([401, 403, 404, 429].includes(error.statusCode) || error.statusCode >= 500)
      ) {
        return {
          totalSoldProperties: 0,
          totalSoldValue: 0,
          latestSoldAt: null,
          recentSold: [],
        };
      }
      throw error;
    }
  },

  async getPropertiesWithin(
    distance: number,
    lat: number,
    lng: number,
    unit: "km" | "mi" = "km"
  ) {
    const latlng = `${lat},${lng}`;
    const response = await requestJson<PropertiesResponse>(
      `/properties/properties-within/${distance}/center/${latlng}/unit/${unit}`,
      { method: "GET" }
    );
    return sanitizePropertyList(response.data.properties);
  },
};

export default propertyService;
