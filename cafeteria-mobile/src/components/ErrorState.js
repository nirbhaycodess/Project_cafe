// src/components/ErrorState.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';
import AppButton from './AppButton';

export default function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{message || 'Failed to load data.'}</Text>
      {onRetry && (
        <AppButton
          label="Try Again"
          onPress={onRetry}
          variant="outline"
          size="sm"
          fullWidth={false}
          style={styles.btn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    minHeight: 200,
  },
  icon: { fontSize: 44, marginBottom: Spacing.md },
  title: {
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeightBase,
    marginBottom: Spacing.lg,
  },
  btn: { marginTop: Spacing.sm },
});

