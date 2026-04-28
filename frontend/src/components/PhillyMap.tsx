import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Business } from "../types";
import type { NeighborhoodCoords } from "../contexts/NeighborhoodContext";

function bizLatLng(b: Business): [number, number] {
  // Use real coordinates from backend if available
  if (b.lat && b.lng) return [b.lat, b.lng];
  // Fallback: affine transform from SVG map coords (artistic approximation)
  return [
    39.9526 + (370 - b.coords.y) * 0.000111,
    -75.1652 + (b.coords.x - 320) * 0.000223,
  ];
}

const T = {
  terracotta: "#C2410C",
  teal:       "#115E59",
  surface:    "#FFFFFF",
  border:     "#E7E5E4",
};

function makeIcon(match: number, color: string, hover: boolean): L.DivIcon {
  const size = hover ? 34 : 28;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:2.5px solid white;
      display:flex;align-items:center;justify-content:center;
      font-size:${hover ? 11 : 10}px;font-weight:600;color:white;
      font-family:Inter,sans-serif;cursor:pointer;
      box-shadow:0 2px 8px rgba(0,0,0,.22);
      transition:all .15s;
    ">${match}</div>`,
    className: "",
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [size / 2, -size / 2],
  });
}

interface PhillyMapProps {
  businesses: Business[];
  center: NeighborhoodCoords;
  neighborhoodName: string;
  hoverId: string | null;
  setHoverId: (id: string | null) => void;
}

export default function PhillyMap({
  businesses,
  center,
  neighborhoodName,
  hoverId,
  setHoverId,
}: PhillyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());
  const youRef       = useRef<L.CircleMarker | null>(null);
  const navigate     = useNavigate();

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center:           [center.lat, center.lng],
      zoom:             14,
      zoomControl:      false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.attribution({ position: "bottomright", prefix: "© OpenStreetMap © CARTO" }).addTo(map);

    // "You are here" outer ring
    youRef.current = L.circleMarker([center.lat, center.lng], {
      radius:      14,
      fillColor:   T.surface,
      fillOpacity: 1,
      color:       T.terracotta,
      weight:      3,
    }).addTo(map).bindTooltip(neighborhoodName, { direction: "top", permanent: false });

    // "You are here" inner dot
    L.circleMarker([center.lat, center.lng], {
      radius:      5,
      fillColor:   T.terracotta,
      fillOpacity: 1,
      color:       T.terracotta,
      weight:      0,
    }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      youRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when neighborhood changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo([center.lat, center.lng], 14, { duration: 0.8 });
    youRef.current?.setLatLng([center.lat, center.lng]);
    youRef.current?.bindTooltip(neighborhoodName, { direction: "top" });
  }, [center.lat, center.lng, neighborhoodName]);

  // Add/replace business markers when businesses prop changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    businesses.forEach((biz) => {
      const [lat, lng] = bizLatLng(biz);
      const color = biz.match >= 88 ? T.terracotta : T.teal;
      const isHover = hoverId === biz.id;

      const marker = L.marker([lat, lng], { icon: makeIcon(biz.match, color, isHover) })
        .addTo(map)
        .bindTooltip(`<b>${biz.name}</b><br>${biz.category} · ${biz.price}`, {
          direction: "top",
          className: "lantern-tooltip",
        });

      marker.on("mouseover", () => setHoverId(biz.id));
      marker.on("mouseout",  () => setHoverId(null));
      marker.on("click",     () => navigate(`/business/${biz.id}`));

      markersRef.current.set(biz.id, marker);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses]);

  // Update marker icons when hoverId changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const biz = businesses.find((b) => b.id === id);
      if (!biz) return;
      const color = biz.match >= 88 ? T.terracotta : T.teal;
      marker.setIcon(makeIcon(biz.match, color, hoverId === id));
    });
  }, [hoverId, businesses]);

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden w-full"
      style={{ height: 720, border: `1px solid ${T.border}` }}
    />
  );
}
