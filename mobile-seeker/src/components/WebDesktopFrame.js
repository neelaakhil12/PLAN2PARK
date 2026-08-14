import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Linking } from 'react-native';
import { COLORS } from '../theme/colors';

// Official Google Play Multi-Colored Vector Logo for Web
const GooglePlayLogo = () => {
  if (Platform.OS === 'web') {
    return (
      <svg width="34" height="34" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 14 }}>
        <path d="M47.7 20.3C44.7 23.4 43 28.2 43 34.6V477.4C43 483.8 44.7 488.6 47.7 491.7L50.1 494.1L306.9 237.3V234.7L50.1 17.9L47.7 20.3Z" fill="#00D2FF"/>
        <path d="M392.5 322.9L306.9 237.3V234.7L392.5 149.1L394.5 150.3L495.8 207.9C524.7 224.3 524.7 251.7 495.8 268.1L394.5 325.7L392.5 322.9Z" fill="#FFC107"/>
        <path d="M306.9 237.3L47.7 491.7C57.3 501.9 73.1 503.2 91.5 492.7L392.5 322.9L306.9 237.3Z" fill="#FF3D00"/>
        <path d="M306.9 234.7L392.5 149.1L91.5 19.3C73.1 8.8 57.3 10.1 47.7 20.3L306.9 234.7Z" fill="#4CAF50"/>
      </svg>
    );
  }
  return <Text style={{ fontSize: 24, marginRight: 10 }}>▶️</Text>;
};

export default function WebDesktopFrame({ children, downloadUrl = "https://expo.dev/accounts/sailaksh123/projects/plantopark-seeker/builds/00420e08-665c-4973-b7d4-8aa1667f8bd4" }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'razorpay-mobile-frame-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .razorpay-container {
            position: fixed !important;
            width: 396px !important;
            max-width: calc(100vw - 32px) !important;
            height: 760px !important;
            max-height: calc(90vh - 20px) !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            border-radius: 32px !important;
            overflow: hidden !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.45) !important;
            z-index: 999999 !important;
          }
          .razorpay-checkout-frame {
            width: 100% !important;
            height: 100% !important;
            border-radius: 32px !important;
            border: none !important;
            display: block !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const handleDownload = () => {
    if (typeof window !== 'undefined') {
      window.open(downloadUrl, '_blank');
    } else {
      Linking.openURL(downloadUrl);
    }
  };

  return (
    <View style={styles.webOuterBackground}>
      {/* Centered Mobile Phone Frame */}
      <View style={styles.phoneContainer}>
        {/* Notch */}
        <View style={styles.phoneNotch} />
        {/* App Viewport */}
        <View style={styles.phoneScreen}>
          {children}
        </View>
      </View>

      {/* Big Right-Side Vertically Centered Play Store Download Card */}
      <View style={styles.rightSidePanel}>
        <Text style={styles.panelTitle}>Get Plan2Park Seeker App</Text>
        <Text style={styles.panelSubtitle}>Install directly on your Android phone</Text>

        <TouchableOpacity style={styles.downloadBtnBig} onPress={handleDownload} activeOpacity={0.85}>
          <GooglePlayLogo />
          <View style={styles.btnTextColBig}>
            <Text style={styles.btnSubBig}>GET IT ON</Text>
            <Text style={styles.btnMainBig}>Google Play</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webOuterBackground: {
    flex: 1,
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    overflowY: 'auto',
    position: 'relative',
  },
  rightSidePanel: {
    position: 'absolute',
    right: '6%',
    top: '42%',
    alignItems: 'flex-start',
    zIndex: 1000,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  panelSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    fontWeight: '500',
  },
  downloadBtnBig: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#27272a',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    cursor: 'pointer',
  },
  btnTextColBig: {
    justifyContent: 'center',
  },
  btnSubBig: {
    color: '#a1a1aa',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  btnMainBig: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 1,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  phoneContainer: {
    width: 420,
    maxWidth: '94%',
    height: 840,
    maxHeight: '94vh',
    backgroundColor: COLORS.darkBg,
    borderRadius: 44,
    borderWidth: 10,
    borderColor: '#1e293b',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
    position: 'relative',
  },
  phoneNotch: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    width: 120,
    height: 18,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 100,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    paddingTop: 36,
    paddingBottom: 24,
    position: 'relative',
  },
});
