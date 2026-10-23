// src/navigation/StaffNavigator.js
// Tab navigation for Staff and Manager/SuperAdmin roles

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Shadows } from '../theme';
import StaffQueueScreen from '../screens/staff/StaffQueueScreen';
import QRScannerScreen from '../screens/staff/QRScannerScreen';
import MenuManagementScreen from '../screens/manager/MenuManagementScreen';

export default function StaffNavigator({ user }) {
  const isManager = user?.role === 'Manager' || user?.role === 'SuperAdmin';

  const TABS = [
    { key: 'queue',  label: 'Queue',   icon: '📋' },
    { key: 'verify', label: 'Scan QR', icon: '📷' },
    ...(isManager ? [{ key: 'menu', label: 'Menu', icon: '🍴' }] : []),
  ];

  const [activeTab, setActiveTab] = useState('queue');

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {activeTab === 'queue'  && <StaffQueueScreen />}
        {activeTab === 'verify' && <QRScannerScreen />}
        {activeTab === 'menu'   && isManager && <MenuManagementScreen />}
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    ...Shadows.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    gap: 3,
    position: 'relative',
  },
  tabIcon: { fontSize: 22 },
  tabLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weightMedium,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.weightBold,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

