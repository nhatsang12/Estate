import { requestJson } from "@/services/apiClient";
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
  console.log('buildPropertiesQuery filters:', JSON.stringify(filters));
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

function applyClientSideKeywordFilter(properties: Property[], filters?: PropertyFilters) {
  if (!filters) {
    return properties;
  }

  const keyword = filters.search?.trim().toLowerCase();
  const location = filters.locationText?.trim().toLowerCase();

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
      .join(" ")
      .toLowerCase();

    const matchesKeyword = keyword ? haystack.includes(keyword) : true;
    const matchesLocation = location ? haystack.includes(location) : true;
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

export const propertyService = {
  async getAllProperties(filters?: PropertyFilters) {
    const query = buildPropertiesQuery(filters);
    const response = await requestJson<PropertiesResponse>(`/properties${query}`, {
      method: "GET",
    });

    return {
      ...response,
      data: {
        ...response.data,
        properties: applyClientSideKeywordFilter(response.data.properties, filters),
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
    return response.data.property;
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
    return response.data.properties;
  },

  async getRecommendations(propertyId: string) {
    const response = await requestJson<RecommendationsResponse>(
      `/properties/${propertyId}/recommendations`,
      { method: "GET" }
    );
    return response.data.recommendations;
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
    return response.data.properties;
  },
};

export default propertyService;