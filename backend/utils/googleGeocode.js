// Google Maps Geocoding Utility (100% Google Geocoding API)

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDkSYnPhr-3QFIN8ynIL3uwoa-_bs1R_y0';

/**
 * Forward Geocode an address/place query using Google Geocoding API
 * @param {string} query
 * @returns {Promise<{ lat: number, lng: number, formattedAddress: string, city: string, pincode: string } | null>}
 */
const googleForwardGeocode = async (query) => {
  if (!query || typeof query !== 'string' || !query.trim()) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      query.trim()
    )}&key=${GOOGLE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const top = data.results[0];
      const lat = top.geometry?.location?.lat;
      const lng = top.geometry?.location?.lng;

      let city = 'Hyderabad';
      let pincode = '';

      if (top.address_components) {
        top.address_components.forEach((c) => {
          if (c.types.includes('locality')) city = c.long_name;
          if (c.types.includes('postal_code')) pincode = c.long_name;
        });
      }

      return {
        lat,
        lng,
        formattedAddress: top.formatted_address,
        city,
        pincode,
      };
    }
  } catch (err) {
    console.error('Google Forward Geocode error:', err.message);
  }
  return null;
};

/**
 * Reverse Geocode latitude/longitude coordinates using Google Geocoding API
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ address: string, city: string, pincode: string, plotNo: string, colonyArea: string } | null>}
 */
const googleReverseGeocode = async (lat, lng) => {
  if (!lat || !lng) return null;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const top = data.results[0];
      let plotNo = '';
      let colonyArea = '';
      let city = 'Hyderabad';
      let pincode = '';

      top.address_components.forEach((c) => {
        if (c.types.includes('street_number') || c.types.includes('premise') || c.types.includes('subpremise')) {
          plotNo = c.long_name.toLowerCase().startsWith('plot') ? c.long_name : `Plot No. ${c.long_name}`;
        } else if (c.types.includes('sublocality_level_2')) {
          colonyArea = c.long_name;
        } else if (c.types.includes('sublocality_level_1') || c.types.includes('sublocality')) {
          if (!colonyArea) colonyArea = c.long_name;
        } else if (c.types.includes('locality')) {
          city = c.long_name;
        } else if (c.types.includes('postal_code')) {
          pincode = c.long_name;
        }
      });

      return {
        address: top.formatted_address,
        city,
        pincode,
        plotNo,
        colonyArea,
        lat,
        lng,
      };
    }
  } catch (err) {
    console.error('Google Reverse Geocode error:', err.message);
  }
  return null;
};

/**
 * Robust extraction of latitude and longitude from ANY Google Maps URL or string
 * Handles:
 * - Direct coordinates: "17.3128, 78.5450"
 * - Mobile & desktop links with !3d(lat)!4d(lng)
 * - URLs with @lat,lng
 * - URLs with ?q=lat,lng or ?ll=lat,lng
 * - Shortened links: expands maps.app.goo.gl and goo.gl/maps
 */
const extractCoordsFromMapsInput = async (inputUrl) => {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  let target = inputUrl.trim();

  // 1. Direct coordinates match in text: "17.3128, 78.5450"
  const directCoordMatch = target.match(/(-?\d{1,2}\.\d{4,8})\s*[,/ ]\s*(-?\d{1,3}\.\d{4,8})/);
  if (directCoordMatch) {
    const lat = parseFloat(directCoordMatch[1]);
    const lng = parseFloat(directCoordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  // 2. Expand shortened URLs
  if (target.includes('goo.gl') || target.includes('maps.app.goo.gl')) {
    try {
      const response = await fetch(target, { redirect: 'follow' });
      target = response.url || target;
    } catch (e) {
      console.warn('URL expand error:', e.message);
    }
  }

  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch (e) {}

  // 3. !3d(lat)!4d(lng)
  const dMatch = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || target.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) {
    return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };
  }

  // 4. @lat,lng
  const atMatch = decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || target.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // 5. q=lat,lng or ll=lat,lng
  const qMatch =
    decoded.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)\s*[,/]\s*(-?\d+\.\d+)/) ||
    target.match(/[?&](?:q|ll|query)=(-?\d+\.\d+)(?:%2c|%2C|,)(-?\d+\.\d+)/i);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // 6. Extract place address query and forward geocode via Google Geocoding API
  const placeMatch = decoded.match(/\/place\/([^/?#]+)/);
  if (placeMatch) {
    const placeQuery = placeMatch[1].replace(/\+/g, ' ').trim();
    if (placeQuery) {
      const geoRes = await googleForwardGeocode(placeQuery);
      if (geoRes && geoRes.lat && geoRes.lng) {
        return { lat: geoRes.lat, lng: geoRes.lng, formattedAddress: geoRes.formattedAddress };
      }
    }
  }

  return null;
};

module.exports = {
  googleForwardGeocode,
  googleReverseGeocode,
  extractCoordsFromMapsInput,
};

