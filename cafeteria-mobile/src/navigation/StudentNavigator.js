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
import { useAuth } from '../context/AuthContext';

// ─── High-Contrast "Campus Executive" Palette ─────────────────────────────────
const C = {
  forest:       '#112A20',
  emeraldDark:  '#2D6A4F',
  emeraldMid:   '#52B788',
  emeraldLight: '#B7E4C7',
  bg:           '#F0F4F1',
  white:        '#FFFFFF',
  cardBorder:   '#CBD5E1', // Slate-300: crisp, clear card boundaries
  goldDark:     '#D97706',
  goldMid:      '#B45309',
  goldLight:    '#FEF3C7',
  redDark:      '#DC2626',
  redLight:     '#FEE2E2',
  blueDark:     '#1D4ED8',
  blueLight:    '#DBEAFE',
  indigoDark:   '#4338CA',
  indigoLight:  '#EEF2FF',
  text:         '#0F172A', // Slate-900: maximum sharpness & legibility
  textMid:      '#334155', // Slate-700: clear secondary text
  textSoft:     '#475569', // Slate-600: easily readable subtitle text
  divider:      '#E2E8F0',
  inputBg:      '#F8FAFC',
};

// ─── Status Meta Helper ───────────────────────────────────────────────────────
const statusMeta = (status) => {
  switch (status) {
    case 'Received':   return { color: '#1E40AF',     bg: '#DBEAFE', label: 'Received'   };
    case 'Preparing':  return { color: '#92400E',     bg: '#FEF3C7', label: 'Preparing'  };
    case 'Ready':      return { color: '#065F46',     bg: '#D1FAE5', label: 'Ready ✓'    };
    case 'Completed':  return { color: '#1F2937',     bg: '#E5E7EB', label: 'Completed'  };
    case 'Cancelled':  return { color: '#991B1B',     bg: '#FEE2E2', label: 'Cancelled'  };
    default:           return { color: C.forest,      bg: '#D1FAE5', label: status       };
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentNavigator() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // ── State (all original variables preserved) ──────────────────────────────
  const [activeTab, setActiveTab] = useState('menu'); // 'menu'|'quick'|'cart'|'orders'|'support'
  const [menuItems, setMenuItems] = useState([]);

  // SEPARATE CARTS for Regular Food vs Quick Packet Food
  const [regularCart, setRegularCart] = useState({}); // { menuItemId: qty }
  const [quickCart, setQuickCart]     = useState({}); // { menuItemId: qty }

  // Separate Payment Method selectors for each bill section
  const [regularPaymentMethod, setRegularPaymentMethod] = useState('UPI');
  const [quickPaymentMethod, setQuickPaymentMethod]     = useState('UPI');

  const [orders, setOrders]                 = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading]               = useState(true);
  const [placingRegular, setPlacingRegular] = useState(false);
  const [placingQuick, setPlacingQuick]     = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  // Order Feedback State
  const [ratingMap, setRatingMap]                   = useState({});
  const [commentMap, setCommentMap]                 = useState({});
  const [submittingFeedbackId, setSubmittingFeedbackId] = useState(null);

  // Help & Support to Manager Form State
  const [supportSubject, setSupportSubject]     = useState('');
  const [supportMessage, setSupportMessage]     = useState('');
  const [supportCategory, setSupportCategory]   = useState('Refund');
  const [selectedOrderId, setSelectedOrderId]   = useState(null);
  const [sendingSupport, setSendingSupport]     = useState(false);

  // ── Data fetch ─────────────────────────────────────────────────────────────
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
        Alert.alert('Order Verified ✅', 'Enjoy your meal! Don\'t forget to rate your order.');
      }
    });

    return () => socket.disconnect();
  }, []);

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const updateRegularCart = (itemId, delta) => {
    setRegularCart((prev) => {
      const nextQty = (prev[itemId] || 0) + delta;
      if (nextQty <= 0) { const copy = { ...prev }; delete copy[itemId]; return copy; }
      return { ...prev, [itemId]: nextQty };
    });
  };

  const updateQuickCart = (itemId, delta) => {
    setQuickCart((prev) => {
      const nextQty = (prev[itemId] || 0) + delta;
      if (nextQty <= 0) { const copy = { ...prev }; delete copy[itemId]; return copy; }
      return { ...prev, [itemId]: nextQty };
    });
  };

  const getCartDetails = (cartObj) => {
    const list = []; let total = 0; let count = 0;
    Object.entries(cartObj).forEach(([id, qty]) => {
      const item = menuItems.find((m) => m._id === id);
      if (item && qty > 0) {
        const subtotal = Number(item.price) * qty;
        total += subtotal; count += qty;
        list.push({ item, qty, subtotal });
      }
    });
    return { list, total, count };
  };

  const regularBill         = getCartDetails(regularCart);
  const quickBill           = getCartDetails(quickCart);
  const totalCartItemsCount = regularBill.count + quickBill.count;

  // ── Checkout handlers ──────────────────────────────────────────────────────
  const handlePlaceRegularOrder = async () => {
    const itemsArray = Object.entries(regularCart).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (itemsArray.length === 0) return;
    setPlacingRegular(true);
    try {
      const res = await api.post('/orders', { items: itemsArray, paymentMethod: regularPaymentMethod });
      const newOrder = res.data.order;
      setRegularCart({});
      setOrders((prev) => [newOrder, ...prev]);
      if (Object.keys(quickCart).length === 0) setActiveTab('orders');
      Alert.alert(
        'Kitchen Order Placed! 🍳',
        `Token: #${newOrder.orderToken}\nBill Paid: ₹${newOrder.totalAmount} (${regularPaymentMethod})\nStatus: ${newOrder.orderStatus} (Sent to Kitchen)`
      );
    } catch (error) {
      Alert.alert('Order Failed', error.response?.data?.message || 'Could not place regular order.');
    } finally { setPlacingRegular(false); }
  };

  const handlePlaceQuickOrder = async () => {
    const itemsArray = Object.entries(quickCart).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (itemsArray.length === 0) return;
    setPlacingQuick(true);
    try {
      const res = await api.post('/orders', { items: itemsArray, paymentMethod: quickPaymentMethod });
      const newOrder = res.data.order;
      setQuickCart({});
      setOrders((prev) => [newOrder, ...prev]);
      if (Object.keys(regularCart).length === 0) setActiveTab('orders');
      Alert.alert(
        '⚡ Quick Packet Order READY!',
        `Token: #${newOrder.orderToken}\nBill Paid: ₹${newOrder.totalAmount} (${quickPaymentMethod})\nStatus: READY FOR INSTANT PICKUP!`
      );
    } catch (error) {
      Alert.alert('Order Failed', error.response?.data?.message || 'Could not place quick order.');
    } finally { setPlacingQuick(false); }
  };

  // ── Feedback ───────────────────────────────────────────────────────────────
  const handleSubmitFeedback = async (orderId) => {
    const rating  = ratingMap[orderId]  || 5;
    const comment = commentMap[orderId] || '';
    setSubmittingFeedbackId(orderId);
    try {
      await api.post(`/orders/${orderId}/feedback`, { rating, comment });
      Alert.alert('Thank You! ⭐', 'Your feedback has been shared with the cafeteria.');
      fetchStudentData();
    } catch (error) {
      Alert.alert('Error', 'Could not submit feedback.');
    } finally { setSubmittingFeedbackId(null); }
  };

  // ── Support ────────────────────────────────────────────────────────────────
  const handleSendSupport = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert('Missing Details', 'Please enter a subject and message for the Manager.');
      return;
    }
    setSendingSupport(true);
    try {
      await api.post('/orders/support', { subject: supportSubject, message: supportMessage });
      setSupportSubject('');
      setSupportMessage('');
      Alert.alert('Sent to Manager ✅', 'Your support request has been sent to the Manager.');
      fetchStudentData();
    } catch (error) {
      Alert.alert('Error', 'Failed to send support message.');
    } finally { setSendingSupport(false); }
  };

  // ── Derived data ───────────────────────────────────────────────────────────
  const regularMenu    = menuItems.filter((i) => !i.isQuickItem);
  const quickItemsMenu = menuItems.filter((i) => i.isQuickItem);

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={C.emeraldDark} />
          <Text style={styles.loadingText}>Loading Campus Cafeteria…</Text>
        </View>
      </View>
    );
  }

  // ── Shared Qty Stepper ─────────────────────────────────────────────────────
  const QtyControl = ({ qty, onDec, onInc, accentColor }) => (
    <View style={styles.qtyRow}>
      {qty > 0 ? (
        <>
          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: accentColor }]} onPress={onDec}>
            <Text style={styles.qtyBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{qty}</Text>
          <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: accentColor }]} onPress={onInc}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );

  // ── Regular Menu Card ──────────────────────────────────────────────────────
  const renderRegularFoodCard = ({ item }) => {
    const qty = regularCart[item._id] || 0;
    return (
      <View style={[styles.regularCard, !item.isAvailable && styles.cardUnavailable]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.tagRow}>
              <View style={styles.kitchenBadge}>
                <Text style={styles.kitchenBadgeText}>🍳 FRESH KITCHEN PREP</Text>
              </View>
              <Text style={styles.categoryLabel}>{item.category}</Text>
            </View>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
            <Text style={[styles.priceLabel, { color: C.emeraldDark }]}>₹{item.price}</Text>
          </View>

          {item.isAvailable ? (
            qty > 0 ? (
              <QtyControl
                qty={qty}
                onDec={() => updateRegularCart(item._id, -1)}
                onInc={() => updateRegularCart(item._id, 1)}
                accentColor={C.emeraldDark}
              />
            ) : (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: C.emeraldDark }]}
                onPress={() => updateRegularCart(item._id, 1)}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.soldOutPill}>
              <Text style={styles.soldOutText}>Sold Out</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Quick Packet Menu Card ─────────────────────────────────────────────────
  const renderQuickFoodCard = ({ item }) => {
    const qty = quickCart[item._id] || 0;
    return (
      <View style={[styles.quickCard, !item.isAvailable && styles.cardUnavailable]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <View style={styles.tagRow}>
              <View style={styles.quickBadge}>
                <Text style={styles.quickBadgeText}>⚡ INSTANT COUNTER PICKUP</Text>
              </View>
              <Text style={[styles.categoryLabel, { color: C.goldMid }]}>{item.category}</Text>
            </View>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
            <Text style={[styles.priceLabel, { color: C.goldMid }]}>₹{item.price}</Text>
          </View>

          {item.isAvailable ? (
            qty > 0 ? (
              <QtyControl
                qty={qty}
                onDec={() => updateQuickCart(item._id, -1)}
                onInc={() => updateQuickCart(item._id, 1)}
                accentColor={C.goldDark}
              />
            ) : (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: C.goldDark }]}
                onPress={() => updateQuickCart(item._id, 1)}
              >
                <Text style={styles.addBtnText}>⚡ Add</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.soldOutPill}>
              <Text style={styles.soldOutText}>Sold Out</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ══════════════ EXECUTIVE HEADER & SIGN OUT ══════════════ */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>STUDENT PORTAL</Text>
        </View>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{user?.name || 'Student'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Campus Online</Text>
            </View>
          </View>
          {signOut && (
            <TouchableOpacity style={styles.signOutPill} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══════════════ TOP 5-TAB PILL BAR ══════════════ */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {[
            { key: 'menu',    emoji: '🍳', label: 'Menu',    badge: regularMenu.length     },
            { key: 'quick',   emoji: '⚡', label: 'Quick',   badge: quickItemsMenu.length  },
            { key: 'cart',    emoji: '🧾', label: 'Cart',    badge: totalCartItemsCount, highlight: totalCartItemsCount > 0 },
            { key: 'orders',  emoji: '📦', label: 'Orders',  badge: orders.length          },
            { key: 'support', emoji: '💬', label: 'Help',    badge: supportTickets.length  },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabPill,
                  isActive && styles.tabPillActive,
                  t.highlight && !isActive && styles.tabPillHighlight,
                ]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={styles.tabEmoji}>{t.emoji}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {t.label}
                </Text>
                {t.badge > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && { color: C.forest }]}>
                      {t.badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ════════════════════════════════════════════════
          TAB 1: REGULAR FOOD MENU
      ════════════════════════════════════════════════ */}
      {activeTab === 'menu' && (
        <View style={{ flex: 1 }}>
          <View style={styles.banner}>
            <View style={[styles.bannerAccent, { backgroundColor: C.emeraldDark }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: C.forest }]}>🍳 Fresh Kitchen Menu</Text>
              <Text style={styles.bannerSub}>Prepared fresh when ordered · Sent to Kitchen Queue</Text>
            </View>
          </View>

          <FlatList
            data={regularMenu}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchStudentData(); }}
                tintColor={C.emeraldDark}
                colors={[C.emeraldDark]}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🍽️</Text>
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptyBody}>No regular kitchen items available right now.</Text>
              </View>
            }
            renderItem={renderRegularFoodCard}
          />

          {regularBill.count > 0 && (
            <TouchableOpacity style={[styles.floatingBar, { backgroundColor: C.forest }]} onPress={() => setActiveTab('cart')}>
              <View>
                <Text style={styles.floatingBarTitle}>🍳 Kitchen Cart · {regularBill.count} items</Text>
                <Text style={styles.floatingBarSub}>Subtotal: ₹{regularBill.total}</Text>
              </View>
              <View style={styles.floatingBarCta}>
                <Text style={styles.floatingBarCtaText}>View Bill →</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ════════════════════════════════════════════════
          TAB 2: QUICK PACKET MENU
      ════════════════════════════════════════════════ */}
      {activeTab === 'quick' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.banner, { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' }]}>
            <View style={[styles.bannerAccent, { backgroundColor: C.goldDark }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: C.goldMid }]}>⚡ Quick Packet Instant Pickup</Text>
              <Text style={[styles.bannerSub, { color: C.textMid }]}>Skips kitchen prep · Status is READY immediately!</Text>
            </View>
          </View>

          <FlatList
            data={quickItemsMenu}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); fetchStudentData(); }}
                tintColor={C.goldDark}
                colors={[C.goldDark]}
              />
            }
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>⚡</Text>
                <Text style={styles.emptyTitle}>No Quick Items Yet</Text>
                <Text style={styles.emptyBody}>No Quick Packet items added by the Manager yet.</Text>
              </View>
            }
            renderItem={renderQuickFoodCard}
          />

          {quickBill.count > 0 && (
            <TouchableOpacity style={[styles.floatingBar, { backgroundColor: C.goldMid }]} onPress={() => setActiveTab('cart')}>
              <View>
                <Text style={styles.floatingBarTitle}>⚡ Quick Cart · {quickBill.count} items</Text>
                <Text style={styles.floatingBarSub}>Instant Pickup Subtotal: ₹{quickBill.total}</Text>
              </View>
              <View style={[styles.floatingBarCta, { backgroundColor: C.goldLight }]}>
                <Text style={[styles.floatingBarCtaText, { color: C.goldMid }]}>View Bill →</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ════════════════════════════════════════════════
          TAB 3: SPLIT BILLING & CHECKOUT
      ════════════════════════════════════════════════ */}
      {activeTab === 'cart' && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>

          {regularBill.count === 0 && quickBill.count === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>Both carts are empty</Text>
              <Text style={styles.emptyBody}>Browse the Menu or Quick tabs to add items.</Text>
            </View>
          ) : (
            <>
              {/* SECTION 1: REGULAR FOOD BILL */}
              <View style={styles.billSection}>
                <View style={[styles.billSectionHeader, { backgroundColor: C.forest }]}>
                  <Text style={styles.billSectionTitle}>🍳 SECTION 1 · REGULAR FOOD BILL</Text>
                  <Text style={styles.billSectionSub}>Sent to Kitchen Queue · Status starts as "Received"</Text>
                </View>

                {regularBill.count === 0 ? (
                  <Text style={styles.emptySectionText}>No regular kitchen items in this bill.</Text>
                ) : (
                  <View style={styles.billBody}>
                    {regularBill.list.map(({ item, qty, subtotal }) => (
                      <View key={item._id} style={styles.billItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.billItemName}>{item.name}</Text>
                          <Text style={styles.billItemMeta}>₹{item.price} × {qty}</Text>
                        </View>
                        <View style={styles.qtyRowSmall}>
                          <TouchableOpacity
                            style={[styles.qtyBtnSm, { backgroundColor: C.emeraldDark }]}
                            onPress={() => updateRegularCart(item._id, -1)}
                          >
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyTextSm}>{qty}</Text>
                          <TouchableOpacity
                            style={[styles.qtyBtnSm, { backgroundColor: C.emeraldDark }]}
                            onPress={() => updateRegularCart(item._id, 1)}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.billSubtotal, { color: C.emeraldDark }]}>₹{subtotal}</Text>
                      </View>
                    ))}

                    <View style={styles.divider} />

                    <Text style={styles.payModeLabel}>Payment Mode</Text>
                    <View style={styles.methodRow}>
                      {['UPI', 'Card', 'Counter'].map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.methodPill, regularPaymentMethod === m && { backgroundColor: C.emeraldDark, borderColor: C.emeraldDark }]}
                          onPress={() => setRegularPaymentMethod(m)}
                        >
                          <Text style={[styles.methodPillText, regularPaymentMethod === m && { color: C.white }]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={[styles.rowBetween, { marginTop: 14 }]}>
                      <Text style={styles.billTotalLabel}>Regular Food Total</Text>
                      <Text style={[styles.billTotalValue, { color: C.emeraldDark }]}>₹{regularBill.total}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.checkoutBtn, { backgroundColor: C.forest }, placingRegular && styles.checkoutBtnDisabled]}
                      onPress={handlePlaceRegularOrder}
                      disabled={placingRegular}
                    >
                      {placingRegular
                        ? <ActivityIndicator color={C.white} />
                        : <Text style={styles.checkoutBtnText}>Pay ₹{regularBill.total} & Order ({regularPaymentMethod}) →</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* SECTION 2: QUICK PACKET BILL */}
              <View style={[styles.billSection, { borderColor: C.goldDark }]}>
                <View style={[styles.billSectionHeader, { backgroundColor: C.goldDark }]}>
                  <Text style={styles.billSectionTitle}>⚡ SECTION 2 · QUICK PACKET BILL</Text>
                  <Text style={styles.billSectionSub}>Skips Kitchen Prep · Status becomes "READY" immediately!</Text>
                </View>

                {quickBill.count === 0 ? (
                  <Text style={styles.emptySectionText}>No quick packet items in this bill.</Text>
                ) : (
                  <View style={styles.billBody}>
                    {quickBill.list.map(({ item, qty, subtotal }) => (
                      <View key={item._id} style={styles.billItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.billItemName}>{item.name} ⚡</Text>
                          <Text style={styles.billItemMeta}>₹{item.price} × {qty}</Text>
                        </View>
                        <View style={styles.qtyRowSmall}>
                          <TouchableOpacity
                            style={[styles.qtyBtnSm, { backgroundColor: C.goldDark }]}
                            onPress={() => updateQuickCart(item._id, -1)}
                          >
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyTextSm}>{qty}</Text>
                          <TouchableOpacity
                            style={[styles.qtyBtnSm, { backgroundColor: C.goldDark }]}
                            onPress={() => updateQuickCart(item._id, 1)}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.billSubtotal, { color: C.goldMid }]}>₹{subtotal}</Text>
                      </View>
                    ))}

                    <View style={styles.divider} />

                    <Text style={styles.payModeLabel}>Payment Mode</Text>
                    <View style={styles.methodRow}>
                      {['UPI', 'Card', 'Counter'].map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.methodPill, quickPaymentMethod === m && { backgroundColor: C.goldDark, borderColor: C.goldDark }]}
                          onPress={() => setQuickPaymentMethod(m)}
                        >
                          <Text style={[styles.methodPillText, quickPaymentMethod === m && { color: C.white }]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={[styles.rowBetween, { marginTop: 14 }]}>
                      <Text style={styles.billTotalLabel}>Quick Packet Total</Text>
                      <Text style={[styles.billTotalValue, { color: C.goldMid }]}>₹{quickBill.total}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.checkoutBtn, { backgroundColor: C.goldDark }, placingQuick && styles.checkoutBtnDisabled]}
                      onPress={handlePlaceQuickOrder}
                      disabled={placingQuick}
                    >
                      {placingQuick
                        ? <ActivityIndicator color={C.white} />
                        : <Text style={styles.checkoutBtnText}>Pay ₹{quickBill.total} & Get Instant QR ({quickPaymentMethod}) →</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════
          TAB 4: MY ORDERS, LIVE QR & FEEDBACK
      ════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchStudentData(); }}
              tintColor={C.emeraldDark}
              colors={[C.emeraldDark]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.ordersHeader}>
              <Text style={styles.ordersHeaderTitle}>My Orders</Text>
              <View style={styles.ordersHeaderBadge}>
                <Text style={styles.ordersHeaderBadgeText}>{orders.length} total</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptyBody}>You haven't placed any orders yet.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isAllQuick = item.items?.every((it) => it.isQuickItem || it.menuItem?.isQuickItem);
            const sm         = statusMeta(item.orderStatus);
            return (
              <View style={[styles.orderCard, isAllQuick ? styles.orderCardQuick : styles.orderCardRegular]}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.orderTypeTag}>
                      {isAllQuick ? '⚡ QUICK PACKET BILL' : '🍳 REGULAR KITCHEN BILL'}
                    </Text>
                    <Text style={styles.orderToken}>Token #{item.orderToken}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: sm.color }]}>{sm.label}</Text>
                  </View>
                </View>

                <Text style={styles.orderPayRow}>
                  Bill Paid: ₹{item.totalAmount} • {item.paymentMethod || 'UPI'} • {item.paymentStatus || 'Paid'}
                </Text>

                <View style={styles.divider} />

                {item.items.map((it, idx) => (
                  <Text key={idx} style={styles.foodLine}>
                    • {it.quantity}× {it.menuItem?.name || 'Item'} — ₹{it.priceAtPurchase * it.quantity}
                    {(it.isQuickItem || it.menuItem?.isQuickItem) ? ' ⚡' : ''}
                  </Text>
                ))}

                {item.orderStatus !== 'Completed' && item.orderStatus !== 'Cancelled' && (
                  <View style={styles.qrWrapper}>
                    <View style={styles.qrCard}>
                      <QRCode value={item.orderToken} size={135} />
                    </View>
                    <Text style={styles.qrHint}>Show this QR code at the counter for pickup verification</Text>
                  </View>
                )}

                {item.orderStatus === 'Completed' && (
                  <View style={styles.feedbackBox}>
                    {item.feedback && item.feedback.rating ? (
                      <View style={styles.feedbackDoneRow}>
                        <Text style={styles.feedbackDone}>
                          ⭐ You rated {item.feedback.rating}/5
                          {item.feedback.comment ? ` — "${item.feedback.comment}"` : ''}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.feedbackTitle}>Rate Your Meal & Leave Feedback</Text>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((star) => {
                            const selected = (ratingMap[item._id] || 5) >= star;
                            return (
                              <TouchableOpacity
                                key={star}
                                onPress={() => setRatingMap((prev) => ({ ...prev, [item._id]: star }))}
                              >
                                <Text style={styles.starText}>{selected ? '⭐' : '☆'}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="Write feedback for the cafeteria..."
                          placeholderTextColor={C.textSoft}
                          value={commentMap[item._id] || ''}
                          onChangeText={(txt) => setCommentMap((prev) => ({ ...prev, [item._id]: txt }))}
                        />
                        <TouchableOpacity
                          style={[styles.feedbackBtn, submittingFeedbackId === item._id && styles.checkoutBtnDisabled]}
                          onPress={() => handleSubmitFeedback(item._id)}
                          disabled={submittingFeedbackId === item._id}
                        >
                          {submittingFeedbackId === item._id
                            ? <ActivityIndicator color={C.white} />
                            : <Text style={styles.checkoutBtnText}>Submit Feedback ⭐</Text>
                          }
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ════════════════════════════════════════════════
          TAB 5: HELP & SUPPORT TO MANAGER
      ════════════════════════════════════════════════ */}
      {activeTab === 'support' && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.supportCard}>
            <View style={styles.supportCardHeader}>
              <Text style={styles.supportCardTitle}>💬 Message the Manager</Text>
              <Text style={styles.supportCardSub}>
                Have an issue with an order, payment, or meal quality? Contact the cafeteria.
              </Text>
            </View>

            <View style={styles.supportCardBody}>
              <Text style={styles.payModeLabel}>Category</Text>
              <View style={[styles.methodRow, { marginBottom: 14 }]}>
                {['Refund', 'Complaint', 'Help'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.methodPill, supportCategory === cat && { backgroundColor: C.indigoDark, borderColor: C.indigoDark }]}
                    onPress={() => setSupportCategory(cat)}
                  >
                    <Text style={[styles.methodPillText, supportCategory === cat && { color: C.white }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.input}
                placeholder="Subject (e.g. Order #A1B2 Payment / Refund Query)"
                placeholderTextColor={C.textSoft}
                value={supportSubject}
                onChangeText={setSupportSubject}
              />
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Describe your issue or question for the Manager…"
                placeholderTextColor={C.textSoft}
                multiline
                value={supportMessage}
                onChangeText={setSupportMessage}
              />

              <TouchableOpacity
                style={[styles.checkoutBtn, { backgroundColor: C.indigoDark }, sendingSupport && styles.checkoutBtnDisabled]}
                onPress={handleSendSupport}
                disabled={sendingSupport}
              >
                {sendingSupport
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={styles.checkoutBtnText}>Send Message to Manager →</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.rowBetween, { marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>My Support Requests</Text>
            <View style={[styles.ordersHeaderBadge, { backgroundColor: C.indigoLight }]}>
              <Text style={[styles.ordersHeaderBadgeText, { color: C.indigoDark }]}>{supportTickets.length}</Text>
            </View>
          </View>

          {supportTickets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyBody}>No support requests submitted yet.</Text>
            </View>
          ) : (
            supportTickets.map((t) => {
              const isResolved = t.status === 'Resolved';
              return (
                <View key={t._id} style={styles.ticketCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.ticketSubject} numberOfLines={1}>{t.subject}</Text>
                    <View style={[styles.ticketStatusBadge, { backgroundColor: isResolved ? '#D1FAE5' : C.goldLight }]}>
                      <Text style={[styles.ticketStatusText, { color: isResolved ? C.emeraldDark : C.goldMid }]}>
                        {t.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.ticketMessage}>{t.message}</Text>
                  <Text style={styles.ticketTime}>
                    Sent: {new Date(t.createdAt).toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: C.white,
    paddingVertical: 36,
    paddingHorizontal: 48,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  loadingText: { marginTop: 14, color: C.textMid, fontSize: 14, fontWeight: '600' },

  // ── Executive Header ──────────────────────────────────────────────────────
  header: {
    backgroundColor: C.forest,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(82,183,136,0.22)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  headerBadgeText: { color: C.emeraldMid, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  headerRow:       { flexDirection: 'row', alignItems: 'center' },
  headerName:      { color: C.white, fontSize: 22, fontWeight: 'bold', letterSpacing: 0.2 },
  statusRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: C.emeraldMid, marginRight: 6 },
  statusText:      { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  signOutPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  signOutText: { color: C.white, fontWeight: '700', fontSize: 13 },

  // ── Tab Bar ───────────────────────────────────────────────────────────────
  tabBarWrapper: {
    paddingHorizontal: 10,
    marginTop: -16,
    zIndex: 10,
  },
  tabBarScroll: {
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    gap: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tabPillActive:    { backgroundColor: C.forest, borderColor: C.forest },
  tabPillHighlight: { backgroundColor: '#FEF3C7', borderColor: C.goldDark },
  tabEmoji:         { fontSize: 14 },
  tabLabel:         { fontSize: 13, fontWeight: '700', color: C.text },
  tabLabelActive:   { color: C.white, fontWeight: '800' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: C.emeraldMid },
  tabBadgeText:   { fontSize: 10, fontWeight: '800', color: C.text },

  // ── Lists ─────────────────────────────────────────────────────────────────
  listContent: { padding: 14, paddingBottom: 100 },

  // ── Banners ───────────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row',
    backgroundColor: '#EDFAF3',
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    padding: 14,
    gap: 10,
    elevation: 1,
  },
  bannerAccent: { width: 4, borderRadius: 4 },
  bannerTitle:  { fontSize: 15, fontWeight: '800' },
  bannerSub:    { fontSize: 13, color: C.textMid, marginTop: 2, fontWeight: '500' },

  // ── Menu Cards ────────────────────────────────────────────────────────────
  regularCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    borderLeftWidth: 5,
    borderLeftColor: C.emeraldDark,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  quickCard: {
    backgroundColor: '#FFFDF0',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderLeftWidth: 5,
    borderLeftColor: C.goldDark,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardUnavailable: { opacity: 0.5 },
  rowBetween:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },

  kitchenBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kitchenBadgeText: { fontSize: 11, fontWeight: '800', color: C.emeraldDark, letterSpacing: 0.4 },
  quickBadge: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  quickBadgeText: { fontSize: 11, fontWeight: '800', color: C.goldMid, letterSpacing: 0.4 },
  categoryLabel:  { fontSize: 12, fontWeight: '700', color: C.emeraldDark },
  itemName:       { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 2 },
  itemDesc:       { fontSize: 13, color: C.textMid, marginTop: 3, lineHeight: 18, fontWeight: '500' },
  priceLabel:     { fontSize: 17, fontWeight: '800', marginTop: 6 },

  // Add / Qty buttons
  addBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnText:  { color: C.white, fontWeight: '800', fontSize: 13 },
  qtyRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText:  { color: C.white, fontSize: 18, fontWeight: '800', lineHeight: 22 },
  qtyText:     { fontSize: 15, fontWeight: '800', color: C.text, minWidth: 24, textAlign: 'center' },
  soldOutPill: {
    backgroundColor: C.redLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  soldOutText: { color: C.redDark, fontWeight: '800', fontSize: 12 },

  // ── Floating Cart Bar ────────────────────────────────────────────────────
  floatingBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    padding: 14,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingBarTitle: { color: C.white, fontWeight: '800', fontSize: 14 },
  floatingBarSub:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  floatingBarCta: {
    backgroundColor: C.emeraldMid,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  floatingBarCtaText: { color: C.white, fontWeight: '800', fontSize: 12 },

  // ── Billing Sections ─────────────────────────────────────────────────────
  billSection: {
    backgroundColor: C.white,
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.emeraldDark,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  billSectionHeader: { padding: 16 },
  billSectionTitle:  { color: C.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
  billSectionSub:    { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 3, fontWeight: '500' },
  billBody:          { padding: 16 },
  billItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  billItemName:   { fontSize: 15, fontWeight: '700', color: C.text },
  billItemMeta:   { fontSize: 13, color: C.textMid, marginTop: 2, fontWeight: '600' },
  billSubtotal:   { fontSize: 15, fontWeight: '800', minWidth: 50, textAlign: 'right' },
  qtyRowSmall:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 8 },
  qtyBtnSm: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyTextSm: { fontSize: 14, fontWeight: '800', color: C.text, minWidth: 20, textAlign: 'center' },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 12 },
  payModeLabel:  { fontSize: 13, fontWeight: '800', color: C.text, marginBottom: 8 },
  methodRow:     { flexDirection: 'row', gap: 8 },
  methodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
  },
  methodPillText:  { fontSize: 13, fontWeight: '700', color: C.text },
  billTotalLabel:  { fontSize: 16, fontWeight: '800', color: C.text },
  billTotalValue:  { fontSize: 22, fontWeight: '800' },
  checkoutBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14,
    elevation: 2,
  },
  checkoutBtnDisabled: { opacity: 0.65 },
  checkoutBtnText:     { color: C.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.2 },
  emptySectionText: { padding: 20, textAlign: 'center', color: C.textMid, fontSize: 13, fontWeight: '500' },

  // ── Orders Tab ────────────────────────────────────────────────────────────
  ordersHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  ordersHeaderTitle: { fontSize: 20, fontWeight: '800', color: C.forest },
  ordersHeaderBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ordersHeaderBadgeText: { fontSize: 12, fontWeight: '800', color: C.emeraldDark },

  orderCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  orderCardRegular: { borderLeftWidth: 5, borderLeftColor: C.emeraldDark },
  orderCardQuick:   { borderLeftWidth: 5, borderLeftColor: C.goldDark },
  orderTypeTag: { fontSize: 11, fontWeight: '800', color: C.textMid, letterSpacing: 0.4, marginBottom: 3 },
  orderToken:   { fontSize: 18, fontWeight: '800', color: C.text },
  statusBadge:  { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 50 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  orderPayRow:  { fontSize: 13, color: C.textMid, marginTop: 6, fontWeight: '600' },
  foodLine:     { fontSize: 14, color: C.text, marginVertical: 3, fontWeight: '600' },

  // QR
  qrWrapper: {
    alignItems: 'center',
    paddingVertical: 18,
    marginTop: 10,
  },
  qrCard: {
    padding: 16,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    elevation: 2,
  },
  qrHint: { fontSize: 13, color: C.textMid, marginTop: 10, textAlign: 'center', fontWeight: '600' },

  // Feedback
  feedbackBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  feedbackDoneRow: {
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
    padding: 12,
  },
  feedbackDone:  { fontSize: 13, color: C.emeraldDark, fontWeight: '700' },
  feedbackTitle: { fontSize: 14, fontWeight: '800', color: C.forest, marginBottom: 10 },
  starRow:       { flexDirection: 'row', gap: 8, marginBottom: 12 },
  starText:      { fontSize: 26 },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    padding: 13,
    borderRadius: 12,
    marginBottom: 10,
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
  },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  feedbackBtn: {
    backgroundColor: C.emeraldDark,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },

  // ── Support Tab ───────────────────────────────────────────────────────────
  supportCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  supportCardHeader: {
    backgroundColor: C.forest,
    padding: 18,
  },
  supportCardTitle: { fontSize: 17, fontWeight: '800', color: C.white },
  supportCardSub:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '500' },
  supportCardBody:  { padding: 16 },
  sectionTitle:     { fontSize: 18, fontWeight: '800', color: C.forest },

  ticketCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  ticketSubject:     { fontSize: 15, fontWeight: '700', color: C.text, flex: 1, marginRight: 8 },
  ticketStatusBadge: { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4 },
  ticketStatusText:  { fontSize: 11, fontWeight: '800' },
  ticketMessage:     { fontSize: 13, color: C.textMid, marginTop: 6, lineHeight: 19, fontWeight: '500' },
  ticketTime:        { fontSize: 12, color: C.textSoft, marginTop: 6, fontWeight: '500' },

  // ── Empty States ──────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    marginTop: 10,
    elevation: 2,
  },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 6 },
  emptyBody:  { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
});
