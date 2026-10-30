import React, { useContext } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

// Auth Screens
import WelcomeScreen from '../screens/Auth/WelcomeScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';

// Seeker Screens
import SeekerHomeScreen from '../screens/Seeker/SeekerHomeScreen';
import SpotDetailsScreen from '../screens/Seeker/SpotDetailsScreen';
import BookingsScreen from '../screens/Seeker/BookingsScreen';
import SeekerWalletScreen from '../screens/Seeker/WalletScreen';
import SeekerProfileScreen from '../screens/Seeker/ProfileScreen';
import SeekerNotificationsScreen from '../screens/Seeker/NotificationsScreen';
import HelpAssistantScreen from '../screens/Seeker/HelpAssistantScreen';

// Owner Screens
import OwnerHomeScreen from '../screens/Owner/OwnerHomeScreen';
import OwnerBookingsScreen from '../screens/Owner/OwnerBookingsScreen';
import AddSpotScreen from '../screens/Owner/AddSpotScreen';
import OwnerWalletScreen from '../screens/Owner/WalletScreen';
import OwnerProfileScreen from '../screens/Owner/ProfileScreen';
import OwnerNotificationsScreen from '../screens/Owner/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 🚗 SEEKER TAB NAVIGATOR
function SeekerTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 68 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8),
          },
        ],
        tabBarActiveTintColor: COLORS.seekerAccent,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={SeekerHomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🎟️</Text>,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={SeekerWalletScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💳</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={SeekerProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function SeekerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SeekerMain" component={SeekerTabs} />
      <Stack.Screen name="SpotDetails" component={SpotDetailsScreen} />
      <Stack.Screen name="Notifications" component={SeekerNotificationsScreen} />
      <Stack.Screen name="HelpAssistant" component={HelpAssistantScreen} />
    </Stack.Navigator>
  );
}

// 🅿️ OWNER TAB NAVIGATOR
function OwnerTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 68 + Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0),
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8),
          },
        ],
        tabBarActiveTintColor: COLORS.ownerAccent,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={OwnerHomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📊</Text>,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OwnerBookingsScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📑</Text>,
        }}
      />
      <Tab.Screen
        name="Add Spot"
        component={AddSpotScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>➕</Text>,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={OwnerWalletScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💰</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={OwnerProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function OwnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OwnerMain" component={OwnerTabs} />
      <Stack.Screen name="AddSpot" component={AddSpotScreen} />
      <Stack.Screen name="Notifications" component={OwnerNotificationsScreen} />
    </Stack.Navigator>
  );
}

// 🔐 AUTH STACK (Welcome -> Login / Register for either role)
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>🅿️ PlanToPark</Text>
        <Text style={styles.loadingTxt}>Loading PlanToPark Platform...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  // Direct dynamically based on user's authenticated role
  if (user.role === 'owner') {
    return <OwnerStack />;
  }

  return <SeekerStack />;
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.cardBg,
    borderTopColor: COLORS.borderDark,
    borderTopWidth: 1,
    paddingTop: 6,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
  },
  loadingTxt: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
