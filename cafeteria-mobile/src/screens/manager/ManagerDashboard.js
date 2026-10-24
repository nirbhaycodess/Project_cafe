// File path: Check RootNavigator.js (e.g. cafeteria-mobile/src/screens/manager/ManagerDashboard.js)
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

export default function ManagerDashboard() {
  const { user, signout } = useAuth();

  // Tabs: 'queue' | 'verify' | 'verifiedHistory' | 'menu' | 'staff'
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [verifiedOrders, setVerifiedOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
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
      const [queueRes, verifiedRes, menuRes, staffRes] = await Promise.all([
        api.get('/orders/queue'),
        api.get('/orders/verified'),
        api.get('/menu'),
        api.get('/orders/staff-list'),
      ]);
      setQueue(queueRes.data);
      setVerifiedOrders(verifiedRes.data);
      setMenuItems(menuRes.data);
      setStaffList(staffRes.data);
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

  // 3. Add or Update Menu Item (including Quick Packet Item toggle)
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
        Alert.alert('Added', isQuickItem ? 'Quick Packet Item added (Instant Ready)!' : 'Menu item added!');
      }

      setEditingItemId(null);
      setNewName('');
      setNewDesc('');
      setNewPrice('');
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

  const pendingStaff = staffList.filter((s) => s.accountStatus === 'Pending');
  const activeStaff = staffList.filter((s) => s.accountStatus !== 'Pending');

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
          <Text style={styles.headerTitle}>Manager Dashboard</Text>
          <Text style={styles.headerSub}>{user?.name}</Text>
        </View>
        {signout && (
          <TouchableOpacity style={styles.logoutBtn} onPress={signout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 5-Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: 'queue', label: `Queue (${queue.length})` },
          { key: 'verify', label: 'Scan QR' },
          { key: 'verifiedHistory', label: `Verified (${verifiedOrders.length})` },
          { key: 'menu', label: 'Menu' },
          { key: 'staff', label: `Staff (${pendingStaff.length ? `${pendingStaff.length}!` : activeStaff.length})` },
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

      {/* TAB 1: LIVE KITCHEN QUEUE */}
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
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No active orders in queue.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                  <Text style={styles.subText}>
                    {item.user?.name || 'Student'} ({item.user?.collegeId || 'ID'})
                  </Text>
                </View>
                <View style={styles.statusPill}>
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

      {/* TAB 2: VERIFY QR SCANNER */}
      {activeTab === 'verify' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Verify Student Order QR</Text>
            <Text style={styles.subText}>
              Scan the student's QR code or enter the 6-character token below.
            </Text>

            {!scannerOpen ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!permission?.granted) {
                    const res = await requestPermission();
                    if (!res.granted) {
                      Alert.alert('Permission Required', 'Camera access is needed to scan QR codes.');
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
                  onBarcodeScanned={scanned ? undefined : ({ data }) => {
                    setScanned(true);
                    verifyOrderToken(data);
                  }}
                />
                <TouchableOpacity
                  style={styles.closeCameraBtn}
                  onPress={() => setScannerOpen(false)}
                >
                  <Text style={styles.primaryBtnText}>Close Camera</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.manualRow}>
              <TextInput
                style={styles.tokenInput}
                placeholder="Enter 6-Char Token"
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

          {verifiedReceipt && (
            <View style={[styles.card, { borderColor: '#2D6A4F', borderWidth: 2 }]}>
              <Text style={{ color: '#2D6A4F', fontWeight: 'bold', fontSize: 16 }}>
                ✅ Order Verified & Completed
              </Text>
              <Text style={styles.tokenTitle}>Token #{verifiedReceipt.orderToken}</Text>
              <Text style={styles.subText}>
                Student: {verifiedReceipt.user?.name} ({verifiedReceipt.user?.collegeId})
              </Text>
              <View style={styles.divider} />
              {verifiedReceipt.items.map((it, idx) => (
                <Text key={idx} style={styles.foodLine}>
                  • {it.quantity}x {it.menuItem?.name || 'Item'}
                </Text>
              ))}
              <Text style={styles.totalLine}>Total Paid: ₹{verifiedReceipt.totalAmount}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB 3: SEE ALL VERIFIED ORDERS */}
      {activeTab === 'verifiedHistory' && (
        <FlatList
          data={verifiedOrders}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No verified orders yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                <Text style={{ color: '#2D6A4F', fontWeight: 'bold', fontSize: 12 }}>
                  ✅ Verified by {item.verifiedBy?.name || 'Staff/Manager'} ({item.verifiedBy?.role || 'Staff'})
                </Text>
              </View>
              <Text style={styles.subText}>
                Student: {item.user?.name || 'Student'} ({item.user?.collegeId || 'N/A'})
              </Text>
              {item.verifiedAt && (
                <Text style={styles.subText}>
                  Time: {new Date(item.verifiedAt).toLocaleString()}
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

      {/* TAB 4: MENU EDIT & QUICK PACKET ITEMS */}
      {activeTab === 'menu' && (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {editingItemId ? 'Edit Menu Item' : 'Add Menu / Quick Packet Item'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Item Name (e.g. Lays Chips / Masala Dosa)"
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Description"
                value={newDesc}
                onChangeText={setNewDesc}
              />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Price (₹)"
                  keyboardType="numeric"
                  value={newPrice}
                  onChangeText={setNewPrice}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Category"
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
              </View>

              {/* Quick Packet Instant Pickup Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>⚡ Quick Packet Item (Instant Pickup)</Text>
                  <Text style={styles.subText}>
                    Automatically marks order as READY immediately upon ordering
                  </Text>
                </View>
                <Switch
                  value={isQuickItem}
                  onValueChange={setIsQuickItem}
                  trackColor={{ false: '#D1D5DB', true: '#52B788' }}
                />
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSaveMenuItem}
                disabled={savingItem}
              >
                <Text style={styles.primaryBtnText}>
                  {savingItem ? 'Saving...' : editingItemId ? 'Save Changes' : '+ Add Item'}
                </Text>
              </TouchableOpacity>

              {editingItemId && (
                <TouchableOpacity
                  style={{ alignItems: 'center', marginTop: 8 }}
                  onPress={() => {
                    setEditingItemId(null);
                    setNewName('');
                    setNewDesc('');
                    setNewPrice('');
                    setIsQuickItem(false);
                  }}
                >
                  <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tokenTitle}>
                    {item.name} {item.isQuickItem ? '⚡' : ''}
                  </Text>
                  <Text style={styles.subText}>
                    {item.category} • ₹{item.price}{' '}
                    {item.isQuickItem ? '• Instant Pickup Packet' : '• Kitchen Prep'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.badgeBtn,
                    { backgroundColor: item.isAvailable ? '#2D6A4F' : '#DC2626' },
                  ]}
                  onPress={() => handleToggleAvailability(item)}
                >
                  <Text style={styles.badgeBtnText}>
                    {item.isAvailable ? 'Available' : 'Sold Out'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.actionRow, { marginTop: 10 }]}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#E5E7EB' }]}
                  onPress={() => startEditItem(item)}
                >
                  <Text style={{ color: '#1F2937', fontWeight: 'bold', fontSize: 12 }}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#FEF3C7' }]}
                  onPress={() => handleToggleQuickItem(item)}
                >
                  <Text style={{ color: '#92400E', fontWeight: 'bold', fontSize: 12 }}>
                    {item.isQuickItem ? 'Make Regular' : '⚡ Make Quick Item'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                  onPress={() => handleDeleteMenuItem(item._id)}
                >
                  <Text style={{ color: '#DC2626', fontWeight: 'bold', fontSize: 12 }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* TAB 5: APPROVE STAFF REQUESTS & SEE ACTIVE STAFF */}
      {activeTab === 'staff' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <Text style={styles.sectionTitle}>
            Pending Staff Registration Requests ({pendingStaff.length})
          </Text>
          {pendingStaff.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No pending Staff requests.</Text>
            </View>
          ) : (
            pendingStaff.map((st) => (
              <View key={st._id} style={styles.card}>
                <Text style={styles.tokenTitle}>{st.name}</Text>
                <Text style={styles.subText}>{st.email}</Text>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#2D6A4F' }]}
                    onPress={() => handleStaffStatus(st._id, 'Approved')}
                  >
                    <Text style={styles.actionBtnText}>Approve Staff</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
                    onPress={() => handleStaffStatus(st._id, 'Rejected')}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, { marginTop: 14 }]}>
            Active Staff Directory ({activeStaff.length})
          </Text>
          {activeStaff.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No active Staff members yet.</Text>
            </View>
          ) : (
            activeStaff.map((st) => (
              <View key={st._id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={styles.tokenTitle}>{st.name}</Text>
                    <Text style={styles.subText}>{st.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.badgeBtn,
                      {
                        backgroundColor:
                          st.accountStatus === 'Approved' ? '#DC2626' : '#2D6A4F',
                      },
                    ]}
                    onPress={() =>
                      handleStaffStatus(
                        st._id,
                        st.accountStatus === 'Approved' ? 'Suspended' : 'Approved'
                      )
                    }
                  >
                    <Text style={styles.badgeBtnText}>
                      {st.accountStatus === 'Approved' ? 'Suspend' : 'Reactivate'}
                    </Text>
                  </TouchableOpacity>
                </View>
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
  listContent: { padding: 14, paddingBottom: 80 },
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
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: { color: '#065F46', fontWeight: 'bold', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 },
  foodLine: { fontSize: 14, color: '#374151', marginVertical: 2 },
  totalLine: { fontSize: 15, fontWeight: 'bold', color: '#1B4332', marginTop: 6 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1B4332', marginBottom: 8 },
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
  input: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  switchTitle: { fontSize: 13, fontWeight: 'bold', color: '#1B4332' },
  badgeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  emptyText: { textAlign: 'center', color: '#6B7280', paddingVertical: 20 },
});