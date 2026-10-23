// src/components/OrderStatusBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography, Radius, Spacing } from '../theme';
import { getStatusColor, getStatusBackground, getStatusLabel } from '../theme';

export default function OrderStatusBadge({ status, size = 'md' }) {
  const bg = getStatusBackground(status);
  const fg = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'sm' && styles.badgeSm]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.label, { color: fg }, size === 'sm' && styles.labelSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.weightBold,
    letterSpacing: 0.3,
  },
  labelSm: { fontSize: 10 },
});

