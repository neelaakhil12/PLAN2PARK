import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { endpoints } from '../../config/api';
import { COLORS } from '../../theme/colors';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function AddSpotScreen({ navigation }) {
  const { token } = useContext(AuthContext);

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [totalSpots, setTotalSpots] = useState('5');
  const [hasEvCharger, setHasEvCharger] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateSpot = async () => {
    if (!title || !address || !city || !hourlyRate) {
      Alert.alert('Validation Error', 'Please fill in title, address, city and rate');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(endpoints.createSpace, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          address,
          city,
          hourlyRate: Number(hourlyRate),
          totalSpots: Number(totalSpots),
          hasEvCharger,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Parking Space listed successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', data.message || 'Could not add space');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="List New Parking Spot" onBack={() => navigation.goBack()} />

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

          <Text style={styles.label}>Full Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Plot 42, Jubilee Hills"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={setAddress}
          />

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
            <View>
              <Text style={styles.switchTitle}>⚡ EV Charger Facility</Text>
              <Text style={styles.switchSub}>Is electric vehicle charging available?</Text>
            </View>
            <Switch
              value={hasEvCharger}
              onValueChange={setHasEvCharger}
              trackColor={{ false: COLORS.borderDark, true: COLORS.ownerAccent }}
            />
          </View>

          <Button
            title="Publish Parking Listing"
            onPress={handleCreateSpot}
            loading={loading}
            style={{ backgroundColor: COLORS.ownerAccent, marginTop: 20 }}
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
});
