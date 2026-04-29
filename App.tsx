import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { flushPendingNotificationOpen, navigationRef } from './src/navigation/navigationService';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef} onReady={flushPendingNotificationOpen}>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}