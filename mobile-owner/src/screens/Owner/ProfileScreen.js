import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import { getImageUrl } from '../../config/api';
import Header from '../../components/Header';
import Button from '../../components/Button';
import TermsModal from '../../components/TermsModal';
import SupportModal from '../../components/SupportModal';
import { Linking } from 'react-native';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleInput, setVehicleInput] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  const isStorageOwner =
    user?.accountCategory === 'vehicle_storage_owner' ||
    (user?.name && user.name.toLowerCase().includes('storage'));
  const [selectedTermsType, setSelectedTermsType] = useState(isStorageOwner ? 'storage_owner' : 'owner');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const currentVehiclePlate = user?.vehiclePlateNumber ||
    user?.vehicleNumber ||
    (user?.vehicles && user.vehicles[0]?.plateNumber) ||
    '';

  const handleSaveVehicle = async () => {
    const formatted = vehicleInput.trim().toUpperCase();
    if (!formatted) {
      Alert.alert('Required', 'Please enter your vehicle plate number');
      return;
    }
    setSavingVehicle(true);
    try {
      await updateProfile({
        vehiclePlateNumber: formatted,
        vehicleNumber: formatted,
        vehicles: [{ plateNumber: formatted, vehicleType: 'Car' }],
      });
      Alert.alert('Updated', `Vehicle plate number updated to ${formatted}!`);
      setShowVehicleModal(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update vehicle number');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleGalleryUpload = async () => {
    try {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status === 'denied' && !perm.canAskAgain && Platform.OS === 'ios') {
          Alert.alert('Permission Required', 'Please enable photo library access in device settings.');
          return;
        }
      } catch (pErr) {
        console.warn('Permission request note:', pErr.message);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        setUploadingImage(true);
        setImageLoadError(false);
        try {
          await updateProfile({ profileImage: base64Data, passPhoto: base64Data });
          Alert.alert('Success', 'Profile photo updated successfully! 📸');
        } catch (err) {
          console.error('Image upload failed', err);
          Alert.alert('Upload Error', 'Failed to update profile photo: ' + (err.message || 'Error'));
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (e) {
      console.error('Picker error', e);
      Alert.alert('Photo Picker Issue', e.message || 'Could not open gallery.');
    }
  };

  const handlePickProfileImage = () => {
    Alert.alert(
      'Update Profile Photo',
      'Select a photo from your device gallery to update your profile photo:',
      [
        { text: '🖼️ Choose from Gallery', onPress: handleGalleryUpload },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const isEmojiAvatar = user?.profileImage && user?.profileImage.length <= 4;
  const hasCustomPhoto = user?.profileImage && !isEmojiAvatar;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Profile" subtitle="Account Settings" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          {/* Avatar with Camera Badge */}
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickProfileImage}
            onClick={handlePickProfileImage}
            activeOpacity={0.85}
            disabled={uploadingImage}
          >
            <View style={styles.avatarBox}>
              {uploadingImage ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : hasCustomPhoto && !imageLoadError ? (
                <Image
                  source={{ uri: getImageUrl(user.profileImage) }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                  onError={() => setImageLoadError(true)}
                />
              ) : isEmojiAvatar ? (
                <Text style={{ fontSize: 36 }}>{user.profileImage}</Text>
              ) : (
                <Text style={styles.avatarTxt}>{(user?.name || 'O').charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraBadgeTxt}>📷</Text>
            </View>
          </TouchableOpacity>

          {/* Quick Photo Upload Action */}
          <TouchableOpacity
            style={styles.uploadPhotoBtn}
            onPress={handlePickProfileImage}
            onClick={handlePickProfileImage}
            activeOpacity={0.8}
            disabled={uploadingImage}
          >
            <Text style={styles.uploadPhotoTxt}>
              {uploadingImage ? '⏳ Uploading...' : '📸 Upload Profile Photo'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name || 'Space Owner'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'owner@example.com'}</Text>
          {user?.contact ? (
            <Text style={styles.userPhone}>📞 {user.contact}</Text>
          ) : null}

          <View style={[styles.roleTag, isStorageOwner && { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' }]}>
            <Text style={[styles.roleTagTxt, isStorageOwner && { color: '#f59e0b' }]}>
              {isStorageOwner ? '🚜 VEHICLE STORAGE YARD OWNER' : 'PARKING SPACE OWNER'}
            </Text>
          </View>
        </View>

        {/* Account Quick Stats */}
        <Text style={styles.sectionTitle}>Account Status</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>Active</Text>
            <Text style={styles.statLbl}>Status</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>Verified</Text>
            <Text style={styles.statLbl}>{isStorageOwner ? 'Yard Partner' : 'Space Partner'}</Text>
          </View>
        </View>

        {/* Saved Vehicle Plate */}
        <Text style={styles.sectionTitle}>Saved Vehicle Plate</Text>
        <View style={styles.vehicleCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <Text style={{ fontSize: 26 }}>🚗</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehPlateText}>
                  {currentVehiclePlate || 'No Plate Added'}
                </Text>
                <Text style={styles.vehSubText}>
                  Auto-fills when booking or reserving spots
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editVehBtn}
              onPress={() => {
                setVehicleInput(currentVehiclePlate);
                setShowVehicleModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.editVehBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & Legal */}
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <TouchableOpacity
          style={styles.linkCard}
          onPress={() => setShowSupportModal(true)}
          activeOpacity={0.75}
        >
          <Text style={styles.linkTxt}>
            {isStorageOwner ? '🚜 24/7 Storage Yard Help Desk' : '📞 24/7 Owner Support Desk'}
          </Text>
        </TouchableOpacity>

        {isStorageOwner ? (
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => {
              setSelectedTermsType('storage_owner');
              setShowTermsModal(true);
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.linkTxt}>📜 Terms & Conditions for Storage Yard Owner</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => {
              setSelectedTermsType('owner');
              setShowTermsModal(true);
            }}
            activeOpacity={0.75}
          >
            <Text style={styles.linkTxt}>🏢 Terms & Conditions for Space Owner</Text>
          </TouchableOpacity>
        )}

        <Button
          title="Sign Out"
          onPress={logout}
          variant="danger"
          style={{ marginTop: 24, marginBottom: 30 }}
        />
      </ScrollView>

      {/* Edit Vehicle Plate Modal */}
      <Modal visible={showVehicleModal} transparent animationType="fade" onRequestClose={() => setShowVehicleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚗 Edit Vehicle Plate Number</Text>
            <Text style={styles.modalSub}>
              This vehicle number will automatically fill when booking a parking spot.
            </Text>
            <TextInput
              style={styles.plateInput}
              placeholder="e.g. TS07AB1234"
              placeholderTextColor="#94a3b8"
              value={vehicleInput}
              onChangeText={setVehicleInput}
              autoCapitalize="characters"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#334155' }]}
                onPress={() => setShowVehicleModal(false)}
                disabled={savingVehicle}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.ownerAccent || '#3b82f6', flex: 1 }]}
                onPress={handleSaveVehicle}
                disabled={savingVehicle}
              >
                <Text style={[styles.modalBtnText, { fontWeight: '800' }]}>
                  {savingVehicle ? 'Saving...' : 'Save Vehicle'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dynamic Terms & Conditions Modal */}
      <TermsModal
        visible={showTermsModal}
        type={selectedTermsType}
        onClose={() => setShowTermsModal(false)}
      />

      {/* 24/7 Owner Help Desk Modal */}
      <SupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        isStorageYard={isStorageOwner}
      />
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
  profileCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarBox: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.ownerAccent || '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.ownerAccent || '#3b82f6',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.ownerAccent || '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardBg,
    elevation: 3,
  },
  cameraBadgeTxt: {
    fontSize: 13,
  },
  uploadPhotoBtn: {
    backgroundColor: '#3b82f620',
    borderWidth: 1,
    borderColor: COLORS.ownerAccent || '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  uploadPhotoTxt: {
    color: COLORS.ownerAccent || '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  avatarTxt: {
    color: COLORS.white,
    fontSize: 34,
    fontWeight: '800',
  },
  userName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
  },
  userEmail: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  userPhone: {
    color: COLORS.ownerAccent || '#3b82f6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  roleTag: {
    backgroundColor: '#3b82f625',
    borderWidth: 1,
    borderColor: COLORS.ownerAccent || '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  roleTagTxt: {
    color: COLORS.ownerAccent || '#3b82f6',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 10,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  statVal: {
    color: COLORS.ownerAccent || '#3b82f6',
    fontSize: 18,
    fontWeight: '800',
  },
  statLbl: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  linkCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  linkTxt: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  vehPlateText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  vehSubText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  editVehBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.ownerAccent || '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editVehBtnText: {
    color: COLORS.ownerAccent || '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  plateInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 10,
    letterSpacing: 1.5,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
