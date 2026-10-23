// src/components/AppButton.js
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows } from '../theme';

export default function AppButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',   // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md',           // 'sm' | 'md' | 'lg'
  fullWidth = true,
  style,
  labelStyle,
}) {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    isDisabled && styles.labelDisabled,
    labelStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.textInverse}
          size="small"
        />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    ...Shadows.sm,
  },
  fullWidth: { width: '100%' },

  // Variants
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.accent },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  ghost: { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  danger: { backgroundColor: Colors.error },

  // Sizes
  size_sm: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
  size_md: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  size_lg: { paddingVertical: Spacing.base, paddingHorizontal: Spacing.xl },

  // Label base
  label: {
    fontWeight: Typography.weightBold,
    letterSpacing: 0.3,
  },
  label_primary: { color: Colors.textInverse },
  label_secondary: { color: Colors.textInverse },
  label_outline: { color: Colors.primary },
  label_ghost: { color: Colors.primary },
  label_danger: { color: Colors.textInverse },

  // Label sizes
  labelSize_sm: { fontSize: Typography.sm },
  labelSize_md: { fontSize: Typography.base },
  labelSize_lg: { fontSize: Typography.md },

  disabled: { opacity: 0.5 },
  labelDisabled: {},
});

