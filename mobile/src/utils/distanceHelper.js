// Distance & Google Road Distance Matrix Utility

export const GOOGLE_MAPS_API_KEY = 'AIzaSyDkSYnPhr-3QFIN8ynIL3uwoa-_bs1R_y0';

// In-memory cache for road distances to avoid redundant API calls: key: `${originLat},${originLng}->${destLat},${destLng}`
const distanceCache = new Map();

/**
 * Straight-line Haversine Formula distance in KM
 */
export function calculateAirDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return dist < 0.1 ? 0.1 : Math.round(dist * 10) / 10;
}

/**
 * Realistic estimated road distance in KM (~1.18x air distance in urban city environments)
 * Provides immediate accurate distance prior to Google API response
 */
export function calculateEstimatedRoadKm(lat1, lon1, lat2, lon2) {
  const air = calculateAirDistanceKm(lat1, lon1, lat2, lon2);
  if (air === null) return null;
  if (air < 0.5) return air;
  // Apply urban road curvature factor (typically 1.15 to 1.25x in Indian cities)
  const estRoad = air * 1.18;
  return Math.round(estRoad * 10) / 10;
}

/**
 * Fetch exact Google Road Driving Distances for a batch of destinations
 * @param {{ lat: number, lng: number }} origin
 * @param {Array<{ id: string, lat: number, lng: number }>} destinations
 * @returns {Promise<Record<string, { roadDistanceKm: number, roadDistanceText: string, roadDurationText: string }>>}
 */
export async function fetchGoogleRoadDistances(origin, destinations) {
  if (!origin || !origin.lat || !origin.lng || !destinations || destinations.length === 0) {
    return {};
  }

  const results = {};
  const missingDests = [];

  // Check cache first
  const originKey = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}`;
  for (const dest of destinations) {
    if (!dest.lat || !dest.lng) continue;
    const cacheKey = `${originKey}->${Number(dest.lat).toFixed(4)},${Number(dest.lng).toFixed(4)}`;
    if (distanceCache.has(cacheKey)) {
      results[dest.id] = distanceCache.get(cacheKey);
    } else {
      missingDests.push(dest);
    }
  }

  if (missingDests.length === 0) {
    return results;
  }

  // Google Distance Matrix limits each request to 25 destinations
  const batch = missingDests.slice(0, 25);
  const destCoords = batch.map((d) => `${d.lat},${d.lng}`).join('|');
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${encodeURIComponent(
    destCoords
  )}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return results;
    const data = await res.json();

    if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements) {
      const elements = data.rows[0].elements;
      batch.forEach((dest, idx) => {
        const el = elements[idx];
        if (el && el.status === 'OK' && el.distance) {
          const roadDistanceKm = Math.round((el.distance.value / 1000) * 10) / 10;
          const info = {
            roadDistanceKm,
            roadDistanceText: el.distance.text || `${roadDistanceKm} km`,
            roadDurationText: el.duration ? el.duration.text : '',
          };
          results[dest.id] = info;

          const cacheKey = `${originKey}->${Number(dest.lat).toFixed(4)},${Number(dest.lng).toFixed(4)}`;
          distanceCache.set(cacheKey, info);
        }
      });
    }
  } catch (err) {
    console.warn('Google Distance Matrix fetch error:', err.message);
  }

  return results;
}
