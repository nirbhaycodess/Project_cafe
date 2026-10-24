// File path: cafeteria-mobile/src/screens/admin/SuperAdminDashboard.js
// File path: cafeteria-mobile/src/screens/admin/SuperAdminDashboard.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'approvals' | 'directory'
  const [analytics, setAnalytics] = useState(null);
  const [staffManagers, setStaffManagers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [analyticsRes, usersRes, ordersRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/staff-managers'),
        api.get('/admin/orders'),
      ]);
      setAnalytics(analyticsRes.data);
      setStaffManagers(usersRes.data);
      setRecentOrders(ordersRes.data);
    } catch (error) {
      console.error('SuperAdmin fetch error:', error);
      Alert.alert('Error', 'Failed to load SuperAdmin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateUser = async (targetUserId, updates) => {
    try {
      const res = await api.put(`/admin/users/${targetUserId}/status`, updates);
      Alert.alert('Updated', res.data.message);
      fetchAdminData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleUpdatePayment = async (orderId, paymentStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/payment`, { paymentStatus });
      fetchAdminData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment status.');
    }
  };

  const pendingRequests = staffManagers.filter((u) => u.accountStatus === 'Pending');
  const activeDirectory = staffManagers.filter((u) => u.accountStatus !== 'Pending');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1B4332" />
      </View>
    );
  }

  // Calculate max daily revenue for scaling the 7-day bar chart
  const maxDailyRevenue = Math.max(
    ...(analytics?.dailyChart?.map((d) => d.revenue) || [1]),
    100
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SuperAdmin Control</Text>
          <Text style={styles.headerSub}>{user?.name || 'Administrator'}</Text>
        </View>
        {logout && (
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'approvals' && styles.activeTab]}
          onPress={() => setActiveTab('approvals')}
        >
          <Text style={[styles.tabText, activeTab === 'approvals' && styles.activeTabText]}>
            Requests ({pendingRequests.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'directory' && styles.activeTab]}
          onPress={() => setActiveTab('directory')}
        >
          <Text style={[styles.tabText, activeTab === 'directory' && styles.activeTabText]}>
            Team ({activeDirectory.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAdminData();
            }}
          />
        }
      >
        {/* TAB 1: ORDERS & PAYMENT ANALYTICAL GRAPH */}
        {activeTab === 'analytics' && analytics && (
          <>
            {/* KPI Summary Row */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total Revenue</Text>
                <Text style={styles.kpiValue}>₹{analytics.totalRevenue}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total Orders</Text>
                <Text style={styles.kpiValue}>{analytics.totalOrders}</Text>
              </View>
            </View>

            {/* 7-Day Revenue & Orders Bar Graph */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>7-Day Revenue & Orders Graph</Text>
              <Text style={styles.cardSubtitle}>Daily paid order revenue (₹)</Text>

              <View style={styles.chartContainer}>
                {analytics.dailyChart.map((day) => {
                  const barHeight = Math.max((day.revenue / maxDailyRevenue) * 120, 8);
                  return (
                    <View key={day.dateKey} style={styles.barColumn}>
                      <Text style={styles.barValue}>₹{day.revenue}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: barHeight }]} />
                      </View>
                      <Text style={styles.barLabel}>{day.label}</Text>
                      <Text style={styles.barOrderCount}>{day.orders} ord</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Payment Status & Method Breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Verification Overview</Text>
              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: '#2D6A4F' }]}>
                    {analytics.paymentStatusBreakdown.Paid || 0}
                  </Text>
                  <Text style={styles.statLabel}>Paid</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: '#D97706' }]}>
                    {analytics.paymentStatusBreakdown.Pending || 0}
                  </Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: '#DC2626' }]}>
                    {analytics.paymentStatusBreakdown.Refunded || 0}
                  </Text>
                  <Text style={styles.statLabel}>Refunded</Text>
                </View>
              </View>

              <View style={styles.divider} />
              <Text style={styles.cardSubtitle}>Recent Order Payments (Tap to Verify/Toggle)</Text>
              {recentOrders.slice(0, 8).map((ord) => (
                <View key={ord._id} style={styles.orderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderToken}>
                      #{ord.orderToken} • ₹{ord.totalAmount} ({ord.paymentMethod || 'UPI'})
                    </Text>
                    <Text style={styles.orderMeta}>
                      {ord.user?.name || 'Student'} • Order: {ord.orderStatus}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.payBadge,
                      ord.paymentStatus === 'Paid' ? styles.payPaid : styles.payPending,
                    ]}
                    onPress={() =>
                      handleUpdatePayment(
                        ord._id,
                        ord.paymentStatus === 'Paid' ? 'Refunded' : 'Paid'
                      )
                    }
                  >
                    <Text style={styles.payBadgeText}>{ord.paymentStatus || 'Paid'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {/* TAB 2: APPROVE MANAGER & STAFF REGISTRATION REQUESTS */}
        {activeTab === 'approvals' && (
          <>
            <Text style={styles.sectionHeader}>
              Pending Manager & Staff Requests ({pendingRequests.length})
            </Text>
            {pendingRequests.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>
                  No pending Manager or Staff registration requests right now.
                </Text>
              </View>
            ) : (
              pendingRequests.map((reqUser) => (
                <View key={reqUser._id} style={styles.card}>
                  <View style={styles.userRowHeader}>
                    <View>
                      <Text style={styles.userName}>{reqUser.name}</Text>
                      <Text style={styles.userEmail}>{reqUser.email}</Text>
                    </View>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleTagText}>Requested: {reqUser.role}</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.approveBtn]}
                      onPress={() =>
                        handleUpdateUser(reqUser._id, { accountStatus: 'Approved' })
                      }
                    >
                      <Text style={styles.btnText}>Approve as {reqUser.role}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btn, styles.rejectBtn]}
                      onPress={() =>
                        handleUpdateUser(reqUser._id, { accountStatus: 'Rejected' })
                      }
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* TAB 3: ACTIVE MANAGER & STAFF DIRECTORY & MANAGEMENT */}
        {activeTab === 'directory' && (
          <>
            <Text style={styles.sectionHeader}>
              Active Managers & Staff ({activeDirectory.length})
            </Text>
            {activeDirectory.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>No approved Managers or Staff yet.</Text>
              </View>
            ) : (
              activeDirectory.map((member) => (
                <View key={member._id} style={styles.card}>
                  <View style={styles.userRowHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{member.name}</Text>
                      <Text style={styles.userEmail}>{member.email}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        member.accountStatus === 'Approved'
                          ? styles.statusActive
                          : styles.statusSuspended,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {member.role} • {member.accountStatus}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    {/* Switch Role between Staff and Manager */}
                    <TouchableOpacity
                      style={[styles.btn, styles.switchRoleBtn]}
                      onPress={() =>
                        handleUpdateUser(member._id, {
                          role: member.role === 'Manager' ? 'Staff' : 'Manager',
                        })
                      }
                    >
                      <Text style={styles.btnText}>
                        Make {member.role === 'Manager' ? 'Staff' : 'Manager'}
                      </Text>
                    </TouchableOpacity>

                    {/* Suspend or Reactivate */}
                    {member.accountStatus === 'Approved' ? (
                      <TouchableOpacity
                        style={[styles.btn, styles.rejectBtn]}
                        onPress={() =>
                          handleUpdateUser(member._id, { accountStatus: 'Suspended' })
                        }
                      >
                        <Text style={styles.btnText}>Suspend</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.btn, styles.approveBtn]}
                        onPress={() =>
                          handleUpdateUser(member._id, { accountStatus: 'Approved' })
                        }
                      >
                        <Text style={styles.btnText}>Reactivate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
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
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#A3B18A', fontSize: 13, marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 6,
    borderRadius: 12,
    elevation: 2,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#1B4332' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#52796F' },
  activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    elevation: 2,
  },
  kpiLabel: { fontSize: 13, color: '#52796F', fontWeight: '600' },
  kpiValue: { fontSize: 24, fontWeight: 'bold', color: '#1B4332', marginTop: 6 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#1B4332' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, marginBottom: 14 },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20,
    paddingHorizontal: 4,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 10, color: '#1B4332', fontWeight: 'bold', marginBottom: 4 },
  barTrack: {
    width: 22,
    height: 120,
    backgroundColor: '#E8F0E8',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', backgroundColor: '#2D6A4F', borderRadius: 6 },
  barLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginTop: 6 },
  barOrderCount: { fontSize: 10, color: '#6B7280' },
  statGrid: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  orderToken: { fontSize: 14, fontWeight: 'bold', color: '#1F2937' },
  orderMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  payBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  payPaid: { backgroundColor: '#D1FAE5' },
  payPending: { backgroundColor: '#FEE2E2' },
  payBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#065F46' },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B4332',
    marginBottom: 10,
  },
  userRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  userEmail: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleTagText: { color: '#92400E', fontSize: 12, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: '#D1FAE5' },
  statusSuspended: { backgroundColor: '#FEE2E2' },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#1B4332' },
  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  approveBtn: { backgroundColor: '#2D6A4F' },
  rejectBtn: { backgroundColor: '#DC2626' },
  switchRoleBtn: { backgroundColor: '#3B82F6' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#6B7280', paddingVertical: 20 },
});