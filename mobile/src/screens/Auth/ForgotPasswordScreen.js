import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import Button from '../../components/Button';
import Header from '../../components/Header';
import { getBaseApiUrl, COMMON_HEADERS } from '../../config/api';

export default function ForgotPasswordScreen({ route, navigation }) {
  const role = route.params?.role || 'seeker';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const themeColor = role === 'seeker' ? COLORS.primary : COLORS.ownerAccent;

  const handleSendReset = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const baseUrl = await getBaseApiUrl();
      const res = await fetch(`${baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: COMMON_HEADERS,
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Server response was not JSON. Please check backend connection.');
      }

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send reset email.');
      }

      setSuccessMsg(data.message || 'Reset code sent to your email.');
      setTimeout(() => {
        navigation.navigate('ResetPassword', { email: email.trim(), role });
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Could not send reset code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Header title="Forgot Password" subtitle="PlanToPark Mobile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Reset Your Password 🔐</Text>
        <Text style={styles.subheading}>
          Enter your registered email address below. We will send a 6-digit OTP reset code to your mailbox.
        </Text>

        {!!errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Reset Request Failed</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {!!successMsg && (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>✅ Email Sent Successfully</Text>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Registered Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. name@example.com"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Button
          title="Send Password Reset Code"
          onPress={handleSendReset}
          loading={loading}
          style={{ marginTop: 12, backgroundColor: themeColor }}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
            <Text style={[styles.loginLink, { color: themeColor }]}>Back to Sign In</Text>
          </TouchableOpacity>
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
    padding: 24,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  subheading: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.white,
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#f87171',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  successBox: {
    backgroundColor: '#064e3b',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  successTitle: {
    color: '#34d399',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  successText: {
    color: '#a7f3d0',
    fontSize: 13,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  loginLink: {
    fontWeight: '700',
    fontSize: 14,
  },
});
