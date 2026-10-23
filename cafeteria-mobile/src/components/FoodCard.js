// src/components/FoodCard.js
// Menu item card used on the Menu screen

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

// Category emoji map (no imageUrl field in backend schema)
const CATEGORY_ICONS = {
  Breakfast: '🍳',
  Lunch: '🍱',
  Dinner: '🍽️',
  Snacks: '🥪',
  Beverages: '🥤',
  Drinks: '🥤',
  Desserts: '🍩',
  Sweets: '🍮',
  South: '🥘',
  'South Indian': '🥘',
  Chinese: '🍜',
  Fast: '🍔',
  'Fast Food': '🍔',
  Veg: '🥗',
  General: '🍴',
};

function getCategoryIcon(category) {
  if (!category) return '🍴';
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (category.toLowerCase().includes(key.toLowerCase())) return CATEGORY_ICONS[key];
  }
  return '🍴';
}

export default function FoodCard({ item, quantity, onAdd, onIncrease, onDecrease }) {
  const isAvailable = item.isAvailable;
  const hasStock = item.stock === -1 || item.stock > 0;
  const canOrder = isAvailable && hasStock;
  const icon = getCategoryIcon(item.category);

  return (
    <View style={[styles.card, !canOrder && styles.cardUnavailable]}>
      {/* Category icon badge */}
      <View style={styles.iconBadge}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Item info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.price}</Text>
          {item.stock !== -1 && item.stock <= 5 && item.stock > 0 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockText}>Only {item.stock} left</Text>
            </View>
          )}
        </View>
      </View>

      {/* Add / Qty control */}
      <View style={styles.action}>
        {!canOrder ? (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Sold Out</Text>
          </View>
        ) : quantity > 0 ? (
          <View style={styles.qtyControl}>
            <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease} activeOpacity={0.7}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.qtyNum}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease} activeOpacity={0.7}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={onAdd} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>ADD</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  cardUnavailable: { opacity: 0.5 },

  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconText: { fontSize: 26 },

  info: { flex: 1, paddingRight: Spacing.sm },
  name: {
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  category: {
    fontSize: Typography.xs,
    color: Colors.accent,
    fontWeight: Typography.weightSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  description: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 5,
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  price: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
  },
  lowStockBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  lowStockText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: Typography.weightBold,
  },

  action: { minWidth: 80, alignItems: 'center' },

  unavailableBadge: {
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  unavailableText: {
    color: Colors.error,
    fontSize: Typography.xs,
    fontWeight: Typography.weightBold,
  },

  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  qtyBtn: {
    width: 30,
    height: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.lg,
    fontWeight: Typography.weightBold,
    lineHeight: 24,
  },
  qtyNum: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },

  addBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  addBtnText: {
    color: Colors.primary,
    fontWeight: Typography.weightBold,
    fontSize: Typography.sm,
    letterSpacing: 1,
  },
});

