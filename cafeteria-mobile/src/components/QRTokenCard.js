// src/components/QRTokenCard.js
// Displays the pickup QR code and token for student orders

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

export default function QRTokenCard({ order }) {
  if (!order || !order.orderToken) return null;

  const canShow = order.orderStatus !== 'Completed' && order.orderStatus !== 'Cancelled';

  if (!canShow) {
    return (
      <View style={styles.completedBox}>
        <Text style={styles.completedIcon}>
          {order.orderStatus === 'Completed' ? '✅' : '❌'}
        </Text>
        <Text style={styles.completedText}>
          {order.orderStatus === 'Completed'
            ? 'Order handed over. Enjoy your meal!'
            : 'This order was cancelled.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Pickup QR Code</Text>
      <Text style={styles.sub}>Show this to cafeteria staff</Text>

      <View style={styles.qrBox}>
        <QRCode value={order.orderToken} size={160} />
      </View>

      <View style={styles.tokenRow}>
        <Text style={styles.tokenLabel}>TOKEN</Text>
        <Text style={styles.tokenValue}>{order.orderToken}</Text>
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>
          Valid until staff scans and confirms your pickup
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.md,
    marginVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heading: {
    fontSize: Typography.lg,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  qrBox: {
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tokenLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.weightBold,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tokenValue: {
    fontSize: Typography.xl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.primary,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  hintRow: {
    paddingTop: Spacing.sm,
  },
  hint: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  completedBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  completedIcon: { fontSize: 36, marginBottom: Spacing.sm },
  completedText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontWeight: Typography.weightMedium,
  },
});

