// src/components/OrderTimeline.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';

const STEPS = ['Received', 'Preparing', 'Ready', 'Completed'];

function getStepIndex(status) {
  if (status === 'Cancelled') return -1;
  return STEPS.indexOf(status);
}

export default function OrderTimeline({ status }) {
  const currentIdx = getStepIndex(status);
  const cancelled = status === 'Cancelled';

  if (cancelled) {
    return (
      <View style={styles.cancelledBox}>
        <Text style={styles.cancelledText}>Order Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        const isPending = idx > currentIdx;

        return (
          <View key={step} style={styles.stepRow}>
            {/* Connector line above (not for first) */}
            {idx > 0 && (
              <View style={[styles.connector, isDone && styles.connectorDone]} />
            )}
            <View style={styles.stepContent}>
              <View
                style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isActive && styles.dotActive,
                  isPending && styles.dotPending,
                ]}
              >
                {isDone && <Text style={styles.checkmark}>✓</Text>}
                {isActive && <View style={styles.activePulse} />}
              </View>
              <View style={styles.labelBox}>
                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isActive && styles.stepLabelActive,
                    isPending && styles.stepLabelPending,
                  ]}
                >
                  {step === 'Received' ? 'Order Received' :
                   step === 'Ready' ? 'Ready for Pickup' : step}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.sm },
  stepRow: { alignItems: 'flex-start' },
  connector: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 10,
  },
  connectorDone: { backgroundColor: Colors.success },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dotDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dotActive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
  },
  dotPending: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  activePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: Typography.weightBold,
  },
  labelBox: { flex: 1 },
  stepLabel: {
    fontSize: Typography.base,
    color: Colors.textMuted,
    fontWeight: Typography.weightRegular,
  },
  stepLabelDone: {
    color: Colors.success,
    fontWeight: Typography.weightMedium,
  },
  stepLabelActive: {
    color: Colors.textPrimary,
    fontWeight: Typography.weightBold,
  },
  stepLabelPending: { color: Colors.textMuted },
  cancelledBox: {
    backgroundColor: Colors.errorLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelledText: {
    color: Colors.error,
    fontWeight: Typography.weightBold,
    fontSize: Typography.base,
  },
});

