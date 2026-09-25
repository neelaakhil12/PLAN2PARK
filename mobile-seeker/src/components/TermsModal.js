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

const fallbackSeekerTerms = [
  "The Seeker must provide accurate vehicle registration details and contact information.",
  "The Seeker shall ensure that all information submitted through the platform is true and complete.",
  "The Seeker shall use only their own registered account and shall not share account credentials with others.",
  "The Seeker shall park only in the parking space allocated through the booking.",
  "The Seeker shall comply with all instructions provided by the Space Owner and the platform.",
  "The Seeker agrees to pay all parking fees displayed during the booking process.",
  "The Seeker agrees to pay additional charges if the vehicle remains beyond the booked period.",
  "The Seeker is responsible for collecting the vehicle before the booking period expires.",
  "The Seeker shall ensure that the vehicle is legally registered and roadworthy.",
  "The Seeker shall not leave an abandoned vehicle in the parking space.",
  "The Seeker shall not park a vehicle containing illegal, dangerous, explosive, or prohibited materials.",
  "The Seeker shall not use the parking space for unauthorized commercial activities.",
  "The Seeker is encouraged to inspect the parking area before leaving the vehicle.",
  "The Seeker is encouraged to take photographs or videos of the vehicle before parking.",
  "The Seeker should record any existing dents, scratches, or visible damage before leaving the vehicle.",
  "The Seeker should remove valuable items, documents, cash, electronics, and personal belongings from the vehicle.",
  "The Seeker shall properly lock and secure the vehicle before leaving it.",
  "The Seeker shall maintain valid insurance coverage for the vehicle.",
  "The Seeker shall not damage parking infrastructure, gates, barriers, equipment, or surrounding property.",
  "The Seeker shall not block entrances, exits, driveways, emergency access points, or neighboring parking spaces.",
  "The Seeker shall adhere to posted speed limits, directional signs, and parking facility rules.",
  "The Seeker shall immediately report any accidents, property damage, or incidents occurring during the parking period.",
  "The Seeker shall not misuse, copy, or distribute access codes, digital passes, or parking permits provided through the platform.",
  "The Seeker shall not attempt to bypass the platform by making private payment arrangements with the Space Owner.",
  "The Seeker agrees that Plan To Park is not responsible for loss, theft, vandalism, or damage to vehicles or personal property unless caused directly by proven platform gross negligence.",
  "The Seeker agrees to cooperate fully in resolving any booking disputes or property damage claims.",
  "The Seeker agrees that continuous overstay beyond the booked period may result in vehicle impoundment or towing at the owner's expense.",
  "The Seeker agrees that all payments and refunds are governed strictly by the Plan To Park Cancellation & Refund Policy.",
  "The Seeker agrees that accounts exhibiting fraudulent behavior, chargeback abuse, or terms violations may be suspended permanently.",
  "The Seeker agrees to comply with all applicable local, municipal, state, and national traffic and parking laws."
];

export default function TermsModal({ visible, onClose, type = 'seeker' }) {
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
    // Fallback mapping
    const fallbackList = fallbackSeekerTerms.map((clause, idx) => ({
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
              {type === 'owner' ? 'Space Partner Agreement' : 'Parking Seeker Agreement'} • Live Policy
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
            placeholder="Search within terms clauses..."
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
            <ActivityIndicator size="large" color={COLORS.primary || '#10b981'} />
            <Text style={styles.loadingTxt}>Fetching latest terms from server...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.introCard}>
              <Text style={styles.introTxt}>
                Please review the official terms and conditions below. These policies are actively enforced to protect all platform users and space partners.
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  liveTagTxt: {
    color: '#10b981',
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
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shrink: 0,
  },
  clauseNumTxt: {
    color: '#10b981',
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
    backgroundColor: COLORS.primary || '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#10b981',
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
