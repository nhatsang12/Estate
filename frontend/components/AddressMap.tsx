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
}

export default function AddressMap({ lat, lng, onSelect, interactive = true }: AddressMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);

  const center = useMemo<LatLngExpression>(
    () => (hasCoords ? [lat as number, lng as number] : DEFAULT_CENTER),
    [hasCoords, lat, lng]
  );

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

    const marker = L.marker(center, { draggable: interactive }).addTo(map);
    if (interactive && onSelect) {
      marker.on("dragend", () => {
        const next = marker.getLatLng();
        onSelect(next.lat, next.lng);
      });

      map.on("click", (event: L.LeafletMouseEvent) => {
        const next = event.latlng;
        marker.setLatLng(next);
        onSelect(next.lat, next.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;
    setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [center, onSelect, interactive]);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) {
      return;
    }

    markerRef.current.setLatLng(center);
    mapRef.current.setView(center, mapRef.current.getZoom(), { animate: true });
  }, [center]);

  return (
    <div
      className="address-map"
      ref={containerRef}
      style={{ minHeight: 320 }}
    />
  );
}
