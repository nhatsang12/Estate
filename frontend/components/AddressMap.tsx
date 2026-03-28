import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";

const DEFAULT_CENTER: LatLngExpression = [10.7769, 106.7009];

const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DEFAULT_ICON;

interface AddressMapProps {
  lat?: number;
  lng?: number;
  onSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
  height?: number | string;
  markers?: AddressMapMarker[];
  popupOnInitMarkerId?: string;
}

export interface AddressMapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  address?: string;
  priceLabel?: string;
  imageUrl?: string;
  href?: string;
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildPopupHtml(marker: AddressMapMarker) {
  const safeTitle = escapeHtml(marker.title || "Bất động sản");
  const safeAddress = escapeHtml(marker.address || "");
  const safePrice = escapeHtml(marker.priceLabel || "");
  const safeHref = marker.href ? escapeHtml(marker.href) : "";
  const safeImage = marker.imageUrl ? escapeHtml(marker.imageUrl) : "";

  return `
    <div style="width:220px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
      ${safeImage ? `<img src="${safeImage}" alt="${safeTitle}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />` : ""}
      <div style="font-size:14px;font-weight:700;color:#1f2937;line-height:1.35;margin-bottom:4px;">${safeTitle}</div>
      ${safeAddress ? `<div style="font-size:12px;color:#6b7280;line-height:1.4;margin-bottom:6px;">${safeAddress}</div>` : ""}
      ${safePrice ? `<div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">${safePrice}</div>` : ""}
      ${safeHref ? `<a href="${safeHref}" style="display:inline-block;font-size:12px;font-weight:600;color:#fff;background:#111827;padding:6px 10px;border-radius:7px;text-decoration:none;">Xem chi tiết</a>` : ""}
    </div>
  `;
}

export default function AddressMap({
  lat,
  lng,
  onSelect,
  interactive = true,
  height = 320,
  markers,
  popupOnInitMarkerId,
}: AddressMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const editableMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);

  const center = useMemo<LatLngExpression>(
    () => (hasCoords ? [lat as number, lng as number] : DEFAULT_CENTER),
    [hasCoords, lat, lng]
  );

  const markerPoints = useMemo<AddressMapMarker[]>(() => {
    const customMarkers = Array.isArray(markers)
      ? markers.filter(
          (item) =>
            item &&
            Number.isFinite(item.lat) &&
            Number.isFinite(item.lng)
        )
      : [];

    if (customMarkers.length > 0) return customMarkers;

    if (!interactive && hasCoords) {
      return [
        {
          id: "primary-location",
          lat: lat as number,
          lng: lng as number,
          title: "Vị trí bất động sản",
        },
      ];
    }

    return [];
  }, [markers, interactive, hasCoords, lat, lng]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      center,
      zoom: 16,
      scrollWheelZoom: interactive,
      dragging: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    const editableMarker = L.marker(center, { draggable: interactive }).addTo(map);
    if (interactive && onSelect && markerPoints.length === 0) {
      editableMarker.on("dragend", () => {
        const next = editableMarker.getLatLng();
        onSelect(next.lat, next.lng);
      });

      map.on("click", (event: L.LeafletMouseEvent) => {
        const next = event.latlng;
        editableMarker.setLatLng(next);
        onSelect(next.lat, next.lng);
      });
    } else if (!interactive || markerPoints.length > 0) {
      map.removeLayer(editableMarker);
    }

    mapRef.current = map;
    editableMarkerRef.current = editableMarker;
    setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      editableMarkerRef.current = null;
      markersLayerRef.current = null;
    };
  }, [center, onSelect, interactive, markerPoints.length]);

  useEffect(() => {
    if (!mapRef.current || !editableMarkerRef.current || markerPoints.length > 0) {
      return;
    }

    editableMarkerRef.current.setLatLng(center);
    mapRef.current.setView(center, mapRef.current.getZoom(), { animate: true });
  }, [center, markerPoints.length]);

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    if (markerPoints.length === 0) return;

    const map = mapRef.current;
    const bounds = L.latLngBounds([]);
    let openingMarker: L.Marker | null = null;

    markerPoints.forEach((point, index) => {
      const latlng: LatLngExpression = [point.lat, point.lng];
      bounds.extend(latlng);

      const marker = L.marker(latlng, { icon: DEFAULT_ICON });
      marker.bindPopup(buildPopupHtml(point), {
        closeButton: false,
        autoPan: true,
        maxWidth: 260,
      });
      marker.on("mouseover", () => marker.openPopup());
      marker.on("mouseout", () => marker.closePopup());
      marker.addTo(markersLayerRef.current!);

      const shouldOpen =
        popupOnInitMarkerId
          ? point.id === popupOnInitMarkerId
          : index === 0;
      if (shouldOpen && !openingMarker) {
        openingMarker = marker;
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.15), { animate: true, maxZoom: 16 });
    }

    if (openingMarker) {
      setTimeout(() => {
        openingMarker?.openPopup();
      }, 180);
    }
  }, [markerPoints, popupOnInitMarkerId]);

  return (
    <div
      className="address-map"
      ref={containerRef}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        minHeight: 320,
      }}
    />
  );
}
