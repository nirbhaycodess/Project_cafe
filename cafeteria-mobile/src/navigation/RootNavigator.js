// src/navigation/RootNavigator.js
// Role-aware root router — renders the correct navigator based on user.role

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { menuService } from '../services/menuService';
import { socketService } from '../services/socketService';
import { Colors, Typography, Spacing, Shadows, Radius } from '../theme';
import StudentNavigator from './StudentNavigator';
import StaffNavigator from './StaffNavigator';
import LoginScreen from '../screens/auth/LoginScreen';

export default function RootNavigator() {
  const { user, initializing, signOut } = useAuth();
  const [menuItems, setMenuItems] = useState([]);

  // Pre-load menu items for the cart screen to have item details
  useEffect(() => {
    if (!user) return;
    menuService.getAll()
      .then(setMenuItems)
      .catch(() => {});

    // Start socket connection when logged in
    socketService.connect();

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  if (initializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashIcon}>🍃</Text>
        <Text style={styles.splashTitle}>Campus Cafeteria</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const roleColor = user.role === 'Student' ? Colors.primary :
                    user.role === 'Staff'   ? Colors.warning :
                    user.role === 'Manager' ? Colors.accent : Colors.error;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* App-wide top header */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <Text style={styles.topLogo}>🍃</Text>
          <View>
            <Text style={styles.topName}>{user.name}</Text>
            <View style={[styles.rolePill, { backgroundColor: roleColor + '20' }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{user.role}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Role-based content */}
      <View style={styles.content}>
        {user.role === 'Student' ? (
          <StudentNavigator menuItems={menuItems} setMenuItems={setMenuItems} />
        ) : (
          <StaffNavigator user={user} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  splashIcon: { fontSize: 52 },
  splashTitle: {
    fontSize: Typography.xxl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.textPrimary,
  },

  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    ...Shadows.sm,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topLogo: { fontSize: 26 },
  topName: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  rolePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: Typography.xs,
    fontWeight: Typography.weightBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.borderLight,
  },
  logoutText: {
    fontSize: Typography.sm,
    color: Colors.error,
    fontWeight: Typography.weightSemiBold,
  },
  content: { flex: 1 },
});

