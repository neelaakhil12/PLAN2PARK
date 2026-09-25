import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';

export default function RoleSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>PlanToPark Owner</Text>
          <Text style={styles.tagline}>LIST PARKING & STORAGE LAND</Text>
        </View>

        <Text style={styles.title}>Owner Dashboard Portal</Text>
        <Text style={styles.subtitle}>Choose how you want to list your space or land</Text>

        {/* Option 1: Spot Owner */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.ownerAccent }]}
          onPress={() => navigation.navigate('Login', { role: 'owner', category: 'standard' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(124, 58, 237, 0.15)' }]}>
            <Text style={styles.cardEmoji}>🅿️</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.roleTitle}>Space Owner</Text>
            <Text style={styles.roleDesc}>List your vacant garage, driveways, or residential spots and turn empty space into income.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.ownerAccent }]}>→</Text>
        </TouchableOpacity>

        {/* Option 2: Vehicle Storage Landowner (Min 1 Acre) */}
        <TouchableOpacity
          style={[styles.roleCard, { borderColor: COLORS.storageAccent, backgroundColor: 'rgba(245, 158, 11, 0.06)' }]}
          onPress={() => navigation.navigate('Login', { role: 'owner', category: 'vehicle_storage_owner' })}
          activeOpacity={0.85}
        >
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Text style={styles.cardEmoji}>🏢</Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.roleTitle}>Vehicle Storage Land</Text>
              <View style={styles.miniBadgeAmber}><Text style={styles.miniBadgeAmberTxt}>1+ ACRE MIN</Text></View>
            </View>
            <Text style={styles.roleDesc}>List 1+ Acre secure land for Banks & Auto Finance companies to store seized & repossessed vehicles.</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.storageAccent }]}>→</Text>
        </TouchableOpacity>
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
    padding: 24,
    paddingTop: 10,
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  logoImg: {
    width: 90,
    height: 90,
    borderRadius: 18,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.ownerAccent,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#94a3b8',
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 8,
  },
  miniBadgeAmber: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniBadgeAmberTxt: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 9,
  },
});
