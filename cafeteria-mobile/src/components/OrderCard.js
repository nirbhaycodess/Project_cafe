// src/components/OrderCard.js
// Used in both student order history and staff queue

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';
import OrderStatusBadge from './OrderStatusBadge';

export default function OrderCard({ order, footer, compact = false }) {
  const dateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {/* Header row */}
      <View style={styles.header}>
        <View>
          <Text style={styles.token}>#{order.orderToken}</Text>
          {dateStr ? <Text style={styles.date}>{dateStr}</Text> : null}
        </View>
        <OrderStatusBadge status={order.orderStatus} size={compact ? 'sm' : 'md'} />
      </View>

      {/* Student info (staff/manager view) */}
      {order.user?.name && (
        <View style={styles.studentRow}>
          <Text style={styles.studentName}>{order.user.name}</Text>
          {order.user.collegeId && (
            <Text style={styles.studentId}> · {order.user.collegeId}</Text>
          )}
        </View>
      )}

      <View style={styles.divider} />

      {/* Items */}
      <View style={styles.items}>
        {order.items.map((it, idx) => (
          <View key={idx} style={styles.itemRow}>
            <Text style={styles.itemQty}>{it.quantity}×</Text>
            <Text style={styles.itemName} numberOfLines={1}>
              {it.menuItem?.name || 'Item'}
            </Text>
            <Text style={styles.itemPrice}>
              ₹{(it.priceAtPurchase * it.quantity).toFixed(0)}
            </Text>
          </View>
        ))}
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{order.totalAmount}</Text>
      </View>

      {/* Footer slot (buttons etc.) */}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  cardCompact: { padding: Spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  token: {
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  date: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  studentName: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textSecondary,
  },
  studentId: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  items: { marginBottom: Spacing.sm },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemQty: {
    width: 28,
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
    color: Colors.accent,
  },
  itemName: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: Typography.weightMedium,
  },
  itemPrice: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weightMedium,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderColor: Colors.divider,
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
  },
  footer: { marginTop: Spacing.md },
});

