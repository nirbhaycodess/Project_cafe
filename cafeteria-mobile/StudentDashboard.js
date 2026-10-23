// File path: cafeteria-mobile/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from './api';

export default function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' or 'orders'
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({}); // { menuItemId: quantity }
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [menuRes, ordersRes] = await Promise.all([
        api.get('/menu'),
        api.get('/orders/my-orders'),
      ]);
      setMenuItems(menuRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Failed to load cafeteria data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Connect to Socket.IO for live order status updates
    const socket = io(SOCKET_URL);

    socket.on('orderStatusUpdated', (data) => {
      // Update the matching order in state if it belongs to this student
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === data.orderId ? { ...order, orderStatus: data.status } : order
        )
      );

      if (data.status === 'Ready') {
        Alert.alert('Order Ready! 🍽️', 'Your food is ready for pickup at the counter. Show your QR code!');
      } else if (data.status === 'Completed') {
        Alert.alert('Order Claimed ✅', 'Your order has been verified and handed over. Enjoy your meal!');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateCart = (itemId, delta) => {
    setCart((prev) => {
      const currentQty = prev[itemId] || 0;
      const nextQty = currentQty + delta;
      if (nextQty <= 0) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      return { ...prev, [itemId]: nextQty };
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((sum, [itemId, qty]) => {
      const item = menuItems.find((m) => m._id === itemId);
      return sum + (item ? item.price * qty : 0);
    }, 0);
  };

  const handlePlaceOrder = async () => {
    const itemsArray = Object.entries(cart).map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity,
    }));

    if (itemsArray.length === 0) return;

    setPlacingOrder(true);
    try {
      const response = await api.post('/orders', { items: itemsArray });
      const newOrder = response.data.order;

      setCart({});
      setOrders((prev) => [newOrder, ...prev]);
      setActiveTab('orders');
      Alert.alert('Order Placed!', `Token: ${newOrder.orderToken}\nShow the QR code at the counter.`);
    } catch (error) {
      const msg = error.response?.data?.message || 'Could not place order.';
      Alert.alert('Order Failed', msg);
    } finally {
      setPlacingOrder(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Received':
        return '#3498DB';
      case 'Preparing':
        return '#F39C12';
      case 'Ready':
        return '#2ECC71';
      case 'Completed':
        return '#7F8C8D';
      case 'Cancelled':
        return '#E74C3C';
      default:
        return '#34495E';
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'menu' && styles.activeTab]}
          onPress={() => setActiveTab('menu')}
        >
          <Text style={[styles.tabText, activeTab === 'menu' && styles.activeTabText]}>
            Menu ({menuItems.filter((i) => i.isAvailable).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
            My Orders ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'menu' ? (
        <View style={styles.flexOne}>
          <FlatList
            data={menuItems}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const qty = cart[item._id] || 0;
              return (
                <View style={[styles.card, !item.isAvailable && styles.unavailableCard]}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    {item.description ? (
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    ) : null}
                    <Text style={styles.itemPrice}>₹{item.price}</Text>
                  </View>

                  {item.isAvailable ? (
                    <View style={styles.qtyContainer}>
                      {qty > 0 ? (
                        <>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateCart(item._id, -1)}
                          >
                            <Text style={styles.qtyBtnText}>-</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qty}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateCart(item._id, 1)}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={styles.addBtn}
                          onPress={() => updateCart(item._id, 1)}
                        >
                          <Text style={styles.addBtnText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.soldOutBadge}>Unavailable</Text>
                  )}
                </View>
              );
            }}
          />

          {/* Bottom Checkout Bar */}
          {Object.keys(cart).length > 0 && (
            <View style={styles.checkoutBar}>
              <View>
                <Text style={styles.cartTotalLabel}>Total Amount</Text>
                <Text style={styles.cartTotalValue}>₹{getCartTotal()}</Text>
              </View>
              <TouchableOpacity
                style={styles.placeOrderBtn}
                onPress={handlePlaceOrder}
                disabled={placingOrder}
              >
                {placingOrder ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.placeOrderText}>Place Order</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>You haven't placed any orders yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <Text style={styles.tokenText}>Token: #{item.orderToken}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.orderStatus) },
                  ]}
                >
                  <Text style={styles.statusText}>{item.orderStatus}</Text>
                </View>
              </View>

              {/* Order Items List */}
              <View style={styles.orderItemsList}>
                {item.items.map((orderItem, idx) => (
                  <Text key={idx} style={styles.orderItemRow}>
                    {orderItem.quantity}x {orderItem.menuItem?.name || 'Item'} — ₹
                    {orderItem.priceAtPurchase * orderItem.quantity}
                  </Text>
                ))}
              </View>

              <Text style={styles.orderTotal}>Total Paid: ₹{item.totalAmount}</Text>

              {/* Show QR Code only while order is active (not Completed/Cancelled) */}
              {item.orderStatus !== 'Completed' && item.orderStatus !== 'Cancelled' ? (
                <View style={styles.qrWrapper}>
                  <QRCode value={item.orderToken} size={140} />
                  <Text style={styles.qrHint}>
                    Show this QR code to staff for pickup verification
                  </Text>
                </View>
              ) : (
                <Text style={styles.completedNote}>
                  This order has been {item.orderStatus.toLowerCase()}.
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  flexOne: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: { backgroundColor: '#FF6B00' },
  tabText: { fontWeight: '600', color: '#57606F', fontSize: 15 },
  activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  unavailableCard: { opacity: 0.55 },
  cardInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 17, fontWeight: 'bold', color: '#1E272E' },
  itemCategory: { fontSize: 12, color: '#FF6B00', fontWeight: '600', marginVertical: 2 },
  itemDesc: { fontSize: 13, color: '#808E9B', marginVertical: 4 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#2ECC71', marginTop: 4 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: '#FF6B00',
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 12, color: '#1E272E' },
  addBtn: {
    borderWidth: 1.5,
    borderColor: '#FF6B00',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#FF6B00', fontWeight: 'bold', fontSize: 14 },
  soldOutBadge: { color: '#E74C3C', fontWeight: 'bold', fontSize: 13 },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E272E',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cartTotalLabel: { color: '#D2DAE2', fontSize: 12 },
  cartTotalValue: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  placeOrderBtn: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  placeOrderText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenText: { fontSize: 18, fontWeight: 'bold', color: '#1E272E' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  orderItemsList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F2F6',
    paddingVertical: 10,
    marginBottom: 10,
  },
  orderItemRow: { fontSize: 14, color: '#2F3542', marginVertical: 2 },
  orderTotal: { fontSize: 16, fontWeight: 'bold', color: '#1E272E', marginBottom: 12 },
  qrWrapper: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 6,
  },
  qrHint: { fontSize: 12, color: '#808E9B', marginTop: 10, textAlign: 'center' },
  completedNote: { fontSize: 13, color: '#7F8C8D', fontStyle: 'italic', textAlign: 'center' },
  emptyText: { textAlign: 'center', color: '#808E9B', marginTop: 40, fontSize: 15 },
});