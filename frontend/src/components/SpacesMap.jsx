/**
 * SpacesMap.jsx  ─  Mapbox GL JS integration for PlanToPark
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Compass } from 'lucide-react';

const loadMapboxResources = () => {
  return new Promise((resolve) => {
    if (window.mapboxgl) {
      resolve(true);
      return;
    }

    // Load stylesheet
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css';
    document.head.appendChild(link);

    // Load JS script
    const script = document.createElement('script');
    script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.js';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const SpacesMap = ({
  spaces = [],
  userLat,
  userLng,
  activeSpaceId,
  onBook,
  onMarkerHover,
  onRouteUpdate,
  simulationActive = false,
  height = '100%',
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({}); // spaceId -> mapboxgl.Marker
  const userMarkerRef = useRef(null);
  const lastRouteCoordsRef = useRef(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);

  // Load Mapbox Resources
  useEffect(() => {
    loadMapboxResources().then((success) => {
      if (success) {
        setMapLoaded(true);
      } else {
        console.error('Failed to load Mapbox SDK.');
      }
    });
  }, []);

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = userLng && userLat 
      ? [userLng, userLat]
      : [78.9629, 20.5937]; // Default India center [lng, lat]

    // Set Mapbox access token from environment
    const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
    if (envToken) {
      window.mapboxgl.accessToken = envToken;
    }

    const map = new window.mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new window.mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    mapInstanceRef.current = map;

    // Set style loaded when map finishes loading
    map.on('load', () => {
      setMapStyleLoaded(true);
    });

    // Detect when user manually drags or pans the map to disable auto-centering
    map.on('dragstart', () => {
      setAutoCenter(false);
    });
  }, [mapLoaded]);

  // Handle Spaces Markers Rebuild
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    let hasValidPoints = false;
    const bounds = new window.mapboxgl.LngLatBounds();

    spaces.forEach(space => {
      const lat = space.coordinates?.lat;
      const lng = space.coordinates?.lng;
      if (!lat || !lng) return;

      const freeSlots = space.slots?.filter(s => s.isAvailable).length ?? 0;
      const isActive = activeSpaceId === space._id;

      // Color scheme
      const markerColor = freeSlots > 0 
        ? (isActive ? '#065f46' : '#10b981') // Active/Regular green
        : '#94a3b8'; // Grey if full

      // Create Custom HTML element for price marker
      const el = document.createElement('div');
      el.className = 'price-marker';
      el.style.backgroundColor = markerColor;
      el.style.color = '#ffffff';
      el.style.fontWeight = '900';
      el.style.fontSize = '11px';
      el.style.padding = '5px 8px';
      el.style.borderRadius = '10px';
      el.style.border = '2px solid #ffffff';
      el.style.cursor = 'pointer';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
      el.style.transform = isActive ? 'scale(1.2)' : 'scale(1)';
      el.style.transition = 'transform 0.2s';
      el.innerText = `₹${space.pricePerHour}`;

      const popupHTML = `
        <div style="width:200px;font-family:system-ui,sans-serif;padding:2px;">
          <img src="${space.image || ''}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:block;" />
          <div style="font-weight:800;font-size:13px;color:#0f172a;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${space.address}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;">📍 ${space.location}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-size:14px;font-weight:900;color:#10b981;">₹${space.pricePerHour}/hr</span>
            ${freeSlots > 0 
              ? `<button id="mb-book-${space._id}" style="background:#10b981;color:#fff;border:none;border-radius:6px;font-weight:800;font-size:11px;padding:6px 12px;cursor:pointer;font-family:sans-serif;">Book Now</button>`
              : `<span style="font-size:11px;font-weight:700;color:#ef4444;">Full</span>`
            }
          </div>
        </div>
      `;

      const popup = new window.mapboxgl.Popup({ offset: 15, closeButton: false })
        .setHTML(popupHTML);

      const marker = new window.mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      // Listen for popup open to bind button click handler
      popup.on('open', () => {
        const btn = document.getElementById(`mb-book-${space._id}`);
        if (btn && onBook) {
          btn.onclick = () => {
            onBook(space);
            popup.remove();
          };
        }
      });

      // Hover sync events on the custom element
      el.onmouseover = () => {
        if (onMarkerHover) onMarkerHover(space._id);
      };
      el.onmouseout = () => {
        if (onMarkerHover) onMarkerHover(null);
      };

      markersRef.current[space._id] = marker;
      bounds.extend([lng, lat]);
      hasValidPoints = true;
    });

    // Auto fit search bounds if there is no active direction routing and multiple spots
    if (hasValidPoints && !activeSpaceId && spaces.length > 1) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [spaces, mapLoaded]);

  // Sync Active Space Highlight
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    Object.entries(markersRef.current).forEach(([sid, marker]) => {
      const el = marker.getElement();
      const isActive = activeSpaceId === sid;
      const space = spaces.find(s => s._id === sid);
      if (!space) return;

      const freeSlots = space.slots?.filter(s => s.isAvailable).length ?? 0;
      const markerColor = freeSlots > 0 
        ? (isActive ? '#065f46' : '#10b981')
        : '#94a3b8';

      el.style.backgroundColor = markerColor;
      el.style.transform = isActive ? 'scale(1.25)' : 'scale(1)';
      el.style.zIndex = isActive ? '10' : '1';

      if (isActive) {
        const coords = space.coordinates;
        if (coords?.lat && coords?.lng) {
          map.panTo([coords.lng, coords.lat]);
        }
      }
    });
  }, [activeSpaceId, spaces]);

  // Sync User location (Car Icon Marker)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLat || !userLng) return;
    const map = mapInstanceRef.current;

    const carHtml = `
      <div style="cursor: pointer; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.2));">
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="#10b981" stroke="#ffffff" stroke-width="3"/>
          <path d="M29 23h1c.6 0 1-.4 1-1v-2c0-.7-.5-1.3-1.2-1.4L27.5 17c-.4-.5-1.1-.8-1.8-.8H14.3c-.7 0-1.4.3-1.8.8l-2.3 1.6c-.7.1-1.2.7-1.2 1.4v2c0 .6.4 1 1 1h1c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5h10c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5" fill="#ffffff"/>
          <circle cx="14" cy="23" r="2.5" fill="#10b981"/>
          <circle cx="26" cy="23" r="2.5" fill="#10b981"/>
        </svg>
      </div>
    `;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([userLng, userLat]);
    } else {
      const el = document.createElement('div');
      el.style.width = '38px';
      el.style.height = '38px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = carHtml;
      userMarkerRef.current = new window.mapboxgl.Marker({
        element: el,
        anchor: 'center'
      })
        .setLngLat([userLng, userLat])
        .addTo(map);
    }

    if (autoCenter) {
      if (simulationActive) {
        map.jumpTo({ center: [userLng, userLat] });
      } else {
        map.panTo([userLng, userLat]);
      }
    }
  }, [userLat, userLng, autoCenter, simulationActive]);

  // Live Navigation Directions Route Polyline Sync (Mapbox version)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapStyleLoaded) return;
    const map = mapInstanceRef.current;

    // Skip recalculation during active simulation
    if (simulationActive) return;

    if (!activeSpaceId || !userLat || !userLng) {
      // Clear route source/layer if they exist
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
      if (onRouteUpdate) onRouteUpdate(null);
      lastRouteCoordsRef.current = null;
      return;
    }

    // Rate-limiting check (skip if moved less than 20m to prevent map flickering)
    if (lastRouteCoordsRef.current) {
      const distanceDiff = getDistance(
        lastRouteCoordsRef.current.lat,
        lastRouteCoordsRef.current.lng,
        userLat,
        userLng
      );
      if (distanceDiff < 20) {
        return;
      }
    }

    const space = spaces.find(s => s._id === activeSpaceId) || (spaces.length === 1 ? spaces[0] : null);
    if (space && space.coordinates?.lat && space.coordinates?.lng) {
      const destLat = space.coordinates.lat;
      const destLng = space.coordinates.lng;

      const getRoute = async () => {
        try {
          const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
          let url = !mapboxToken
            ? `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`
            : `https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${destLng},${destLat}?geometries=geojson&steps=true&access_token=${mapboxToken}`;

          let res = await fetch(url);
          if (!res.ok && mapboxToken) {
            // Fallback to OSRM if mapbox request fails
            url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
            res = await fetch(url);
          }
          if (!res.ok) throw new Error('Directions request failed');
          const data = await res.json();
          if (!data.routes || data.routes.length === 0) return;

          const route = data.routes[0];
          const coords = route.geometry.coordinates; // [[lng, lat], ...]

          // Draw route line
          if (map.getSource('route')) {
            map.getSource('route').setData({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coords
              }
            });
          } else {
            map.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coords
                }
              }
            });

            map.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#10b981',
                'line-width': 6,
                'line-opacity': 0.85
              }
            });
          }

          // Fit bounds to show route on initial render
          if (!lastRouteCoordsRef.current) {
            const bounds = new window.mapboxgl.LngLatBounds();
            coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
            map.fitBounds(bounds, { padding: 50 });
          }

          lastRouteCoordsRef.current = { lat: userLat, lng: userLng };

          // Parse HUD Info
          const distance = route.distance; // meters
          const duration = route.duration; // seconds
          const steps = route.legs?.[0]?.steps || [];
          const turnStep = steps.find(s => s.maneuver?.modifier) || steps[0];
          
          let instruction = '';
          if (turnStep) {
            const dist = Math.round(turnStep.distance);
            let action = (turnStep.maneuver?.modifier || turnStep.maneuver?.type || 'proceed').toLowerCase();
            const road = turnStep.name || 'road';

            if (action === 'uturn') action = 'make a U-turn';
            else if (action === 'left') action = 'turn left';
            else if (action === 'right') action = 'turn right';
            else if (action === 'slight left') action = 'slight turn left';
            else if (action === 'slight right') action = 'slight turn right';
            else if (action === 'sharp left') action = 'turn sharp left';
            else if (action === 'sharp right') action = 'turn sharp right';
            else action = `continue ${action}`;

            instruction = `In ${dist} meters, ${action} onto ${road}`;
          } else {
            instruction = 'Proceed to destination';
          }

          if (onRouteUpdate) {
            const pathCoords = coords.map(([lng, lat]) => ({ lat, lng }));
            onRouteUpdate({ distance, duration, instruction, path: pathCoords });
          }
        } catch (err) {
          console.error('Mapbox Directions service failed:', err);
        }
      };

      getRoute();
    }
  }, [activeSpaceId, userLat, userLng, spaces, simulationActive, mapStyleLoaded]);

  if (!mapLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 gap-3 border border-slate-200 rounded-2xl" style={{ minHeight: height }}>
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Loading Mapbox...</p>
      </div>
    );
  }

  const envToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
  const isPlaceholder = !envToken || envToken === 'your_mapbox_access_token_here' || envToken.trim() === '';

  return (
    <div className="relative w-full h-full font-sans" style={{ minHeight: height }}>
      <div ref={mapContainerRef} className="w-full h-full rounded-2xl" style={{ minHeight: height }} />
      
      {/* Mapbox Token warning banner overlay */}
      {isPlaceholder && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-amber-500/95 backdrop-blur text-slate-950 rounded-xl px-4 py-2.5 shadow-lg border border-amber-400 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span className="font-bold">
              Mapbox Token is not configured. Please add it to your <code className="bg-amber-600/20 px-1 py-0.5 rounded font-mono text-[10px]">frontend/.env</code> to load map styles.
            </span>
          </div>
          <a
            href="https://account.mapbox.com/auth/signup/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors"
          >
            Get Free Token
          </a>
        </div>
      )}
      
      {/* Floating Recenter target button */}
      {userLat && userLng && (
        <button
          onClick={() => {
            setAutoCenter(true);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.panTo([userLng, userLat]);
              mapInstanceRef.current.setZoom(14);
            }
          }}
          className={`absolute bottom-5 right-5 p-3 rounded-full border shadow-xl z-10 transition-all ${
            autoCenter 
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-slate-200/20'
          }`}
          title="Recenter Map"
        >
          <Compass className={`h-5 w-5 ${autoCenter ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default SpacesMap;
