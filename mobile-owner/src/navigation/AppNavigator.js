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

// Owner Screens
import OwnerHomeScreen from '../screens/Owner/OwnerHomeScreen';
import AddSpotScreen from '../screens/Owner/AddSpotScreen';
import ProfileScreen from '../screens/Seeker/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
        name="Add Spot"
        component={AddSpotScreen}
        options={{
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>➕</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
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
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        initialParams={{ role: 'owner' }} 
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        initialParams={{ role: 'owner' }} 
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen} 
        initialParams={{ role: 'owner' }} 
      />
      <Stack.Screen 
        name="ResetPassword" 
        component={ResetPasswordScreen} 
        initialParams={{ role: 'owner' }} 
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>🏢 Plan2Park Owner</Text>
        <Text style={styles.loadingTxt}>Loading Space Owner Portal...</Text>
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  return <OwnerStack />;
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
    color: COLORS.ownerAccent,
    fontSize: 14,
    fontWeight: '600',
  },
});
