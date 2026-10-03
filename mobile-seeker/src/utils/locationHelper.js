import * as Location from 'expo-location';

/**
 * High-accuracy reverse geocoding for Indian addresses (Plot No, Landmark, Colony, Suburb, City, Pincode)
 */
export async function getDetailedAddressFromCoords(lat, lng) {
  let nominatimAddr = null;

  // 1. Query OpenStreetMap Nominatim with zoom=18 & full addressdetails
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'PlanToPark-Seeker/1.0 (contact@plantopark.com)',
          'Accept-Language': 'en-IN,en;q=0.9',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        nominatimAddr = data.address;
      }
    }
  } catch (e) {
    // network fallback
  }

  // 2. Query Native Expo reverseGeocodeAsync
  let expoAddr = null;
  try {
    const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (rev && rev.length > 0) {
      expoAddr = rev[0];
    }
  } catch (e) {}

  // 3. Assemble detailed components in proper order
  const parts = [];

  // Plot / House / Door Number
  const house =
    expoAddr?.streetNumber ||
    nominatimAddr?.house_number ||
    nominatimAddr?.building;
  if (house) {
    parts.push(house.toLowerCase().includes('plot') ? house : `Plot ${house}`);
  }

  // Specific Landmark / Premises / Name
  const landmark =
    (expoAddr?.name && !['hyderabad', 'telangana', 'india', 'almasguda'].includes(expoAddr.name.toLowerCase()) ? expoAddr.name : null) ||
    nominatimAddr?.amenity ||
    nominatimAddr?.shop;
  if (landmark && !parts.includes(landmark)) {
    parts.push(landmark);
  }

  // Street / Road Name
  const road =
    expoAddr?.street ||
    nominatimAddr?.road ||
    nominatimAddr?.street;
  if (road && !parts.some(p => p.toLowerCase() === road.toLowerCase())) {
    parts.push(road);
  }

  // Colony / Neighbourhood (e.g. "Chaitanya Hills")
  const colony =
    nominatimAddr?.neighbourhood ||
    nominatimAddr?.residential ||
    nominatimAddr?.subdivision ||
    expoAddr?.district;
  if (colony && !parts.some(p => p.toLowerCase().includes(colony.toLowerCase()))) {
    parts.push(colony);
  }

  // Suburb / Area (e.g. "Almasguda")
  const suburb =
    nominatimAddr?.suburb ||
    nominatimAddr?.village ||
    (expoAddr?.subregion && expoAddr.subregion !== expoAddr.city ? expoAddr.subregion : null);
  if (suburb && !parts.some(p => p.toLowerCase().includes(suburb.toLowerCase()))) {
    parts.push(suburb);
  }

  // City / District / Mandal (e.g. "Hyderabad" or "Balapur mandal")
  const city =
    expoAddr?.city ||
    nominatimAddr?.city ||
    nominatimAddr?.town ||
    nominatimAddr?.county ||
    'Hyderabad';
  if (city && !parts.some(p => p.toLowerCase().includes(city.toLowerCase()))) {
    parts.push(city);
  }

  // PIN Code
  const postcode = expoAddr?.postalCode || nominatimAddr?.postcode;

  if (parts.length > 0) {
    let finalStr = parts.join(', ');
    if (postcode && !finalStr.includes(postcode)) {
      finalStr += ` - ${postcode}`;
    }
    return finalStr;
  }

  return 'Current Location';
}

/**
 * Smart geocoding for search queries (supports plot numbers, colonies, landmarks)
 */
export async function smartGeocodeAddress(addressText) {
  if (!addressText || !addressText.trim()) return null;
  const cleanAddr = addressText.trim();

  // 1. Try native geocode
  try {
    const geocoded = await Location.geocodeAsync(cleanAddr);
    if (geocoded && geocoded.length > 0) {
      return { latitude: geocoded[0].latitude, longitude: geocoded[0].longitude };
    }
  } catch (e) {}

  // 2. Try Nominatim exact
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanAddr)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'PlanToPark-Seeker/1.0' } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch (e) {}

  // 3. Fallback: Strip plot / door prefix (e.g., "Plot 89, Chaitanya Hills" -> "Chaitanya Hills")
  const withoutPlot = cleanAddr.replace(/^(plot\s*(no\.?|#)?\s*\d+[a-z]?|h\.?no\.?\s*[\d/-]+|[a-z0-9#-]+),\s*/i, '');
  if (withoutPlot !== cleanAddr) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(withoutPlot)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'PlanToPark-Seeker/1.0' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      }
    } catch (e) {}
  }

  // 4. Fallback: Try colony + city
  const parts = cleanAddr.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) {
    const colonyCity = parts.slice(1).join(' ');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(colonyCity)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'PlanToPark-Seeker/1.0' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
      }
    } catch (e) {}
  }

  return null;
}
