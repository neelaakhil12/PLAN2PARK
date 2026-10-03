import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../theme/colors';
import Button from './Button';

const POPULAR_LOCATIONS = [
  { name: 'Almasguda, Hyderabad', lat: 17.3128, lng: 78.5450 },
  { name: 'Hitech City, Hyderabad', lat: 17.4435, lng: 78.3772 },
  { name: 'Madhapur, Hyderabad', lat: 17.4483, lng: 78.3915 },
  { name: 'Gachibowli, Hyderabad', lat: 17.4401, lng: 78.3489 },
  { name: 'Kondapur, Hyderabad', lat: 17.4646, lng: 78.3582 },
  { name: 'Jubilee Hills, Hyderabad', lat: 17.4319, lng: 78.4071 },
  { name: 'Banjara Hills, Hyderabad', lat: 17.4156, lng: 78.4347 },
  { name: 'Secunderabad Station', lat: 17.4334, lng: 78.5042 },
  { name: 'LB Nagar, Hyderabad', lat: 17.3457, lng: 78.5522 },
  { name: 'Ibrahimpatnam', lat: 17.1950, lng: 78.6480 },
];

export default function PinLocationModal({ visible, currentLocation, onSelectLocation, onClose }) {
  const [selectedArea, setSelectedArea] = useState(currentLocation || 'Almasguda (17.313, 78.545)');
  const [customAddress, setCustomAddress] = useState('');
  const [locating, setLocating] = useState(false);

  if (!visible) return null;

  const handleConfirm = async () => {
    const finalAddress = customAddress.trim();
    if (finalAddress) {
      setLocating(true);
      try {
        const geocoded = await Location.geocodeAsync(finalAddress);
        if (geocoded && geocoded.length > 0) {
          const { latitude, longitude } = geocoded[0];
          const locStr = `🎯 ${finalAddress} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          onSelectLocation(locStr);
          setLocating(false);
          return;
        }
      } catch (e) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(finalAddress)}&format=json&limit=1`, {
            headers: { 'User-Agent': 'PlanToPark/1.0' }
          });
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            const locStr = `🎯 ${finalAddress} (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            onSelectLocation(locStr);
            setLocating(false);
            return;
          }
        } catch (nomErr) {}
      }
      setLocating(false);
      onSelectLocation(finalAddress);
    } else if (selectedArea) {
      onSelectLocation(selectedArea);
    }
  };

  const handleUseGps = async () => {
    setLocating(true);
    try {
      // 1. Request foreground location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please allow location access in your device settings so PlanToPark can pin your exact parking position.'
        );
        setLocating(false);
        return;
      }

      // 2. Query real hardware GPS coordinates
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 3. Reverse geocode to retrieve the real locality/neighborhood name
      let areaName = '';
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (rev && rev.length > 0) {
          const r = rev[0];
          const nameParts = [r.name, r.district, r.subregion, r.city].filter(Boolean);
          const uniqueParts = [...new Set(nameParts)];
          areaName = uniqueParts.slice(0, 2).join(', ') || r.city || r.district || 'My Location';
        }
      } catch (revErr) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'User-Agent': 'PlanToPark/1.0' }
          });
          const data = await res.json();
          if (data && data.address) {
            areaName = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.village || data.address.town || data.address.city || 'My Location';
          }
        } catch (nomErr) {}
      }

      if (!areaName) {
        areaName = 'Current Location';
      }

      const locationStr = `🎯 ${areaName} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      setSelectedArea(locationStr);
      setCustomAddress('');
      onSelectLocation(locationStr);
    } catch (err) {
      console.warn('GPS detection error:', err);

      // Web fallback
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const locationStr = `🎯 Current Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            setSelectedArea(locationStr);
            setCustomAddress('');
            onSelectLocation(locationStr);
            setLocating(false);
          },
          (navErr) => {
            Alert.alert(
              'Location Unavailable',
              'Unable to detect your device GPS location. Please turn on your device GPS / Location services and try again.'
            );
            setLocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
        return;
      }

      Alert.alert(
        'Location Unavailable',
        'Unable to detect GPS position. Please make sure location services are turned ON in your device settings.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleSelectPopular = (loc) => {
    const locationStr = `🎯 ${loc.name} (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`;
    setSelectedArea(locationStr);
    setCustomAddress('');
    onSelectLocation(locationStr);
  };

  const modalBody = (
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.modalTitle}>📍 Pin Your Location</Text>
          <Text style={styles.modalSub}>
            Pin where you need parking so we can show you the nearest spots!
          </Text>
        </View>

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* GPS Locate Button */}
          <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGps} activeOpacity={0.8} disabled={locating}>
            <Text style={styles.gpsIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.gpsTitle}>Use Current GPS Location</Text>
              <Text style={styles.gpsSub}>
                {locating ? 'Detecting your real-time GPS location...' : 'Auto-detect & pin current location'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Custom Input */}
          <Text style={styles.sectionLabel}>Or Search Specific Area / Landmark</Text>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>📍</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter city, area, or landmark..."
              placeholderTextColor={COLORS.textMuted}
              value={customAddress}
              onChangeText={(txt) => {
                setCustomAddress(txt);
                if (txt) setSelectedArea(txt);
              }}
            />
          </View>

          {/* Quick Popular Locations */}
          <Text style={styles.sectionLabel}>Popular Parking Hotspots</Text>
          <View style={styles.chipContainer}>
            {POPULAR_LOCATIONS.map((loc) => {
              const isSelected = selectedArea.includes(loc.name) && !customAddress;
              return (
                <TouchableOpacity
                  key={loc.name}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => handleSelectPopular(loc)}
                >
                  <Text style={[styles.chipTxt, isSelected && styles.chipTxtActive]}>
                    {loc.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Simulated Map Pin Card */}
          <View style={styles.mapPinPreview}>
            <Text style={styles.mapPinEmoji}>📌</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle}>Pinned Destination:</Text>
              <Text style={styles.previewLocation}>
                {customAddress || selectedArea}
              </Text>
            </View>
            <Text style={styles.activeBadge}>PINNED</Text>
          </View>
        </ScrollView>

        {/* Footer Action */}
        <View style={styles.footer}>
          <Button
            title={locating ? "Detecting Location..." : "Confirm Pinned Location 🚀"}
            onPress={handleConfirm}
            variant="primary"
            disabled={locating}
          />
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return modalBody;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      {modalBody}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  body: {
    maxHeight: 400,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  gpsIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  gpsTitle: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  gpsSub: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  chipTxt: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  chipTxtActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  mapPinPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginVertical: 10,
  },
  mapPinEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  previewTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  previewLocation: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
});
