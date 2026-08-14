import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { COLORS } from '../theme/colors';
import Button from './Button';

const AVATAR_OPTIONS = [
  { id: 'av1', emoji: '👨‍✈️', label: 'Driver 1' },
  { id: 'av2', emoji: '👩‍✈️', label: 'Driver 2' },
  { id: 'av3', emoji: '🚗', label: 'Sedan' },
  { id: 'av4', emoji: '🚙', label: 'SUV' },
  { id: 'av5', emoji: '⚡', label: 'EV Rider' },
  { id: 'av6', emoji: '👤', label: 'User' },
];

export default function ProfileEditorModal({
  visible,
  isNewUser = false,
  currentUser,
  onSave,
  onClose,
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👨‍✈️');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setContact(currentUser.contact || '');
      const primaryVeh = currentUser.vehicles && currentUser.vehicles[0];
      setVehicleNumber(primaryVeh ? primaryVeh.plateNumber : 'TS 07 AB 1234');
      if (currentUser.profileImage && currentUser.profileImage.length <= 4) {
        setSelectedAvatar(currentUser.profileImage);
      }
    }
  }, [currentUser, visible]);

  if (!visible) return null;

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Email Address is required');
      return;
    }
    if (!contact.trim()) {
      setErrorMsg('Phone Number is required');
      return;
    }

    const finalVehicle = vehicleNumber.trim() || 'TS 07 AB 1234';

    try {
      setLoading(true);
      await onSave({
        name: name.trim(),
        email: email.trim(),
        contact: contact.trim(),
        vehicleNumber: finalVehicle.toUpperCase(),
        passPhoto: selectedAvatar,
        profileImage: selectedAvatar,
      });
    } catch (err) {
      console.error('Save profile error:', err);
      setErrorMsg(err.message || 'Failed to update profile in database');
    } finally {
      setLoading(false);
    }
  };

  const modalBody = (
    <View style={styles.overlay}>
      <View style={styles.modalCard}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.modalTitle}>
            {isNewUser ? '📝 Complete Seeker Profile' : '✏️ Edit Profile Details'}
          </Text>
          <Text style={styles.modalSub}>
            {isNewUser
              ? 'Please fill in your details to search and book parking spots.'
              : 'Update your name, contact, vehicle number, or profile photo.'}
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTxt}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* Avatar / Pass Photo Selection */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.fieldLabel}>Select Pass Photo / Avatar</Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#10b98120',
                borderWidth: 1,
                borderColor: '#10b981',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
              onPress={() => {
                if (typeof document !== 'undefined') {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setSelectedAvatar(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }
              }}
            >
              <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>📷 Upload Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.avatarRow}>
            {AVATAR_OPTIONS.map((item) => {
              const isSelected = selectedAvatar === item.emoji;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}
                  onPress={() => setSelectedAvatar(item.emoji)}
                >
                  <Text style={styles.avatarEmoji}>{item.emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Name Input */}
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Email Input */}
          <Text style={styles.fieldLabel}>Email Address *</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email address"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Phone Number Input */}
          <Text style={styles.fieldLabel}>Phone / Contact Number *</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>📞</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={contact}
              onChangeText={setContact}
            />
          </View>

          {/* Vehicle Number Input */}
          <Text style={styles.fieldLabel}>Primary Vehicle Number *</Text>
          <View style={styles.inputBox}>
            <Text style={styles.inputIcon}>🚗</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. TS 07 AB 1234"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters"
              value={vehicleNumber}
              onChangeText={setVehicleNumber}
            />
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            title={isNewUser ? 'Save & Continue 🚀' : 'Save Changes ✅'}
            onPress={handleSubmit}
            loading={loading}
            variant="primary"
          />
          {!isNewUser && onClose && (
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
              style={{ marginTop: 6 }}
            />
          )}
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return modalBody;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      {modalBody}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: COLORS.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  header: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginBottom: 10,
  },
  errorTxt: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    maxHeight: 380,
  },
  fieldLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.darkBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  avatarCircleSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  avatarEmoji: {
    fontSize: 22,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
    marginBottom: 10,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
  },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderDark,
  },
});
