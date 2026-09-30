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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { endpoints, getBaseApiUrl, getImageUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function AddSpotScreen({ route, navigation }) {
  const { token, user } = useContext(AuthContext);
  const editingSpot = route?.params?.spot || null;

  const [spotImages, setSpotImages] = useState(
    editingSpot?.images && Array.isArray(editingSpot.images) && editingSpot.images.length > 0
      ? editingSpot.images
      : editingSpot?.image || editingSpot?.imageUrl
      ? [editingSpot.image || editingSpot.imageUrl]
      : []
  );
  const spotImage = spotImages[0] || '';
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
  const [cancellationPolicy, setCancellationPolicy] = useState(editingSpot?.cancellationPolicy || 'full');
  const [maxWalletDiscount, setMaxWalletDiscount] = useState(String(editingSpot?.maxWalletDiscount !== undefined ? editingSpot.maxWalletDiscount : '10'));
  const [suitableVehicles, setSuitableVehicles] = useState(
    editingSpot?.suitableVehicles && editingSpot.suitableVehicles.length > 0
      ? editingSpot.suitableVehicles
      : ['hatchback', 'sedan', 'suv']
  );

  // Commercial Vehicle Storage Yard (Banks & Auto Finance) fields
  const [isVehicleStorageYard, setIsVehicleStorageYard] = useState(
    editingSpot?.spaceCategory === 'commercial_vehicle_storage' || user?.accountCategory === 'vehicle_storage_owner'
  );
  const [landAcres, setLandAcres] = useState(String(editingSpot?.landAcres || user?.landAcres || '1.0'));
  const [monthlyStorageRate, setMonthlyStorageRate] = useState(String(editingSpot?.monthlyStorageRate || '1500'));
  const [hasCompoundWall, setHasCompoundWall] = useState(editingSpot?.securityFacilities?.hasCompoundWall !== false);
  const [has24x7Guards, setHas24x7Guards] = useState(editingSpot?.securityFacilities?.has24x7Guards !== false);
  const [hasCctv, setHasCctv] = useState(editingSpot?.securityFacilities?.hasCctv !== false);
  const [hasFloodLights, setHasFloodLights] = useState(editingSpot?.securityFacilities?.hasFloodLights !== false);

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [parsingLink, setParsingLink] = useState(false);
  const [parseSuccessMsg, setParseSuccessMsg] = useState('');

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
      setCancellationPolicy(s.cancellationPolicy || 'full');
      if (s.images && Array.isArray(s.images) && s.images.length > 0) {
        setSpotImages(s.images);
      } else if (s.image || s.imageUrl) {
        setSpotImages([s.image || s.imageUrl]);
      }
      if (s.suitableVehicles && s.suitableVehicles.length > 0) {
        setSuitableVehicles(s.suitableVehicles);
      }
    }
  }, [route?.params?.spot]);

  const handlePickImage = async () => {
    try {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status === 'denied' && !perm.canAskAgain && Platform.OS === 'ios') {
          showAlert('Permission Required', 'Please enable photo library access in device settings.');
          return;
        }
      } catch (pErr) {
        console.warn('Permission request error:', pErr);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 8,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImgs = await Promise.all(
          result.assets.map(async (asset) => {
            if (asset.base64) {
              return `data:image/jpeg;base64,${asset.base64}`;
            }
            if (asset.uri) {
              if (Platform.OS === 'web' || typeof window !== 'undefined') {
                try {
                  const response = await fetch(asset.uri);
                  const blob = await response.blob();
                  return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = () => resolve(asset.uri);
                    reader.readAsDataURL(blob);
                  });
                } catch (e) {
                  return asset.uri;
                }
              }
              return asset.uri;
            }
            return null;
          })
        );
        const validImgs = newImgs.filter(Boolean);
        setSpotImages((prev) => [...prev, ...validImgs].slice(0, 10));
      }
    } catch (err) {
      console.error('Image picker error:', err);
      showAlert('Error', 'Could not select photos: ' + (err.message || 'Error'));
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setSpotImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSetPrimaryCover = (index) => {
    setSpotImages((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, idx) => idx !== index);
      return [selected, ...rest];
    });
  };

  const toggleVehicleType = (typeId) => {
    if (suitableVehicles.includes(typeId)) {
      if (suitableVehicles.length === 1) {
        showAlert('Vehicle Fit', 'Please select at least one vehicle size that fits in this parking spot.');
        return;
      }
      setSuitableVehicles(suitableVehicles.filter((t) => t !== typeId));
    } else {
      setSuitableVehicles([...suitableVehicles, typeId]);
    }
  };

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

  const handleMapsLinkChange = (text) => {
    setGoogleMapsLink(text);
    const trimmed = (text || '').trim();
    if (
      trimmed.startsWith('http') &&
      (trimmed.includes('maps.app.goo.gl') ||
        trimmed.includes('goo.gl/maps') ||
        trimmed.includes('google.com/maps') ||
        trimmed.includes('maps.google'))
    ) {
      handleParseMapsLink(trimmed);
    }
  };

  const handleParseMapsLink = async (urlInput) => {
    const rawUrl = (urlInput !== undefined ? urlInput : googleMapsLink || '').trim();
    if (!rawUrl) {
      showAlert('Enter Link', 'Please paste a Google Maps link first.');
      return;
    }

    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      showAlert('Invalid Link', 'Please enter a valid Google Maps link starting with http:// or https://');
      return;
    }

    setParsingLink(true);
    setParseSuccessMsg('');

    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/spaces/parse-maps-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawUrl }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      console.log('parse-maps-link result:', data);

      if (data && (data.address || data.fullUrl)) {
        let finalAddr = data.address || '';
        let detectedCity = data.city || city || 'Hyderabad';
        let detectedPin = pincode;
        let detectedLat = data.lat;
        let detectedLng = data.lng;

        // Try extracting lat/lng from fullUrl or rawUrl if missing
        const targetUrl = data.fullUrl || rawUrl;
        if (!detectedLat || !detectedLng) {
          const dMatch = targetUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          if (dMatch) {
            detectedLat = parseFloat(dMatch[1]);
            detectedLng = parseFloat(dMatch[2]);
          } else {
            const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) {
              detectedLat = parseFloat(atMatch[1]);
              detectedLng = parseFloat(atMatch[2]);
            } else {
              const qMatch = targetUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
              if (qMatch) {
                detectedLat = parseFloat(qMatch[1]);
                detectedLng = parseFloat(qMatch[2]);
              }
            }
          }
        }

        // Extract 6-digit Indian PIN code from address if present
        const pinMatch = finalAddr.match(/\b(5\d{5})\b/);
        if (pinMatch) {
          detectedPin = pinMatch[1];
        }

        // Extract city from address if identifiable
        const addrLower = finalAddr.toLowerCase();
        if (addrLower.includes('hyderabad')) {
          detectedCity = 'Hyderabad';
        } else if (addrLower.includes('secunderabad')) {
          detectedCity = 'Secunderabad';
        } else if (addrLower.includes('cyberabad')) {
          detectedCity = 'Hyderabad';
        } else if (data.city) {
          detectedCity = data.city;
        }

        if (finalAddr) setAddress(finalAddr);
        if (detectedCity) setCity(detectedCity);
        if (detectedPin) setPincode(detectedPin);
        if (detectedLat) setLat(detectedLat);
        if (detectedLng) setLng(detectedLng);
        if (data.plotNo) setPlotNo(data.plotNo);
        if (data.colonyArea) setColonyArea(data.colonyArea);
        if (data.landmark) setLandmark(data.landmark);

        // Auto-fill title if empty
        if (!title && data.colonyArea) {
          setTitle(`Parking at ${data.colonyArea}`);
        } else if (!title && finalAddr) {
          const firstPart = finalAddr.split(',')[0].trim();
          if (firstPart) setTitle(`Parking near ${firstPart}`);
        }

        setParseSuccessMsg('✅ Address & location details auto-filled!');
        setTimeout(() => setParseSuccessMsg(''), 5000);

        showAlert(
          '📍 Address Auto-Filled!',
          `Address, City and Location have been extracted and filled from Google Maps!`
        );
      } else {
        setParseSuccessMsg('⚠️ Could not extract address from this link.');
        setTimeout(() => setParseSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Error parsing maps link:', err);
      // Client-side fallback: check if coordinates can be extracted directly
      let dLat = null;
      let dLng = null;
      const dMatch = rawUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (dMatch) {
        dLat = parseFloat(dMatch[1]);
        dLng = parseFloat(dMatch[2]);
      } else {
        const atMatch = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) {
          dLat = parseFloat(atMatch[1]);
          dLng = parseFloat(atMatch[2]);
        }
      }

      if (dLat && dLng) {
        setLat(dLat);
        setLng(dLng);
        fetchWhatsAppStyleLocations(dLat, dLng);
        setParseSuccessMsg('✅ Coordinates extracted, resolving address...');
      } else {
        setParseSuccessMsg('⚠️ Could not auto-fill. Please type address or use GPS.');
      }
      setTimeout(() => setParseSuccessMsg(''), 5000);
    } finally {
      setParsingLink(false);
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

    if (isVehicleStorageYard) {
      const acres = parseFloat(landAcres);
      if (isNaN(acres) || acres < 1.0) {
        showAlert(
          '1 Acre Minimum Required',
          'A minimum of 1.0 Acre of secure contiguous land is strictly required to list a Vehicle Storage Yard for Banks & Auto Finance companies.'
        );
        return;
      }
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
          image: spotImages[0] || spotImage || '',
          imageUrl: spotImages[0] || spotImage || '',
          images: spotImages,
          hourlyRate: Number(hourlyRate),
          pricePerHour: Number(hourlyRate),
          totalSpots: Number(totalSpots),
          totalSlots: Number(totalSpots),
          hasEvCharger,
          isActive,
          cancellationPolicy,
          maxWalletDiscount: Number(maxWalletDiscount || 0),
          suitableVehicles,
          spaceCategory: isVehicleStorageYard ? 'commercial_vehicle_storage' : 'standard',
          landAcres: isVehicleStorageYard ? Number(landAcres) : 0,
          monthlyStorageRate: isVehicleStorageYard ? Number(monthlyStorageRate) : 0,
          securityFacilities: {
            hasCompoundWall,
            has24x7Guards,
            hasCctv,
            hasFloodLights,
            isGated: true,
          },
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
      <Header
        title={
          editingSpot
            ? (user?.accountCategory === 'vehicle_storage_owner' ? 'Edit Storage Yard' : 'Edit Parking Spot')
            : (user?.accountCategory === 'vehicle_storage_owner' ? 'List Storage Yard' : 'List New Parking Spot')
        }
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Storage Owner Identity Banner - shown only to vehicle_storage_owner */}
        {user?.accountCategory === 'vehicle_storage_owner' && (
          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderWidth: 1.5,
            borderColor: '#f59e0b',
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
            <Text style={{ fontSize: 24 }}>🏢</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fbbf24', fontWeight: '900', fontSize: 13 }}>VEHICLE STORAGE LAND OWNER</Text>
              <Text style={{ color: '#fef3c7', fontSize: 11, marginTop: 2 }}>
                You are listing a 1+ Acre commercial vehicle storage yard for Banks & Auto Finance repossession.
              </Text>
            </View>
          </View>
        )}

        {/* Category Switcher: Only shown if user is NOT a storage owner - storage owners always use commercial_vehicle_storage */}
        {user?.accountCategory !== 'vehicle_storage_owner' && (
          <View style={{ marginBottom: 18 }}>
            <Text style={styles.label}>Listing Category</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: !isVehicleStorageYard ? COLORS.ownerAccent : '#334155',
                  backgroundColor: !isVehicleStorageYard ? 'rgba(124, 58, 237, 0.15)' : COLORS.darkBg,
                  alignItems: 'center',
                }}
                onPress={() => setIsVehicleStorageYard(false)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22, marginBottom: 4 }}>🅿️</Text>
                <Text style={{ color: !isVehicleStorageYard ? COLORS.white : '#94a3b8', fontSize: 13, fontWeight: '800' }}>
                  Standard Parking
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 10, marginTop: 2, textAlign: 'center' }}>
                  Daily commuter parking slots
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ⚠️ Mandatory 1 Acre Policy Warning for Vehicle Storage */}
        {isVehicleStorageYard && (
          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderWidth: 1.5,
            borderColor: COLORS.storageAccent,
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
          }}>
            <Text style={{ color: COLORS.storageAccent, fontWeight: '900', fontSize: 13, marginBottom: 4 }}>
              ⚠️ MANDATORY 1 ACRE REQUIREMENT FOR BANKS
            </Text>
            <Text style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 18 }}>
              Banks and Auto Finance companies require large, secure facilities to store seized and repossessed vehicles. A minimum of 1.0 contiguous Acre of land is strictly enforced.
            </Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.label}>
            {isVehicleStorageYard ? 'Yard / Stockyard Title' : 'Spot Name / Title'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isVehicleStorageYard ? "e.g. Hyderabad South 2-Acre Secured Auto Stockyard" : "e.g. Covered Driveway near Metro"}
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Location Action Row */}
          <View style={styles.locationHeaderRow}>
            <Text style={styles.label}>Full Address (Complete)</Text>
            <TouchableOpacity
              style={styles.locateBtn}
              onPress={handleLocateMe}
              onClick={handleLocateMe}
              disabled={locating}
              activeOpacity={0.8}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#25D366" />
              ) : (
                <Text style={styles.locateBtnTxt}>📍 Use GPS</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Complete address with colony, landmark & city"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
          />

          {/* City and Pincode Row */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Hyderabad"
                placeholderTextColor={COLORS.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                placeholder="500097"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={pincode}
                onChangeText={setPincode}
              />
            </View>
          </View>

          {/* Google Maps Link Field */}
          <View style={styles.locationHeaderRow}>
            <Text style={styles.label}>Google Maps Link (Optional)</Text>
            <TouchableOpacity
              style={[styles.locateBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => handleParseMapsLink(googleMapsLink)}
              onClick={() => handleParseMapsLink(googleMapsLink)}
              disabled={parsingLink}
              activeOpacity={0.8}
            >
              {parsingLink ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.locateBtnTxt}>⚡ Auto-Fill Address</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Paste Google Maps URL or use GPS above"
            placeholderTextColor={COLORS.textMuted}
            value={googleMapsLink}
            onChangeText={handleMapsLinkChange}
          />

          {parsingLink && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 }}>
              <ActivityIndicator size="small" color="#60a5fa" />
              <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600' }}>
                Fetching address from Google Maps link...
              </Text>
            </View>
          )}

          {!!parseSuccessMsg && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: '#34d399', fontSize: 12, fontWeight: '700' }}>
                {parseSuccessMsg}
              </Text>
            </View>
          )}

          {/* Rate and Capacity */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Hourly Rate (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="50"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={hourlyRate}
                onChangeText={setHourlyRate}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Total Capacity (Slots)</Text>
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

          {/* Cancellation & Refund Policy Options (Owner Choice) */}
          <View style={{ marginTop: 14, marginBottom: 14 }}>
            <Text style={styles.switchTitle}>🛡️ Cancellation & Refund Policy</Text>
            <Text style={styles.switchSub}>Select refund amount seeker receives if they cancel:</Text>

            <View style={{ gap: 8, marginTop: 10 }}>
              {[
                { id: 'full', title: '🟢 100% Full Refund', sub: 'Seeker receives full 100% paid amount credited to wallet' },
                { id: 'half', title: '🟡 50% Half Refund', sub: 'Seeker receives 50% refund; you keep 50% compensation' },
                { id: 'none', title: '🔴 0% No Refund', sub: 'Strict non-refundable booking' },
              ].map((policy) => {
                const isSelected = cancellationPolicy === policy.id;
                return (
                  <TouchableOpacity
                    key={policy.id}
                    style={{
                      backgroundColor: isSelected ? '#a855f720' : '#0f172a80',
                      borderColor: isSelected ? COLORS.ownerAccent : COLORS.borderDark,
                      borderWidth: 1.5,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => setCancellationPolicy(policy.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: isSelected ? COLORS.white : COLORS.textMuted, fontSize: 14, fontWeight: '800' }}>
                        {policy.title}
                      </Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                        {policy.sub}
                      </Text>
                    </View>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isSelected ? COLORS.ownerAccent : '#475569',
                      backgroundColor: isSelected ? COLORS.ownerAccent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isSelected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white }} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Supported Vehicle Sizes & Types */}
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.label}>🚗 Vehicles Fit in this Spot (Select all that fit)</Text>
              <Text style={{ fontSize: 11, color: COLORS.ownerAccent, fontWeight: '700' }}>
                {suitableVehicles.length} of 3 Selected
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>
              Check which car sizes can comfortably enter and park in your space:
            </Text>

            <View style={{ gap: 10 }}>
              {[
                {
                  id: 'hatchback',
                  title: 'Hatchback',
                  icon: '🚗',
                  subtitle: 'Small cars, usually 4–5 seats',
                  examples: 'Swift, i20, Baleno',
                },
                {
                  id: 'sedan',
                  title: 'Sedan',
                  icon: '🚘',
                  subtitle: 'Separate boot/trunk, usually 4–5 seats',
                  examples: 'Dzire, Honda City, Verna',
                },
                {
                  id: 'suv',
                  title: 'SUV',
                  icon: '🚙',
                  subtitle: 'Taller, larger body, usually 5–7 seats',
                  examples: 'Creta, Seltos, XUV700',
                },
              ].map((vehicle) => {
                const isChecked = suitableVehicles.includes(vehicle.id);
                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={{
                      backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.12)' : COLORS.darkBg,
                      borderWidth: 1.5,
                      borderColor: isChecked ? COLORS.ownerAccent : '#334155',
                      borderRadius: 14,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    onPress={() => toggleVehicleType(vehicle.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12, marginRight: 10 }}>
                      <Text style={{ fontSize: 24 }}>{vehicle.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: isChecked ? COLORS.white : '#94a3b8', fontSize: 14, fontWeight: '800' }}>
                          {vehicle.title}
                        </Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 1 }}>
                          {vehicle.subtitle}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <Text style={{ fontSize: 10, color: COLORS.ownerAccent, fontWeight: '700' }}>Examples:</Text>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>{vehicle.examples}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Checkbox box with checkmark */}
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: isChecked ? COLORS.ownerAccent : '#475569',
                      backgroundColor: isChecked ? COLORS.ownerAccent : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {isChecked && (
                        <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '900' }}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Max Wallet Discount Option (Owner Control) */}
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.label}>⚡ Max Wallet Money Usable per Booking (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={maxWalletDiscount}
              onChangeText={setMaxWalletDiscount}
            />
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
              Seekers can deduct up to ₹{maxWalletDiscount || 0} from their PlanToPark Wallet balance on each booking.
            </Text>
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
                <Text style={styles.switchSub}>Is this spot open & accepting seeker bookings?</Text>
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

          {/* Multi-Photo Upload Section */}
          <View style={{
            marginBottom: 20,
            marginTop: 10,
            backgroundColor: '#1e293b',
            padding: 16,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: isVehicleStorageYard ? 'rgba(245, 158, 11, 0.4)' : 'rgba(124, 58, 237, 0.4)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.white }}>
                {isVehicleStorageYard ? '📸 1+ Acre Land & Yard Photos' : '📸 Parking Spot Photos'}
              </Text>
              {spotImages.length > 0 ? (
                <View style={{ backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '800' }}>
                    ✓ {spotImages.length} Photo{spotImages.length > 1 ? 's' : ''} Added
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={{ fontSize: 12, color: '#94a3b8', lineHeight: 18, marginBottom: 12 }}>
              {isVehicleStorageYard
                ? 'Upload multiple clear photos of your land, compound wall, gate, and security cabin (Up to 8 photos). Seekers can scroll through all photos.'
                : 'Upload multiple photos of your parking bay, entrance, and driveway (Up to 8 photos). The first photo will be the main cover photo.'}
            </Text>

            {spotImages.length > 0 ? (
              <View>
                {/* Horizontal Scrollable Thumbnails */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                >
                  {spotImages.map((imgUri, idx) => (
                    <View
                      key={idx}
                      style={{
                        width: 140,
                        height: 120,
                        borderRadius: 12,
                        overflow: 'hidden',
                        backgroundColor: '#0f172a',
                        borderWidth: 1.5,
                        borderColor: idx === 0 ? COLORS.ownerAccent : '#334155',
                        position: 'relative',
                      }}
                    >
                      <Image
                        source={{ uri: getImageUrl(imgUri) || imgUri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />

                      {/* Cover Badge or Make Cover Action */}
                      {idx === 0 ? (
                        <View style={{
                          position: 'absolute',
                          bottom: 6,
                          left: 6,
                          backgroundColor: 'rgba(124, 58, 237, 0.9)',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                        }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>⭐ Primary Cover</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={{
                            position: 'absolute',
                            bottom: 6,
                            left: 6,
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            borderWidth: 0.5,
                            borderColor: '#94a3b8',
                          }}
                          onPress={() => handleSetPrimaryCover(idx)}
                        >
                          <Text style={{ color: '#38bdf8', fontSize: 9, fontWeight: '700' }}>Set Cover</Text>
                        </TouchableOpacity>
                      )}

                      {/* Remove Single Photo Button */}
                      <TouchableOpacity
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => handleRemoveImage(idx)}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900', lineHeight: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Append More Photos Dashed Card */}
                  {spotImages.length < 8 && (
                    <TouchableOpacity
                      style={{
                        width: 110,
                        height: 120,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: '#475569',
                        backgroundColor: 'rgba(15, 23, 42, 0.5)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={handlePickImage}
                      activeOpacity={0.75}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 4 }}>➕</Text>
                      <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700' }}>Add More</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>

                {/* Bottom Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      borderWidth: 1,
                      borderColor: '#38bdf8',
                      paddingVertical: 9,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={handlePickImage}
                  >
                    <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 12 }}>
                      📸 + Add More Photos ({spotImages.length}/8)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      borderWidth: 1,
                      borderColor: '#ef4444',
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                    }}
                    onPress={() => setSpotImages([])}
                  >
                    <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 12 }}>🗑️ Clear All</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: isVehicleStorageYard ? COLORS.storageAccent : COLORS.ownerAccent,
                  borderRadius: 12,
                  paddingVertical: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                }}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 32, marginBottom: 6 }}>
                  {isVehicleStorageYard ? '🏢' : '📷'}
                </Text>
                <Text style={{ color: isVehicleStorageYard ? COLORS.storageAccent : COLORS.ownerAccent, fontWeight: '800', fontSize: 14 }}>
                  {isVehicleStorageYard ? '+ Upload 1+ Acre Land Photos (Select Multiple)' : '+ Upload Parking Spot Photos (Select Multiple)'}
                </Text>
                <Text style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                  Select multiple photos from device gallery (Up to 8 photos)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Button
            title={
              editingSpot
                ? (isVehicleStorageYard ? "Save Changes & Update Yard" : "Save Changes & Update Spot")
                : (isVehicleStorageYard ? "Publish 1+ Acre Vehicle Storage Yard" : "Publish Parking Listing")
            }
            onPress={handleCreateSpot}
            loading={loading}
            style={{
              backgroundColor: isVehicleStorageYard ? COLORS.storageAccent : COLORS.ownerAccent,
              marginTop: 10,
            }}
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
    width: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        boxSizing: 'border-box',
      },
    }),
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  col: {
    flex: 1,
    minWidth: 0,
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

