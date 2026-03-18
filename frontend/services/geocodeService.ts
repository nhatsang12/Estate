const DEFAULT_PROVIDER =
  (process.env.NEXT_PUBLIC_GEOCODE_PROVIDER || "nominatim").toLowerCase();
const DEFAULT_COUNTRYCODES = process.env.NEXT_PUBLIC_GEOCODE_COUNTRYCODES || "vn";
const DEFAULT_LANGUAGE = process.env.NEXT_PUBLIC_GEOCODE_LANGUAGE || "vi";
const DEFAULT_EMAIL = process.env.NEXT_PUBLIC_GEOCODE_EMAIL || "";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MAPBOX_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places";

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName?: string;
}

export interface GeocodeSuggestion {
  id: string;
  displayName: string;
  lat: number;
  lng: number;
}

const normalizeAddress = (address: string) =>
  address.trim().replace(/\s+/g, " ");

const buildNominatimParams = (query: string, limit: number) => {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: String(limit),
    addressdetails: "1",
    "accept-language": DEFAULT_LANGUAGE,
  });
  if (DEFAULT_COUNTRYCODES.trim()) {
    params.set("countrycodes", DEFAULT_COUNTRYCODES.trim());
  }
  if (DEFAULT_EMAIL.trim()) {
    params.set("email", DEFAULT_EMAIL.trim());
  }
  return params;
};

async function geocodeWithNominatim(address: string): Promise<GeocodeResult> {
  const fetchResult = async (query: string) => {
    const params = buildNominatimParams(query, 1);
    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
      headers: {
        "Accept-Language": DEFAULT_LANGUAGE,
      },
    });
    if (!response.ok) {
      throw new Error("Không thể lấy tọa độ từ địa chỉ đã nhập.");
    }

    const data = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;

    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const result = data[0];
    const lat = Number(result.lat);
    const lng = Number(result.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return {
      lat,
      lng,
      displayName: result.display_name,
    } as GeocodeResult;
  };

  const normalized = normalizeAddress(address);
  const attempts = [
    normalized,
    `${normalized}, Viet Nam`,
    `${normalized}, Vietnam`,
  ];

  for (const attempt of attempts) {
    const result = await fetchResult(attempt);
    if (result) {
      return result;
    }
  }

  throw new Error(
    "Không tìm thấy tọa độ cho địa chỉ này. Hãy nhập địa chỉ đầy đủ (số nhà, đường, quận, tỉnh)."
  );
}

async function geocodeWithMapbox(address: string): Promise<GeocodeResult> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  if (!token) {
    throw new Error("Thiếu NEXT_PUBLIC_MAPBOX_TOKEN cho Mapbox geocoding.");
  }

  const params = new URLSearchParams({
    access_token: token,
    limit: "1",
    language: DEFAULT_LANGUAGE,
  });
  if (DEFAULT_COUNTRYCODES.trim()) {
    params.set("country", DEFAULT_COUNTRYCODES.trim());
  }

  const response = await fetch(
    `${MAPBOX_ENDPOINT}/${encodeURIComponent(address)}.json?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Không thể lấy tọa độ từ địa chỉ đã nhập.");
  }

  const data = (await response.json()) as {
    features?: Array<{ center?: [number, number]; place_name?: string }>;
  };

  const feature = data.features?.[0];
  const center = feature?.center;
  if (!center || center.length < 2) {
    throw new Error("Không tìm thấy tọa độ cho địa chỉ này.");
  }

  return {
    lng: Number(center[0]),
    lat: Number(center[1]),
    displayName: feature.place_name,
  };
}

async function searchWithNominatim(
  query: string,
  limit: number
): Promise<GeocodeSuggestion[]> {
  const params = buildNominatimParams(query, limit);
  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
    headers: { "Accept-Language": DEFAULT_LANGUAGE },
  });
  if (!response.ok) {
    throw new Error("Không thể lấy gợi ý địa chỉ.");
  }

  const data = (await response.json()) as Array<{
    place_id?: number;
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => ({
      id: String(item.place_id || item.display_name || Math.random()),
      displayName: item.display_name || "",
      lat: Number(item.lat),
      lng: Number(item.lon),
    }))
    .filter(
      (item) =>
        item.displayName &&
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng)
    );
}

async function searchWithMapbox(
  query: string,
  limit: number
): Promise<GeocodeSuggestion[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
  if (!token) {
    throw new Error("Thiếu NEXT_PUBLIC_MAPBOX_TOKEN cho Mapbox geocoding.");
  }

  const params = new URLSearchParams({
    access_token: token,
    limit: String(limit),
    language: DEFAULT_LANGUAGE,
    autocomplete: "true",
  });
  if (DEFAULT_COUNTRYCODES.trim()) {
    params.set("country", DEFAULT_COUNTRYCODES.trim());
  }

  const response = await fetch(
    `${MAPBOX_ENDPOINT}/${encodeURIComponent(query)}.json?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Không thể lấy gợi ý địa chỉ.");
  }

  const data = (await response.json()) as {
    features?: Array<{
      id?: string;
      place_name?: string;
      center?: [number, number];
    }>;
  };

  return (
    data.features?.map((feature) => ({
      id: feature.id || feature.place_name || Math.random().toString(),
      displayName: feature.place_name || "",
      lng: Number(feature.center?.[0]),
      lat: Number(feature.center?.[1]),
    })) || []
  ).filter(
    (item) =>
      item.displayName &&
      Number.isFinite(item.lat) &&
      Number.isFinite(item.lng)
  );
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const normalized = normalizeAddress(address);
  if (!normalized) {
    throw new Error("Vui lòng nhập địa chỉ để lấy tọa độ.");
  }

  if (DEFAULT_PROVIDER === "mapbox") {
    return geocodeWithMapbox(normalized);
  }

  return geocodeWithNominatim(normalized);
}

export async function searchAddressSuggestions(
  query: string,
  limit = 6
): Promise<GeocodeSuggestion[]> {
  const normalized = normalizeAddress(query);
  if (!normalized) {
    return [];
  }

  if (DEFAULT_PROVIDER === "mapbox") {
    return searchWithMapbox(normalized, limit);
  }

  return searchWithNominatim(normalized, limit);
}

