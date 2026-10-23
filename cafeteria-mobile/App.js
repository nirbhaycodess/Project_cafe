// App.js — Root entry point
// Wraps the app in AuthContext and SafeAreaProvider, renders the role-aware navigator.
// The original login/dashboard logic is now handled inside src/navigation/RootNavigator.js

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
