// File path: cafeteria-mobile/src/screens/manager/ManagerDashboard.js
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
  Switch,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── High-Contrast "Campus Executive" Palette ─────────────────────────────────
const C = {
  forest:       '#112A20',
  emeraldDark:  '#2D6A4F',
  emeraldMid:   '#52B788',
  emeraldLight: '#B7E4C7',
  bg:           '#F0F4F1',
  white:        '#FFFFFF',
  cardBorder:   '#CBD5E1', // Slate-300: visible card boundaries
  goldDark:     '#D97706',
  goldMid:      '#B45309',
  goldLight:    '#FEF3C7',
  redDark:      '#DC2626',
  redLight:     '#FEE2E2',
  blueDark:     '#1D4ED8',
  blueLight:    '#DBEAFE',
  indigoDark:   '#4338CA',
  indigoLight:  '#EEF2FF',
  text:         '#0F172A', // Slate-900: sharp, deep text
  textMid:      '#334155', // Slate-700: high-contrast secondary text
  textSoft:     '#475569', // Slate-600: clear, readable subtitle text
  divider:      '#E2E8F0',
  inputBg:      '#F8FAFC',
};

const statusMeta = (status) => {
  switch (status) {
    case 'Received':   return { color: '#1E40AF', bg: '#DBEAFE', label: 'Received'   };
    case 'Preparing':  return { color: '#92400E', bg: '#FEF3C7', label: 'Preparing'  };
    case 'Ready':      return { color: '#065F46', bg: '#D1FAE5', label: 'Ready ✓'    };
    case 'Completed':  return { color: '#1F2937', bg: '#E5E7EB', label: 'Completed'  };
    case 'Cancelled':  return { color: '#991B1B', bg: '#FEE2E2', label: 'Cancelled'  };
    default:           return { color: C.forest,  bg: '#D1FAE5', label: status       };
  }
};

const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

export default function ManagerDashboard() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // Tabs: 'queue' | 'verify' | 'verifiedHistory' | 'menu' | 'staff' | 'support'
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [verifiedOrders, setVerifiedOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [feedbackOrders, setFeedbackOrders] = useState([]);
  const [replyTextMap, setReplyTextMap] = useState({}); // { ticketId: string }
  const [supportSubTab, setSupportSubTab] = useState('tickets'); // 'tickets' | 'feedback'

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // QR Scanner & Verification State
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedReceipt, setVerifiedReceipt] = useState(null);

  // Add / Edit Menu Form State
  const [editingItemId, setEditingItemId] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Snacks');
  const [isQuickItem, setIsQuickItem] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const fetchManagerData = async () => {
    try {
      const [queueRes, verifiedRes, menuRes, staffRes, supportRes, feedbackRes] =
        await Promise.all([
          api.get('/orders/queue'),
          api.get('/orders/verified'),
          api.get('/menu'),
          api.get('/orders/staff-list'),
          api.get('/orders/all-support'),
          api.get('/orders/feedback-list'),
        ]);
      setQueue(queueRes.data);
      setVerifiedOrders(verifiedRes.data);
      setMenuItems(menuRes.data);
      setStaffList(staffRes.data);
      setSupportTickets(supportRes.data);
      setFeedbackOrders(feedbackRes.data);
    } catch (error) {
      console.error('Manager load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchManagerData();

    const socket = io(SOCKET_URL);
    socket.on('newOrder', (newOrder) => {
      setQueue((prev) => [...prev, newOrder]);
    });
    socket.on('orderStatusUpdated', () => {
      fetchManagerData();
    });
    socket.on('newSupportTicket', (newTicket) => {
      setSupportTickets((prev) => [newTicket, ...prev]);
      Alert.alert(
        `New Student ${newTicket.category || 'Support'} Request`,
        `${newTicket.user?.name || 'A student'}: ${newTicket.subject}`
      );
    });

    return () => socket.disconnect();
  }, []);

  // 1. Update Order Status
  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      fetchManagerData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status.');
    }
  };

  // 2. Verify Order via QR or Manual Token
  const verifyOrderToken = async (tokenStr) => {
    const cleanToken = tokenStr.trim().toUpperCase();
    if (!cleanToken) {
      Alert.alert('Missing Token', 'Scan a QR code or enter a 6-character token.');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.put('/orders/verify', { orderToken: cleanToken });
      setVerifiedReceipt(res.data.order);
      setManualToken('');
      setScannerOpen(false);
      fetchManagerData();
      Alert.alert('Order Verified ✅', `Token #${res.data.order.orderToken} completed!`);
    } catch (error) {
      Alert.alert('Verification Failed ❌', error.response?.data?.message || 'Invalid token.');
    } finally {
      setVerifying(false);
      setTimeout(() => setScanned(false), 1500);
    }
  };

  // 3. Add or Update Menu Item
  const handleSaveMenuItem = async () => {
    if (!newName.trim() || !newPrice.trim()) {
      Alert.alert('Missing Fields', 'Please enter item name and price.');
      return;
    }

    setSavingItem(true);
    try {
      const payload = {
        name: newName.trim(),
        description: newDesc.trim(),
        price: Number(newPrice),
        category: newCategory.trim() || 'Snacks',
        isQuickItem,
      };

      if (editingItemId) {
        await api.put(`/menu/${editingItemId}`, payload);
        Alert.alert('Updated', 'Menu item updated successfully!');
      } else {
        await api.post('/menu', { ...payload, isAvailable: true, stock: -1 });
        Alert.alert(
          'Added',
          isQuickItem ? 'Quick Packet Item added (Instant Ready)!' : 'Menu item added!'
        );
      }

      setEditingItemId(null);
      setNewName('');
      setNewDesc('');
      setNewPrice('');
      setNewCategory('Snacks');
      setIsQuickItem(false);
      fetchManagerData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save menu item.');
    } finally {
      setSavingItem(false);
    }
  };

  const startEditItem = (item) => {
    setEditingItemId(item._id);
    setNewName(item.name);
    setNewDesc(item.description || '');
    setNewPrice(String(item.price));
    setNewCategory(item.category || 'Snacks');
    setIsQuickItem(Boolean(item.isQuickItem));
  };

  const handleToggleAvailability = async (item) => {
    try {
      await api.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
      fetchManagerData();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle availability.');
    }
  };

  const handleToggleQuickItem = async (item) => {
    try {
      await api.put(`/menu/${item._id}`, { isQuickItem: !item.isQuickItem });
      fetchManagerData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update quick item status.');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    try {
      await api.delete(`/menu/${itemId}`);
      fetchManagerData();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item.');
    }
  };

  // 4. Approve / Manage Staff
  const handleStaffStatus = async (staffId, accountStatus) => {
    try {
      const res = await api.put(`/orders/staff/${staffId}/status`, { accountStatus });
      Alert.alert('Staff Updated', res.data.message);
      fetchManagerData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update staff member.');
    }
  };

  // 5. Resolve Student Support Ticket / Approve Refund
  const handleResolveTicket = async (ticketId, markOrderRefunded = false) => {
    const reply = replyTextMap[ticketId] ?? '';
    try {
      const res = await api.put(`/orders/support/${ticketId}/resolve`, {
        status: markOrderRefunded ? 'Refunded' : 'Resolved',
        managerReply:
          reply ||
          (markOrderRefunded
            ? 'Your refund has been approved by the Manager.'
            : 'Resolved by Cafeteria Manager.'),
        markOrderRefunded,
      });
      Alert.alert('Success ✅', res.data.message);
      fetchManagerData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update ticket.');
    }
  };

  const pendingStaff = staffList.filter((s) => s.accountStatus === 'Pending');
  const activeStaff = staffList.filter((s) => s.accountStatus !== 'Pending');
  const openTicketsCount = supportTickets.filter((t) => t.status === 'Open').length;

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={C.emeraldDark} />
          <Text style={styles.loadingText}>Loading Manager Console…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ══════════════ EXECUTIVE HEADER & SIGN OUT ══════════════ */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>MANAGER PORTAL</Text>
        </View>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{user?.name || 'Manager'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Operations Online</Text>
            </View>
          </View>
          {signOut && (
            <TouchableOpacity style={styles.signOutPill} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══════════════ 6-TAB SCROLLABLE PILL BAR ══════════════ */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {[
            { key: 'queue', emoji: '👨‍🍳', label: 'Queue', count: queue.length },
            { key: 'verify', emoji: '📷', label: 'Scan QR' },
            { key: 'verifiedHistory', emoji: '✅', label: 'Done', count: verifiedOrders.length },
            { key: 'menu', emoji: '🍽️', label: 'Menu', count: menuItems.length },
            {
              key: 'staff',
              emoji: '👥',
              label: 'Staff',
              count: pendingStaff.length ? `${pendingStaff.length}!` : activeStaff.length,
              urgent: pendingStaff.length > 0,
            },
            {
              key: 'support',
              emoji: '💬',
              label: 'Help',
              count: openTicketsCount ? `${openTicketsCount}!` : supportTickets.length,
              urgent: openTicketsCount > 0,
            },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tabPill,
                  isActive && styles.tabPillActive,
                  t.urgent && !isActive && styles.tabPillUrgent,
                ]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={styles.tabEmoji}>{t.emoji}</Text>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {t.label}
                </Text>
                {t.count !== undefined && (
                  <View
                    style={[
                      styles.tabBadge,
                      isActive && styles.tabBadgeActive,
                      t.urgent && !isActive && styles.tabBadgeUrgent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        isActive && { color: C.forest },
                        t.urgent && !isActive && { color: C.white },
                      ]}
                    >
                      {t.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ════════════════════════════════════════════════
          TAB 1: LIVE KITCHEN QUEUE
      ════════════════════════════════════════════════ */}
      {activeTab === 'queue' && (
        <FlatList
          data={queue}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchManagerData();
              }}
              tintColor={C.emeraldDark}
              colors={[C.emeraldDark]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Live Kitchen Queue</Text>
                <Text style={styles.sectionSubtitle}>
                  Monitor active orders, prep statuses, and counter handovers
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{queue.length} active</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>Queue Clear!</Text>
              <Text style={styles.emptyBody}>No active orders in the queue right now.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sm = statusMeta(item.orderStatus);
            const isReady = item.orderStatus === 'Ready';
            const isPreparing = item.orderStatus === 'Preparing';
            const isReceived = item.orderStatus === 'Received';
            const hasQuickItem = item.items?.some((it) => it.isQuickItem || it.menuItem?.isQuickItem);

            return (
              <View
                style={[
                  styles.card,
                  isReady ? styles.cardReady : isPreparing ? styles.cardPreparing : styles.cardReceived,
                ]}
              >
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.tagRow}>
                      <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                      {hasQuickItem && (
                        <View style={styles.quickTag}>
                          <Text style={styles.quickTagText}>⚡ Quick Packet</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.subText}>
                      {item.user?.name || 'Student'} • ID: {item.user?.collegeId || 'N/A'}
                    </Text>
                  </View>

                  <View style={[styles.statusPill, { backgroundColor: sm.bg }]}>
                    <Text style={[styles.statusPillText, { color: sm.color }]}>{sm.label}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.itemsBox}>
                  {item.items.map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemBullet}>•</Text>
                      <Text style={styles.itemQuantity}>{it.quantity}×</Text>
                      <Text style={styles.itemName}>
                        {it.menuItem?.name || 'Item'}
                        {(it.isQuickItem || it.menuItem?.isQuickItem) ? ' ⚡' : ''}
                      </Text>
                      <Text style={styles.itemPrice}>₹{it.priceAtPurchase * it.quantity}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.rowBetween, { marginTop: 12 }]}>
                  <Text style={styles.totalLabel}>Order Bill</Text>
                  <Text style={styles.totalLine}>₹{item.totalAmount}</Text>
                </View>

                <View style={styles.actionContainer}>
                  {(isReceived || isPreparing) && (
                    <View style={styles.actionPrepRow}>
                      {isReceived && (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnPreparing]}
                          onPress={() => handleStatusChange(item._id, 'Preparing')}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionBtnText} numberOfLines={1}>🍳 Mark Preparing</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnReady]}
                        onPress={() => handleStatusChange(item._id, 'Ready')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnText} numberOfLines={1}>✓ Mark Ready</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnVerify, styles.actionBtnFull]}
                    onPress={() => verifyOrderToken(item.orderToken)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText} numberOfLines={1}>🤝 Verify & Handover</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ════════════════════════════════════════════════
          TAB 2: VERIFY QR SCANNER
      ════════════════════════════════════════════════ */}
      {activeTab === 'verify' && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify Student Order QR</Text>
            <Text style={styles.cardSubtitle}>
              Scan the student's digital QR code or enter their 6-character token below.
            </Text>

            {!scannerOpen ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!permission?.granted) {
                    const res = await requestPermission();
                    if (!res.granted) {
                      Alert.alert(
                        'Permission Required',
                        'Camera access is needed to scan QR codes.'
                      );
                      return;
                    }
                  }
                  setScanned(false);
                  setScannerOpen(true);
                }}
              >
                <Text style={styles.primaryBtnText}>📷 Open Camera QR Scanner</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={
                    scanned
                      ? undefined
                      : ({ data }) => {
                          setScanned(true);
                          verifyOrderToken(data);
                        }
                  }
                />
                <TouchableOpacity
                  style={styles.closeCameraBtn}
                  onPress={() => setScannerOpen(false)}
                >
                  <Text style={styles.closeCameraBtnText}>✕ Close Camera</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.orDividerRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR MANUAL TOKEN</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.manualRow}>
              <TextInput
                style={styles.tokenInput}
                placeholder="TOKEN (e.g. A4B9C2)"
                placeholderTextColor={C.textMid}
                value={manualToken}
                onChangeText={setManualToken}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.verifyBtn, verifying && styles.btnDisabled]}
                onPress={() => verifyOrderToken(manualToken)}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color={C.white} size="small" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {verifiedReceipt && (
            <View style={[styles.card, styles.verifiedSuccessCard]}>
              <View style={styles.successBadgeRow}>
                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>✅ ORDER VERIFIED & COMPLETED</Text>
                </View>
                <Text style={styles.verifiedByText}>Verified by Manager</Text>
              </View>

              <Text style={styles.tokenTitleLarge}>Token #{verifiedReceipt.orderToken}</Text>
              <Text style={styles.subText}>
                Student: {verifiedReceipt.user?.name} (ID: {verifiedReceipt.user?.collegeId || 'N/A'})
              </Text>

              <View style={styles.divider} />

              <View style={styles.itemsBox}>
                {verifiedReceipt.items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemBullet}>•</Text>
                    <Text style={styles.itemQuantity}>{it.quantity}×</Text>
                    <Text style={styles.itemName}>{it.menuItem?.name || 'Item'}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.rowBetween, { marginTop: 12 }]}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalLine}>₹{verifiedReceipt.totalAmount}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════
          TAB 3: SEE ALL VERIFIED ORDERS
      ════════════════════════════════════════════════ */}
      {activeTab === 'verifiedHistory' && (
        <FlatList
          data={verifiedOrders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Completed Handover History</Text>
                <Text style={styles.sectionSubtitle}>
                  All orders verified by Staff and Managers
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{verifiedOrders.length} completed</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Verified Orders Yet</Text>
              <Text style={styles.emptyBody}>Completed meal pickups will be logged here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedTagText}>
                    ✓ {item.verifiedBy?.name || 'Staff'} ({item.verifiedBy?.role || 'Staff'})
                  </Text>
                </View>
              </View>

              <Text style={styles.subText}>
                Student: {item.user?.name || 'Student'} • ID: {item.user?.collegeId || 'N/A'}
              </Text>
              {item.verifiedAt && (
                <Text style={styles.timeText}>
                  Time: {new Date(item.verifiedAt).toLocaleString()}
                </Text>
              )}

              <View style={styles.divider} />

              <View style={styles.itemsBox}>
                {item.items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemBullet}>•</Text>
                    <Text style={styles.itemQuantity}>{it.quantity}×</Text>
                    <Text style={styles.itemName}>{it.menuItem?.name || 'Item'}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.rowBetween, { marginTop: 12 }]}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalLine}>₹{item.totalAmount}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* ════════════════════════════════════════════════
          TAB 4: MENU EDIT & QUICK PACKET ITEMS
      ════════════════════════════════════════════════ */}
      {activeTab === 'menu' && (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editingItemId ? '✏️ Edit Menu Item' : '➕ Add Menu / Quick Item'}
              </Text>
              <Text style={styles.cardSubtitle}>
                Add fresh kitchen items or instant-pickup quick packet food
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Item Name (e.g. Masala Dosa / Lays Chips)"
                placeholderTextColor={C.textMid}
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Description (ingredients, serving size, etc.)"
                placeholderTextColor={C.textMid}
                value={newDesc}
                onChangeText={setNewDesc}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Price (₹)"
                  placeholderTextColor={C.textMid}
                  keyboardType="numeric"
                  value={newPrice}
                  onChangeText={setNewPrice}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Category (e.g. Meals, Snacks)"
                  placeholderTextColor={C.textMid}
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.switchTitle}>⚡ Quick Packet Item (Instant Pickup)</Text>
                  <Text style={styles.subText}>
                    Automatically sets order status to READY immediately upon checkout
                  </Text>
                </View>
                <Switch
                  value={isQuickItem}
                  onValueChange={setIsQuickItem}
                  trackColor={{ false: '#D1D5DB', true: C.emeraldMid }}
                  thumbColor={isQuickItem ? C.emeraldDark : '#F4F4F5'}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, savingItem && styles.btnDisabled]}
                onPress={handleSaveMenuItem}
                disabled={savingItem}
              >
                <Text style={styles.primaryBtnText}>
                  {savingItem ? 'Saving…' : editingItemId ? '✓ Save Changes' : '+ Add Item to Menu'}
                </Text>
              </TouchableOpacity>

              {editingItemId && (
                <TouchableOpacity
                  style={styles.cancelEditBtn}
                  onPress={() => {
                    setEditingItemId(null);
                    setNewName('');
                    setNewDesc('');
                    setNewPrice('');
                    setIsQuickItem(false);
                  }}
                >
                  <Text style={styles.cancelEditText}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={styles.tagRow}>
                    <Text style={styles.tokenTitle}>{item.name}</Text>
                    {item.isQuickItem && (
                      <View style={styles.quickTag}>
                        <Text style={styles.quickTagText}>⚡ Quick Packet</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.subText}>
                    {item.category} • ₹{item.price}{' '}
                    {item.isQuickItem ? '• Instant Pickup' : '• Fresh Kitchen Prep'}
                  </Text>
                  {item.description ? (
                    <Text style={styles.itemDescText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[
                    styles.availabilityBadge,
                    { backgroundColor: item.isAvailable ? '#D1FAE5' : C.redLight, borderColor: item.isAvailable ? '#A7F3D0' : '#FECACA' },
                  ]}
                  onPress={() => handleToggleAvailability(item)}
                >
                  <Text
                    style={[
                      styles.availabilityBadgeText,
                      { color: item.isAvailable ? C.emeraldDark : C.redDark },
                    ]}
                  >
                    {item.isAvailable ? '● Available' : '● Sold Out'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuActionRow}>
                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: C.indigoLight }]}
                  onPress={() => startEditItem(item)}
                >
                  <Text style={[styles.smallActionText, { color: C.indigoDark }]}>✏️ Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: C.goldLight }]}
                  onPress={() => handleToggleQuickItem(item)}
                >
                  <Text style={[styles.smallActionText, { color: C.goldMid }]}>
                    {item.isQuickItem ? '🍳 Set Regular' : '⚡ Set Quick'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallActionBtn, { backgroundColor: C.redLight }]}
                  onPress={() => handleDeleteMenuItem(item._id)}
                >
                  <Text style={[styles.smallActionText, { color: C.redDark }]}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* ════════════════════════════════════════════════
          TAB 5: APPROVE STAFF REQUESTS & ACTIVE STAFF
      ════════════════════════════════════════════════ */}
      {activeTab === 'staff' && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {/* Pending requests */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Pending Staff Requests</Text>
              <Text style={styles.sectionSubtitle}>Review and approve new cafeteria staff</Text>
            </View>
            <View
              style={[
                styles.countBadge,
                pendingStaff.length > 0 && { backgroundColor: C.goldLight, borderColor: '#FDE68A' },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  pendingStaff.length > 0 && { color: C.goldMid },
                ]}
              >
                {pendingStaff.length} pending
              </Text>
            </View>
          </View>

          {pendingStaff.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>All Caught Up!</Text>
              <Text style={styles.emptyBody}>No pending Staff registration requests.</Text>
            </View>
          ) : (
            pendingStaff.map((st) => (
              <View key={st._id} style={styles.card}>
                <View style={styles.memberHeaderRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(st.name)}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.memberName}>{st.name}</Text>
                    <Text style={styles.subText}>{st.email}</Text>
                  </View>
                  <View style={styles.pendingTag}>
                    <Text style={styles.pendingTagText}>Requested: Staff</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnReady]}
                    onPress={() => handleStaffStatus(st._id, 'Approved')}
                  >
                    <Text style={styles.actionBtnText}>✓ Approve Staff</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnReject]}
                    onPress={() => handleStaffStatus(st._id, 'Rejected')}
                  >
                    <Text style={[styles.actionBtnText, { color: C.redDark }]}>✕ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {/* Active directory */}
          <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
            <View>
              <Text style={styles.sectionTitle}>Active Staff Directory</Text>
              <Text style={styles.sectionSubtitle}>Manage existing staff permissions</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeStaff.length} members</Text>
            </View>
          </View>

          {activeStaff.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Active Staff</Text>
              <Text style={styles.emptyBody}>Approved staff members will appear here.</Text>
            </View>
          ) : (
            activeStaff.map((st) => {
              const isApproved = st.accountStatus === 'Approved';
              return (
                <View key={st._id} style={styles.card}>
                  <View style={styles.memberHeaderRow}>
                    <View style={[styles.avatar, { backgroundColor: C.emeraldDark }]}>
                      <Text style={styles.avatarText}>{initials(st.name)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.memberName}>{st.name}</Text>
                      <Text style={styles.subText}>{st.email}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: isApproved ? '#D1FAE5' : C.redLight },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isApproved ? C.emeraldDark : C.redDark },
                        ]}
                      >
                        {st.accountStatus}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.actionRow, { marginTop: 12 }]}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        isApproved ? styles.actionBtnReject : styles.actionBtnReady,
                      ]}
                      onPress={() =>
                        handleStaffStatus(
                          st._id,
                          isApproved ? 'Suspended' : 'Approved'
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.actionBtnText,
                          isApproved && { color: C.redDark },
                        ]}
                      >
                        {isApproved ? 'Suspend Access' : 'Reactivate Access'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════
          TAB 6: STUDENT HELP, REFUNDS & FEEDBACK
      ════════════════════════════════════════════════ */}
      {activeTab === 'support' && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchManagerData();
              }}
              tintColor={C.emeraldDark}
              colors={[C.emeraldDark]}
            />
          }
        >
          {/* Sub-tab segmented pill switch */}
          <View style={styles.subTabBar}>
            <TouchableOpacity
              style={[
                styles.subTabPill,
                supportSubTab === 'tickets' && styles.subTabPillActive,
              ]}
              onPress={() => setSupportSubTab('tickets')}
            >
              <Text
                style={[
                  styles.subTabPillText,
                  supportSubTab === 'tickets' && styles.subTabPillTextActive,
                ]}
              >
                💸 Refunds & Complaints ({supportTickets.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subTabPill,
                supportSubTab === 'feedback' && styles.subTabPillActive,
              ]}
              onPress={() => setSupportSubTab('feedback')}
            >
              <Text
                style={[
                  styles.subTabPillText,
                  supportSubTab === 'feedback' && styles.subTabPillTextActive,
                ]}
              >
                ⭐ Meal Feedback ({feedbackOrders.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sub-tab 1: Tickets */}
          {supportSubTab === 'tickets' ? (
            supportTickets.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>All Tickets Resolved!</Text>
                <Text style={styles.emptyBody}>
                  No student complaints, refund requests, or help inquiries.
                </Text>
              </View>
            ) : (
              supportTickets.map((t) => {
                const isRefund = t.category === 'Refund';
                const isComplaint = t.category === 'Complaint';
                const borderColor = isRefund ? C.redDark : isComplaint ? C.goldDark : C.blueDark;

                return (
                  <View
                    key={t._id}
                    style={[styles.card, { borderLeftWidth: 5, borderLeftColor: borderColor }]}
                  >
                    <View style={styles.rowBetween}>
                      <View
                        style={[
                          styles.categoryTag,
                          {
                            backgroundColor: isRefund
                              ? C.redLight
                              : isComplaint
                              ? C.goldLight
                              : C.blueLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryTagText,
                            {
                              color: isRefund
                                ? C.redDark
                                : isComplaint
                                ? C.goldMid
                                : C.blueDark,
                            },
                          ]}
                        >
                          {isRefund
                            ? '💸 REFUND REQUEST'
                            : isComplaint
                            ? '⚠️ COMPLAINT'
                            : '💬 HELP / SUPPORT'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor:
                              t.status === 'Open'
                                ? C.goldLight
                                : t.status === 'Refunded'
                                ? C.redLight
                                : '#D1FAE5',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            {
                              color:
                                t.status === 'Open'
                                ? C.goldMid
                                : t.status === 'Refunded'
                                ? C.redDark
                                : C.emeraldDark,
                            },
                          ]}
                        >
                          {t.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.ticketSubject}>{t.subject}</Text>
                    <Text style={styles.subText}>
                      From: {t.user?.name || 'Student'} (ID: {t.user?.collegeId || 'N/A'}) •{' '}
                      {new Date(t.createdAt).toLocaleString()}
                    </Text>

                    {/* Attached Order Box */}
                    {t.order && (
                      <View style={styles.attachedOrderBox}>
                        <View style={styles.rowBetween}>
                          <Text style={styles.attachedOrderTitle}>
                            📎 Attached Order: Token #{t.order.orderToken}
                          </Text>
                          <Text style={styles.attachedOrderAmount}>₹{t.order.totalAmount}</Text>
                        </View>
                        <Text style={styles.subText}>
                          Payment: {t.order.paymentMethod || 'UPI'} • Status: {t.order.paymentStatus || 'Paid'}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.ticketMessage}>{t.message}</Text>

                    <View style={styles.divider} />

                    {/* Manager Reply Display */}
                    {t.managerReply ? (
                      <View style={styles.replyBox}>
                        <Text style={styles.replyLabel}>Manager Response:</Text>
                        <Text style={styles.replyText}>{t.managerReply}</Text>
                      </View>
                    ) : null}

                    {/* Resolve Form */}
                    {t.status === 'Open' && (
                      <View style={{ marginTop: 10 }}>
                        <TextInput
                          style={styles.input}
                          placeholder="Write reply to student (e.g. Refund processed / Issue addressed)…"
                          placeholderTextColor={C.textMid}
                          value={replyTextMap[t._id] || ''}
                          onChangeText={(txt) =>
                            setReplyTextMap((prev) => ({ ...prev, [t._id]: txt }))
                          }
                        />
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnReady]}
                            onPress={() => handleResolveTicket(t._id, false)}
                          >
                            <Text style={styles.actionBtnText}>✓ Reply & Resolve</Text>
                          </TouchableOpacity>

                          {(isRefund || t.order) && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.actionBtnRejectFill]}
                              onPress={() => handleResolveTicket(t._id, true)}
                            >
                              <Text style={styles.actionBtnText}>
                                💸 Approve Refund
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )
          ) : (
            /* Sub-tab 2: Meal Ratings & Feedback */
            feedbackOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>⭐</Text>
                <Text style={styles.emptyTitle}>No Feedback Yet</Text>
                <Text style={styles.emptyBody}>
                  Student ratings and comments on completed meals will appear here.
                </Text>
              </View>
            ) : (
              feedbackOrders.map((ord) => (
                <View key={ord._id} style={styles.card}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.tokenTitle}>
                      Token #{ord.orderToken} • {'⭐'.repeat(ord.feedback?.rating || 5)}{' '}
                      <Text style={{ fontSize: 13, color: C.textMid, fontWeight: '700' }}>
                        ({ord.feedback?.rating}/5)
                      </Text>
                    </Text>
                    <Text style={styles.totalLine}>₹{ord.totalAmount}</Text>
                  </View>

                  <Text style={styles.subText}>
                    Student: {ord.user?.name || 'Student'} • ID: {ord.user?.collegeId || 'N/A'}
                  </Text>

                  {ord.feedback?.comment ? (
                    <View style={styles.commentQuoteBox}>
                      <Text style={styles.commentQuoteText}>
                        "{ord.feedback.comment}"
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.divider} />

                  <Text style={styles.subText}>
                    Ordered Items:{' '}
                    {ord.items
                      ?.map((i) => `${i.quantity}× ${i.menuItem?.name || 'Item'}`)
                      .join(', ')}
                  </Text>
                </View>
              ))
            )
          )}
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

  // ── 6-Tab Scrollable Bar ──────────────────────────────────────────────────
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
  tabPillUrgent:    { backgroundColor: '#FFFBEB', borderColor: C.goldDark },
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
  tabBadgeActive:   { backgroundColor: C.emeraldMid },
  tabBadgeUrgent:   { backgroundColor: C.goldDark },
  tabBadgeText:     { fontSize: 10, fontWeight: '800', color: C.text },

  // ── List & Content ────────────────────────────────────────────────────────
  listContent: { padding: 14, paddingBottom: 90 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle:    { fontSize: 18, fontWeight: '800', color: C.forest },
  sectionSubtitle: { fontSize: 13, color: C.textMid, marginTop: 2, fontWeight: '500' },
  countBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  countBadgeText: { color: C.emeraldDark, fontSize: 12, fontWeight: '800' },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
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
  cardReady:      { borderLeftWidth: 5, borderLeftColor: C.emeraldDark },
  cardPreparing:  { borderLeftWidth: 5, borderLeftColor: C.goldDark },
  cardReceived:   { borderLeftWidth: 5, borderLeftColor: C.blueDark },
  cardTitle:      { fontSize: 18, fontWeight: '800', color: C.forest },
  cardSubtitle:   { fontSize: 13, color: C.textMid, marginTop: 3, marginBottom: 14, fontWeight: '500' },
  rowBetween:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tokenTitle:     { fontSize: 17, fontWeight: '800', color: C.text },
  tokenTitleLarge:{ fontSize: 20, fontWeight: '800', color: C.forest, marginTop: 6 },
  subText:        { fontSize: 13, color: C.textMid, marginTop: 3, fontWeight: '500' },
  timeText:       { fontSize: 12, color: C.textSoft, marginTop: 3, fontWeight: '500' },
  quickTag: {
    backgroundColor: C.goldLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  quickTagText: { fontSize: 11, fontWeight: '800', color: C.goldMid },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 50,
  },
  statusPillText: { fontSize: 12, fontWeight: '800' },
  verifiedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedTagText: { color: C.emeraldDark, fontWeight: '800', fontSize: 11 },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 12 },

  // ── Items Line ────────────────────────────────────────────────────────────
  itemsBox:     { gap: 5 },
  itemRow:      { flexDirection: 'row', alignItems: 'center' },
  itemBullet:   { fontSize: 14, color: C.textMid, marginRight: 6 },
  itemQuantity: { fontSize: 14, fontWeight: '800', color: C.forest, marginRight: 6 },
  itemName:     { fontSize: 14, color: C.text, flex: 1, fontWeight: '600' },
  itemPrice:    { fontSize: 14, fontWeight: '700', color: C.textMid },
  totalLabel:   { fontSize: 14, fontWeight: '700', color: C.textMid },
  totalLine:    { fontSize: 18, fontWeight: '800', color: C.forest },

  // ── Action Buttons ────────────────────────────────────────────────────────
  actionContainer: { marginTop: 14, gap: 8 },
  actionPrepRow:   { flexDirection: 'row', gap: 8 },
  actionRow:       { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  actionBtnFull:      { flex: 0, width: '100%' },
  actionBtnPreparing: { backgroundColor: C.goldDark, borderColor: C.goldDark },
  actionBtnReady:     { backgroundColor: C.emeraldDark, borderColor: C.emeraldDark },
  actionBtnVerify:    { backgroundColor: C.blueDark, borderColor: C.blueDark },
  actionBtnReject: {
    backgroundColor: C.redLight,
    borderColor: C.redDark,
  },
  actionBtnRejectFill: {
    backgroundColor: C.redDark,
    borderColor: C.redDark,
  },
  actionBtnText: { color: C.white, fontWeight: '800', fontSize: 13 },

  // ── Verification / Scanner Tab ────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: C.forest,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
    elevation: 2,
  },
  primaryBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },
  cameraWrapper: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
  },
  closeCameraBtn: {
    backgroundColor: C.redDark,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeCameraBtnText: { color: C.white, fontWeight: '800', fontSize: 13 },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  orLine: { flex: 1, height: 1, backgroundColor: C.divider },
  orText: { fontSize: 11, fontWeight: '800', color: C.textMid, letterSpacing: 0.8 },
  manualRow: { flexDirection: 'row', gap: 10 },
  tokenInput: {
    flex: 1,
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 2,
    color: C.forest,
  },
  verifyBtn: {
    backgroundColor: C.emeraldDark,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    minWidth: 85,
  },
  verifyBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },
  btnDisabled:   { opacity: 0.65 },

  // ── Verified Receipt Card ─────────────────────────────────────────────────
  verifiedSuccessCard: {
    borderWidth: 2,
    borderColor: C.emeraldMid,
    backgroundColor: '#FAFCFA',
  },
  successBadgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  successBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBadgeText: { fontSize: 11, fontWeight: '800', color: C.emeraldDark },
  verifiedByText:   { fontSize: 12, color: C.textMid, fontWeight: '600' },

  // ── Menu Management Form ──────────────────────────────────────────────────
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDFAF3',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: C.emeraldLight,
  },
  switchTitle: { fontSize: 13, fontWeight: '800', color: C.forest },
  cancelEditBtn: { alignItems: 'center', marginTop: 10, paddingVertical: 6 },
  cancelEditText: { color: C.textMid, fontWeight: '700', fontSize: 13 },
  itemDescText:  { fontSize: 13, color: C.textMid, marginTop: 4, lineHeight: 18, fontWeight: '500' },
  availabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
  },
  availabilityBadgeText: { fontSize: 12, fontWeight: '800' },
  menuActionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallActionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  smallActionText: { fontWeight: '800', fontSize: 12 },

  // ── Staff Management ──────────────────────────────────────────────────────
  memberHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.indigoDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: C.white, fontWeight: '800', fontSize: 16 },
  memberName: { fontSize: 16, fontWeight: '700', color: C.text },
  pendingTag: {
    backgroundColor: C.goldLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingTagText: { color: C.goldMid, fontWeight: '800', fontSize: 11 },

  // ── Support & Feedback ────────────────────────────────────────────────────
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 50,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
  },
  subTabPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 50,
    alignItems: 'center',
  },
  subTabPillActive:     { backgroundColor: C.forest },
  subTabPillText:       { fontSize: 12, fontWeight: '700', color: C.text },
  subTabPillTextActive: { color: C.white, fontWeight: '800' },
  categoryTag:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryTagText:      { fontSize: 11, fontWeight: '800' },
  ticketSubject:        { fontSize: 16, fontWeight: '800', color: C.text, marginTop: 8 },
  ticketMessage:        { fontSize: 14, color: C.text, marginTop: 8, lineHeight: 20, fontWeight: '500' },
  attachedOrderBox: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  attachedOrderTitle:  { fontSize: 13, fontWeight: '800', color: C.forest },
  attachedOrderAmount: { fontSize: 14, fontWeight: '800', color: C.emeraldDark },
  replyBox: {
    backgroundColor: '#EDFAF3',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.emeraldDark,
    marginBottom: 8,
  },
  replyLabel: { fontSize: 12, fontWeight: '800', color: C.emeraldDark },
  replyText:  { fontSize: 13, color: C.text, marginTop: 4, fontWeight: '600' },
  commentQuoteBox: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.goldDark,
    marginTop: 8,
  },
  commentQuoteText: { fontSize: 13, fontStyle: 'italic', color: '#78350F', lineHeight: 18, fontWeight: '600' },

  // ── Empty State ───────────────────────────────────────────────────────────
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
