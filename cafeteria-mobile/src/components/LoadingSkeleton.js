// src/components/LoadingSkeleton.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '../theme';

function SkeletonBox({ width, height, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[{ width, height, backgroundColor: Colors.border, borderRadius: Radius.sm, opacity }, style]}
    />
  );
}

export function MenuItemSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <SkeletonBox width="70%" height={16} style={{ marginBottom: 8 }} />
        <SkeletonBox width="40%" height={12} style={{ marginBottom: 8 }} />
        <SkeletonBox width="55%" height={11} style={{ marginBottom: 8 }} />
        <SkeletonBox width="30%" height={16} />
      </View>
      <SkeletonBox width={60} height={32} style={{ borderRadius: Radius.md }} />
    </View>
  );
}

export function OrderCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBox width="50%" height={18} />
        <SkeletonBox width={80} height={24} style={{ borderRadius: Radius.full }} />
      </View>
      <SkeletonBox width="80%" height={12} style={{ marginTop: 12 }} />
      <SkeletonBox width="60%" height={12} style={{ marginTop: 6 }} />
      <SkeletonBox width="40%" height={14} style={{ marginTop: 12 }} />
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
    justifyContent: 'space-between',
  },
  info: { flex: 1, paddingRight: Spacing.base },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
});

