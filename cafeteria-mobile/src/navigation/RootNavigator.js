// File path: cafeteria-mobile/src/navigation/RootNavigator.js
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import StudentNavigator from './StudentNavigator';
import StaffDashboard from '../screens/staff/StaffDashboard';
import ManagerDashboard from '../screens/manager/ManagerDashboard';
import SuperAdminDashboard from '../screens/admin/SuperAdminDashboard';
import LoginScreen from '../screens/auth/LoginScreen';

export default function RootNavigator() {
  const { user, initializing } = useAuth();
  const [menuItems, setMenuItems] = useState([]);

  // 1. Show loading spinner while AuthContext checks AsyncStorage session
  if (initializing) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor="#F4F7F4" />
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  // 2. If user is null (logged out), show LoginScreen
  if (!user) {
    return <LoginScreen />;
  }

  const renderRoleNavigator = () => {
    switch (user.role) {
      case 'Student':
        return <StudentNavigator menuItems={menuItems} setMenuItems={setMenuItems} />;
      case 'SuperAdmin':
        return <SuperAdminDashboard />;
      case 'Manager':
        return <ManagerDashboard />;
      case 'Staff':
      default:
        return <StaffDashboard />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#112A20" />
      {renderRoleNavigator()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#112A20',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F7F4',
  },
});
