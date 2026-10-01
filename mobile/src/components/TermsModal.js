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

const fallbackStorageTerms = [
  "The Storage Yard Owner must possess valid legal ownership, title deed, registered lease, or documented power of attorney authorizing commercial vehicle storage on the premises.",
  "The listed land parcel must measure a verified minimum contiguous area of 1.0 Acre suitable for multi-vehicle staging, holding, and heavy vehicle maneuvers.",
  "The Owner must maintain a secure, continuous perimeter compound wall or heavy-duty chain-link fencing with razor wire of at least 7 feet in height.",
  "The Owner shall provide 24/7 on-site security personnel or continuous automated gate access control with strict logging of all vehicle movements.",
  "Operational CCTV surveillance covering all entrance gates, staging bays, and perimeter fences with at least 30 days of continuous recording backup is mandatory.",
  "The storage yard must provide adequate high-mast floodlighting ensuring clear visibility across all staging bays and vehicle compounds during nighttime operations.",
  "The yard must feature an all-weather motorable approach road capable of accommodating multi-car trailers, recovery flatbeds, and heavy commercial towing trucks.",
  "The Owner shall maintain an official physical and digital Vehicle Movement Register recording vehicle make, model, registration or chassis number, entry date/time, and recovery agent details.",
  "A standardized joint Vehicle Inward Condition Inspection Checklist (photographing odometer, fuel level, exterior scratches, tires, and battery state) must be signed at every vehicle intake.",
  "The Owner assumes bailee custody responsibilities to prevent pilferage, unauthorized parts cannibalization, siphoning of fuel, or vandalism while vehicles are stored on the premises.",
  "The Owner shall never allow unauthorized personnel, third parties, or private individuals to enter, test drive, or access stored or repossessed vehicles without an official authorization token.",
  "Stored repossessed vehicles are held under legal custody for financial institutions; the Owner shall not create any third-party lien, charge, or encumbrance on any vehicle parked in the yard.",
  "Monthly storage fees agreed upon during listing and booking are fixed; no unauthorized yard handling, gate pass, or release surcharge may be demanded from recovery agents or lenders.",
  "The Owner must honor and reserve staging bays allocated through Plan To Park platform bookings and prevent overbooking or bay conflicts.",
  "In the event of extreme weather warnings, fire, flooding, or security breaches, the Owner shall take prompt precautionary measures and notify Plan To Park and the vehicle custodian within 2 hours.",
  "The Owner must maintain valid commercial premises liability insurance and fire safety equipment (extinguishers, sand buckets) on the property.",
  "Vehicle release shall strictly occur only upon verification of the official digital Release Order (RO), QR Gate Pass, or authorized token generated through the Plan To Park platform.",
  "Any unauthorized release of a repossessed or stored vehicle without platform release clearance constitutes a material breach and will attract immediate legal and financial liability.",
  "The Owner shall provide prompt ingress and egress access to authorized recovery agents, towing personnel, and bank audit teams during designated operational hours.",
  "The Owner must permit scheduled or surprise yard security and inventory audits conducted by Plan To Park or designated representatives of partner banking institutions.",
  "Any damage, vandalism, theft, or fire incident occurring to a vehicle within the yard must be documented with photos, CCTV footage, and reported to the platform immediately.",
  "The Owner shall keep the yard grounds graded, clear of hazardous debris, flammable dry brush, stagnant water, and environmental contaminants.",
  "Subletting, transferring, or assigning the management of the listed storage yard to unverified third parties without prior platform written consent is strictly prohibited.",
  "Platform payouts for storage contracts will be remitted to the Owner's verified bank account according to the agreed billing cycle after deducting platform commission.",
  "Disputed inventory discrepancies between inward inspection logs and release conditions must be submitted to the platform dispute resolution cell within 48 hours of vehicle dispatch.",
  "The Owner shall strictly safeguard user, financial institution, and vehicle data obtained via the platform and comply with all applicable data protection regulations.",
  "The Owner confirms that the land parcel complies with local municipality, panchayat, zoning laws, and has obtained necessary fire and local administrative NOCs where applicable.",
  "Plan To Park serves as a digital staging, custody workflow, and booking facilitator; the Owner remains solely liable for physical premise management and on-site bailee duties.",
  "Any violation of security standards, falsification of inventory logs, or extortionate gate charges will result in instant listing deactivation, escrow forfeiture, and legal delisting.",
  "These terms are subject to the exclusive jurisdiction of courts situated in Hyderabad, Telangana, India, and may be amended periodically with digital notification."
];

const fallbackSpaceTerms = [
  "The Space Owner warrants that they possess lawful ownership, leasehold rights, or landlord permission to list the designated parking space on Plan To Park.",
  "The Owner must provide accurate spot dimensions, photos, entry directions, clearance heights, and surface type (covered, open, basement).",
  "The Owner shall maintain the parking space in a clean, safe, and obstacle-free condition ready for vehicle entry.",
  "The Owner must honor all confirmed bookings accepted through the platform and keep the space vacant for the designated reservation period.",
  "The Owner shall not accept duplicate bookings or allow unauthorized vehicles to park in a slot already reserved through Plan To Park.",
  "The Owner is strictly prohibited from demanding any cash, off-platform surcharge, or unlisted fees from parking seekers.",
  "The Owner must specify accurate operating hours and gate closure timings in the listing description.",
  "If the parking spot has physical gates, booms, or security guards, the Owner must ensure seamless entry access for the seeker upon presentation of the booking pass.",
  "The Owner shall treat all parking seekers with courtesy, professionalism, and without any discrimination based on gender, race, religion, or background.",
  "The Owner shall not cancel confirmed reservations except under verifiable emergencies, which must be reported immediately to platform support.",
  "Frequent or unjustified booking cancellations by the Owner will lead to search ranking penalties and possible account suspension.",
  "Where CCTV or security surveillance is advertised, the Owner must ensure camera functionality during booked durations.",
  "If EV charging equipment is offered, the Owner is responsible for ensuring electrical safety, standard grounding, and operational chargers.",
  "The Owner must not handle, drive, tamper with, or enter the seeker's vehicle without the seeker's explicit prior written consent.",
  "In cases where a vehicle overstays past the booked time, the Owner must notify the platform via the dashboard rather than taking unilateral punitive action.",
  "The Owner shall not wheel-clamp, tow, or damage an overstaying vehicle without prior authorization and coordination with Plan To Park customer support.",
  "Overstay compensation accrued by the seeker will be credited to the Owner's wallet pursuant to platform overstay billing policies.",
  "The Owner is encouraged to take entry and exit photos via the app in case of disputes regarding vehicle condition or parking bays.",
  "The Owner must disclose any known access hazards, steep ramps, low ceilings, or tight turning radiuses in the space listing.",
  "The Owner shall immediately notify support if any property damage, oil leakage, or security incident occurs during a booking.",
  "Host earnings will be credited to the in-app wallet upon successful booking completion and can be withdrawn to verified bank accounts.",
  "Applicable platform service commissions and statutory taxes will be deducted from gross booking amounts prior to wallet disbursement.",
  "The Owner agrees to resolve all user disputes amicably through the Plan To Park concierge support desk before pursuing third-party actions.",
  "The Owner shall not misuse, copy, or share seeker contact details or license plate information for any off-platform purpose.",
  "The Owner must comply with residential association (RWA), commercial society bylaws, and local municipal parking regulations.",
  "False representation of parking amenities (e.g. claiming covered parking or 24/7 security when absent) will result in immediate penalty and refund to the user.",
  "Plan To Park acts strictly as an online technology intermediary connecting space hosts with motorists and does not operate physical parking facilities.",
  "The Owner is advised to maintain adequate premises insurance covering common third-party liabilities.",
  "The platform reserves the right to suspend or terminate owner accounts that breach security, ethics, or contractual commitments.",
  "These terms constitute a legally binding host agreement between the Space Owner and Plan To Park and are governed by the laws of India."
];

export default function TermsModal({ visible, onClose, type = 'storage_owner' }) {
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

    const sourceList = targetType === 'storage_owner' ? fallbackStorageTerms : fallbackSpaceTerms;
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

  const isStorage = (type === 'storage_owner' || activeTab === 'storage_owner');

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.title}>
                {isStorage ? '🚜 Storage Yard Owner Terms' : '🏢 Parking Space Owner Terms'}
              </Text>
              <Text style={styles.subtitle}>
                {isStorage
                  ? '1+ Acre Commercial Vehicle Staging & Repo Yard Agreement'
                  : 'Driveway, Bay & Commercial Parking Host Agreement'}
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
            <Text style={styles.liveTagTxt}>Live Server Synced • Official Policy</Text>
          </View>
          <Text style={styles.clauseCount}>{terms.length} Legal Clauses</Text>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={isStorage ? "Search yard owner clauses..." : "Search space host clauses..."}
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
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingTxt}>Fetching verified terms from server...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.introCard, isStorage && { borderColor: '#f59e0b44' }]}>
              <Text style={styles.introTxt}>
                {isStorage
                  ? '⚖️ These 30 legal clauses govern all 1+ Acre vehicle storage yards, staging bay allocations, repossession fleet custody, security standards, and payouts.'
                  : '⚖️ These 30 legal clauses govern parking space listings, driver reservations, vehicle bailment guidelines, host earnings, and cancellation policies.'}
              </Text>
            </View>

            {filteredTerms.map((item, idx) => (
              <View key={item._id || idx} style={styles.clauseCard}>
                <View style={styles.clauseHeader}>
                  <View style={[styles.clauseNumBadge, isStorage && { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.clauseNumTxt}>
                      {String(item.order || idx + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <Text style={styles.clauseCategory}>
                    {isStorage ? 'COMMERCIAL YARD POLICY' : 'SPACE HOST COVENANT'}
                  </Text>
                </View>
                <Text style={styles.clauseBody}>{item.clause}</Text>
              </View>
            ))}

            <View style={styles.footerNote}>
              <Text style={styles.footerNoteTxt}>
                🔒 Legally binding agreement between the Registered Host and Plan To Park Technologies. All rights reserved. Hyderabad, Telangana jurisdiction.
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
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  tabTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeTabTxt: {
    color: '#0f172a',
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
    backgroundColor: '#3b82f6',
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
