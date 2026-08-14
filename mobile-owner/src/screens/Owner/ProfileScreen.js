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
import { getImageUrl } from '../../config/api';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function ProfileScreen() {
  const { user, updateProfile, logout } = useContext(AuthContext);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const handlePickProfileImage = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            if (typeof window !== 'undefined' && window.alert) {
              window.alert('Selected image exceeds 5MB limit. Please choose a smaller photo.');
            } else {
              Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
            }
            return;
          }

          setUploadingImage(true);
          setImageLoadError(false);
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

          <View style={styles.roleTag}>
            <Text style={styles.roleTagTxt}>PARKING SPACE OWNER</Text>
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
            <Text style={styles.statLbl}>Space Partner</Text>
          </View>
        </View>

        {/* Support & Legal */}
        <Text style={styles.sectionTitle}>Support & Legal</Text>
        <TouchableOpacity style={styles.linkCard}>
          <Text style={styles.linkTxt}>📞 24/7 Owner Support Desk</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkCard}>
          <Text style={styles.linkTxt}>📜 Partner Terms & Privacy Policy</Text>
        </TouchableOpacity>

        <Button
          title="Sign Out"
          onPress={logout}
          variant="danger"
          style={{ marginTop: 24, marginBottom: 30 }}
        />
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
});
