// src/screens/student/OrdersScreen.js
// Student order history with live status updates and QR token display

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { orderService } from '../../services/orderService';
import { socketService } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import OrderCard from '../../components/OrderCard';
import QRTokenCard from '../../components/QRTokenCard';
import OrderTimeline from '../../components/OrderTimeline';
import { OrderCardSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';

export default function OrdersScreen({ newOrder }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null); // orderId of expanded detail

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await orderService.getMyOrders();
      setOrders(data);
      // Auto-expand the most recent active order
      const active = data.find(
        (o) => o.orderStatus !== 'Completed' && o.orderStatus !== 'Cancelled'
      );
      if (active) setExpanded(active._id);
    } catch (e) {
      setError(e.userMessage || 'Could not load your orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // If a new order just came from the cart screen, prepend it
  useEffect(() => {
    if (newOrder) {
      setOrders((prev) => {
        const exists = prev.some((o) => o._id === newOrder._id);
        return exists ? prev : [newOrder, ...prev];
      });
      setExpanded(newOrder._id);
    }
  }, [newOrder]);

  // Socket.IO live updates
  useEffect(() => {
    const socket = socketService.connect();

    const handleStatusUpdate = ({ orderId, status, userId }) => {
      // Only update orders belonging to this user
      if (userId && userId !== user?.id) return;

      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, orderStatus: status } : o))
      );

      if (status === 'Ready') {
        Alert.alert('Order Ready! 🍽️', 'Your food is ready at the counter. Show your QR code!');
      } else if (status === 'Completed') {
        Alert.alert('Order Collected ✅', 'Your order has been verified and handed over. Enjoy!');
      }
    };

    socket.on('orderStatusUpdated', handleStatusUpdate);

    return () => {
      socket.off('orderStatusUpdated', handleStatusUpdate);
    };
  }, [user?.id]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const activeOrders = orders.filter(
    (o) => o.orderStatus !== 'Completed' && o.orderStatus !== 'Cancelled'
  );
  const pastOrders = orders.filter(
    (o) => o.orderStatus === 'Completed' || o.orderStatus === 'Cancelled'
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={{ padding: Spacing.screen }}>
          {[1, 2].map((k) => <OrderCardSkeleton key={k} />)}
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

  const renderOrder = ({ item: order }) => {
    const isExpanded = expanded === order._id;
    return (
      <View style={styles.orderWrapper}>
        <OrderCard
          order={order}
          footer={
            <View>
              {/* Toggle detail */}
              <Text
                style={styles.toggleDetail}
                onPress={() => setExpanded(isExpanded ? null : order._id)}
              >
                {isExpanded ? 'Hide details ▲' : 'Show details ▼'}
              </Text>

              {isExpanded && (
                <View style={styles.detail}>
                  <OrderTimeline status={order.orderStatus} />
                  <View style={styles.divider} />
                  <QRTokenCard order={order} />
                </View>
              )}
            </View>
          }
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSub}>{orders.length} total</Text>
      </View>

      <FlatList
        data={[
          ...(activeOrders.length > 0
            ? [{ _id: '__activeHeader', _type: 'header', label: `Active (${activeOrders.length})` }, ...activeOrders]
            : []),
          ...(pastOrders.length > 0
            ? [{ _id: '__pastHeader', _type: 'header', label: 'Past Orders' }, ...pastOrders]
            : []),
        ]}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="🍽️"
            title="No orders yet"
            message="Place your first order from the menu!"
          />
        }
        renderItem={({ item }) => {
          if (item._type === 'header') {
            return <Text style={styles.sectionHeader}>{item.label}</Text>;
          }
          return renderOrder({ item });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  list: { padding: Spacing.screen, paddingBottom: Spacing.xxxl },
  sectionHeader: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  orderWrapper: {},
  toggleDetail: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.weightSemiBold,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  detail: { marginTop: Spacing.sm },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.md,
  },
});

