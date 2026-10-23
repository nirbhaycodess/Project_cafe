// src/navigation/StudentNavigator.js
// Tab-based navigation for Student role

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import HomeScreen from '../screens/student/HomeScreen';
import CartScreen from '../screens/student/CartScreen';
import OrdersScreen from '../screens/student/OrdersScreen';

const TABS = [
  { key: 'home',   label: 'Menu',   icon: '🍽️' },
  { key: 'orders', label: 'Orders', icon: '📦' },
];

export default function StudentNavigator({ menuItems, setMenuItems }) {
  const [activeTab, setActiveTab]   = useState('home');
  const [cart, setCart]             = useState({});
  const [pendingOrder, setPendingOrder] = useState(null); // order just placed

  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleOrderPlaced = (order) => {
    setPendingOrder(order);
    setActiveTab('orders');
  };

  const goToCart = () => setActiveTab('cart');
  const goToMenu = () => setActiveTab('home');

  return (
    <View style={styles.container}>
      {/* Screens */}
      <View style={styles.screen}>
        {activeTab === 'home' && (
          <HomeScreen
            cart={cart}
            onCartUpdate={setCart}
            onGoToCart={goToCart}
          />
        )}
        {activeTab === 'cart' && (
          <CartScreen
            cart={cart}
            menuItems={menuItems}
            onCartUpdate={setCart}
            onOrderPlaced={handleOrderPlaced}
            onBack={goToMenu}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersScreen newOrder={pendingOrder} />
        )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* Cart tab with badge */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cart' && styles.tabActive]}
          onPress={goToCart}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.tabIcon}>🛒</Text>
            {totalCartItems > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalCartItems}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'cart' && styles.tabLabelActive]}>Cart</Text>
        </TouchableOpacity>
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
    paddingBottom: Spacing.sm, // safe area handled in screens
    ...Shadows.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: 3,
  },
  tabActive: {},
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 9,
    fontWeight: Typography.weightExtraBold,
  },
});

