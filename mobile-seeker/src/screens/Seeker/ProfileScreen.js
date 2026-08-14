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
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS } from '../../theme/colors';
import { endpoints, getImageUrl } from '../../config/api';
import Header from '../../components/Header';
import Button from '../../components/Button';
import ProfileEditorModal from '../../components/ProfileEditorModal';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const primaryVehicle = user?.vehicles && user.vehicles.length > 0
    ? user.vehicles[0]
    : { plateNumber: 'TS 07 AB 1234', vehicleType: 'Car' };

  const handleSaveProfile = async (profileData) => {
    await updateProfile(profileData);
    setShowEditModal(false);
  };

  const handlePickProfileImage = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          // Check size limit (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            if (typeof window !== 'undefined' && window.alert) {
              window.alert('Selected image exceeds 5MB limit. Please choose a smaller photo.');
            } else {
              Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
            }
            return;
          }

          setUploadingImage(true);
          const reader = new FileReader();
          reader.onload = async () => {
            const base64 = reader.result;
            try {
              await updateProfile({ profileImage: base64, passPhoto: base64 });
              if (typeof window !== 'undefined' && window.alert) {
                window.alert('Profile photo updated successfully! 📸');
              }
            } catch (err) {
              console.error('Image upload failed', err);
              if (typeof window !== 'undefined' && window.alert) {
                window.alert('Failed to upload profile photo. Please try again.');
              }
            } finally {
              setUploadingImage(false);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const isEmojiAvatar = user?.profileImage && user?.profileImage.length <= 4;
  const hasCustomPhoto = user?.profileImage && !isEmojiAvatar;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My Profile" subtitle="Account Settings & Vehicle Info" />

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
              ) : hasCustomPhoto ? (
                <Image
                  source={{ uri: getImageUrl(user.profileImage) }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : isEmojiAvatar ? (
                <Text style={{ fontSize: 36 }}>{user.profileImage}</Text>
              ) : (
                <Text style={styles.avatarTxt}>{(user?.name || 'U').charAt(0).toUpperCase()}</Text>
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

          <Text style={styles.userName}>{user?.name || 'Parking Seeker'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'seeker@example.com'}</Text>
          <Text style={styles.userPhone}>📞 {user?.contact || 'Not provided'}</Text>

          <View style={styles.roleTag}>
            <Text style={styles.roleTagTxt}>PARKING SEEKER</Text>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setShowEditModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.editBtnTxt}>✏️ Edit Profile Details</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Vehicles */}
        <Text style={styles.sectionTitle}>Saved Vehicle Details</Text>
        <View style={styles.itemCard}>
          <View style={styles.vehRow}>
            <Text style={styles.itemTitle}>🚗 {primaryVehicle.plateNumber}</Text>
            <Text style={styles.primaryTag}>PRIMARY</Text>
          </View>
          <Text style={styles.itemSub}>{primaryVehicle.vehicleType || 'Car'} • Active Parking License</Text>
        </View>

        {/* Account Quick Stats */}
        <Text style={styles.sectionTitle}>Account Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>Active</Text>
            <Text style={styles.statLbl}>Status</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>Verified</Text>
            <Text style={styles.statLbl}>Account</Text>
          </View>
        </View>

        {/* Support & Legal */}
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <TouchableOpacity style={styles.linkCard}>
          <Text style={styles.linkTxt}>📞 24/7 Customer Support Desk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard}>
          <Text style={styles.linkTxt}>📜 Terms of Service & Privacy Policy</Text>
        </TouchableOpacity>

        <Button
          title="Sign Out"
          onPress={logout}
          variant="danger"
          style={{ marginTop: 24, marginBottom: 30 }}
        />
      </ScrollView>

      {/* Edit Profile Modal for Existing Users */}
      <ProfileEditorModal
        visible={showEditModal}
        isNewUser={false}
        currentUser={user}
        onSave={handleSaveProfile}
        onClose={() => setShowEditModal(false)}
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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#10b981',
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
    backgroundColor: '#10b981',
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
    backgroundColor: '#10b98120',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    marginTop: 4,
  },
  uploadPhotoTxt: {
    color: '#10b981',
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
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  roleTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  roleTagTxt: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  editBtn: {
    marginTop: 16,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    width: '100%',
    alignItems: 'center',
  },
  editBtnTxt: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 10,
    marginBottom: 10,
  },
  itemCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  vehRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  primaryTag: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  statVal: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  linkCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  linkTxt: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
