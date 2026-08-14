/**
 * MapPicker.jsx  ─  Interactive location picker for PlanToPark owners
 *
 * Features:
 *  ─ Search bar (Nominatim geocoding — free, no API key)
 *  ─ Click map → drops a parking-space pin (green teardrop)
 *  ─ Drag pin → auto-reverse-geocodes address
 *  ─ "My Location" button → shows BOTH current-location blue dot AND keeps
 *    parking pin wherever the owner placed it
 *  ─ "Use current location as parking pin" button → moves parking pin to GPS
 *  ─ Returns { lat, lng, address, location } to parent via onChange
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Navigation, Search, X, Loader2, Crosshair } from 'lucide-react';

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

/* ── Icon: parking pin (green teardrop) ─────────────────────────────────── */
const parkingIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:36px;height:36px;">
        <div style="
          width:36px;height:36px;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          background:#10b981;
          border:3px solid #fff;
          box-shadow:0 3px 12px rgba(16,185,129,0.45);
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%) rotate(0deg);
          color:#fff;font-size:14px;font-weight:900;line-height:1;
          margin-top:-3px;
        ">P</div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40],
  });

/* ── Icon: user location (blue pulsing dot) ─────────────────────────────── */
const locationDotIcon = () =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <div style="
          position:absolute;inset:-10px;border-radius:50%;
          background:rgba(59,130,246,0.18);
          animation:mpulse 2s ease-in-out infinite;
        "></div>
        <div style="
          width:22px;height:22px;border-radius:50%;
          background:#3b82f6;border:3px solid #fff;
          box-shadow:0 2px 8px rgba(59,130,246,0.6);
        "></div>
      </div>
      <style>@keyframes mpulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.7);opacity:.1}}</style>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

/* ── Nominatim helpers ──────────────────────────────────────────────────── */
const reverseGeocode = async (lat, lng) => {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const d = await r.json();
    if (d?.address) {
      const a = d.address;
      const street   = [a.house_number, a.road, a.neighbourhood].filter(Boolean).join(', ');
      const city     = a.city || a.town || a.village || a.county || '';
      const state    = a.state || '';
      return {
        address:  street || d.display_name?.split(',')[0] || '',
        location: [city, state].filter(Boolean).join(', '),
      };
    }
  } catch (e) { console.warn('Reverse geocode error', e); }
  return { address: '', location: '' };
};

const forwardSearch = async (q) => {
  if (!q.trim() || q.length < 3) return [];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    return await r.json();
  } catch { return []; }
};

/* ══════════════════════════════════════════════════════════════════════════
   MapPicker Component
   Props:
     initialLat, initialLng   — pre-filled pin coords (edit mode)
     initialAddress, initialLocation — pre-filled text fields
     onChange({ lat, lng, address, location }) — fires on every pin update
══════════════════════════════════════════════════════════════════════════ */
const MapPicker = ({
  initialLat, initialLng,
  initialAddress = '', initialLocation = '',
  onChange,
}) => {
  const mapRef      = useRef(null);
  const mapInst     = useRef(null);
  const pinMarker   = useRef(null);   // green parking pin
  const locMarker   = useRef(null);   // blue current-location dot

  const [address,   setAddress]   = useState(initialAddress);
  const [location,  setLocation]  = useState(initialLocation);
  const [lat,       setLat]       = useState(initialLat || null);
  const [lng,       setLng]       = useState(initialLng || null);
  const [userLat,   setUserLat]   = useState(null);
  const [userLng,   setUserLng]   = useState(null);

  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [sLoading,  setSLoading]  = useState(false);
  const [gLoading,  setGLoading]  = useState(false);
  const [ready,     setReady]     = useState(false);

  const notify = useCallback((la, ln, addr, loc) => {
    if (onChange) onChange({ lat: la, lng: ln, address: addr, location: loc });
  }, [onChange]);

  /* Place / move green parking pin */
  const dropPin = useCallback(async (la, ln, skipGeo = false) => {
    setLat(la); setLng(ln);
    if (mapInst.current && L) {
      const ll = [la, ln];
      if (pinMarker.current) {
        pinMarker.current.setLatLng(ll);
      } else {
        pinMarker.current = L.marker(ll, { icon: parkingIcon(), draggable: true })
          .addTo(mapInst.current)
          .bindTooltip('Drag to adjust', { permanent: false });
        pinMarker.current.on('dragend', async () => {
          const p = pinMarker.current.getLatLng();
          await dropPin(p.lat, p.lng);
        });
      }
      mapInst.current.setView(ll, Math.max(mapInst.current.getZoom(), 15), { animate: true });
    }
    if (!skipGeo) {
      const geo = await reverseGeocode(la, ln);
      setAddress(geo.address);
      setLocation(geo.location);
      notify(la, ln, geo.address, geo.location);
    } else {
      notify(la, ln, address, location);
    }
  }, [address, location, notify]);

  /* Place / update blue location dot (does NOT move parking pin) */
  const showLocationDot = useCallback((la, ln) => {
    setUserLat(la); setUserLng(ln);
    if (!mapInst.current || !L) return;
    if (locMarker.current) {
      locMarker.current.setLatLng([la, ln]);
    } else {
      locMarker.current = L.marker([la, ln], { icon: locationDotIcon() })
        .addTo(mapInst.current)
        .bindTooltip('Your Location', { permanent: false });
    }
  }, []);

  /* Init Leaflet */
  useEffect(() => {
    let alive = true;
    (async () => {
      const Lf = await loadLeaflet();
      if (!alive || !mapRef.current || mapInst.current) return;

      const startLat  = initialLat || 20.5937;
      const startLng  = initialLng || 78.9629;
      const startZoom = initialLat ? 15 : 5;

      const map = Lf.map(mapRef.current, { zoomControl: true })
        .setView([startLat, startLng], startZoom);

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      /* Click to drop / move parking pin */
      map.on('click', async (e) => { await dropPin(e.latlng.lat, e.latlng.lng); });

      /* Pre-place pin if editing */
      if (initialLat && initialLng) {
        pinMarker.current = Lf.marker([initialLat, initialLng], {
          icon: parkingIcon(), draggable: true
        }).addTo(map).bindTooltip('Drag to adjust');
        pinMarker.current.on('dragend', async () => {
          const p = pinMarker.current.getLatLng();
          await dropPin(p.lat, p.lng);
        });
      }

      mapInst.current = map;
      setReady(true);
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  /* Search handler */
  const handleSearch = async (q) => {
    setQuery(q);
    if (q.length < 3) { setResults([]); return; }
    setSLoading(true);
    const res = await forwardSearch(q);
    setResults(res);
    setSLoading(false);
  };

  const pickResult = async (r) => {
    const la = parseFloat(r.lat);
    const ln = parseFloat(r.lon);
    const a  = r.address || {};
    const street = [a.house_number, a.road, a.neighbourhood].filter(Boolean).join(', ');
    const city   = a.city || a.town || a.village || a.county || '';
    const state  = a.state || '';
    const addr   = street || r.display_name?.split(',')[0] || '';
    const loc    = [city, state].filter(Boolean).join(', ');
    setAddress(addr); setLocation(loc);
    setQuery(''); setResults([]);
    await dropPin(la, ln, true);
    notify(la, ln, addr, loc);
  };

  /* My Location — shows blue dot, optionally moves pin */
  const getMyLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported.');
    setGLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        showLocationDot(la, ln);
        // If no pin set yet, also drop parking pin at current location
        if (!lat && !lng) {
          await dropPin(la, ln);
        } else {
          // Just pan to show both
          if (mapInst.current) mapInst.current.setView([la, ln], 14, { animate: true });
        }
        setGLoading(false);
      },
      () => { alert('Cannot get location. Allow location access.'); setGLoading(false); }
    );
  };

  /* Move parking pin to current GPS location */
  const setPinToMyLocation = () => {
    if (!userLat || !userLng) return getMyLocation();
    dropPin(userLat, userLng);
  };

  return (
    <div className="space-y-3">
      {/* Search bar row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search address or area to pin location…"
              className="flex-1 text-sm text-slate-700 placeholder-slate-400 bg-transparent focus:outline-none"
            />
            {sLoading && <Loader2 className="h-4 w-4 text-slate-400 animate-spin shrink-0" />}
            {query && !sLoading && (
              <button type="button" onClick={() => { setQuery(''); setResults([]); }}>
                <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickResult(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-start gap-2"
                >
                  <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-700 leading-snug">{r.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* My Location button */}
        <button
          type="button"
          onClick={getMyLocation}
          title="Show my current location on map"
          className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-colors shadow-sm whitespace-nowrap"
        >
          {gLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Navigation className="h-4 w-4" />}
          My Location
        </button>
      </div>

      {/* If user's location is known but pin is elsewhere, offer to sync */}
      {userLat && lat && (userLat !== lat || userLng !== lng) && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <Navigation className="h-4 w-4 text-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 font-semibold flex-1">
            Blue dot = your GPS location. Green <strong>P</strong> = parking pin.
          </p>
          <button
            type="button"
            onClick={setPinToMyLocation}
            className="shrink-0 text-xs font-bold text-blue-600 underline underline-offset-2 hover:text-blue-800"
          >
            Move pin to me
          </button>
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div ref={mapRef} className="w-full" style={{ height: '380px' }} />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
            <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
          </div>
        )}
        {ready && !lat && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 text-slate-600 text-xs font-semibold px-4 py-2 rounded-full shadow-md flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-500" />
              Click the map or search to drop a parking pin
            </div>
          </div>
        )}

        {/* Map legend */}
        {ready && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 z-[400] text-[10px] font-bold text-slate-600 shadow-sm space-y-1 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              Parking spot (P)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
              Your location
            </div>
          </div>
        )}
      </div>

      {/* Pinned info card */}
      {lat && lng && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-black mb-1">📍 Pinned Location</p>
          <p className="text-sm font-bold text-slate-900">{address || 'Fetching address…'}</p>
          {location && <p className="text-xs text-slate-500 mt-0.5">{location}</p>}
          <p className="text-[10px] font-mono text-slate-400 mt-1">{lat.toFixed(6)}, {lng.toFixed(6)}</p>
        </div>
      )}

      {/* Current location info */}
      {userLat && userLng && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
          <p className="text-xs text-blue-700 font-semibold">
            GPS: {userLat.toFixed(5)}, {userLng.toFixed(5)}
          </p>
          <button
            type="button"
            onClick={setPinToMyLocation}
            className="ml-auto shrink-0 text-[10px] font-bold bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg transition-colors"
          >
            Use as parking pin
          </button>
        </div>
      )}
    </div>
  );
};

export default MapPicker;
