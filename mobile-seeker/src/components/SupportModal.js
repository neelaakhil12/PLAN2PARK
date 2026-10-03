import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import { API_URL } from '../config/api';

const DEFAULT_SUPPORT = {
  supportPhone: '+91 8919360467',
  supportEmail: 'plantopark@gmail.com',
  supportWhatsapp: '+91 8919360467',
  supportHours: '24/7 Dedicated Support Desk',
  seekerSupportPhone: '+91 8919360467',
  seekerSupportEmail: 'plantopark@gmail.com',
  bankFinanceSupportPhone: '+91 8919360467',
  bankFinanceSupportEmail: 'plantopark@gmail.com',
};

export default function SupportModal({ visible, onClose, isBankFinance = false }) {
  const [supportData, setSupportData] = useState(DEFAULT_SUPPORT);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchSupportData();
    }
  }, [visible]);

  const fetchSupportData = async () => {
    try {
      const res = await fetch(`${API_URL}/settings/support`);
      if (res.ok) {
        const data = await res.json();
        setSupportData(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      // Use defaults
    }
  };

  const activePhone = isBankFinance
    ? (supportData.bankFinanceSupportPhone || supportData.supportPhone)
    : (supportData.seekerSupportPhone || supportData.supportPhone);

  const activeEmail = isBankFinance
    ? (supportData.bankFinanceSupportEmail || supportData.supportEmail)
    : (supportData.seekerSupportEmail || supportData.supportEmail);

  const activeWhatsapp = supportData.supportWhatsapp || activePhone;

  const handleCall = () => {
    const cleanNumber = activePhone.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`).catch(() => {
      alert(`Plan2Park Support Phone: ${activePhone}`);
    });
  };

  const handleEmail = () => {
    const subject = isBankFinance
      ? 'Bank Recovery Fleet Support - Plan2Park Help Desk'
      : 'Parking Support Inquiry - Plan2Park Help Desk';
    Linking.openURL(`mailto:${activeEmail}?subject=${encodeURIComponent(subject)}`).catch(() => {
      alert(`Plan2Park Support Email: ${activeEmail}`);
    });
  };

  const handleWhatsapp = () => {
    const cleanNumber = activeWhatsapp.replace(/[^\d]/g, '');
    const msg = isBankFinance
      ? 'Hello Plan2Park Support, I am an authorized Bank Recovery / Fleet representative requesting support.'
      : 'Hello Plan2Park Support, I am a parking seeker requesting assistance with my booking.';
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      alert(`WhatsApp Number: ${activeWhatsapp}`);
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View style={styles.liveDot} />
                <Text style={styles.badgeTxt}>LIVE 24/7 HELPDESK</Text>
              </View>
              <Text style={styles.title}>
                {isBankFinance ? '🏦 Bank & Fleet Support Desk' : '📞 24/7 Customer Support Desk'}
              </Text>
              <Text style={styles.subtitle}>
                Official Plan2Park Support • Immediate Concierge & Emergency Assistance
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Main Action Card */}
            <View style={styles.priorityCard}>
              <Text style={styles.priorityTitle}>We're Available Around the Clock</Text>
              <Text style={styles.priorityDesc}>
                {isBankFinance
                  ? 'Connect with dedicated bank liaison officers for staging yard inquiries, impounded vehicle release passes, and corporate billing.'
                  : 'Get rapid assistance for parking spot directions, gate access issues, booking extensions, or refund requests.'}
              </Text>

              {/* Direct Call Button */}
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={handleCall}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnIcon}>📞</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionBtnLabel}>Call Support Hotline</Text>
                  <Text style={styles.actionBtnVal}>{activePhone}</Text>
                </View>
                <Text style={styles.actionBtnArrow}>→</Text>
              </TouchableOpacity>

              {/* WhatsApp Button */}
              <TouchableOpacity
                style={styles.actionBtnWhatsapp}
                onPress={handleWhatsapp}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnIcon}>💬</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionBtnLabel}>Chat on WhatsApp</Text>
                  <Text style={styles.actionBtnVal}>{activeWhatsapp}</Text>
                </View>
                <Text style={styles.actionBtnArrow}>→</Text>
              </TouchableOpacity>

              {/* Email Button */}
              <TouchableOpacity
                style={styles.actionBtnEmail}
                onPress={handleEmail}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnIcon}>✉️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionBtnLabel}>Official Support Email</Text>
                  <Text style={styles.actionBtnVal}>{activeEmail}</Text>
                </View>
                <Text style={styles.actionBtnArrow}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Operating Hours & Guarantee */}
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>⏱️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Helpdesk Availability</Text>
                  <Text style={styles.infoVal}>{supportData.supportHours}</Text>
                </View>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Direct Resolution SLA</Text>
                  <Text style={styles.infoVal}>Immediate phone response • Instant WhatsApp concierge</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 16 : 0,
  },
  sheetContainer: {
    backgroundColor: '#0f172a',
    borderRadius: Platform.OS === 'web' ? 32 : 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    maxWidth: 420,
    maxHeight: Platform.OS === 'web' ? 780 : '88%',
    paddingBottom: 24,
    borderWidth: 1.5,
    borderColor: '#334155',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  badgeTxt: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  closeTxt: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  priorityCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priorityTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },
  priorityDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 14,
    fontWeight: '500',
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionBtnWhatsapp: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  actionBtnEmail: {
    backgroundColor: '#475569',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  actionBtnIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionBtnLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  actionBtnVal: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  actionBtnArrow: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#131d35',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoVal: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 8,
  },
  sectionHeader: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  topicCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topicIcon: {
    fontSize: 16,
    marginBottom: 6,
  },
  topicTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  topicDesc: {
    color: '#94a3b8',
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },
});
