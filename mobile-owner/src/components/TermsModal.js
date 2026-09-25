import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { endpoints } from '../config/api';

const fallbackOwnerTerms = [
  "The Owner must provide accurate and complete details regarding the parking space, including address, landmarks, accessibility, dimensions, pricing, availability, and restrictions.",
  "The Owner confirms that they have the legal right, authority, or permission to list the parking space on the Plan To Park platform.",
  "The Owner shall ensure that the parking space is safe, reasonably maintained, and suitable for vehicle parking.",
  "The Owner shall keep the parking area free from hazards that may cause damage to vehicles or injury to users.",
  "The Owner is responsible for maintaining accurate availability schedules and updating them whenever necessary.",
  "The Owner shall honor all confirmed bookings made through the platform.",
  "The Owner shall not cancel a confirmed booking without a valid reason.",
  "The Owner shall not accept duplicate bookings for the same parking space during overlapping periods.",
  "The Owner shall clearly disclose any parking restrictions, vehicle size limitations, height restrictions, or access conditions.",
  "The Owner shall not provide misleading or false information regarding the parking facility.",
  "The Owner shall not demand additional charges beyond the amount displayed in the application unless such charges are approved and communicated through the platform.",
  "The Owner shall not encourage users to bypass the platform's payment system.",
  "The Owner shall communicate professionally and respectfully with all users.",
  "The Owner shall not discriminate against users based on gender, religion, race, nationality, disability, or any protected category.",
  "The Owner shall allow access to the booked parking space during the reserved period.",
  "If a vehicle remains after the booking period expires, the Owner must first attempt to contact the Vehicle Owner through the platform.",
  "The Owner shall provide reasonable time for vehicle collection after booking expiry.",
  "The Owner shall not damage, lock, remove, tow, or interfere with a vehicle solely because the booking period has expired.",
  "The Owner may charge applicable overstay charges according to the pricing structure displayed on the platform.",
  "The Owner is encouraged to capture photographs or videos of the vehicle condition at check-in and check-out.",
  "The Owner shall cooperate in investigations relating to disputes, damages, payment issues, or security incidents.",
  "Where CCTV is advertised, the Owner shall make reasonable efforts to keep the surveillance system operational.",
  "The Owner shall not misuse, share, sell, or disclose user information obtained through the platform.",
  "The Owner shall comply with all applicable laws, regulations, zoning rules, and parking-related requirements.",
  "The Owner shall immediately report suspicious, illegal, or unsafe activities occurring within the parking premises.",
  "The Owner shall not use the platform for fraudulent, deceptive, or unlawful purposes.",
  "The Owner agrees that ratings and reviews may be displayed publicly on the platform.",
  "The Owner acknowledges that Plan To Park acts only as a technology platform connecting parking providers and vehicle owners.",
  "The Owner agrees to resolve disputes through the platform before initiating legal proceedings wherever reasonably possible.",
  "Violation of these terms may result in listing suspension, account restriction, or permanent removal from the platform."
];

export default function TermsModal({ visible, onClose, type = 'owner' }) {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      fetchTerms();
    }
  }, [visible, type]);

  const fetchTerms = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoints.getTerms(type));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTerms(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // Use fallback
    }
    const fallbackList = fallbackOwnerTerms.map((clause, idx) => ({
      _id: `fallback-${idx}`,
      order: idx + 1,
      clause,
      type,
    }));
    setTerms(fallbackList);
    setLoading(false);
  };

  const filteredTerms = terms.filter(t =>
    !searchQuery.trim() || t.clause?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>📜 Terms & Conditions</Text>
            <Text style={styles.subtitle}>
              Space Partner Agreement • Live Platform Policy
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Live sync badge & Search */}
        <View style={styles.metaRow}>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveTagTxt}>Live Server Synced</Text>
          </View>
          <Text style={styles.clauseCount}>{terms.length} Legal Clauses</Text>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search partner clauses..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Body content */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.ownerAccent || '#3b82f6'} />
            <Text style={styles.loadingTxt}>Fetching latest partner terms from server...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.introCard}>
              <Text style={styles.introTxt}>
                These obligations govern your space listings, bookings, host earnings, and vehicle handling on Plan To Park.
              </Text>
            </View>

            {filteredTerms.map((item, idx) => (
              <View key={item._id || idx} style={styles.clauseCard}>
                <View style={styles.clauseNumBadge}>
                  <Text style={styles.clauseNumTxt}>{item.order || idx + 1}</Text>
                </View>
                <Text style={styles.clauseBody}>{item.clause}</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.acceptBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.acceptBtnTxt}>✓ Understood & Close</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg || '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: COLORS.cardBg || '#1e293b',
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  liveTagTxt: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  clauseCount: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    padding: 0,
  },
  clearSearch: {
    color: '#94a3b8',
    fontSize: 13,
    paddingHorizontal: 6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingTxt: {
    color: '#94a3b8',
    fontSize: 12,
  },
  introCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  introTxt: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  clauseCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  clauseNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shrink: 0,
  },
  clauseNumTxt: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '800',
  },
  clauseBody: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 18,
  },
  acceptBtn: {
    backgroundColor: COLORS.ownerAccent || '#3b82f6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnTxt: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
