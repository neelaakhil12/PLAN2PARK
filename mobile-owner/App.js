import React from 'react';
import { View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import WebDesktopFrame from './src/components/WebDesktopFrame';

export default function App() {
  const content = (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#0f172a" translucent={false} />
      <AppNavigator />
    </NavigationContainer>
  );

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <AuthProvider>
        {Platform.OS === 'web' ? (
          <WebDesktopFrame appName="Plan2Park Owner App">
            {content}
          </WebDesktopFrame>
        ) : (
          <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
            {content}
          </View>
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
