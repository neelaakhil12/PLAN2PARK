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
import { getDetailedAddressFromCoords, smartGeocodeAddress } from '../utils/locationHelper';

const POPULAR_LOCATIONS = [
  { name: 'Chaitanya Hills, Almasguda', lat: 17.3139, lng: 78.5456 },
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
  const [selectedArea, setSelectedArea] = useState(currentLocation || '');
  const [customAddress, setCustomAddress] = useState('');
  const [locating, setLocating] = useState(false);

  if (!visible) return null;

  const handleConfirm = async () => {
    const finalAddress = customAddress.trim();
    if (finalAddress) {
      setLocating(true);
      try {
        const coords = await smartGeocodeAddress(finalAddress);
        if (coords) {
          const locStr = `🎯 ${finalAddress} (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
          onSelectLocation(locStr);
          setLocating(false);
          return;
        }
      } catch (e) {}
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

      // 2. Query real hardware GPS coordinates with highest accuracy
      let pos = null;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
      } catch (gpsErr) {
        pos = await Location.getLastKnownPositionAsync({
          maxAge: 30000,
        });
      }

      if (!pos || !pos.coords) {
        throw new Error('Unable to retrieve coordinates');
      }

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 3. Reverse geocode to retrieve the real locality/neighborhood/colony name
      const detailedAddress = await getDetailedAddressFromCoords(lat, lng);
      const locationStr = `🎯 ${detailedAddress} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      setSelectedArea(locationStr);
      setCustomAddress(detailedAddress);
      onSelectLocation(locationStr);
    } catch (err) {
      console.warn('GPS detection error:', err);

      // Web fallback
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const detailedAddress = await getDetailedAddressFromCoords(lat, lng);
            const locationStr = `🎯 ${detailedAddress} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            setSelectedArea(locationStr);
            setCustomAddress(detailedAddress);
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
    setCustomAddress(loc.name);
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
                {locating ? 'Detecting your real-time colony & GPS location...' : 'Auto-detect colony, landmark & GPS coordinates'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Custom Input */}
          <Text style={styles.sectionLabel}>Or Search / Edit Specific Plot, Colony or Landmark</Text>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>📍</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Plot 89, Chaitanya Hills, Hyderabad..."
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
              <Text style={styles.previewLocation} numberOfLines={2}>
                {customAddress || selectedArea || 'No location selected yet'}
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  modalSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  body: {
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  gpsIcon: {
    fontSize: 24,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338CA',
  },
  gpsSub: {
    fontSize: 12,
    color: '#6366F1',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primaryLight || '#EDE9FE',
    borderColor: COLORS.primary,
  },
  chipTxt: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  chipTxtActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  mapPinPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  mapPinEmoji: {
    fontSize: 24,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewLocation: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
    marginTop: 2,
  },
  activeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
});
