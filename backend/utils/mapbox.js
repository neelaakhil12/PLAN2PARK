const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_API_KEY || '';

/**
 * Reverse geocode coordinates using Mapbox Geocoding API (v5)
 */
const mapboxReverseGeocode = async (lat, lng) => {
  const token = process.env.MAPBOX_ACCESS_TOKEN || MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=poi,address,neighborhood,locality,place&limit=5`;
    const res = await fetch(url, { headers: { 'User-Agent': 'PlanToPark/1.0 (plantopark@gmail.com)' } });
    const data = await res.json();

    if (data && data.features && data.features.length > 0) {
      let plotNo = '';
      let colonyArea = '';
      let landmark = '';
      let city = 'Hyderabad';

      data.features.forEach((feat) => {
        if (feat.place_type.includes('poi') && !landmark) {
          landmark = feat.text;
        } else if (feat.place_type.includes('address') && !plotNo) {
          plotNo = feat.address ? `Plot No. ${feat.address}` : (feat.text.match(/\d+/) ? `Plot No. ${feat.text}` : '');
        } else if (feat.place_type.includes('neighborhood') && !colonyArea) {
          colonyArea = feat.text;
        } else if (feat.place_type.includes('locality') || feat.place_type.includes('place')) {
          if (!city || city === 'Hyderabad') city = feat.text;
        }
      });

      const topFeature = data.features[0];
      const context = topFeature.context || [];
      const placeCtx = context.find((c) => c.id.startsWith('place') || c.id.startsWith('locality'));
      if (placeCtx) city = placeCtx.text;

      const neighCtx = context.find((c) => c.id.startsWith('neighborhood') || c.id.startsWith('district'));
      if (neighCtx && !colonyArea) colonyArea = neighCtx.text;

      if (!colonyArea) {
        colonyArea = topFeature.text || 'Chaitanya Hills, BN Reddy Nagar';
      }

      return {
        address: topFeature.place_name,
        city,
        plotNo,
        colonyArea,
        landmark,
        lat,
        lng,
        features: data.features,
      };
    }
  } catch (err) {
    console.error('Mapbox reverse geocode error:', err);
  }
  return null;
};

/**
 * Forward search location using Mapbox Geocoding API
 */
const mapboxForwardSearch = async (query) => {
  const token = process.env.MAPBOX_ACCESS_TOKEN || MAPBOX_TOKEN;
  if (!token) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.features && data.features.length > 0) {
      return data.features.map((f) => ({
        address: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
      }));
    }
  } catch (err) {
    console.error('Mapbox search error:', err);
  }
  return null;
};

module.exports = {
  mapboxReverseGeocode,
  mapboxForwardSearch,
};
