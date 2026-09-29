import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { getBaseApiUrl } from '../../config/api';
import { COLORS } from '../../theme/colors';
import { useIsFocused } from '@react-navigation/native';

export default function WalletScreen({ navigation }) {
  const { user, token } = useContext(AuthContext);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState({
    walletBalance: 0,
    pendingWithdrawal: 0,
    totalWithdrawn: 0,
    totalGrossEarned: 0,
    platformCommissionRate: 10,
    bankAccountDetails: {},
    transactions: [],
    payoutRequests: [],
  });

  const [activeTab, setActiveTab] = useState('payouts'); // 'payouts' | 'ledger'
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Withdrawal form fields
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('upi'); // 'upi' | 'bank_transfer'
  const [upiId, setUpiId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');

  // Receipt Preview Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    if (isFocused && token) {
      fetchWalletData();
    }
  }, [isFocused, token]);

  const fetchWalletData = async () => {
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/wallet/owner`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletData(data);

        // Pre-fill saved bank/UPI details if available
        if (data.bankAccountDetails) {
          if (data.bankAccountDetails.upiId) setUpiId(data.bankAccountDetails.upiId);
          if (data.bankAccountDetails.accountName) setAccountName(data.bankAccountDetails.accountName);
          if (data.bankAccountDetails.accountNumber) setAccountNumber(data.bankAccountDetails.accountNumber);
          if (data.bankAccountDetails.ifscCode) setIfscCode(data.bankAccountDetails.ifscCode);
          if (data.bankAccountDetails.bankName) setBankName(data.bankAccountDetails.bankName);
        }
      }
    } catch (err) {
      console.warn('Error fetching wallet data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleOpenWithdraw = () => {
    if ((walletData.walletBalance || 0) <= 0) {
      Alert.alert('Zero Balance', 'You currently do not have any available balance to withdraw.');
      return;
    }
    setWithdrawAmount('');
    setWithdrawModalVisible(true);
  };

  const handleWithdrawSubmit = async () => {
    const amountVal = parseFloat(withdrawAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (amountVal > walletData.walletBalance) {
      Alert.alert('Insufficient Balance', `Maximum available to withdraw is ₹${walletData.walletBalance.toFixed(2)}`);
      return;
    }

    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., yourname@okhdfcbank).');
        return;
      }
    } else {
      if (!accountNumber.trim() || !ifscCode.trim() || !accountName.trim()) {
        Alert.alert('Incomplete Bank Details', 'Please enter Account Name, Account Number, and IFSC code.');
        return;
      }
    }

    setSubmittingWithdraw(true);
    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amountVal,
          payoutMethod,
          upiId: upiId.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          bankName: bankName.trim(),
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setWithdrawModalVisible(false);
        Alert.alert('Request Sent!', resData.message || 'Withdrawal request submitted successfully.');
        fetchWalletData();
      } else {
        Alert.alert('Request Failed', resData.message || 'Unable to submit withdrawal request.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit withdrawal request.');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#090d16" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Earnings & Wallet</Text>
          <Text style={styles.headerSubtitle}>
            {user?.role === 'owner' && user?.accountCategory === 'vehicle_storage_owner'
              ? 'Vehicle Storage Land Facility'
              : 'Host Parking Space Partner'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchWalletData}>
          <Text style={styles.refreshText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.ownerAccent} />}
      >
        {/* Main Hero Card: Available Balance */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.heroBalance}>₹{Number(walletData.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.rateBadge}>
              <Text style={styles.rateBadgeText}>{walletData.platformCommissionRate || 10}% Admin Fee</Text>
            </View>
          </View>

          <Text style={styles.heroExplainer}>
            Net earnings automatically credited after platform commission deduction.
          </Text>

          <View style={styles.heroActionRow}>
            <TouchableOpacity style={styles.withdrawBtn} onPress={handleOpenWithdraw} activeOpacity={0.85}>
              <Text style={styles.withdrawBtnText}>💸 Withdraw Funds</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Gross Bookings</Text>
            <Text style={styles.statValue}>₹{Number(walletData.totalGrossEarned || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Withdrawn</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>₹{Number(walletData.totalWithdrawn || 0).toFixed(0)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Pending Payout</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>₹{Number(walletData.pendingWithdrawal || 0).toFixed(0)}</Text>
          </View>
        </View>

        {/* Section Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'payouts' && styles.navTabActive]}
            onPress={() => setActiveTab('payouts')}
          >
            <Text style={[styles.navTabText, activeTab === 'payouts' && styles.navTabTextActive]}>
              Withdrawal Requests ({walletData.payoutRequests?.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'ledger' && styles.navTabActive]}
            onPress={() => setActiveTab('ledger')}
          >
            <Text style={[styles.navTabText, activeTab === 'ledger' && styles.navTabTextActive]}>
              Wallet History ({walletData.transactions?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.ownerAccent} style={{ marginTop: 40 }} />
        ) : activeTab === 'payouts' ? (
          /* TAB 1: Payout Requests */
          <View style={styles.tabContent}>
            {(!walletData.payoutRequests || walletData.payoutRequests.length === 0) ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={styles.emptyTitle}>No Withdrawal Requests Yet</Text>
                <Text style={styles.emptySubtitle}>
                  When you have available earnings, click "Withdraw Funds" to request a transfer to your UPI or Bank.
                </Text>
              </View>
            ) : (
              walletData.payoutRequests.map((req) => {
                const isApproved = req.status === 'approved';
                const isPending = req.status === 'pending';
                const isRejected = req.status === 'rejected';

                return (
                  <View key={req._id} style={styles.requestCard}>
                    <View style={styles.requestHeader}>
                      <View>
                        <Text style={styles.requestAmount}>₹{req.amount.toLocaleString('en-IN')}</Text>
                        <Text style={styles.requestMethod}>
                          via {req.payoutMethod === 'upi' ? `UPI (${req.payoutDetails?.upiId})` : `Bank A/C (${req.payoutDetails?.accountNumber?.slice(-4) || '••••'})`}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isApproved && styles.statusBadgeApproved,
                          isPending && styles.statusBadgePending,
                          isRejected && styles.statusBadgeRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isApproved && styles.statusTextApproved,
                            isPending && styles.statusTextPending,
                            isRejected && styles.statusTextRejected,
                          ]}
                        >
                          {isApproved ? '✅ Paid & Verified' : isPending ? '⏳ Awaiting Admin' : '❌ Declined'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.requestDate}>
                      Requested: {new Date(req.requestedAt || req.createdAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>

                    {req.transactionReference ? (
                      <View style={styles.utrBox}>
                        <Text style={styles.utrLabel}>Bank/UPI Reference (UTR):</Text>
                        <Text style={styles.utrValue}>{req.transactionReference}</Text>
                      </View>
                    ) : null}

                    {req.adminNotes ? (
                      <Text style={styles.adminNoteText}>Note: {req.adminNotes}</Text>
                    ) : null}

                    {/* Button to view receipt screenshot if uploaded by admin */}
                    {req.adminReceiptImage ? (
                      <TouchableOpacity
                        style={styles.viewProofBtn}
                        onPress={() => setSelectedReceipt(req.adminReceiptImage)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.viewProofBtnText}>📸 View Admin Payment Receipt</Text>
                      </TouchableOpacity>
                    ) : isApproved ? (
                      <Text style={styles.proofPendingText}>Receipt proof marked verified by admin</Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : (
          /* TAB 2: Wallet Transaction Ledger */
          <View style={styles.tabContent}>
            {(!walletData.transactions || walletData.transactions.length === 0) ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>📜</Text>
                <Text style={styles.emptyTitle}>No Transaction History</Text>
                <Text style={styles.emptySubtitle}>
                  Credits from bookings and withdrawals will appear here in chronological order.
                </Text>
              </View>
            ) : (
              walletData.transactions.map((tx, idx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <View key={idx} style={styles.txCard}>
                    <View style={styles.txIconBox}>
                      <Text style={styles.txIcon}>{isCredit ? '⬇️' : '⬆️'}</Text>
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={styles.txDescription}>{tx.description || (isCredit ? 'Booking Credit' : 'Withdrawal')}</Text>
                      <Text style={styles.txDate}>
                        {new Date(tx.date || Date.now()).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, isCredit ? styles.txAmountCredit : styles.txAmountDebit]}>
                      {isCredit ? '+' : '-'}₹{Number(tx.amount || 0).toFixed(2)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* WITHDRAWAL REQUEST MODAL */}
      <Modal visible={withdrawModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw to Bank / UPI</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalBalanceBox}>
                <Text style={styles.modalBalanceLabel}>Available Balance</Text>
                <Text style={styles.modalBalanceValue}>₹{Number(walletData.walletBalance || 0).toFixed(2)}</Text>
              </View>

              {/* Amount Input */}
              <Text style={styles.inputLabel}>Withdrawal Amount (₹)</Text>
              <View style={styles.amountInputRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="e.g. 500"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
                <TouchableOpacity
                  style={styles.maxBtn}
                  onPress={() => setWithdrawAmount(String(walletData.walletBalance || 0))}
                >
                  <Text style={styles.maxBtnText}>MAX</Text>
                </TouchableOpacity>
              </View>

              {/* Payout Method Toggle */}
              <Text style={styles.inputLabel}>Payout Method</Text>
              <View style={styles.methodToggleRow}>
                <TouchableOpacity
                  style={[styles.methodBtn, payoutMethod === 'upi' && styles.methodBtnActive]}
                  onPress={() => setPayoutMethod('upi')}
                >
                  <Text style={[styles.methodBtnText, payoutMethod === 'upi' && styles.methodBtnTextActive]}>
                    ⚡ UPI ID (Fastest)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodBtn, payoutMethod === 'bank_transfer' && styles.methodBtnActive]}
                  onPress={() => setPayoutMethod('bank_transfer')}
                >
                  <Text style={[styles.methodBtnText, payoutMethod === 'bank_transfer' && styles.methodBtnTextActive]}>
                    🏦 Bank Transfer
                  </Text>
                </TouchableOpacity>
              </View>

              {payoutMethod === 'upi' ? (
                <View>
                  <Text style={styles.inputLabel}>UPI ID (GPay / PhonePe / Paytm)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. username@okhdfcbank"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    value={upiId}
                    onChangeText={setUpiId}
                  />
                </View>
              ) : (
                <View>
                  <Text style={styles.inputLabel}>Account Holder Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Full name as per bank passbook"
                    placeholderTextColor="#64748b"
                    value={accountName}
                    onChangeText={setAccountName}
                  />

                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Bank Account Number"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                  />

                  <Text style={styles.inputLabel}>IFSC Code</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. HDFC0001234"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    value={ifscCode}
                    onChangeText={setIfscCode}
                  />

                  <Text style={styles.inputLabel}>Bank Name (Optional)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. HDFC Bank"
                    placeholderTextColor="#64748b"
                    value={bankName}
                    onChangeText={setBankName}
                  />
                </View>
              )}

              <Text style={styles.modalNotice}>
                • Admin will verify and transfer funds directly to your UPI/Bank.
                {'\n'}• Transfer receipt screenshot will be attached to your request upon approval.
              </Text>

              <TouchableOpacity
                style={[styles.submitWithdrawBtn, submittingWithdraw && { opacity: 0.6 }]}
                onPress={handleWithdrawSubmit}
                disabled={submittingWithdraw}
              >
                {submittingWithdraw ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitWithdrawBtnText}>Confirm Withdrawal</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* RECEIPT PROOF PREVIEW MODAL */}
      <Modal visible={!!selectedReceipt} animationType="fade" transparent>
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptContainer}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>Payment Receipt Proof</Text>
              <TouchableOpacity onPress={() => setSelectedReceipt(null)}>
                <Text style={styles.receiptClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedReceipt && (
              <Image
                source={{
                  uri: selectedReceipt.startsWith('http')
                    ? selectedReceipt
                    : `https://api.plantopark.com${selectedReceipt}`,
                }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}

            <Text style={styles.receiptFootnote}>
              Official transfer proof uploaded by PlanToPark Platform Administrator.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#131b2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  refreshText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#7c3aed40',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#7c3aed20',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  heroBalance: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
  },
  rateBadge: {
    backgroundColor: '#7c3aed25',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7c3aed50',
  },
  rateBadgeText: {
    color: '#c4b5fd',
    fontSize: 11,
    fontWeight: '700',
  },
  heroExplainer: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 10,
    lineHeight: 18,
  },
  heroActionRow: {
    marginTop: 18,
  },
  withdrawBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  withdrawBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  navTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  navTabActive: {
    backgroundColor: '#7c3aed',
  },
  navTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  navTabTextActive: {
    color: '#ffffff',
  },
  tabContent: {
    gap: 12,
  },
  emptyBox: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  requestCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  requestMethod: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgePending: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b50',
  },
  statusBadgeApproved: {
    backgroundColor: '#10b98120',
    borderColor: '#10b98150',
  },
  statusBadgeRejected: {
    backgroundColor: '#ef444420',
    borderColor: '#ef444450',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextPending: { color: '#f59e0b' },
  statusTextApproved: { color: '#10b981' },
  statusTextRejected: { color: '#ef4444' },
  requestDate: {
    fontSize: 11,
    color: '#64748b',
  },
  utrBox: {
    backgroundColor: '#090d16',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  utrLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  utrValue: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  adminNoteText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  viewProofBtn: {
    marginTop: 6,
    backgroundColor: '#0ea5e920',
    borderColor: '#0ea5e960',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewProofBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
  proofPendingText: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 4,
    fontWeight: '600',
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#090d16',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIcon: {
    fontSize: 14,
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f8fafc',
  },
  txDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  txAmountCredit: {
    color: '#10b981',
  },
  txAmountDebit: {
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#7c3aed40',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#94a3b8',
    padding: 4,
  },
  modalBalanceBox: {
    backgroundColor: '#090d16',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalBalanceLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  modalBalanceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 10,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090d16',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  maxBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  maxBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  methodToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#090d16',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  methodBtnActive: {
    backgroundColor: '#7c3aed20',
    borderColor: '#7c3aed',
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  methodBtnTextActive: {
    color: '#c4b5fd',
  },
  textInput: {
    backgroundColor: '#090d16',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
  },
  modalNotice: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 14,
    lineHeight: 16,
  },
  submitWithdrawBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitWithdrawBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  receiptContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#131b2e',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#38bdf840',
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  receiptClose: {
    fontSize: 22,
    color: '#94a3b8',
    padding: 4,
  },
  receiptImage: {
    width: '100%',
    height: 380,
    borderRadius: 16,
    backgroundColor: '#090d16',
  },
  receiptFootnote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
  },
});
