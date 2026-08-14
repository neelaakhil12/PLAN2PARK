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
} from 'react-native';
import { COLORS } from '../theme/colors';
import Button from './Button';

const POPULAR_LOCATIONS = [
  'Hitech City, Hyderabad',
  'Banjara Hills, Hyderabad',
  'Madhapur, Hyderabad',
  'Gachibowli, Hyderabad',
  'Jubilee Hills, Hyderabad',
  'Kondapur, Hyderabad',
  'Begumpet, Hyderabad',
  'Secunderabad Railway Station',
];

export default function PinLocationModal({ visible, currentLocation, onSelectLocation, onClose }) {
  const [selectedArea, setSelectedArea] = useState(currentLocation || 'Hitech City, Hyderabad');
  const [customAddress, setCustomAddress] = useState('');
  const [locating, setLocating] = useState(false);

  if (!visible) return null;

  const handleConfirm = () => {
    const finalLocation = customAddress.trim() || selectedArea;
    if (finalLocation) {
      onSelectLocation(finalLocation);
    }
  };

  const handleUseGps = () => {
    setLocating(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            const areaName = data.address
              ? (data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.city_district || data.address.city || 'Current Area')
              : 'Current GPS Location';
            const locationStr = `🎯 ${areaName} (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
            setSelectedArea(locationStr);
            setCustomAddress('');
            onSelectLocation(locationStr);
          } catch (e) {
            const fallbackStr = `🎯 GPS Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
            setSelectedArea(fallbackStr);
            setCustomAddress('');
            onSelectLocation(fallbackStr);
          } finally {
            setLocating(false);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          const fallback = '🎯 Current Location (Banjara Hills, Hyderabad)';
          setSelectedArea(fallback);
          setCustomAddress('');
          onSelectLocation(fallback);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setTimeout(() => {
        const fallback = '🎯 Current Location (Banjara Hills, Hyderabad)';
        setSelectedArea(fallback);
        setCustomAddress('');
        onSelectLocation(fallback);
        setLocating(false);
      }, 500);
    }
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
          <TouchableOpacity style={styles.gpsBtn} onPress={handleUseGps} activeOpacity={0.8}>
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
              const isSelected = selectedArea === loc && !customAddress;
              return (
                <TouchableOpacity
                  key={loc}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => {
                    setSelectedArea(loc);
                    setCustomAddress('');
                    onSelectLocation(loc);
                  }}
                >
                  <Text style={[styles.chipTxt, isSelected && styles.chipTxtActive]}>
                    {loc}
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
            title="Confirm Pinned Location 🚀"
            onPress={handleConfirm}
            variant="primary"
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
