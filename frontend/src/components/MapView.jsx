import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { CATEGORY_FALLBACK_COLOR } from "@/lib/constants";

const ADDIS_CENTER = [9.0108, 38.7613];

function pinIcon(color) {
  return L.divIcon({
    className: "addis-pin",
    html: `<div class="pin-dot" style="background:${color}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 18],
  });
}

export default function MapView({ incidents = [], categories = [], onSelect, height = "100%", selectedId }) {
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const containerRef = useRef(null);

  const colorFor = (key) => {
    const c = categories.find((x) => x.key === key);
    return (c && c.color) || CATEGORY_FALLBACK_COLOR;
  };

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView(ADDIS_CENTER, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    clusterRef.current = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45, animate: false, chunkedLoading: true });
    map.addLayer(clusterRef.current);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster || !mapRef.current) return;
    cluster.clearLayers();
    incidents.forEach((inc) => {
      if (inc.latitude == null || inc.longitude == null) return;
      const marker = L.marker([inc.latitude, inc.longitude], { icon: pinIcon(colorFor(inc.category)) });
      marker.bindPopup(
        `<div style="min-width:180px">
          <div style="font-weight:700;font-family:'Plus Jakarta Sans'">${inc.title}</div>
          <div style="color:#94A3B8;font-size:12px;margin-top:2px">${inc.location_description || ""}</div>
          <div style="color:#19C3C9;font-size:12px;margin-top:6px;font-weight:600">${(inc.status||"").replace("_"," ")}</div>
        </div>`
      );
      if (onSelect) marker.on("click", () => onSelect(inc));
      cluster.addLayer(marker);
    });
  }, [incidents, categories]); // eslint-disable-line

  useEffect(() => {
    if (selectedId && mapRef.current) {
      const inc = incidents.find((i) => i.incident_id === selectedId);
      if (inc && inc.latitude != null) mapRef.current.setView([inc.latitude, inc.longitude], 15, { animate: true });
    }
  }, [selectedId]); // eslint-disable-line

  return <div ref={containerRef} data-testid="map-view" style={{ height, width: "100%" }} />;
}
