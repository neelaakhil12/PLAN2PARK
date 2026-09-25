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
  TouchableOpacity,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { endpoints } from '../../config/api';
import { COLORS } from '../../theme/colors';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function AddSpotScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);

  const [spaceCategory, setSpaceCategory] = useState(
    user?.accountCategory === 'vehicle_storage_owner' ? 'commercial_vehicle_storage' : 'standard'
  );
  const isVehicleStorage = spaceCategory === 'commercial_vehicle_storage';

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [hourlyRate, setHourlyRate] = useState('50');
  const [totalSpots, setTotalSpots] = useState('5');
  const [hasEvCharger, setHasEvCharger] = useState(false);
  const [suitableVehicles, setSuitableVehicles] = useState(['hatchback', 'sedan', 'suv']);

  // Commercial Storage Yard States
  const [landAcres, setLandAcres] = useState(String(user?.landAcres || '1.0'));
  const [monthlyStorageRate, setMonthlyStorageRate] = useState('1500');
  const [hasCompoundWall, setHasCompoundWall] = useState(true);
  const [has24x7Guards, setHas24x7Guards] = useState(true);
  const [hasCctv, setHasCctv] = useState(true);
  const [hasFloodLights, setHasFloodLights] = useState(true);

  const [loading, setLoading] = useState(false);

  const toggleVehicleType = (typeId) => {
    if (suitableVehicles.includes(typeId)) {
      if (suitableVehicles.length === 1) {
        Alert.alert('Vehicle Fit', 'Please select at least one vehicle size that fits in this parking spot.');
        return;
      }
      setSuitableVehicles(suitableVehicles.filter((t) => t !== typeId));
    } else {
      setSuitableVehicles([...suitableVehicles, typeId]);
    }
  };

  const handleCreateSpot = async () => {
    if (!title || !address || !city) {
      Alert.alert('Validation Error', 'Please fill in title, address, and city.');
      return;
    }

    if (isVehicleStorage) {
      const acres = parseFloat(landAcres);
      if (isNaN(acres) || acres < 1.0) {
        Alert.alert(
          'Minimum 1 Acre Required',
          'Strict Policy: Commercial Vehicle Storage for Banks & Auto Finance requires a minimum of 1.0 contiguous Acre of land.'
        );
        return;
      }
    } else {
      if (!hourlyRate) {
        Alert.alert('Validation Error', 'Please enter hourly rate.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        title,
        address,
        city,
        spaceCategory: isVehicleStorage ? 'commercial_vehicle_storage' : 'standard',
        suitableVehicles,
      };

      if (isVehicleStorage) {
        payload.landAcres = parseFloat(landAcres);
        payload.monthlyStorageRate = parseFloat(monthlyStorageRate) || 1500;
        payload.hourlyRate = Math.round((parseFloat(monthlyStorageRate) || 1500) / 100);
        payload.totalSpots = Math.max(Number(totalSpots) || 50, Math.round(parseFloat(landAcres) * 80));
        payload.securityFacilities = {
          hasCompoundWall,
          has24x7Guards,
          hasCctv,
          hasFloodLights,
          isGated: true,
        };
      } else {
        payload.hourlyRate = Number(hourlyRate);
        payload.totalSpots = Number(totalSpots);
        payload.hasEvCharger = hasEvCharger;
      }

      const res = await fetch(endpoints.createSpace, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          'Success',
          isVehicleStorage
            ? 'Commercial Vehicle Storage Yard listed successfully for Banks & Auto Finance Companies!'
            : 'Parking Space listed successfully!'
        );
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
      <Header
        title={isVehicleStorage ? "List Vehicle Storage Yard" : "List New Parking Spot"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Switcher Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: '#131b2e', borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' }}>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: !isVehicleStorage ? COLORS.ownerAccent : 'transparent',
              alignItems: 'center',
            }}
            onPress={() => setSpaceCategory('standard')}
          >
            <Text style={{ color: !isVehicleStorage ? '#ffffff' : '#94a3b8', fontWeight: '800', fontSize: 13 }}>
              🅿️ Standard Spot
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1.2,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: isVehicleStorage ? '#f59e0b' : 'transparent',
              alignItems: 'center',
            }}
            onPress={() => setSpaceCategory('commercial_vehicle_storage')}
          >
            <Text style={{ color: isVehicleStorage ? '#000000' : '#94a3b8', fontWeight: '800', fontSize: 13 }}>
              🏢 Storage Yard (1+ Ac)
            </Text>
          </TouchableOpacity>
        </View>

        {isVehicleStorage && (
          <View style={{
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            borderColor: 'rgba(245, 158, 11, 0.4)',
            borderWidth: 1.5,
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={{ color: '#fbbf24', fontWeight: '800', fontSize: 14 }}>
                MANDATORY POLICY REQUIREMENT
              </Text>
            </View>
            <Text style={{ color: '#fef3c7', fontSize: 12, lineHeight: 18 }}>
              Landowners listing for <Text style={{ fontWeight: '800' }}>Banks & Auto Finance Companies</Text> MUST have a <Text style={{ fontWeight: '800', color: '#fbbf24' }}>minimum of 1.0 Acre contiguous land</Text>. This provides secure holding capacity for seized & repossessed vehicles with 24/7 security.
            </Text>
          </View>
        )}

        <View style={styles.formCard}>
          <Text style={styles.label}>
            {isVehicleStorage ? "Stockyard Name / Title" : "Spot Name / Title"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={isVehicleStorage ? "e.g. Hyderabad Mega Vehicle Holding Yard 1" : "e.g. Covered Driveway near Metro"}
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Full Address</Text>
          <TextInput
            style={styles.input}
            placeholder={isVehicleStorage ? "e.g. Survey 88, Outer Ring Road Junction" : "e.g. Plot 42, Jubilee Hills"}
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

          {isVehicleStorage ? (
            <>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={styles.label}>Land Area (Acres)</Text>
                    <Text style={{ fontSize: 11, color: '#fbbf24', fontWeight: '800' }}>Min 1.0 Ac</Text>
                  </View>
                  <TextInput
                    style={[styles.input, parseFloat(landAcres) < 1.0 && { borderColor: '#ef4444', borderWidth: 2 }]}
                    placeholder="1.0"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={landAcres}
                    onChangeText={setLandAcres}
                  />
                  {parseFloat(landAcres) < 1.0 && (
                    <Text style={{ color: '#ef4444', fontSize: 11, marginTop: -6, marginBottom: 8, fontWeight: '700' }}>
                      Minimum 1.0 Acre strictly required!
                    </Text>
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Monthly Fee (₹/car)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1500"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={monthlyStorageRate}
                    onChangeText={setMonthlyStorageRate}
                  />
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={styles.label}>Total Holding Capacity (Cars)</Text>
                <TextInput
                  style={styles.input}
                  placeholder={String(Math.round(Math.max(1, parseFloat(landAcres) || 1) * 80))}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={totalSpots}
                  onChangeText={setTotalSpots}
                />
                <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: -4 }}>
                  Estimated capacity: ~80 to 120 cars per acre.
                </Text>
              </View>

              <Text style={[styles.label, { marginTop: 6, marginBottom: 8 }]}>🛡️ Security & Boundary Facilities</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {[
                  { label: '🧱 Concrete Compound Wall', val: hasCompoundWall, set: setHasCompoundWall },
                  { label: '👮 24/7 On-Site Security Guards', val: has24x7Guards, set: setHas24x7Guards },
                  { label: '📹 Full CCTV Camera Surveillance', val: hasCctv, set: setHasCctv },
                  { label: '💡 Perimeter Flood Lights', val: hasFloodLights, set: setHasFloodLights },
                ].map((sec, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: sec.val ? 'rgba(245, 158, 11, 0.1)' : COLORS.darkBg,
                      borderWidth: 1.5,
                      borderColor: sec.val ? '#f59e0b' : '#334155',
                      borderRadius: 10,
                      padding: 10,
                    }}
                    onPress={() => sec.set(!sec.val)}
                  >
                    <Text style={{ color: sec.val ? '#ffffff' : '#94a3b8', fontSize: 13, fontWeight: '700' }}>
                      {sec.label}
                    </Text>
                    <Switch
                      value={sec.val}
                      onValueChange={sec.set}
                      trackColor={{ false: COLORS.borderDark, true: '#f59e0b' }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
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
            </>
          )}

          {/* Supported Vehicle Sizes & Types */}
          <View style={{ marginTop: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.label}>🚗 Vehicles Fit in this Spot</Text>
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
