import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { endpoints, getBaseApiUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function AddSpotScreen({ route, navigation }) {
  const { token } = useContext(AuthContext);
  const editingSpot = route?.params?.spot || null;

  const [title, setTitle] = useState(editingSpot?.title || '');
  const [plotNo, setPlotNo] = useState('');
  const [colonyArea, setColonyArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState(editingSpot?.address || '');
  const [city, setCity] = useState(editingSpot?.city || 'Hyderabad');
  const [pincode, setPincode] = useState('500097');
  const [googleMapsLink, setGoogleMapsLink] = useState(editingSpot?.locationLink || editingSpot?.googleMapsLink || '');
  const [lat, setLat] = useState(editingSpot?.coordinates?.lat || editingSpot?.lat || null);
  const [lng, setLng] = useState(editingSpot?.coordinates?.lng || editingSpot?.lng || null);
  const [hourlyRate, setHourlyRate] = useState(String(editingSpot?.pricePerHour || editingSpot?.hourlyRate || '50'));
  const [totalSpots, setTotalSpots] = useState(String(editingSpot?.totalSlots || (editingSpot?.slots ? editingSpot.slots.length : null) || editingSpot?.totalSpots || '5'));
  const [hasEvCharger, setHasEvCharger] = useState(Boolean(editingSpot?.hasEvCharger));
  const [isActive, setIsActive] = useState(editingSpot?.isActive !== false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const s = route?.params?.spot;
    if (s) {
      setTitle(s.title || '');
      setAddress(s.address || '');
      setCity(s.city || 'Hyderabad');
      setGoogleMapsLink(s.locationLink || s.googleMapsLink || '');
      setLat(s.coordinates?.lat || s.lat || null);
      setLng(s.coordinates?.lng || s.lng || null);
      setHourlyRate(String(s.pricePerHour !== undefined ? s.pricePerHour : (s.hourlyRate || '50')));
      setTotalSpots(String(s.totalSlots || (s.slots ? s.slots.length : null) || s.totalSpots || '5'));
      setHasEvCharger(Boolean(s.hasEvCharger));
      setIsActive(s.isActive !== false);
    }
  }, [route?.params?.spot]);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [currentLocInfo, setCurrentLocInfo] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const GOOGLE_MAPS_API_KEY = 'AIzaSyDkSYnPhr-3QFIN8ynIL3uwoa-_bs1R_y0';

  // Helper to re-compose full address whenever plotNo/colonyArea/landmark change
  const handleAddressSubFieldChange = (newPlot, newArea, newLandmark, newCity, newPin) => {
    const parts = [
      newPlot ? (newPlot.toLowerCase().includes('plot') || newPlot.toLowerCase().includes('h.no') ? newPlot : `Plot No. ${newPlot}`) : '',
      newArea,
      newLandmark ? `Near ${newLandmark}` : '',
      newCity,
      newPin,
    ].filter(Boolean);

    if (parts.length > 0) {
      setAddress(parts.join(', '));
    }
  };

  const showAlert = (title, message) => {
    if (typeof window !== 'undefined' && window.alert) {
      try {
        window.alert(`${title}\n\n${message}`);
      } catch (e) {
        console.log(title, message);
      }
    } else if (typeof Alert !== 'undefined' && Alert.alert) {
      Alert.alert(title, message);
    }
  };

  const processCoordsWithGoogle = async (latitude, longitude) => {
    setLat(latitude);
    setLng(longitude);

    try {
      const gRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const gData = await gRes.json();

      if (gData && gData.results && gData.results.length > 0) {
        let detectedPlot = '';
        let detectedArea = '';
        let detectedLandmark = '';
        let detectedCity = 'Hyderabad';
        let detectedPin = pincode;

        // Always prioritize top result (results[0]) for highest precision rooftop matching
        const topRes = gData.results[0];
        const formattedAddr0 = topRes.formatted_address || '';

        topRes.address_components.forEach((comp) => {
          if (comp.types.includes('premise') || comp.types.includes('street_number') || comp.types.includes('subpremise')) {
            detectedPlot = comp.long_name.toLowerCase().startsWith('plot') || comp.long_name.toLowerCase().startsWith('h.no') 
              ? comp.long_name 
              : `Plot No. ${comp.long_name}`;
          } else if (comp.types.includes('sublocality_level_2')) {
            detectedArea = comp.long_name; // Priority micro-colony like Chaitanya Hills
          } else if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
            if (!detectedArea) detectedArea = comp.long_name;
          } else if (comp.types.includes('landmark') || comp.types.includes('point_of_interest') || comp.types.includes('establishment')) {
            if (!detectedLandmark && comp.long_name !== detectedArea) detectedLandmark = comp.long_name;
          } else if (comp.types.includes('locality')) {
            detectedCity = comp.long_name;
          } else if (comp.types.includes('postal_code')) {
            detectedPin = comp.long_name;
          }
        });

        // Extract plot number from formatted address if component tags missed "Plot No 89"
        if (!detectedPlot && formattedAddr0) {
          const plotMatch = formattedAddr0.match(/(Plot\s*No\.?\s*\d+[A-Za-z]?|H\.?No\.?\s*[\d\/-]+|\d+[-\/]\d+[-\/\d]*[A-Za-z]?)/i);
          if (plotMatch) {
            detectedPlot = plotMatch[1].toLowerCase().includes('plot') || plotMatch[1].toLowerCase().includes('h.no') 
              ? plotMatch[1] 
              : `Plot No. ${plotMatch[1]}`;
          }
        }

        // Search secondary components across all results for landmark or pincode fallback
        gData.results.forEach((resItem) => {
          resItem.address_components.forEach((comp) => {
            if (comp.types.includes('sublocality_level_2') && !detectedArea) detectedArea = comp.long_name;
            if (comp.types.includes('postal_code') && (!detectedPin || detectedPin === pincode)) detectedPin = comp.long_name;
            if ((comp.types.includes('landmark') || comp.types.includes('point_of_interest')) && !detectedLandmark && comp.long_name !== detectedArea) {
              detectedLandmark = comp.long_name;
            }
          });
        });

        if (detectedPlot) setPlotNo(detectedPlot);
        if (detectedArea) setColonyArea(detectedArea);
        setLandmark(detectedLandmark);
        setCity(detectedCity);
        if (detectedPin) setPincode(detectedPin);

        const compiled = [
          detectedPlot,
          detectedArea,
          detectedLandmark ? `Near ${detectedLandmark}` : '',
          detectedCity,
          `Telangana ${detectedPin}`,
          'India'
        ].filter(Boolean).join(', ');

        const finalFormatted = formattedAddr0 || compiled;
        setAddress(finalFormatted);

        const googlePlaceUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
        setGoogleMapsLink(googlePlaceUrl);

        showAlert(
          '📍 Location Auto-Filled!',
          `Address auto-filled: ${finalFormatted}`
        );
      }
    } catch (e) {
      console.error('Locate error:', e);
      const fallbackUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      setGoogleMapsLink(fallbackUrl);
    }
  };

  const fetchWhatsAppStyleLocations = async (latitude, longitude) => {
    setShowLocationModal(true);
    setLat(latitude);
    setLng(longitude);

    const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
    setCurrentLocInfo({
      name: 'Current GPS Location',
      title: 'Send your current location',
      subtitle: '📡 Getting your address...',
      plotNo: '',
      colonyArea: '',
      landmark: '',
      city: 'Hyderabad',
      address: `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      googleMapsLink: mapsLink,
    });

    setModalLoading(true);

    let detectedPlot = '';
    let detectedArea = '';
    let detectedLandmark = '';
    let detectedCity = 'Hyderabad';
    let detectedPin = pincode;
    let compiled = '';
    let formattedAddr = '';

    // 1. Google Maps Geocoding API (Exact Indian Addresses)
    try {
      const gRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
      const gData = await gRes.json();

      if (gData && gData.results && gData.results.length > 0) {
        formattedAddr = gData.results[0].formatted_address;

        gData.results.forEach((resItem) => {
          resItem.address_components.forEach((comp) => {
            if (comp.types.includes('street_number') || comp.types.includes('premise') || comp.types.includes('subpremise')) {
              if (!detectedPlot) detectedPlot = `Plot No. ${comp.long_name}`;
            } else if (comp.types.includes('sublocality_level_2')) {
              detectedArea = comp.long_name; // Priority to micro-colony like Chaitanya Hills
            } else if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality') || comp.types.includes('neighborhood')) {
              if (!detectedArea) detectedArea = comp.long_name;
            } else if (comp.types.includes('point_of_interest') || comp.types.includes('establishment')) {
              if (!detectedLandmark) detectedLandmark = comp.long_name;
            } else if (comp.types.includes('locality')) {
              detectedCity = comp.long_name;
            } else if (comp.types.includes('postal_code')) {
              detectedPin = comp.long_name;
            }
          });
        });

        // Extract house/plot numbers from address string if components missed it
        if (!detectedPlot && formattedAddr) {
          const plotMatch = formattedAddr.match(/(?:Plot|H\.?No|Flat|Door|House|D\.?No)?\s*(?:No\.?)?\s*(\d+[A-Za-z]?|\d+[-\/]\d+[-\/\d]*[A-Za-z]?)/i);
          if (plotMatch && plotMatch[1]) {
            detectedPlot = `H.No. ${plotMatch[1]}`;
          }
        }
      }
    } catch (gErr) {
      console.warn('Google Geocode error:', gErr);
    }

    if (!detectedArea) detectedArea = 'Chaitanya Hills, BN Reddy Nagar';
    compiled = [detectedPlot, detectedArea, detectedLandmark ? `Near ${detectedLandmark}` : '', detectedCity, detectedPin].filter(Boolean).join(', ');

    // Update Current Location Info Banner
    setCurrentLocInfo({
      name: 'Current GPS Location',
      title: 'Send your current location',
      subtitle: `Accurate to 15 meters • ${detectedArea}`,
      plotNo: detectedPlot,
      colonyArea: detectedArea,
      landmark: detectedLandmark,
      city: detectedCity,
      pincode: detectedPin,
      address: formattedAddr || compiled,
      googleMapsLink: mapsLink,
    });

    // 2. Fetch Nearby Places from Google Geocoding Results
    let foundPlaces = [];
    try {
      const gRes2 = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
      const gData2 = await gRes2.json();

      if (gData2 && gData2.results) {
        foundPlaces = gData2.results.slice(0, 8).map((r, idx) => {
          let pPlot = '';
          let pArea = detectedArea;
          let pCity = detectedCity;
          let pPin = detectedPin;
          let pLandmark = '';

          r.address_components.forEach(c => {
            if (c.types.includes('street_number') || c.types.includes('premise')) pPlot = `H.No. ${c.long_name}`;
            if (c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')) pArea = c.long_name;
            if (c.types.includes('point_of_interest') || c.types.includes('establishment')) pLandmark = c.long_name;
            if (c.types.includes('locality')) pCity = c.long_name;
            if (c.types.includes('postal_code')) pPin = c.long_name;
          });

          const placeTitle = pLandmark || r.formatted_address.split(',')[0];

          return {
            id: String(idx),
            name: placeTitle,
            subtitle: `${pArea}, ${pCity}`,
            plotNo: pPlot || detectedPlot,
            colonyArea: pArea,
            landmark: pLandmark || placeTitle,
            city: pCity,
            pincode: pPin,
            address: r.formatted_address,
            googleMapsLink: `https://www.google.com/maps?q=${r.geometry.location.lat},${r.geometry.location.lng}`,
          };
        });
      }
    } catch (e) {
      console.warn('Nearby places error:', e);
    }

    setNearbyPlaces(foundPlaces);
    setModalLoading(false);
  };

  const handleSelectLocationItem = (item) => {
    if (item.plotNo) setPlotNo(item.plotNo);
    if (item.colonyArea) setColonyArea(item.colonyArea);
    if (item.landmark) setLandmark(item.landmark);
    if (item.pincode) setPincode(item.pincode);
    setCity(item.city || 'Hyderabad');
    setAddress(item.address);
    setGoogleMapsLink(item.googleMapsLink);

    setShowLocationModal(false);
    showAlert('📍 Location Selected!', `Selected: ${item.name || item.address}`);
  };

  const handleLocateMe = async () => {
    setLocating(true);

    // Open modal immediately with a loading spinner while GPS resolves
    setCurrentLocInfo(null);
    setNearbyPlaces([]);
    setShowLocationModal(true);
    setModalLoading(true);

    let latVal = 17.312998;
    let lngVal = 78.544726;
    let gotRealLocation = false;

    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          // Give browser 15 seconds to get real GPS (so permission dialog can be shown)
          const pos = await new Promise((resolve) => {
            let done = false;
            const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 15000);
            navigator.geolocation.getCurrentPosition(
              (p) => { if (!done) { done = true; clearTimeout(timer); resolve(p); } },
              (err) => { if (!done) { done = true; clearTimeout(timer); resolve(null); } },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
          });
          if (pos && pos.coords) {
            latVal = pos.coords.latitude;
            lngVal = pos.coords.longitude;
            gotRealLocation = true;
          }
        } catch (geoErr) { console.warn('GPS warning', geoErr); }
      }

      // Now fetch with real (or default) coordinates
      await fetchWhatsAppStyleLocations(latVal, lngVal);
    } catch (err) {
      console.error('Locate error:', err);
      setModalLoading(false);
    } finally {
      setLocating(false);
    }
  };

  const extractPlaceFromUrl = (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return null;
    const cleanUrl = urlStr.trim();
    let placeName = '';
    let lat = null;
    let lng = null;

    const placeMatch = cleanUrl.match(/\/(?:place|search)\/([^/@?]+)/);
    if (placeMatch && placeMatch[1]) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
      } catch (e) {
        placeName = placeMatch[1].replace(/\+/g, ' ').trim();
      }
    }

    if (!placeName) {
      const qMatch = cleanUrl.match(/[?&]q=([^&]+)/);
      if (qMatch && qMatch[1] && !/^-?\d+\.\d+,-?\d+\.\d+$/.test(qMatch[1].trim())) {
        try {
          const text = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
          if (!/^[\d\.\s,-]+$/.test(text)) {
            placeName = text;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    if (placeName && /^[\d\.\s,-]+$/.test(placeName)) {
      placeName = '';
    }

    const atMatch = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qCoords = cleanUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      lat = parseFloat(atMatch[1]);
      lng = parseFloat(atMatch[2]);
    } else if (qCoords) {
      lat = parseFloat(qCoords[1]);
      lng = parseFloat(qCoords[2]);
    }

    return { placeName, lat, lng };
  };

  const handleLocationLinkChange = async (url) => {
    setGoogleMapsLink(url);
    if (!url || url.trim().length < 5) return;

    // 1. Try client-side extraction of coords from URL
    let targetLat = null;
    let targetLng = null;

    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const dMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

    if (dMatch) {
      targetLat = parseFloat(dMatch[1]);
      targetLng = parseFloat(dMatch[2]);
    } else if (atMatch) {
      targetLat = parseFloat(atMatch[1]);
      targetLng = parseFloat(atMatch[2]);
    } else if (qMatch) {
      targetLat = parseFloat(qMatch[1]);
      targetLng = parseFloat(qMatch[2]);
    }

    if (targetLat && targetLng) {
      await processCoordsWithGoogle(targetLat, targetLng);
      return;
    }

    // 2. For shortened links (maps.app.goo.gl), call backend expand & geocode
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/spaces/parse-maps-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.lat && data.lng) {
        await processCoordsWithGoogle(data.lat, data.lng);
      } else if (res.ok && data.address) {
        if (data.plotNo) setPlotNo(data.plotNo);
        if (data.colonyArea) setColonyArea(data.colonyArea);
        if (data.landmark) setLandmark(data.landmark);
        if (data.city) setCity(data.city);
        setAddress(data.address);
      }
    } catch (e) {
      console.error('Error parsing maps link:', e);
    }
  };

  const handleCreateSpot = async () => {
    if (!title || !address || !city || !hourlyRate) {
      showAlert('Validation Error', 'Please fill in title, address, city and rate');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = await getBaseApiUrl();
      const url = editingSpot ? `${baseUrl}/spaces/${editingSpot._id}` : `${baseUrl}/spaces`;
      const method = editingSpot ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          address,
          city,
          location: address,
          googleMapsLink,
          locationLink: googleMapsLink,
          lat,
          lng,
          hourlyRate: Number(hourlyRate),
          pricePerHour: Number(hourlyRate),
          totalSpots: Number(totalSpots),
          totalSlots: Number(totalSpots),
          hasEvCharger,
          isActive,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showAlert('Success', editingSpot ? 'Parking Space updated successfully!' : 'Parking Space listed successfully!');
        navigation.goBack();
      } else {
        showAlert('Error', data.message || 'Could not save space');
      }
    } catch (err) {
      showAlert('Error', err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={editingSpot ? "Edit Parking Spot" : "List New Parking Spot"} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Spot Name / Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Covered Driveway near Metro"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Plot No & House No Field */}
          <Text style={styles.label}>Plot No. / House No. / Building No.</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Plot No. 42 or H.No. 8-3-123"
            placeholderTextColor={COLORS.textMuted}
            value={plotNo}
            onChangeText={(txt) => {
              setPlotNo(txt);
              handleAddressSubFieldChange(txt, colonyArea, landmark, city, pincode);
            }}
          />

          {/* Colony / Area / Street Field */}
          <Text style={styles.label}>Colony / Street / Area Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chaitanya Hills, BN Reddy Nagar"
            placeholderTextColor={COLORS.textMuted}
            value={colonyArea}
            onChangeText={(txt) => {
              setColonyArea(txt);
              handleAddressSubFieldChange(plotNo, txt, landmark, city, pincode);
            }}
          />

          {/* Landmark Field */}
          <Text style={styles.label}>Landmark (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Near Cult Gym or Opp. SBI Bank"
            placeholderTextColor={COLORS.textMuted}
            value={landmark}
            onChangeText={(txt) => {
              setLandmark(txt);
              handleAddressSubFieldChange(plotNo, colonyArea, txt, city, pincode);
            }}
          />

          {/* Location Action Row */}
          <View style={styles.locationHeaderRow}>
            <Text style={styles.label}>Full Address (Complete)</Text>
            <TouchableOpacity
              style={styles.locateBtn}
              onPress={handleLocateMe}
              onClick={handleLocateMe}
              disabled={locating}
              activeOpacity={0.7}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.locateBtnTxt}>📍 Locate Me (Auto-Fill)</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="e.g. Plot No. 42, Chaitanya Hills, BN Reddy Nagar, Hyderabad, 500097"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={setAddress}
            multiline
          />

          {/* Google Maps Location Link Manual Paste */}
          <Text style={styles.label}>Google Maps / Location Link (Paste Option)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. https://maps.app.goo.gl/... or paste location link"
            placeholderTextColor={COLORS.textMuted}
            value={googleMapsLink}
            onChangeText={handleLocationLinkChange}
            autoCapitalize="none"
          />
          <Text style={styles.helperText}>
            💡 Tip: Click "Locate Me" to auto-detect current spot address, or paste a Google Maps link manually if listing another location.
          </Text>

          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Hyderabad"
            placeholderTextColor={COLORS.textMuted}
            value={city}
            onChangeText={setCity}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Hourly Rate (₹/hr)</Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={hourlyRate}
                onChangeText={setHourlyRate}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Total Capacity (Spots)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={totalSpots}
                onChangeText={setTotalSpots}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>⚡ EV Charger Facility</Text>
              <Text style={styles.switchSub}>Is electric vehicle charging available?</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.customToggleTrack,
                  { backgroundColor: hasEvCharger ? '#10b981' : '#334155' }
                ]}
                onPress={() => setHasEvCharger((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.customToggleThumb,
                    { alignSelf: hasEvCharger ? 'flex-end' : 'flex-start' }
                  ]}
                />
              </TouchableOpacity>
              <Text style={{ fontSize: 12, fontWeight: '800', width: 30, color: hasEvCharger ? '#10b981' : '#94a3b8' }}>
                {hasEvCharger ? 'ON' : 'OFF'}
              </Text>
            </View>
          </View>

          {editingSpot && (
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>🟢 Spot Availability Status</Text>
                <Text style={styles.switchSub}>Is this spot open & accepting driver bookings?</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.customToggleTrack,
                    { backgroundColor: isActive ? '#10b981' : '#334155' }
                  ]}
                  onPress={() => setIsActive((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.customToggleThumb,
                      { alignSelf: isActive ? 'flex-end' : 'flex-start' }
                    ]}
                  />
                </TouchableOpacity>
                <Text style={{ fontSize: 12, fontWeight: '800', width: 45, color: isActive ? '#10b981' : '#94a3b8' }}>
                  {isActive ? 'ONLINE' : 'CLOSED'}
                </Text>
              </View>
            </View>
          )}

          <Button
            title={editingSpot ? "Save Changes & Update Spot" : "Publish Parking Listing"}
            onPress={handleCreateSpot}
            loading={loading}
            style={{ backgroundColor: COLORS.ownerAccent, marginTop: 20 }}
          />
        </View>
      </ScrollView>

      {/* WhatsApp-Style Send Location Overlay (web-safe, no Modal) */}
      {showLocationModal && (
        <View style={styles.waOverlay}>
          {/* Top WhatsApp Header */}
          <View style={styles.waHeader}>
            <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.waBackBtn}>
              <Text style={styles.waBackTxt}>←</Text>
            </TouchableOpacity>
            <Text style={styles.waHeaderTitle}>Send location</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)} style={styles.waIconBtn}>
              <Text style={styles.waIconTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* WhatsApp Map Banner Graphic */}
          <View style={styles.waMapBanner}>
            <Text style={styles.waMapBannerText}>📍 GPS Satellite Map View</Text>
            <Text style={styles.waMapSubText}>Chaitanya Hills • BN Reddy Rd • Nagarjuna Hills</Text>
            <View style={styles.waPulseCenter}>
              <View style={styles.waPulseInner} />
            </View>
          </View>

          {modalLoading ? (
            <View style={styles.waLoadingBox}>
              <ActivityIndicator size="large" color="#25D366" />
              <Text style={styles.waLoadingTxt}>
                {currentLocInfo ? 'Finding nearby places...' : '📡 Waiting for GPS signal...\n\nPlease allow location access in your browser'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.waBody}>
              {/* Option 1: Send current location */}
              {currentLocInfo && (
                <TouchableOpacity
                  style={styles.waCurrentLocRow}
                  onPress={() => handleSelectLocationItem(currentLocInfo)}
                >
                  <View style={styles.waGreenCircle}>
                    <Text style={{ fontSize: 18, color: '#25D366' }}>🎯</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.waCurrentLocTitle}>{currentLocInfo.title}</Text>
                    <Text style={styles.waCurrentLocSub}>{currentLocInfo.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Nearby places section header */}
              <Text style={styles.waNearbyHeader}>Nearby places</Text>

              {/* Nearby places list */}
              {nearbyPlaces.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.waPlaceRow}
                  onPress={() => handleSelectLocationItem(item)}
                >
                  <View style={styles.waPlaceIconCircle}>
                    <Text style={{ fontSize: 16, color: '#8696a0' }}>📍</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.waPlaceName}>{item.name}</Text>
                    <Text style={styles.waPlaceSub} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    position: 'relative',
  },
  content: {
    padding: 16,
  },
  formCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.darkBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
  switchTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  customToggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  customToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
  },
  locateBtn: {
    backgroundColor: COLORS.ownerAccent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  locateBtnTxt: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  helperText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  waOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111b21',
    zIndex: 9999,
    flex: 1,
  },
  waHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#202c33',
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
  },
  waBackBtn: {
    paddingRight: 12,
  },
  waBackTxt: {
    color: '#e9edef',
    fontSize: 22,
    fontWeight: '700',
  },
  waHeaderTitle: {
    color: '#e9edef',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  waIconBtn: {
    padding: 6,
  },
  waIconTxt: {
    fontSize: 18,
    color: '#e9edef',
  },
  waMapBanner: {
    height: 160,
    backgroundColor: '#1f2c34',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
    position: 'relative',
  },
  waMapBannerText: {
    color: '#00a884',
    fontSize: 14,
    fontWeight: '700',
  },
  waMapSubText: {
    color: '#8696a0',
    fontSize: 11,
    marginTop: 4,
  },
  waPulseCenter: {
    marginTop: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 168, 132, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waPulseInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00a884',
  },
  waLoadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  waLoadingTxt: {
    color: '#8696a0',
    fontSize: 13,
    marginTop: 12,
  },
  waBody: {
    flex: 1,
    backgroundColor: '#111b21',
  },
  waCurrentLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#222d34',
  },
  waGreenCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#002a22',
    borderWidth: 2,
    borderColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  waCurrentLocTitle: {
    color: '#00a884',
    fontSize: 15,
    fontWeight: '600',
  },
  waCurrentLocSub: {
    color: '#8696a0',
    fontSize: 12,
    marginTop: 2,
  },
  waNearbyHeader: {
    color: '#8696a0',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  waPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1d272d',
  },
  waPlaceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#202c33',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  waPlaceName: {
    color: '#e9edef',
    fontSize: 15,
    fontWeight: '600',
  },
  waPlaceSub: {
    color: '#8696a0',
    fontSize: 12,
    marginTop: 2,
  },
});

