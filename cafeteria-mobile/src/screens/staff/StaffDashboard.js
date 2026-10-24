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

export default function StaffDashboard() {
  const { user, signOut } = useAuth();

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
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Staff Dashboard</Text>
          <Text style={styles.headerSub}>{user?.name || 'Staff Member'}</Text>
        </View>
        {signOut && (
          <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Top 3-Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'queue' && styles.activeTab]}
          onPress={() => setActiveTab('queue')}
        >
          <Text style={[styles.tabText, activeTab === 'queue' && styles.activeTabText]}>
            Queue ({queue.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'verify' && styles.activeTab]}
          onPress={() => setActiveTab('verify')}
        >
          <Text style={[styles.tabText, activeTab === 'verify' && styles.activeTabText]}>
            Verify QR
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'myVerified' && styles.activeTab]}
          onPress={() => setActiveTab('myVerified')}
        >
          <Text style={[styles.tabText, activeTab === 'myVerified' && styles.activeTabText]}>
            My Record ({myVerifiedOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: ACTIVE KITCHEN QUEUE & STATUS UPDATES */}
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
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active orders in the queue right now.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                  <Text style={styles.subText}>
                    {item.user?.name || 'Student'} ({item.user?.collegeId || 'ID'})
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    item.orderStatus === 'Ready' && { backgroundColor: '#D1FAE5' },
                  ]}
                >
                  <Text style={styles.statusPillText}>{item.orderStatus}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {item.items.map((it, idx) => (
                <Text key={idx} style={styles.foodLine}>
                  • {it.quantity}x {it.menuItem?.name || 'Item'}{' '}
                  {(it.isQuickItem || it.menuItem?.isQuickItem) && '⚡(Quick Packet)'}
                </Text>
              ))}

              <Text style={styles.totalLine}>Total: ₹{item.totalAmount}</Text>

              <View style={styles.actionRow}>
                {item.orderStatus === 'Received' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#D97706' }]}
                    onPress={() => handleStatusChange(item._id, 'Preparing')}
                  >
                    <Text style={styles.actionBtnText}>Mark Preparing</Text>
                  </TouchableOpacity>
                )}

                {(item.orderStatus === 'Received' || item.orderStatus === 'Preparing') && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#2D6A4F' }]}
                    onPress={() => handleStatusChange(item._id, 'Ready')}
                  >
                    <Text style={styles.actionBtnText}>Mark Ready</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => verifyOrderToken(item.orderToken)}
                >
                  <Text style={styles.actionBtnText}>Verify & Handover</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* TAB 2: SCAN QR CODE OR VERIFY TOKEN */}
      {activeTab === 'verify' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Verify Student Pickup</Text>
            <Text style={styles.subText}>
              Scan the student's QR code with your camera or enter their 6-character token below.
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
                <Text style={styles.primaryBtnText}>Open Camera QR Scanner</Text>
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
                  <Text style={styles.primaryBtnText}>Close Scanner</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.manualRow}>
              <TextInput
                style={styles.tokenInput}
                placeholder="Enter 6-Char Token (e.g. A4B9C2)"
                value={manualToken}
                onChangeText={setManualToken}
                autoCapitalize="characters"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.verifyBtn}
                onPress={() => verifyOrderToken(manualToken)}
                disabled={verifying}
              >
                <Text style={styles.primaryBtnText}>{verifying ? '...' : 'Verify'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {lastVerifiedOrder && (
            <View style={[styles.card, { borderColor: '#2D6A4F', borderWidth: 2 }]}>
              <Text style={{ color: '#2D6A4F', fontWeight: 'bold', fontSize: 16 }}>
                ✅ Handover Verified by {user?.name || 'You'}
              </Text>
              <Text style={styles.tokenTitle}>Token #{lastVerifiedOrder.orderToken}</Text>
              <Text style={styles.subText}>
                Student: {lastVerifiedOrder.user?.name} ({lastVerifiedOrder.user?.collegeId})
              </Text>
              <View style={styles.divider} />
              {lastVerifiedOrder.items.map((it, idx) => (
                <Text key={idx} style={styles.foodLine}>
                  • {it.quantity}x {it.menuItem?.name || 'Item'}
                </Text>
              ))}
              <Text style={styles.totalLine}>Total Paid: ₹{lastVerifiedOrder.totalAmount}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB 3: MY VERIFIED ORDERS RECORD */}
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
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryTitle}>My Verified Orders Log</Text>
              <Text style={styles.summarySub}>
                You have verified and handed over {myVerifiedOrders.length} orders.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              You haven't verified any orders yet. Orders you scan or verify will appear here.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                <View style={styles.verifiedTag}>
                  <Text style={styles.verifiedTagText}>✅ Verified by Me</Text>
                </View>
              </View>

              <Text style={styles.subText}>
                Student: {item.user?.name || 'Student'} ({item.user?.collegeId || 'ID'})
              </Text>
              {item.verifiedAt && (
                <Text style={styles.subText}>
                  Verified at: {new Date(item.verifiedAt).toLocaleString()}
                </Text>
              )}

              <View style={styles.divider} />

              {item.items.map((it, idx) => (
                <Text key={idx} style={styles.foodLine}>
                  • {it.quantity}x {it.menuItem?.name || 'Item'}
                </Text>
              ))}

              <Text style={styles.totalLine}>Total: ₹{item.totalAmount}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F4' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1B4332',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#A3B18A', fontSize: 13 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 12,
    padding: 5,
    borderRadius: 12,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#1B4332' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#52796F' },
  activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
  listContent: { padding: 14, paddingBottom: 80 },
  summaryBanner: {
    backgroundColor: '#1B4332',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  summaryTitle: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  summarySub: { color: '#A3B18A', fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tokenTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  subText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: { color: '#92400E', fontWeight: 'bold', fontSize: 12 },
  verifiedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  verifiedTagText: { color: '#065F46', fontWeight: 'bold', fontSize: 11 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  foodLine: { fontSize: 14, color: '#374151', marginVertical: 2 },
  totalLine: { fontSize: 15, fontWeight: 'bold', color: '#1B4332', marginTop: 6 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B4332', marginBottom: 6 },
  primaryBtn: {
    backgroundColor: '#1B4332',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  cameraWrapper: { height: 260, borderRadius: 12, overflow: 'hidden', marginVertical: 12 },
  closeCameraBtn: { backgroundColor: '#DC2626', padding: 10, alignItems: 'center' },
  manualRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  tokenInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    fontWeight: 'bold',
  },
  verifyBtn: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 10,
  },
  emptyText: { textAlign: 'center', color: '#6B7280', paddingVertical: 24 },
});