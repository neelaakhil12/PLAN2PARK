/**
 * SpacesMap.jsx ─ Interactive Leaflet / OpenStreetMap for PlanToPark
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Navigation, MapPin } from 'lucide-react';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
let L = null;

const loadLeaflet = async () => {
  if (L) return L;
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }
  L = await import('leaflet');
  delete L.Icon.Default.prototype._getIconUrl;
  return L;
};

const createPriceIcon = (price, isAvailable, isActive) => {
  if (!L) return null;
  const bg = isAvailable ? (isActive ? '#065f46' : '#10b981') : '#64748b';
  return L.divIcon({
    className: 'custom-price-pin',
    html: `
      <div style="
        background-color: ${bg};
        color: #ffffff;
        font-weight: 900;
        font-size: 11px;
        padding: 5px 9px;
        border-radius: 12px;
        border: 2px solid #ffffff;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.25);
        white-space: nowrap;
        transform: translate(-50%, -50%) ${isActive ? 'scale(1.15)' : 'scale(1)'};
        transition: transform 0.2s ease;
        display: flex;
        align-items: center;
        gap: 4px;
        font-family: system-ui, sans-serif;
      ">
        <span>🅿️ ₹${price}</span>
      </div>
    `,
    iconSize: [60, 30],
    iconAnchor: [30, 15],
  });
};

const SpacesMap = ({
  spaces = [],
  userLat,
  userLng,
  activeSpaceId,
  onBook,
  onMarkerHover,
  onRouteUpdate,
  height = '100%',
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [loading, setLoading] = useState(true);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    loadLeaflet().then((Leaflet) => {
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;

      const initialCenter = userLat && userLng ? [userLat, userLng] : [17.3850, 78.4867]; // Default Hyderabad

      const map = Leaflet.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 12,
        zoomControl: false,
      });

      Leaflet.control.zoom({ position: 'topright' }).addTo(map);

      // Add CartoDB Voyager / OpenStreetMap Clean Tiles
      Leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setLoading(false);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Render Markers for all spaces
  useEffect(() => {
    if (!mapInstanceRef.current || !L) return;
    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    const bounds = [];

    spaces.forEach((space) => {
      const lat = space.coordinates?.lat || space.lat || space.location?.coordinates?.[1];
      const lng = space.coordinates?.lng || space.lng || space.location?.coordinates?.[0];
      if (!lat || !lng) return;

      bounds.push([lat, lng]);

      const freeSlots = space.slots?.filter((s) => s.isAvailable).length ?? (space.availableSlots || 5);
      const isAvailable = freeSlots > 0;
      const isActive = activeSpaceId === space._id;

      const icon = createPriceIcon(space.pricePerHour || 50, isAvailable, isActive);

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 200px; padding: 4px;">
          <img src="${space.image || 'https://images.unsplash.com/photo-1506015391300-4802dc74de2e?w=600'}" style="width: 100%; height: 95px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${space.title || space.address}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">📍 ${space.address || 'Parking Location'}</div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 14px; font-weight: 900; color: #10b981;">₹${space.pricePerHour}/hr</span>
            <button id="book-btn-${space._id}" style="background: #10b981; color: #ffffff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 11px; cursor: pointer;">
              Book Slot
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { offset: [0, -10] });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`book-btn-${space._id}`);
        if (btn && onBook) {
          btn.onclick = () => onBook(space);
        }
        if (onMarkerHover) onMarkerHover(space._id);
      });

      markersRef.current[space._id] = marker;
    });

    if (userLat && userLng) {
      bounds.push([userLat, userLng]);
      const userIcon = L.divIcon({
        className: 'user-location-dot',
        html: `<div style="width: 16px; height: 16px; background: #3b82f6; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    }

    if (bounds.length > 0 && map) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch (e) {}
    }
  }, [spaces, activeSpaceId, userLat, userLng]);

  return (
    <div style={{ width: '100%', height, position: 'relative', minHeight: '300px' }}>
      {loading && (
        <div style={{ position: 'absolute', inset: 0, background: '#0f172a15', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <Loader2 style={{ width: 28, height: 28, animation: 'spin 1s linear infinite', color: '#10b981' }} />
        </div>
      )}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }} />
    </div>
  );
};

export default SpacesMap;
