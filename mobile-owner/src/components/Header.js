import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';

export default function Header({ title, subtitle, rightElement, onBack }) {
  const insets = useSafeAreaInsets();
  
  // Clean, compact top padding compatible with all Android devices and iOS notches
  const totalTopPadding = Platform.OS === 'android' ? 12 : Math.max(insets.top, 14);

  return (
    <View style={[styles.headerContainer, { paddingTop: totalTopPadding }]}>
      <View style={styles.leftCol}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backTxt}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement && <View>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.darkBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderDark,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderDark,
  },
  backTxt: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
