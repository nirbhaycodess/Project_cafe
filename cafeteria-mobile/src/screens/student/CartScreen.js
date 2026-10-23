// src/screens/student/CartScreen.js
// Cart review, item management, and order placement (server validates & prices)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { orderService } from '../../services/orderService';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';

export default function CartScreen({ cart, menuItems, onCartUpdate, onOrderPlaced, onBack }) {
  const [placing, setPlacing] = useState(false);

  // Build cart line items from cart map + menu data
  const cartLines = Object.entries(cart)
    .map(([menuItemId, quantity]) => {
      const item = menuItems.find((m) => m._id === menuItemId);
      return item ? { menuItemId, quantity, item } : null;
    })
    .filter(Boolean);

  const frontendTotal = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);
  const totalItems = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  const handleQtyChange = (menuItemId, delta) => {
    onCartUpdate((prev) => {
      const next = (prev[menuItemId] || 0) + delta;
      if (next <= 0) {
        const updated = { ...prev };
        delete updated[menuItemId];
        return updated;
      }
      return { ...prev, [menuItemId]: next };
    });
  };

  const handleRemove = (menuItemId) => {
    onCartUpdate((prev) => {
      const updated = { ...prev };
      delete updated[menuItemId];
      return updated;
    });
  };

  const handleClear = () => {
    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => onCartUpdate({}) },
    ]);
  };

  const handlePlaceOrder = async () => {
    if (cartLines.length === 0) return;

    setPlacing(true);
    try {
      const items = cartLines.map(({ menuItemId, quantity }) => ({ menuItemId, quantity }));
      const order = await orderService.placeOrder(items);
      onCartUpdate({});                // clear cart
      onOrderPlaced(order);           // navigate to confirmation
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.message || 'Could not place your order. Please try again.';
      Alert.alert('Order Failed', msg);
    } finally {
      setPlacing(false);
    }
  };

  if (cartLines.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Menu</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Your Cart</Text>
          <View style={{ width: 60 }} />
        </View>
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          message="Add items from the menu to get started."
          actionLabel="Browse Menu"
          onAction={onBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Menu</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Your Cart</Text>
        <TouchableOpacity onPress={handleClear}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{totalItems} {totalItems === 1 ? 'item' : 'items'}</Text>
          {cartLines.map(({ menuItemId, quantity, item }) => (
            <View key={menuItemId} style={styles.lineItem}>
              <View style={styles.lineLeft}>
                <Text style={styles.lineName}>{item.name}</Text>
                <Text style={styles.lineCategory}>{item.category}</Text>
                <Text style={styles.lineUnitPrice}>₹{item.price} each</Text>
              </View>
              <View style={styles.lineRight}>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => handleQtyChange(menuItemId, -1)}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => handleQtyChange(menuItemId, 1)}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.lineTotal}>₹{item.price * quantity}</Text>
                <TouchableOpacity onPress={() => handleRemove(menuItemId)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Order summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Order Summary</Text>
          {cartLines.map(({ menuItemId, quantity, item }) => (
            <View key={menuItemId} style={styles.summaryRow}>
              <Text style={styles.summaryItem}>{item.name} × {quantity}</Text>
              <Text style={styles.summaryAmt}>₹{item.price * quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Estimated Total</Text>
            <Text style={styles.summaryTotalAmt}>₹{frontendTotal}</Text>
          </View>
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              ℹ️ Final amount is calculated and confirmed by the server at checkout.
            </Text>
          </View>
        </View>

        {/* Payment note */}
        <View style={styles.paymentNote}>
          <Text style={styles.paymentIcon}>💵</Text>
          <Text style={styles.paymentText}>
            Payment is collected at the cafeteria counter when you pick up your order.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom checkout bar */}
      <View style={styles.checkoutBar}>
        <View>
          <Text style={styles.checkoutLabel}>Total (est.)</Text>
          <Text style={styles.checkoutTotal}>₹{frontendTotal}</Text>
        </View>
        <AppButton
          label={placing ? 'Placing...' : 'Place Order'}
          onPress={handlePlaceOrder}
          loading={placing}
          size="md"
          fullWidth={false}
          style={styles.checkoutBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: { paddingVertical: 4, minWidth: 60 },
  backText: {
    fontSize: Typography.base,
    color: Colors.primary,
    fontWeight: Typography.weightSemiBold,
  },
  topTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  clearText: {
    fontSize: Typography.sm,
    color: Colors.error,
    fontWeight: Typography.weightSemiBold,
    minWidth: 60,
    textAlign: 'right',
  },

  section: {
    padding: Spacing.screen,
  },
  sectionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },

  lineItem: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...Shadows.sm,
  },
  lineLeft: { flex: 1, paddingRight: Spacing.sm },
  lineName: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  lineCategory: {
    fontSize: Typography.xs,
    color: Colors.accent,
    fontWeight: Typography.weightSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  lineUnitPrice: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  lineRight: { alignItems: 'flex-end' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    lineHeight: 22,
  },
  qtyNum: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    minWidth: 26,
    textAlign: 'center',
  },
  lineTotal: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
    marginBottom: 4,
  },
  removeBtn: { paddingVertical: 2 },
  removeText: {
    fontSize: Typography.xs,
    color: Colors.error,
    fontWeight: Typography.weightSemiBold,
  },

  summaryCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.screen,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  summaryTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryItem: { fontSize: Typography.sm, color: Colors.textSecondary },
  summaryAmt: { fontSize: Typography.sm, color: Colors.textPrimary, fontWeight: Typography.weightMedium },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.sm },
  summaryTotal: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  summaryTotalAmt: {
    fontSize: Typography.lg,
    fontWeight: Typography.weightExtraBold,
    color: Colors.primary,
  },
  noteBox: {
    backgroundColor: Colors.infoLight,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  noteText: {
    fontSize: Typography.xs,
    color: Colors.info,
    lineHeight: 16,
  },

  paymentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginHorizontal: Spacing.screen,
    marginBottom: Spacing.md,
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  paymentIcon: { fontSize: 18 },
  paymentText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.warning,
    lineHeight: 18,
  },

  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  checkoutLabel: { color: Colors.textMuted, fontSize: Typography.xs },
  checkoutTotal: {
    color: Colors.textInverse,
    fontSize: Typography.xl,
    fontWeight: Typography.weightExtraBold,
  },
  checkoutBtn: { flex: 0, backgroundColor: Colors.primary },
});

