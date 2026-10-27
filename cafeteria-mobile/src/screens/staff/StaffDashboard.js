// File path: cafeteria-mobile/src/screens/staff/StaffDashboard.js
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
  text:         '#0F172A', // Slate-900: sharp, crisp text
  textMid:      '#334155', // Slate-700: clear secondary text
  textSoft:     '#475569', // Slate-600: easily readable subtitle text
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

export default function StaffDashboard() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // 3 Tabs for Staff: 'queue' | 'verify' | 'myVerified'
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [myVerifiedOrders, setMyVerifiedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Camera & QR Verification State
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lastVerifiedOrder, setLastVerifiedOrder] = useState(null);

  const fetchStaffData = async () => {
    try {
      const [queueRes, myVerRes] = await Promise.all([
        api.get('/orders/queue'),
        api.get('/orders/my-verified'),
      ]);
      setQueue(queueRes.data);
      setMyVerifiedOrders(myVerRes.data);
    } catch (error) {
      console.error('Staff data fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStaffData();

    const socket = io(SOCKET_URL);
    socket.on('newOrder', (newOrder) => {
      setQueue((prev) => [...prev, newOrder]);
    });
    socket.on('orderStatusUpdated', () => {
      fetchStaffData();
    });

    return () => socket.disconnect();
  }, []);

  // Update Order Status (Preparing / Ready)
  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      fetchStaffData();
    } catch (error) {
      Alert.alert('Update Failed', error.response?.data?.message || 'Could not update status.');
    }
  };

  // Verify Order via QR or 6-Character Token
  const verifyOrderToken = async (tokenStr) => {
    const cleanToken = tokenStr.trim().toUpperCase();
    if (!cleanToken) {
      Alert.alert('Missing Token', 'Please scan a QR code or enter a 6-character token.');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.put('/orders/verify', { orderToken: cleanToken });
      const verifiedOrd = res.data.order;
      setLastVerifiedOrder(verifiedOrd);
      setManualToken('');
      setScannerOpen(false);
      fetchStaffData();
      Alert.alert(
        'Order Verified ✅',
        `Token #${verifiedOrd.orderToken} verified and added to your record!`
      );
    } catch (error) {
      Alert.alert(
        'Verification Failed ❌',
        error.response?.data?.message || 'Invalid or already claimed token.'
      );
    } finally {
      setVerifying(false);
      setTimeout(() => setScanned(false), 1500);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={C.emeraldDark} />
          <Text style={styles.loadingText}>Loading Kitchen Queue…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* ══════════════ EXECUTIVE HEADER & SIGN OUT ══════════════ */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>STAFF PORTAL</Text>
        </View>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{user?.name || 'Staff Member'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Station Online</Text>
            </View>
          </View>
          {signOut && (
            <TouchableOpacity style={styles.signOutPill} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ══════════════ SEGMENTED TAB BAR ══════════════ */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'queue' && styles.tabPillActive]}
            onPress={() => setActiveTab('queue')}
          >
            <View style={styles.tabInner}>
              <Text style={[styles.tabPillText, activeTab === 'queue' && styles.tabPillTextActive]}>
                👨‍🍳 Queue
              </Text>
              {queue.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'queue' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'queue' && { color: C.forest }]}>
                    {queue.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'verify' && styles.tabPillActive]}
            onPress={() => setActiveTab('verify')}
          >
            <Text style={[styles.tabPillText, activeTab === 'verify' && styles.tabPillTextActive]}>
              📷 Verify QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'myVerified' && styles.tabPillActive]}
            onPress={() => setActiveTab('myVerified')}
          >
            <View style={styles.tabInner}>
              <Text style={[styles.tabPillText, activeTab === 'myVerified' && styles.tabPillTextActive]}>
                📋 My Record
              </Text>
              {myVerifiedOrders.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'myVerified' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'myVerified' && { color: C.forest }]}>
                    {myVerifiedOrders.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ════════════════════════════════════════════════
          TAB 1: ACTIVE KITCHEN QUEUE & STATUS UPDATES
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
                fetchStaffData();
              }}
              tintColor={C.emeraldDark}
              colors={[C.emeraldDark]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Kitchen Prep Queue</Text>
                <Text style={styles.sectionSubtitle}>
                  Update status as meals cook and hand over to students
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
              <Text style={styles.emptyBody}>No pending orders in the kitchen queue right now.</Text>
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
          TAB 2: SCAN QR CODE OR VERIFY TOKEN
      ════════════════════════════════════════════════ */}
      {activeTab === 'verify' && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify Student Pickup</Text>
            <Text style={styles.cardSubtitle}>
              Scan the student's digital QR code with your camera or enter their 6-character token below.
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
                        'Camera permission is needed to scan student QR codes.'
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

          {lastVerifiedOrder && (
            <View style={[styles.card, styles.verifiedSuccessCard]}>
              <View style={styles.successBadgeRow}>
                <View style={styles.successBadge}>
                  <Text style={styles.successBadgeText}>✅ HANDOVER COMPLETE</Text>
                </View>
                <Text style={styles.verifiedByText}>Verified by {user?.name || 'Staff'}</Text>
              </View>

              <Text style={styles.tokenTitleLarge}>Token #{lastVerifiedOrder.orderToken}</Text>
              <Text style={styles.subText}>
                Student: {lastVerifiedOrder.user?.name} (ID: {lastVerifiedOrder.user?.collegeId || 'N/A'})
              </Text>

              <View style={styles.divider} />

              <View style={styles.itemsBox}>
                {lastVerifiedOrder.items.map((it, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemBullet}>•</Text>
                    <Text style={styles.itemQuantity}>{it.quantity}×</Text>
                    <Text style={styles.itemName}>{it.menuItem?.name || 'Item'}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.rowBetween, { marginTop: 12 }]}>
                <Text style={styles.totalLabel}>Total Paid</Text>
                <Text style={styles.totalLine}>₹{lastVerifiedOrder.totalAmount}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ════════════════════════════════════════════════
          TAB 3: MY VERIFIED ORDERS RECORD
      ════════════════════════════════════════════════ */}
      {activeTab === 'myVerified' && (
        <FlatList
          data={myVerifiedOrders}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchStaffData();
              }}
              tintColor={C.emeraldDark}
              colors={[C.emeraldDark]}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.summaryBanner}>
              <View style={[styles.bannerAccent, { backgroundColor: C.emeraldMid }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryTitle}>My Handover Record</Text>
                <Text style={styles.summarySub}>
                  You have verified and handed over {myVerifiedOrders.length} orders.
                </Text>
              </View>
              <View style={styles.bannerPill}>
                <Text style={styles.bannerPillText}>{myVerifiedOrders.length} orders</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No Orders Verified Yet</Text>
              <Text style={styles.emptyBody}>
                Orders you scan with the QR scanner or verify manually will appear here in your log.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedTagText}>✓ Verified by Me</Text>
                </View>
              </View>

              <Text style={styles.subText}>
                Student: {item.user?.name || 'Student'} • ID: {item.user?.collegeId || 'N/A'}
              </Text>
              {item.verifiedAt && (
                <Text style={styles.timeText}>
                  Verified at: {new Date(item.verifiedAt).toLocaleString()}
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

  // ── Segmented Tab Bar ─────────────────────────────────────────────────────
  tabBarWrapper: {
    paddingHorizontal: 14,
    marginTop: -16,
    zIndex: 10,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 50,
    padding: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1.5,
    borderColor: C.cardBorder,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive:     { backgroundColor: C.forest },
  tabPillText:       { fontSize: 13, fontWeight: '700', color: C.text },
  tabPillTextActive: { color: C.white, fontWeight: '800' },
  tabInner:          { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive:   { backgroundColor: C.emeraldMid },
  tabBadgeText:     { fontSize: 10, fontWeight: '800', color: C.text },

  // ── List & Content ────────────────────────────────────────────────────────
  listContent: { padding: 14, paddingBottom: 80 },
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
  actionBtnText:      { color: C.white, fontWeight: '800', fontSize: 13 },

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

  // ── Summary Banner (My Record) ────────────────────────────────────────────
  summaryBanner: {
    flexDirection: 'row',
    backgroundColor: C.forest,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  bannerAccent: { width: 4, height: 38, borderRadius: 4 },
  summaryTitle: { color: C.white, fontWeight: '800', fontSize: 16 },
  summarySub:   { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2, fontWeight: '500' },
  bannerPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  bannerPillText: { color: C.white, fontSize: 12, fontWeight: '800' },

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
