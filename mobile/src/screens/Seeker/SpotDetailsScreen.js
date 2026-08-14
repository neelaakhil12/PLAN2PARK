import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { endpoints } from '../../config/api';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function SpotDetailsScreen({ route, navigation }) {
  const space = route.params?.space || {};
  const { token } = useContext(AuthContext);

  const [vehicleNumber, setVehicleNumber] = useState('TS07AB1234');
  const [vehicleType, setVehicleType] = useState('4-wheeler');
  const [durationHours, setDurationHours] = useState('2');
  const [loading, setLoading] = useState(false);

  const hourlyRate = space.hourlyRate || 40;
  const totalPrice = Number(durationHours || 1) * hourlyRate;

  const handleCreateBooking = async () => {
    if (!vehicleNumber) {
      Alert.alert('Error', 'Please enter your vehicle plate number');
      return;
    }

    setLoading(true);
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + Number(durationHours) * 60 * 60 * 1000);

      const payload = {
        spaceId: space._id,
        vehicleNumber,
        vehicleType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        totalAmount: totalPrice,
      };

      const res = await fetch(endpoints.createBooking, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert('🎉 Booking Confirmed!', `Spot reserved at ${space.title}!`, [
          {
            text: 'View My Bookings',
            onPress: () => navigation.navigate('Bookings'),
          },
        ]);
      } else {
        Alert.alert('Booking Error', data.message || 'Could not complete booking');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error during booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Spot Details & Reservation" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Card */}
        <View style={styles.spotCard}>
          <View style={styles.badgeRow}>
            <Text style={styles.verifiedBadge}>VERIFIED PARKING</Text>
            {space.hasEvCharger && <Text style={styles.evBadge}>⚡ EV CHARGING</Text>}
          </View>

          <Text style={styles.spotTitle}>{space.title || 'Central Safe Parking'}</Text>
          <Text style={styles.spotAddress}>📍 {space.address || 'Hitech City Road'}, {space.city || 'Hyderabad'}</Text>
          <Text style={styles.spotRate}>Rate: <Text style={styles.rateHighlight}>₹{hourlyRate}/hour</Text></Text>

          <View style={styles.divider} />

          {/* Features */}
          <Text style={styles.sectionTitle}>Amenities & Features</Text>
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityChip}><Text style={styles.amenityTxt}>🛡️ 24/7 CCTV</Text></View>
            <View style={styles.amenityChip}><Text style={styles.amenityTxt}>🔒 Gated Guarded</Text></View>
            {space.hasEvCharger && <View style={styles.amenityChip}><Text style={styles.amenityTxt}>⚡ Fast Charger</Text></View>}
            <View style={styles.amenityChip}><Text style={styles.amenityTxt}>☂️ Covered Parking</Text></View>
          </View>
        </View>

        {/* Reservation Details Input */}
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Reservation Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vehicle Plate Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. TS 08 EA 5678"
              placeholderTextColor={COLORS.textMuted}
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
              autoCapitalize="characters"
            />
          </View>

          {/* Vehicle Type Switcher */}
          <Text style={styles.label}>Vehicle Type</Text>
          <View style={styles.vehicleTypeRow}>
            <TouchableOpacity
              style={[styles.vTypeBtn, vehicleType === '4-wheeler' && styles.vTypeBtnActive]}
              onPress={() => setVehicleType('4-wheeler')}
            >
              <Text style={[styles.vTypeTxt, vehicleType === '4-wheeler' && styles.vTypeTxtActive]}>🚗 4-Wheeler (Car)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.vTypeBtn, vehicleType === '2-wheeler' && styles.vTypeBtnActive]}
              onPress={() => setVehicleType('2-wheeler')}
            >
              <Text style={[styles.vTypeTxt, vehicleType === '2-wheeler' && styles.vTypeTxtActive]}>🏍️ 2-Wheeler (Bike)</Text>
            </TouchableOpacity>
          </View>

          {/* Duration Selector */}
          <Text style={styles.label}>Parking Duration (Hours)</Text>
          <View style={styles.durationRow}>
            {['1', '2', '4', '8'].map((hr) => (
              <TouchableOpacity
                key={hr}
                style={[styles.durBtn, durationHours === hr && styles.durBtnActive]}
                onPress={() => setDurationHours(hr)}
              >
                <Text style={[styles.durTxt, durationHours === hr && styles.durTxtActive]}>{hr} hr{hr !== '1' ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Price Calculation Box */}
          <View style={styles.priceBox}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Base Rate</Text>
              <Text style={styles.priceVal}>₹{hourlyRate} × {durationHours} hrs</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Platform Convenience Fee</Text>
              <Text style={styles.priceVal}>₹0 (Free)</Text>
            </View>
            <View style={[styles.priceRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.borderDark, paddingTop: 6 }]}>
              <Text style={styles.totalLabel}>Total Payable</Text>
              <Text style={styles.totalVal}>₹{totalPrice}</Text>
            </View>
          </View>

          <Button
            title={`Confirm Booking • ₹${totalPrice}`}
            onPress={handleCreateBooking}
            loading={loading}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  content: {
    padding: 16,
  },
  spotCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  verifiedBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  evBadge: {
    backgroundColor: '#3b82f6',
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  spotTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  spotAddress: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  spotRate: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  rateHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderDark,
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amenityTxt: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
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
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  vTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  vTypeBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#064e3b',
  },
  vTypeTxt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  vTypeTxtActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  durBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  durTxt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  durTxtActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  priceBox: {
    backgroundColor: COLORS.darkBg,
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  priceLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  priceVal: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  totalLabel: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 15,
  },
  totalVal: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 18,
  },
});
