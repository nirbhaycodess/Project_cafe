// src/screens/staff/StaffQueueScreen.js
// Live kitchen queue with status controls

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { orderService } from '../../services/orderService';
import { socketService } from '../../services/socketService';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import OrderCard from '../../components/OrderCard';
import AppButton from '../../components/AppButton';
import { OrderCardSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';

const STATUS_ACTIONS = {
  Received:  [{ label: 'Start Preparing', next: 'Preparing', color: Colors.warning }],
  Preparing: [{ label: 'Mark Ready',      next: 'Ready',     color: Colors.success }],
  Ready:     [{ label: 'Complete Handover', next: 'Completed', color: Colors.info }],
};

export default function StaffQueueScreen() {
  const [queue, setQueue]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null); // orderId being updated

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await orderService.getQueue();
      setQueue(data);
    } catch (e) {
      setError(e.userMessage || 'Could not load the order queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Real-time updates
  useEffect(() => {
    const socket = socketService.connect();

    const handleNew = (newOrder) => {
      setQueue((prev) => {
        if (prev.some((o) => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
    };

    const handleUpdate = ({ orderId, status }) => {
      if (status === 'Completed' || status === 'Cancelled') {
        setQueue((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setQueue((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: status } : o))
        );
      }
    };

    socket.on('newOrder', handleNew);
    socket.on('orderStatusUpdated', handleUpdate);

    return () => {
      socket.off('newOrder', handleNew);
      socket.off('orderStatusUpdated', handleUpdate);
    };
  }, []);

  const handleStatusChange = async (orderId, nextStatus) => {
    setUpdating(orderId);
    try {
      await orderService.updateStatus(orderId, nextStatus);
      // Socket.IO will push the update; also update locally for snappiness
      if (nextStatus === 'Completed' || nextStatus === 'Cancelled') {
        setQueue((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setQueue((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: nextStatus } : o))
        );
      }
    } catch (err) {
      Alert.alert('Update Failed', err.userMessage || 'Could not update order status.');
    } finally {
      setUpdating(null);
    }
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Kitchen Queue</Text>
        </View>
        <View style={{ padding: Spacing.screen }}>
          {[1, 2, 3].map((k) => <OrderCardSkeleton key={k} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Kitchen Queue</Text>
          <Text style={styles.subtitle}>
            {queue.length === 0 ? 'All clear!' : `${queue.length} active order${queue.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        {/* Live indicator */}
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>Live</Text>
        </View>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(o) => o._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title="Queue is empty"
            message="No pending orders right now. New orders will appear here in real time."
          />
        }
        renderItem={({ item: order }) => {
          const actions = STATUS_ACTIONS[order.orderStatus] || [];
          const isUpdating = updating === order._id;

          return (
            <OrderCard
              order={order}
              footer={
                actions.length > 0 ? (
                  <View style={styles.actionRow}>
                    {actions.map((action) => (
                      <AppButton
                        key={action.next}
                        label={action.label}
                        loading={isUpdating}
                        onPress={() => handleStatusChange(order._id, action.next)}
                        style={[styles.actionBtn, { backgroundColor: action.color }]}
                        size="sm"
                        fullWidth={false}
                      />
                    ))}
                  </View>
                ) : null
              }
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.errorLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.error,
  },
  liveLabel: {
    fontSize: Typography.xs,
    color: Colors.error,
    fontWeight: Typography.weightBold,
  },
  list: { padding: Spacing.screen, paddingBottom: Spacing.xxxl },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: { shadowOpacity: 0, elevation: 0 },
});

