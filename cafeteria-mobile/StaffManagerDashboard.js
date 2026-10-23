// File path: cafeteria-mobile/StaffManagerDashboard.js
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
import api, { SOCKET_URL } from './api';

export default function StaffManagerDashboard({ user }) {
  const isManager = user.role === 'Manager' || user.role === 'SuperAdmin';

  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'verify', 'menu'
  const [queue, setQueue] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // QR Verification state
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState(null);

  // New Menu Item form state (Manager only)
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('Snacks');
  const [addingItem, setAddingItem] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const requests = [api.get('/orders/queue')];
      if (isManager) {
        requests.push(api.get('/menu'));
      }
      const results = await Promise.all(requests);
      setQueue(results[0].data);
      if (isManager && results[1]) {
        setMenuItems(results[1].data);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      Alert.alert('Error', 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = io(SOCKET_URL);

    // Live kitchen queue update when a student places an order
    socket.on('newOrder', (newOrder) => {
      setQueue((prev) => [...prev, newOrder]);
    });

    // Keep queue synced if another staff member updates or verifies an order
    socket.on('orderStatusUpdated', ({ orderId, status }) => {
      if (status === 'Completed' || status === 'Cancelled') {
        setQueue((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setQueue((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: status } : o))
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update Order Status (Preparing / Ready / Cancelled)
  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      if (nextStatus === 'Completed' || nextStatus === 'Cancelled') {
        setQueue((prev) => prev.filter((o) => o._id !== orderId));
      } else {
        setQueue((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, orderStatus: nextStatus } : o))
        );
      }
    } catch (error) {
      Alert.alert('Update Failed', error.response?.data?.message || 'Could not update status.');
    }
  };

  // Verify Order via QR or Manual Token
  const verifyOrderToken = async (tokenToVerify) => {
    const cleanToken = tokenToVerify.trim().toUpperCase();
    if (!cleanToken) {
      Alert.alert('Missing Token', 'Please scan a QR code or enter a 6-character token.');
      return;
    }

    setVerifying(true);
    try {
      const response = await api.put('/orders/verify', { orderToken: cleanToken });
      const completedOrder = response.data.order;
      setVerifiedOrder(completedOrder);
      setManualToken('');
      setScannerOpen(false);
      setQueue((prev) => prev.filter((o) => o._id !== completedOrder._id));
      Alert.alert('Order Verified ✅', `Token #${completedOrder.orderToken} marked as Completed!`);
    } catch (error) {
      const msg = error.response?.data?.message || 'Invalid or already claimed token.';
      Alert.alert('Verification Failed ❌', msg);
    } finally {
      setVerifying(false);
      setTimeout(() => setScanned(false), 1500);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || verifying) return;
    setScanned(true);
    verifyOrderToken(data);
  };

  // Manager: Add Menu Item
  const handleAddMenuItem = async () => {
    if (!newName.trim() || !newPrice.trim()) {
      Alert.alert('Missing Info', 'Please enter an item name and price.');
      return;
    }

    setAddingItem(true);
    try {
      const res = await api.post('/menu', {
        name: newName.trim(),
        description: newDesc.trim(),
        price: Number(newPrice),
        category: newCategory.trim() || 'General',
        isAvailable: true,
        stock: -1,
      });
      setMenuItems((prev) => [...prev, res.data.item]);
      setNewName('');
      setNewDesc('');
      setNewPrice('');
      Alert.alert('Success', 'Menu item added!');
    } catch (error) {
      Alert.alert('Error', 'Could not create menu item.');
    } finally {
      setAddingItem(false);
    }
  };

  // Manager: Toggle Item Availability
  const handleToggleAvailability = async (item) => {
    try {
      const res = await api.put(`/menu/${item._id}`, {
        isAvailable: !item.isAvailable,
      });
      setMenuItems((prev) =>
        prev.map((m) => (m._id === item._id ? res.data.item : m))
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update item availability.');
    }
  };

  // Manager: Delete Menu Item
  const handleDeleteMenuItem = async (itemId) => {
    try {
      await api.delete(`/menu/${itemId}`);
      setMenuItems((prev) => prev.filter((m) => m._id !== itemId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete item.');
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
      {/* Top Role Navigation Tabs */}
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

        {isManager && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'menu' && styles.activeTab]}
            onPress={() => setActiveTab('menu')}
          >
            <Text style={[styles.tabText, activeTab === 'menu' && styles.activeTabText]}>
              Menu ({menuItems.length})
            </Text>
          </TouchableOpacity>
        )}
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
                fetchDashboardData();
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No active orders in the queue right now.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.tokenTitle}>Token #{item.orderToken}</Text>
                  <Text style={styles.studentSub}>
                    {item.user?.name || 'Student'} ({item.user?.collegeId || 'ID'})
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{item.orderStatus}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {item.items.map((orderItem, idx) => (
                <Text key={idx} style={styles.foodLine}>
                  • {orderItem.quantity}x {orderItem.menuItem?.name || 'Item'}
                </Text>
              ))}

              <Text style={styles.totalLine}>Total: ₹{item.totalAmount}</Text>

              <View style={styles.actionRow}>
                {item.orderStatus === 'Received' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F39C12' }]}
                    onPress={() => handleStatusChange(item._id, 'Preparing')}
                  >
                    <Text style={styles.actionBtnText}>Mark Preparing</Text>
                  </TouchableOpacity>
                )}

                {(item.orderStatus === 'Received' || item.orderStatus === 'Preparing') && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#2ECC71' }]}
                    onPress={() => handleStatusChange(item._id, 'Ready')}
                  >
                    <Text style={styles.actionBtnText}>Mark Ready</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#3498DB' }]}
                  onPress={() => verifyOrderToken(item.orderToken)}
                >
                  <Text style={styles.actionBtnText}>Complete Handover</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* TAB 2: QR SCANNER & MANUAL TOKEN VERIFICATION */}
      {activeTab === 'verify' && (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Scan Student QR Code</Text>
            <Text style={styles.sectionSub}>
              Use the camera to scan the student's pickup QR code or enter the 6-character token below.
            </Text>

            {!scannerOpen ? (
              <TouchableOpacity
                style={styles.cameraBtn}
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
                <Text style={styles.cameraBtnText}>Open Camera QR Scanner</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />
                <TouchableOpacity
                  style={styles.closeCameraBtn}
                  onPress={() => setScannerOpen(false)}
                >
                  <Text style={styles.closeCameraText}>Close Scanner</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.manualRow}>
              <TextInput
                style={styles.tokenInput}
                placeholder="Enter 6-Char Token (e.g. A3F9B2)"
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
                {verifying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Verified Order Receipt Card */}
          {verifiedOrder && (
            <View style={[styles.card, styles.verifiedReceipt]}>
              <Text style={styles.verifiedHeader}>✅ Verified & Completed</Text>
              <Text style={styles.tokenTitle}>Token #{verifiedOrder.orderToken}</Text>
              <Text style={styles.studentSub}>
                Student: {verifiedOrder.user?.name} ({verifiedOrder.user?.collegeId || verifiedOrder.user?.email})
              </Text>
              <View style={styles.divider} />
              <Text style={styles.handoverLabel}>Items to Hand Over:</Text>
              {verifiedOrder.items.map((it, idx) => (
                <Text key={idx} style={styles.foodLine}>
                  • {it.quantity}x {it.menuItem?.name || 'Food Item'}
                </Text>
              ))}
              <Text style={styles.totalLine}>Total Paid: ₹{verifiedOrder.totalAmount}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* TAB 3: MANAGER MENU CONTROL */}
      {activeTab === 'menu' && isManager && (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Add New Menu Item</Text>
              <TextInput
                style={styles.input}
                placeholder="Food Name (e.g. Masala Dosa)"
                value={newName}
                onChangeText={setNewName}
              />
              <TextInput
                style={styles.input}
                placeholder="Short Description"
                value={newDesc}
                onChangeText={setNewDesc}
              />
              <View style={styles.rowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                  placeholder="Price (₹)"
                  keyboardType="numeric"
                  value={newPrice}
                  onChangeText={setNewPrice}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Category (Breakfast/Snacks)"
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
              </View>
              <TouchableOpacity
                style={styles.cameraBtn}
                onPress={handleAddMenuItem}
                disabled={addingItem}
              >
                {addingItem ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.cameraBtnText}>+ Add Item to Menu</Text>
                )}
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tokenTitle}>{item.name}</Text>
                  <Text style={styles.studentSub}>
                    {item.category} • ₹{item.price}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.availBtn,
                    { backgroundColor: item.isAvailable ? '#2ECC71' : '#E74C3C' },
                  ]}
                  onPress={() => handleToggleAvailability(item)}
                >
                  <Text style={styles.availBtnText}>
                    {item.isAvailable ? 'Available' : 'Sold Out'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.deleteLink}
                onPress={() => handleDeleteMenuItem(item._id)}
              >
                <Text style={styles.deleteLinkText}>Delete Item</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FF6B00' },
  tabText: { fontWeight: '600', color: '#57606F', fontSize: 13 },
  activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
  listContent: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E272E' },
  studentSub: { fontSize: 13, color: '#57606F', marginTop: 2 },
  statusPill: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusPillText: { color: '#FF6B00', fontWeight: 'bold', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#F1F2F6', marginVertical: 10 },
  foodLine: { fontSize: 15, color: '#2F3542', marginVertical: 2, fontWeight: '500' },
  totalLine: { fontSize: 15, fontWeight: 'bold', color: '#2ECC71', marginTop: 8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 4,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E272E', marginBottom: 4 },
  sectionSub: { fontSize: 13, color: '#808E9B', marginBottom: 14 },
  cameraBtn: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  cameraBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  cameraWrapper: { height: 280, borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  camera: { flex: 1 },
  closeCameraBtn: {
    backgroundColor: '#E74C3C',
    padding: 10,
    alignItems: 'center',
  },
  closeCameraText: { color: '#FFFFFF', fontWeight: 'bold' },
  manualRow: { flexDirection: 'row', alignItems: 'center' },
  tokenInput: {
    flex: 1,
    backgroundColor: '#F1F2F6',
    padding: 13,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#1E272E',
  },
  verifyBtn: {
    backgroundColor: '#2ECC71',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  verifyBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  verifiedReceipt: { borderColor: '#2ECC71', borderWidth: 2 },
  verifiedHeader: { color: '#2ECC71', fontWeight: 'bold', fontSize: 16, marginBottom: 6 },
  handoverLabel: { fontSize: 13, fontWeight: 'bold', color: '#57606F', marginBottom: 4 },
  input: {
    backgroundColor: '#F1F2F6',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  rowInputs: { flexDirection: 'row' },
  availBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  availBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  deleteLink: { marginTop: 10, alignSelf: 'flex-end' },
  deleteLinkText: { color: '#E74C3C', fontSize: 13, fontWeight: '600' },
  emptyText: { textAlign: 'center', color: '#808E9B', marginTop: 40, fontSize: 15 },
});