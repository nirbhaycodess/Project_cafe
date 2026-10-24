// File path: cafeteria-mobile/src/navigation/StudentNavigator.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../services/api';

export default function StudentNavigator() {
  // 4 Tabs: 'menu' | 'quick' | 'orders' | 'support'
  const [activeTab, setActiveTab] = useState('menu');
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'Card' | 'Counter'
  const [orders, setOrders] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Order Feedback State
  const [ratingMap, setRatingMap] = useState({}); // { orderId: number }
  const [commentMap, setCommentMap] = useState({}); // { orderId: string }
  const [submittingFeedbackId, setSubmittingFeedbackId] = useState(null);

  // Help & Support to Manager Form State
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

  const fetchStudentData = async () => {
    try {
      const [menuRes, ordersRes, supportRes] = await Promise.all([
        api.get('/menu'),
        api.get('/orders/my-orders'),
        api.get('/orders/my-support'),
      ]);
      setMenuItems(menuRes.data);
      setOrders(ordersRes.data);
      setSupportTickets(supportRes.data);
    } catch (error) {
      console.error('Student fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentData();

    const socket = io(SOCKET_URL);
    socket.on('orderStatusUpdated', (data) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === data.orderId ? { ...o, orderStatus: data.status } : o))
      );
      if (data.status === 'Ready') {
        Alert.alert('Order Ready! 🍽️', 'Your order is ready at the counter. Show your QR code!');
      } else if (data.status === 'Completed') {
        Alert.alert('Order Verified ✅', 'Enjoy your meal! Don’t forget to rate your order.');
      }
    });

    return () => socket.disconnect();
  }, []);

  // Cart Helpers
  const updateCart = (itemId, delta) => {
    setCart((prev) => {
      const nextQty = (prev[itemId] || 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: nextQty };
    });
  };

  const getCartTotal = () =>
    Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = menuItems.find((m) => m._id === id);
      return sum + (item ? Number(item.price) * qty : 0);
    }, 0);

  // Place Order with Selected Payment Method
  const handlePlaceOrder = async () => {
    const itemsArray = Object.entries(cart).map(([menuItemId, quantity]) => ({
      menuItemId,
      quantity,
    }));
    if (itemsArray.length === 0) return;

    setPlacingOrder(true);
    try {
      const res = await api.post('/orders', {
        items: itemsArray,
        paymentMethod,
      });
      const newOrder = res.data.order;
      setCart({});
      setOrders((prev) => [newOrder, ...prev]);
      setActiveTab('orders');

      Alert.alert(
        newOrder.orderStatus === 'Ready' ? '⚡ Instant Pickup Ready!' : 'Order Placed! 🎉',
        `Token: #${newOrder.orderToken}\nPayment: ₹${newOrder.totalAmount} (${paymentMethod})\nStatus: ${newOrder.orderStatus}`
      );
    } catch (error) {
      Alert.alert('Order Failed', error.response?.data?.message || 'Could not place order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  // Submit Order Feedback
  const handleSubmitFeedback = async (orderId) => {
    const rating = ratingMap[orderId] || 5;
    const comment = commentMap[orderId] || '';
    setSubmittingFeedbackId(orderId);
    try {
      await api.post(`/orders/${orderId}/feedback`, { rating, comment });
      Alert.alert('Thank You! ⭐', 'Your feedback has been shared with the cafeteria.');
      fetchStudentData();
    } catch (error) {
      Alert.alert('Error', 'Could not submit feedback.');
    } finally {
      setSubmittingFeedbackId(null);
    }
  };

  // Send Help & Support Ticket to Manager
  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert('Missing Details', 'Please enter a subject and message for the Manager.');
      return;
    }
    setSendingSupport(true);
    try {
      await api.post('/orders/support', {
        subject: supportSubject,
        message: supportMessage,
      });
      setSupportSubject('');
      setSupportMessage('');
      Alert.alert('Sent to Manager ✅', 'Your support request has been sent to the Manager.');
      fetchStudentData();
    } catch (error) {
      Alert.alert('Error', 'Failed to send support message.');
    } finally {
      setSendingSupport(false);
    }
  };

  const regularMenu = menuItems.filter((i) => !i.isQuickItem);
  const quickItemsMenu = menuItems.filter((i) => i.isQuickItem);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Received':
        return '#2563EB';
      case 'Preparing':
        return '#D97706';
      case 'Ready':
        return '#2D6A4F';
      case 'Completed':
        return '#6B7280';
      case 'Cancelled':
        return '#DC2626';
      default:
        return '#1B4332';
    }
  };

  const renderMenuItemCard = ({ item }) => {
    const qty = cart[item._id] || 0;
    return (
      <View style={[styles.card, !item.isAvailable && { opacity: 0.55 }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.isQuickItem && (
                <View style={styles.quickBadge}>
                  <Text style={styles.quickBadgeText}>⚡ INSTANT READY</Text>
                </View>
              )}
            </View>
            <Text style={styles.itemCategory}>{item.category}</Text>
            {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </View>

          {item.isAvailable ? (
            <View style={styles.qtyRow}>
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
            <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 12 }}>Sold Out</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top 4-Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'menu', label: `Menu (${regularMenu.length})` },
          { key: 'quick', label: `⚡ Quick (${quickItemsMenu.length})` },
          { key: 'orders', label: `Orders (${orders.length})` },
          { key: 'support', label: 'Help' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.activeTab]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.activeTabText]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TAB 1 & TAB 2: REGULAR MENU OR QUICK PACKET ITEMS */}
      {(activeTab === 'menu' || activeTab === 'quick') && (
        <View style={{ flex: 1 }}>
          {activeTab === 'quick' && (
            <View style={styles.quickBanner}>
              <Text style={styles.quickBannerTitle}>⚡ Quick Packet Instant Pickup</Text>
              <Text style={styles.quickBannerSub}>
                Packaged items skip kitchen prep — status becomes READY immediately!
              </Text>
            </View>
          )}

          <FlatList
            data={activeTab === 'menu' ? regularMenu : quickItemsMenu}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchStudentData();
                }}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {activeTab === 'quick'
                  ? 'No Quick Packet items added by the Manager yet.'
                  : 'No menu items available right now.'}
              </Text>
            }
            renderItem={renderMenuItemCard}
          />

          {/* Bottom Checkout & Payment Bar */}
          {Object.keys(cart).length > 0 && (
            <View style={styles.checkoutBar}>
              {/* Payment Method Selector */}
              <View style={styles.paymentRow}>
                <Text style={styles.payLabel}>Pay via:</Text>
                {['UPI', 'Card', 'Counter'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.payPill,
                      paymentMethod === method && styles.payPillActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        styles.payPillText,
                        paymentMethod === method && styles.payPillTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowBetween}>
                <View>
                  <Text style={{ color: '#A3B18A', fontSize: 12 }}>Total Amount</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>
                    ₹{getCartTotal()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.placeOrderBtn}
                  onPress={handlePlaceOrder}
                  disabled={placingOrder}
                >
                  <Text style={styles.placeOrderText}>
                    {placingOrder ? 'Placing...' : `Pay & Order (${paymentMethod})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* TAB 3: MY ORDERS, LIVE QR & FEEDBACK */}
      {activeTab === 'orders' && (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchStudentData();
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>You haven’t placed any orders yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.orderStatus) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>{item.orderStatus}</Text>
                </View>
              </View>

              <Text style={styles.itemDesc}>
                Payment: ₹{item.totalAmount} • {item.paymentMethod || 'UPI'} ({item.paymentStatus || 'Paid'})
              </Text>

              <View style={styles.divider} />

              {item.items.map((it, idx) => (
                <Text key={idx} style={styles.foodLine}>
                  • {it.quantity}x {it.menuItem?.name || 'Item'} — ₹
                  {it.priceAtPurchase * it.quantity}{' '}
                  {(it.isQuickItem || it.menuItem?.isQuickItem) && '⚡'}
                </Text>
              ))}

              {/* Show QR Code while order is active */}
              {item.orderStatus !== 'Completed' && item.orderStatus !== 'Cancelled' ? (
                <View style={styles.qrWrapper}>
                  <QRCode value={item.orderToken} size={135} />
                  <Text style={styles.qrHint}>
                    Show this QR code at the counter for verification
                  </Text>
                </View>
              ) : null}

              {/* Feedback Section for Completed Orders */}
              {item.orderStatus === 'Completed' && (
                <View style={styles.feedbackBox}>
                  {item.feedback && item.feedback.rating ? (
                    <Text style={styles.feedbackDone}>
                      ⭐ You rated this order {item.feedback.rating}/5
                      {item.feedback.comment ? ` — "${item.feedback.comment}"` : ''}
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.feedbackTitle}>Rate Your Meal & Leave Feedback</Text>
                      <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const selected = (ratingMap[item._id] || 5) >= star;
                          return (
                            <TouchableOpacity
                              key={star}
                              onPress={() =>
                                setRatingMap((prev) => ({ ...prev, [item._id]: star }))
                              }
                            >
                              <Text style={{ fontSize: 22 }}>{selected ? '⭐' : '☆'}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Write feedback for the cafeteria..."
                        value={commentMap[item._id] || ''}
                        onChangeText={(txt) =>
                          setCommentMap((prev) => ({ ...prev, [item._id]: txt }))
                        }
                      />
                      <TouchableOpacity
                        style={styles.submitFeedbackBtn}
                        onPress={() => handleSubmitFeedback(item._id)}
                        disabled={submittingFeedbackId === item._id}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                          {submittingFeedbackId === item._id ? 'Sending...' : 'Submit Feedback'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}

      {/* TAB 4: HELP & SUPPORT TO MANAGER */}
      {activeTab === 'support' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.card}>
            <Text style={styles.tokenTitle}>Help & Support to Manager</Text>
            <Text style={[styles.itemDesc, { marginBottom: 12 }]}>
              Have an issue with an order, payment, or item quality? Send a direct message to the Cafeteria Manager.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Subject (e.g. Order #A1B2C3 Payment / Refund Query)"
              value={supportSubject}
              onChangeText={setSupportSubject}
            />
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="Describe your issue or question for the Manager..."
              multiline
              value={supportMessage}
              onChangeText={setSupportMessage}
            />

            <TouchableOpacity
              style={styles.submitFeedbackBtn}
              onPress={handleSendSupport}
              disabled={sendingSupport}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 }}>
                {sendingSupport ? 'Sending...' : 'Send Message to Manager'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.tokenTitle, { marginBottom: 10, marginTop: 6 }]}>
            My Support Requests ({supportTickets.length})
          </Text>
          {supportTickets.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No support requests submitted yet.</Text>
            </View>
          ) : (
            supportTickets.map((t) => (
              <View key={t._id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <Text style={styles.itemName}>{t.subject}</Text>
                  <View
                    style={[
                      styles.quickBadge,
                      { backgroundColor: t.status === 'Resolved' ? '#D1FAE5' : '#FEF3C7' },
                    ]}
                  >
                    <Text style={styles.quickBadgeText}>{t.status}</Text>
                  </View>
                </View>
                <Text style={[styles.foodLine, { marginTop: 6 }]}>{t.message}</Text>
                <Text style={styles.itemDesc}>
                  Sent: {new Date(t.createdAt).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 4,
    borderRadius: 12,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#1B4332' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#52796F' },
  activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
  quickBanner: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 14,
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  quickBannerTitle: { fontWeight: 'bold', color: '#92400E', fontSize: 14 },
  quickBannerSub: { color: '#92400E', fontSize: 12, marginTop: 2 },
  listContent: { padding: 14, paddingBottom: 150 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  itemCategory: { fontSize: 12, color: '#2D6A4F', fontWeight: '600', marginTop: 2 },
  itemDesc: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  itemPrice: { fontSize: 16, fontWeight: 'bold', color: '#1B4332', marginTop: 6 },
  quickBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quickBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#92400E' },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: '#1B4332',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  qtyText: { fontSize: 15, fontWeight: 'bold', marginHorizontal: 10, color: '#1F2937' },
  addBtn: {
    borderWidth: 1.5,
    borderColor: '#1B4332',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: '#1B4332', fontWeight: 'bold', fontSize: 13 },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1B4332',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  payLabel: { color: '#D8F3DC', fontSize: 12, fontWeight: '600', marginRight: 4 },
  payPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  payPillActive: { backgroundColor: '#52B788' },
  payPillText: { color: '#D8F3DC', fontSize: 12, fontWeight: '600' },
  payPillTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  placeOrderBtn: {
    backgroundColor: '#52B788',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  placeOrderText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  tokenTitle: { fontSize: 17, fontWeight: 'bold', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  foodLine: { fontSize: 14, color: '#374151', marginVertical: 2 },
  qrWrapper: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 10,
  },
  qrHint: { fontSize: 12, color: '#6B7280', marginTop: 8 },
  feedbackBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  feedbackTitle: { fontSize: 14, fontWeight: 'bold', color: '#1B4332', marginBottom: 6 },
  feedbackDone: { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  starRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  input: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 13,
  },
  submitFeedbackBtn: {
    backgroundColor: '#1B4332',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyText: { textAlign: 'center', color: '#6B7280', paddingVertical: 24 },
});