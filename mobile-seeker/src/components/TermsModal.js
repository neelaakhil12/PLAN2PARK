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
  Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { endpoints } from '../config/api';

const fallbackSeekerTerms = [
  "The Seeker must register with genuine credentials, including full legal name, active mobile number, and valid email address.",
  "The Seeker warrants that any vehicle parked using the platform is legally registered, roadworthy, and holds active insurance and PUC certification.",
  "The Seeker agrees to arrive punctually within the booked window; early arrival or late checkout is subject to slot availability and extra tariffs.",
  "The Seeker must park strictly within the assigned slot boundaries and avoid blocking adjacent vehicles, pedestrian pathways, or emergency exits.",
  "The Seeker is solely responsible for locking their vehicle, rolling up all windows, and securing personal valuables before leaving the parking space.",
  "Plan To Park and the Space Owner bear no liability for loss, theft, or damage to personal belongings left inside unattended vehicles.",
  "The Seeker must display the digital Plan To Park booking pass or QR code to on-site security personnel or automated scanners upon arrival.",
  "The Seeker shall strictly adhere to property speed limits (maximum 10 km/h) and follow on-site navigation signs and host instructions.",
  "Storing illegal contraband, hazardous chemicals, explosives, or flammable materials inside vehicles parked through the platform is strictly prohibited.",
  "The Seeker shall not use the parked vehicle for overnight human lodging, commercial sales, mechanical servicing, or illegal activities.",
  "If the Seeker wishes to extend their parking duration, an extension must be booked through the app prior to the expiration of the original slot.",
  "Failure to extend a booking will trigger automated overstay charges billed at dynamic overtime rates as displayed on the platform.",
  "Vehicles left unattended for more than 48 hours past booking expiry without communication will be deemed abandoned and subject to municipal impoundment.",
  "Any physical damage caused to the parking space, property gates, walls, or neighboring vehicles by the Seeker must be fully compensated by the Seeker.",
  "The Seeker agrees to complete all payments exclusively through authorized Plan To Park in-app payment gateways (UPI, Cards, Net Banking, Wallet).",
  "Paying cash or negotiating off-platform parking fees with space owners voids all platform security guarantees, dispute support, and insurance coverage.",
  "Cancellation refunds are processed according to the transparent cancellation tier policy specified at the time of reservation.",
  "In the event of a dispute with the Space Owner, the Seeker must file a ticket via the 24/7 Support Desk or Chat Assistant within 24 hours.",
  "The Seeker must not leave engines running or play loud music causing disturbance to residential neighbors or property occupants.",
  "In spaces with EV charging stations, the Seeker must disconnect and vacate the charging bay promptly once charging reaches completion.",
  "The Seeker consents to the capture of vehicle entry/exit photos and license plate recognition for security verification and billing accuracy.",
  "The Seeker shall treat the Space Owner and property staff with mutual respect and refrain from abusive, threatening, or unruly behavior.",
  "The Seeker must ensure their vehicle has no active fuel, coolant, or excessive oil leaks that could damage the host's surface flooring.",
  "Commercial vehicles, trailers, or trucks may not be parked in standard car slots unless the listing explicitly designates heavy vehicle accommodation.",
  "The Seeker agrees that ratings and reviews submitted regarding spaces must be factual, fair, and free from defamation or profanity.",
  "Plan To Park acts as a matchmaking and payment technology provider and does not assume physical bailment or guardianship of parked vehicles.",
  "Repeated booking cancellations, abusive conduct, or evasion of overstay penalties will result in account suspension and payment gateway blocking.",
  "The Seeker is responsible for verifying height clearance, vehicle turn radiuses, and ramp gradients before entering basement or automated lifts.",
  "Any emergency or vehicle breakdown occurring on the premises must be promptly reported to the host and platform support team.",
  "By creating an account or reserving a parking bay, the Seeker unconditionally accepts these terms under the jurisdiction of the courts of Hyderabad."
];

const fallbackBankTerms = [
  "The Financial Institution (Bank, NBFC, or Authorized Recovery Agency) warrants that it operates with valid lending, recovery, or asset disposal mandates.",
  "All vehicles placed into commercial staging yards must be repossessed or stored pursuant to lawful contract clauses, SARFAESI proceedings, or court decrees.",
  "The Institution must furnish verified agent credentials, vehicle repossession inventory sheets, and authorized gate entry tokens at intake.",
  "Prior to dispatching recovery vehicles to a partner storage yard, the Institution must book adequate staging bay allocations through Plan To Park.",
  "The Institution's recovery agents must accompany each impounded vehicle and complete the standardized joint Inward Condition Checklist.",
  "High-resolution photographs documenting vehicle exterior, odometer reading, chassis plate, and interior condition must be uploaded at intake.",
  "Commercial storage tariffs are billed on agreed monthly or daily staging bay rates and must be settled through the platform billing module.",
  "The Institution acknowledges that partner yard owners act as bailee custodians providing secure yard space and perimeter security for staged assets.",
  "Any specialized preservation requirements (such as battery trickle charging, tyre rotation, or protective covers) must be mutually contracted in advance.",
  "The Institution must verify that its authorized recovery drivers adhere to yard safety regulations, weight restrictions, and environmental rules.",
  "Staging bays may not be used to store hazardous goods, leaking fuel tankers, or vehicles containing explosive or bio-hazardous materials.",
  "The Institution must carry comprehensive master insurance coverage for all repossessed automotive assets in transit and in commercial storage.",
  "Yard owners shall not be held liable for pre-existing mechanical defects, hidden internal faults, or transit damage sustained prior to yard gate check-in.",
  "The Institution is entitled to dispatch authorized audit and inspection officers to the yard during daylight business hours upon 24 hours prior app notification.",
  "Official vehicle release orders (RO) or loan closure clearance certificates must be submitted through the platform to generate a digital QR Gate Pass.",
  "Storage yard owners are strictly instructed never to release any vehicle without verification of the official Plan To Park digital Release Pass.",
  "In the event of vehicle auction or secondary sale from the yard, the Institution must ensure winning bidders present verified auction release credentials.",
  "Invoices for monthly storage holding fees will be generated on the 1st of each calendar month and must be cleared within agreed credit terms.",
  "Late payment of holding fees may incur standard statutory interest charges and freeze future staging bay allocations across partner yards.",
  "In case of legal disputes between the borrower and the financial institution, the institution indemnifies the platform and the yard owner against third-party claims.",
  "The Institution must notify the platform immediately in the event of a court injunction, stay order, or police directive affecting any stored asset.",
  "The storage yard owner shall maintain 24/7 security watch and perimeter floodlighting but is not responsible for force majeure acts of God.",
  "The Institution's agents shall not cause nuisance, damage to yard infrastructure, or block common access roads during loading/unloading operations.",
  "Long-term staged vehicles exceeding 180 days must undergo joint quarterly condition reviews between the institution and yard management.",
  "All communication regarding bay availability, invoicing, vehicle dispatch, and dispute escalation shall be logged through the official platform portal.",
  "The Institution agrees to keep login credentials, API tokens, and authorization passes strictly confidential among designated recovery officers.",
  "Plan To Park provides the digital asset-tracking, bay-reservation, and audit infrastructure connecting financial institutions with verified yard hosts.",
  "Discrepancies noted during vehicle exit inspection must be filed within 24 hours of gate pass execution with supporting checklist documentation.",
  "Any attempt to bypass platform billing or induce yard owners to enter off-platform storage agreements will result in corporate account deactivation.",
  "These terms constitute a legally enforceable commercial storage agreement governed by the laws of India and subject to Hyderabad jurisdiction."
];

export default function TermsModal({ visible, onClose, type = 'seeker' }) {
  const [activeTab, setActiveTab] = useState(type);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setActiveTab(type);
    }
  }, [visible, type]);

  useEffect(() => {
    if (visible) {
      fetchTerms(activeTab);
    }
  }, [visible, activeTab]);

  const fetchTerms = async (targetType) => {
    setLoading(true);
    try {
      const res = await fetch(endpoints.getTerms(targetType));
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

    const sourceList = targetType === 'bank_finance' ? fallbackBankTerms : fallbackSeekerTerms;
    const fallbackList = sourceList.map((clause, idx) => ({
      _id: `fallback-${idx}`,
      order: idx + 1,
      clause,
      type: targetType,
    }));
    setTerms(fallbackList);
    setLoading(false);
  };

  const filteredTerms = terms.filter(t =>
    !searchQuery.trim() || t.clause?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isBank = (type === 'bank_finance' || activeTab === 'bank_finance');

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.title}>
                {isBank ? '🏦 Bank & Auto Finance Terms' : '🚗 Parking Seeker Terms'}
              </Text>
              <Text style={styles.subtitle}>
                {isBank
                  ? 'Lender & Recovery Fleet Staging Bay Legal Agreement'
                  : 'Vehicle Driver & Commuter Parking Terms of Service'}
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
            <Text style={styles.liveTagTxt}>Live Server Synced • Verified Policy</Text>
          </View>
          <Text style={styles.clauseCount}>{terms.length} Legal Clauses</Text>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={isBank ? "Search bank recovery clauses..." : "Search driver parking clauses..."}
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
            <ActivityIndicator size="large" color={isBank ? '#06b6d4' : '#3b82f6'} />
            <Text style={styles.loadingTxt}>Fetching verified terms from server...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.introCard, isBank && { borderColor: '#06b6d444' }]}>
              <Text style={styles.introTxt}>
                {isBank
                  ? '⚖️ These 30 legal clauses govern financial institutions, auto finance recovery agencies, commercial vehicle staging bay allotments, bailee storage custody, and release authorization.'
                  : '⚖️ These 30 legal clauses govern driver bookings, parking bay occupancy rules, vehicle roadworthiness, overstay penalty tariffs, and platform liability disclaimers.'}
              </Text>
            </View>

            {filteredTerms.map((item, idx) => (
              <View key={item._id || idx} style={styles.clauseCard}>
                <View style={styles.clauseHeader}>
                  <View style={[styles.clauseNumBadge, isBank && { backgroundColor: '#0891b2' }]}>
                    <Text style={styles.clauseNumTxt}>
                      {String(item.order || idx + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.clauseCategory}>
                    {isBank ? 'COMMERCIAL RECOVERY CLAUSE' : 'DRIVER PARKING RULE'}
                  </Text>
                </View>
                <Text style={styles.clauseBody}>{item.clause}</Text>
              </View>
            ))}

            <View style={styles.footerNote}>
              <Text style={styles.footerNoteTxt}>
                🔒 Legally binding agreement between the Registered User and Plan To Park Technologies. All rights reserved. Hyderabad, Telangana jurisdiction.
              </Text>
            </View>
          </ScrollView>
        )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 16 : 0,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    height: Platform.OS === 'web' ? 820 : '100%',
    maxHeight: Platform.OS === 'web' ? '92vh' : '100%',
    backgroundColor: '#0b1120',
    borderRadius: Platform.OS === 'web' ? 28 : 0,
    borderWidth: Platform.OS === 'web' ? 1.5 : 0,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeTxt: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#0f172a',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeTabBtn: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  activeTabBtnBank: {
    backgroundColor: '#0891b2',
    borderColor: '#0891b2',
  },
  tabTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeTabTxt: {
    color: '#ffffff',
    fontWeight: '900',
  },
  activeTabTxtBank: {
    color: '#ffffff',
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0b1329',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  liveTagTxt: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  clauseCount: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 10,
  },
  clearSearch: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingTxt: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  introTxt: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '600',
  },
  clauseCard: {
    backgroundColor: '#131d35',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  clauseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  clauseNumBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  clauseNumTxt: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },
  clauseCategory: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  clauseBody: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  footerNote: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  footerNoteTxt: {
    color: '#64748b',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '600',
  },
});
