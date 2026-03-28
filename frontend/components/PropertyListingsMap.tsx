import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { Property } from "@/types/property";
import { formatVNDShort } from "@/utils/formatPrice";
import { optimizeCloudinaryUrl } from "@/utils/imageOptimization";

interface PropertyListingsMapProps {
  properties: Property[];
  onLocate?: (lat: number, lng: number) => Promise<void> | void;
  activePropertyId?: string | null;
  height?: number;
}

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];
const DEFAULT_ZOOM = 11;

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPropertyLatLng(property: Property): [number, number] | null {
  const coords = property.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

export default function PropertyListingsMap({
  properties,
  onLocate,
  activePropertyId = null,
  height = 620,
}: PropertyListingsMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markerByPropertyIdRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const points = useMemo(
    () =>
      properties
        .map((property) => ({ property, latlng: getPropertyLatLng(property) }))
        .filter((item): item is { property: Property; latlng: [number, number] } =>
          Boolean(item.latlng)
        ),
    [properties]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 120);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const timer = window.setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [height]);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    markerByPropertyIdRef.current.clear();

    if (points.length === 0) {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
      return;
    }

    const bounds = L.latLngBounds([]);
    points.forEach(({ property, latlng }) => {
      bounds.extend(latlng);
      const marker = L.marker(latlng, { icon: markerIcon });
      const safeTitle = escapeHtml(property.title || "Bất động sản");
      const safeAddress = escapeHtml(property.address || "");
      const price = escapeHtml(formatVNDShort(property.price || 0));
      const image = property.images?.[0] || "";
      const optimizedImage = image ? optimizeCloudinaryUrl(image, 220) : "";
      const href = `/properties/${property._id}`;

      marker.bindPopup(
        `
          <div style="width:220px;font-family:system-ui, -apple-system, Segoe UI, sans-serif;">
            ${
              optimizedImage
                ? `<img src="${optimizedImage}" alt="${safeTitle}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;loading:lazy;decoding:async;" />`
                : ""
            }
            <div style="font-size:14px;font-weight:700;color:#1f2937;line-height:1.35;margin-bottom:4px;">${safeTitle}</div>
            <div style="font-size:12px;color:#6b7280;line-height:1.4;margin-bottom:6px;">${safeAddress}</div>
            <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">${price}</div>
            <a href="${href}" style="display:inline-block;font-size:12px;font-weight:600;color:#fff;background:#111827;padding:6px 10px;border-radius:7px;text-decoration:none;">Xem chi tiết</a>
          </div>
        `,
        { closeButton: true, autoPan: true, maxWidth: 260 }
      );

      marker.on("mouseover", () => marker.openPopup());
      marker.addTo(markersLayerRef.current!);
      markerByPropertyIdRef.current.set(property._id, marker);
    });

    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds.pad(0.2), {
        animate: true,
        maxZoom: 14,
      });
    }
  }, [points]);

  useEffect(() => {
    if (!activePropertyId || !mapRef.current) return;
    const marker = markerByPropertyIdRef.current.get(activePropertyId);
    if (!marker) return;

    const map = mapRef.current;
    const markerLatLng = marker.getLatLng();
    if (!map.getBounds().pad(-0.08).contains(markerLatLng)) {
      map.panTo(markerLatLng, { animate: true, duration: 0.35 });
    }
    marker.openPopup();
  }, [activePropertyId]);

  const handleLocate = async () => {
    if (!navigator.geolocation) {
      setLocateError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    setLocating(true);
    setLocateError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 13, { animate: true });
        }

        if (userMarkerRef.current && mapRef.current) {
          mapRef.current.removeLayer(userMarkerRef.current);
        }
        if (mapRef.current) {
          userMarkerRef.current = L.circleMarker([lat, lng], {
            radius: 8,
            color: "#0f172a",
            weight: 2,
            fillColor: "#f59e0b",
            fillOpacity: 0.9,
          }).addTo(mapRef.current);
        }

        try {
          if (onLocate) await onLocate(lat, lng);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        const message =
          error.code === 1
            ? "Bạn đã từ chối quyền định vị."
            : "Không thể lấy vị trí hiện tại.";
        setLocateError(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#d6dbe3] bg-white">
      <div ref={containerRef} style={{ width: "100%", height }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[420] bg-gradient-to-b from-black/20 to-transparent p-3" />
      <button
        type="button"
        onClick={() => void handleLocate()}
        disabled={locating}
        className="absolute right-3 top-3 z-[430] inline-flex items-center gap-2 rounded-lg border border-white/60 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 shadow backdrop-blur transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {locating ? "Đang định vị..." : "Vị trí của tôi"}
      </button>
      {locateError ? (
        <div className="absolute bottom-3 left-3 right-3 z-[430] rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow">
          {locateError}
        </div>
      ) : null}
    </div>
  );
}
