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

// ─── High-Contrast "Campus Executive" Palette ─────────────────────────────────
const C = {
  forest:       '#112A20',
  emeraldDark:  '#2D6A4F',
  emeraldMid:   '#52B788',
  emeraldLight: '#B7E4C7',
  bg:           '#F0F4F1',
  white:        '#FFFFFF',
  cardBorder:   '#CBD5E1', // Slate-300: crisp, visible card boundary
  goldDark:     '#D97706',
  goldMid:      '#B45309',
  goldLight:    '#FEF3C7',
  redDark:      '#DC2626',
  redLight:     '#FEE2E2',
  indigoDark:   '#4338CA',
  indigoLight:  '#EEF2FF',
  blueDark:     '#1D4ED8',
  blueLight:    '#DBEAFE',
  text:         '#0F172A', // Slate-900: sharp, deep text for maximum visibility
  textMid:      '#334155', // Slate-700: high-contrast secondary text
  textSoft:     '#475569', // Slate-600: clear, readable subtitle text
  divider:      '#E2E8F0',
  barTrack:     '#E2EBE5',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

const paymentMethodColor = (method) => {
  switch ((method || '').toLowerCase()) {
    case 'upi':     return { bg: '#EDE9FE', text: '#5B21B6' };
    case 'card':    return { bg: C.blueLight, text: C.blueDark };
    case 'counter': return { bg: C.goldLight, text: '#78350F' };
    default:        return { bg: C.blueLight, text: C.blueDark };
  }
};

const orderStatusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'completed':  return { bg: '#D1FAE5', text: '#065F46' };
    case 'pending':    return { bg: C.goldLight, text: '#78350F' };
    case 'preparing':  return { bg: C.blueLight, text: C.blueDark };
    case 'cancelled':  return { bg: C.redLight, text: '#991B1B' };
    default:           return { bg: '#E2E8F0', text: C.textMid };
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name = '', size = 44, bgColor = C.emeraldDark, textColor = C.white }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38, color: textColor }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

function Pill({ label, bg, color, small }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }, small && styles.pillSmall]}>
      <Text style={[styles.pillText, { color }, small && styles.pillTextSmall]}>{label}</Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // ── State (unchanged) ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab]         = useState('analytics'); // 'analytics' | 'approvals' | 'directory'
  const [analytics, setAnalytics]         = useState(null);
  const [staffManagers, setStaffManagers] = useState([]);
  const [recentOrders, setRecentOrders]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [dirFilter, setDirFilter] = useState('All'); // 'All' | 'Managers' | 'Staff' | 'Suspended'

  // ── Data fetch ─────────────────────────────────────────────────────────────
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

  useEffect(() => { fetchAdminData(); }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
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

  // ── Derived data ───────────────────────────────────────────────────────────
  const pendingRequests  = staffManagers.filter((u) => u.accountStatus === 'Pending');
  const activeDirectory  = staffManagers.filter((u) => u.accountStatus !== 'Pending');

  const filteredDirectory = activeDirectory.filter((m) => {
    if (dirFilter === 'All')       return true;
    if (dirFilter === 'Managers')  return m.role === 'Manager';
    if (dirFilter === 'Staff')     return m.role === 'Staff';
    if (dirFilter === 'Suspended') return m.accountStatus === 'Suspended';
    return true;
  });

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={C.emeraldDark} />
          <Text style={styles.loadingText}>Loading Admin Portal…</Text>
        </View>
      </View>
    );
  }

  // ── Bar chart helpers ──────────────────────────────────────────────────────
  const maxDailyRevenue = Math.max(
    ...(analytics?.dailyChart?.map((d) => d.revenue) || [1]),
    100
  );
  const total7DayRevenue = analytics?.dailyChart?.reduce((s, d) => s + (d.revenue || 0), 0) || 0;
  const todayLabel = analytics?.dailyChart?.[analytics.dailyChart.length - 1]?.label;

  // ── Payment method summary totals ──────────────────────────────────────────
  const pmb = analytics?.paymentMethodBreakdown || {};
  const pmbTotal = (pmb.UPI || 0) + (pmb.Card || 0) + (pmb.Counter || 0) || 1;
  const psbPaid     = analytics?.paymentStatusBreakdown?.Paid     || 0;
  const psbPending  = analytics?.paymentStatusBreakdown?.Pending  || 0;
  const psbRefunded = analytics?.paymentStatusBreakdown?.Refunded || 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ══════════════ EXECUTIVE HEADER & SIGN OUT ══════════════ */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>SUPER ADMIN PORTAL</Text>
        </View>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName}>{user?.name || 'Administrator'}</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>System Online</Text>
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

          {/* Tab 1 — Analytics */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'analytics' && styles.tabPillActive]}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={[styles.tabPillText, activeTab === 'analytics' && styles.tabPillTextActive]}>
              📊 Analytics
            </Text>
          </TouchableOpacity>

          {/* Tab 2 — Requests + badge */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'approvals' && styles.tabPillActive]}
            onPress={() => setActiveTab('approvals')}
          >
            <View style={styles.tabInner}>
              <Text style={[styles.tabPillText, activeTab === 'approvals' && styles.tabPillTextActive]}>
                ⏳ Requests
              </Text>
              {pendingRequests.length > 0 && (
                <View style={[styles.tabBadge, activeTab === 'approvals' && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === 'approvals' && { color: C.forest }]}>
                    {pendingRequests.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Tab 3 — Team + count */}
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'directory' && styles.tabPillActive]}
            onPress={() => setActiveTab('directory')}
          >
            <View style={styles.tabInner}>
              <Text style={[styles.tabPillText, activeTab === 'directory' && styles.tabPillTextActive]}>
                👥 Team
              </Text>
              <View style={[styles.tabBadge, activeTab === 'directory' && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === 'directory' && { color: C.forest }]}>
                  {activeDirectory.length}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

        </View>
      </View>

      {/* ══════════════ SCROLLABLE CONTENT ══════════════ */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAdminData(); }}
            tintColor={C.emeraldDark}
            colors={[C.emeraldDark]}
          />
        }
      >

        {/* ════════════ TAB 1 — ANALYTICS ════════════ */}
        {activeTab === 'analytics' && analytics && (
          <>
            {/* ── Stable 2-Row 2x2 Bento Grid ── */}
            <View style={styles.bentoContainer}>
              {/* Row 1 */}
              <View style={styles.bentoRow}>
                <View style={styles.bentoCard}>
                  <View style={[styles.bentoAccentBar, { backgroundColor: C.emeraldMid }]} />
                  <Text style={styles.bentoLabel}>TOTAL REVENUE</Text>
                  <Text style={styles.bentoValue}>₹{(analytics.totalRevenue || 0).toLocaleString('en-IN')}</Text>
                  <Text style={styles.bentoSub}>Paid Orders</Text>
                </View>

                <View style={styles.bentoCard}>
                  <View style={[styles.bentoAccentBar, { backgroundColor: C.blueDark }]} />
                  <Text style={styles.bentoLabel}>TOTAL ORDERS</Text>
                  <Text style={[styles.bentoValue, { color: C.blueDark }]}>{analytics.totalOrders || 0}</Text>
                  <Text style={styles.bentoSub}>All-Time Orders</Text>
                </View>
              </View>

              {/* Row 2 */}
              <View style={styles.bentoRow}>
                <TouchableOpacity
                  style={styles.bentoCard}
                  onPress={() => setActiveTab('approvals')}
                  activeOpacity={0.78}
                >
                  <View style={[styles.bentoAccentBar, { backgroundColor: C.goldDark }]} />
                  <Text style={styles.bentoLabel}>PENDING APPROVALS</Text>
                  <Text style={[styles.bentoValue, { color: C.goldDark }]}>
                    {analytics.pendingApprovalsCount ?? pendingRequests.length}
                  </Text>
                  <Text style={styles.bentoSubTap}>Tap to review →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bentoCard}
                  onPress={() => setActiveTab('directory')}
                  activeOpacity={0.78}
                >
                  <View style={[styles.bentoAccentBar, { backgroundColor: C.indigoDark }]} />
                  <Text style={styles.bentoLabel}>ACTIVE DIRECTORY</Text>
                  <Text style={[styles.bentoValue, { color: C.indigoDark }]}>
                    {analytics.activeStaffCount ?? activeDirectory.filter((m) => m.accountStatus === 'Approved').length}
                  </Text>
                  <Text style={styles.bentoSubTap}>Tap to manage →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── 7-Day Revenue Bar Chart ── */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>7-Day Revenue Performance</Text>
                  <Text style={styles.cardSubtitle}>Daily paid order revenue in Rupees</Text>
                </View>
                <View style={styles.totalPill}>
                  <Text style={styles.totalPillText}>₹{total7DayRevenue.toLocaleString('en-IN')} total</Text>
                </View>
              </View>

              <View style={styles.chartContainer}>
                {(analytics.dailyChart || []).map((day) => {
                  const isToday = day.label === todayLabel;
                  const barH = Math.max((day.revenue / maxDailyRevenue) * 120, 8);
                  return (
                    <View key={day.dateKey} style={styles.barColumn}>
                      <Text style={[styles.barValue, isToday && { color: C.emeraldDark, fontWeight: '800' }]}>
                        ₹{day.revenue}
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { height: barH, backgroundColor: isToday ? C.emeraldMid : C.emeraldDark },
                          ]}
                        />
                      </View>
                      <Text style={[styles.barLabel, isToday && { color: C.forest, fontWeight: '800' }]}>
                        {day.label}
                      </Text>
                      <View style={[styles.orderCountPill, isToday && { backgroundColor: '#D1FAE5' }]}>
                        <Text style={[styles.orderCountPillText, isToday && { color: C.emeraldDark }]}>
                          {day.orders} ord
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── Payment Method & Status Distribution ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Breakdown</Text>
              <Text style={styles.cardSubtitle}>Verification status and preferred student modes</Text>

              {/* Payment Status Boxes */}
              <View style={styles.statusBoxRow}>
                <View style={[styles.statusBox, { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0' }]}>
                  <Text style={[styles.statusBoxNum, { color: C.emeraldDark }]}>{psbPaid}</Text>
                  <Text style={[styles.statusBoxLabel, { color: '#065F46' }]}>Paid</Text>
                </View>
                <View style={[styles.statusBox, { backgroundColor: C.goldLight, borderWidth: 1, borderColor: '#FDE68A' }]}>
                  <Text style={[styles.statusBoxNum, { color: C.goldDark }]}>{psbPending}</Text>
                  <Text style={[styles.statusBoxLabel, { color: '#78350F' }]}>Pending</Text>
                </View>
                <View style={[styles.statusBox, { backgroundColor: C.redLight, borderWidth: 1, borderColor: '#FECACA' }]}>
                  <Text style={[styles.statusBoxNum, { color: C.redDark }]}>{psbRefunded}</Text>
                  <Text style={[styles.statusBoxLabel, { color: '#991B1B' }]}>Refunded</Text>
                </View>
              </View>

              {/* Horizontal Progress Bars for Payment Methods */}
              {[
                { key: 'UPI',     label: 'UPI',     count: pmb.UPI     || 0, color: '#7C3AED' },
                { key: 'Card',    label: 'Card',    count: pmb.Card    || 0, color: C.blueDark },
                { key: 'Counter', label: 'Counter', count: pmb.Counter || 0, color: C.goldDark },
              ].map(({ key, label, count, color }) => (
                <View key={key} style={styles.pmRow}>
                  <Text style={styles.pmLabel}>{label}</Text>
                  <View style={styles.pmTrack}>
                    <View
                      style={[
                        styles.pmFill,
                        { width: `${Math.round((count / pmbTotal) * 100)}%`, backgroundColor: color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.pmCount, { color }]}>{count}</Text>
                </View>
              ))}
            </View>

            {/* ── Interactive Payment Audit Feed ── */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Audit Feed</Text>
              <Text style={styles.cardSubtitle}>Tap toggle button to switch between Paid and Refunded</Text>

              {recentOrders.slice(0, 8).map((ord, idx) => {
                const pm = paymentMethodColor(ord.paymentMethod);
                const os = orderStatusColor(ord.orderStatus);
                const isPaid = ord.paymentStatus === 'Paid';
                return (
                  <View key={ord._id} style={[styles.txRow, idx === 0 && { borderTopWidth: 0 }]}>
                    {/* Token avatar */}
                    <View style={styles.tokenAvatar}>
                      <Text style={styles.tokenAvatarText}>#{String(ord.orderToken || idx + 1).slice(-2)}</Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={styles.txName} numberOfLines={1}>
                        {ord.user?.name || 'Student'}
                      </Text>
                      <View style={styles.txBadgeRow}>
                        <View style={[styles.txBadge, { backgroundColor: pm.bg }]}>
                          <Text style={[styles.txBadgeText, { color: pm.text }]}>
                            {ord.paymentMethod || 'UPI'}
                          </Text>
                        </View>
                        <View style={[styles.txBadge, { backgroundColor: os.bg }]}>
                          <Text style={[styles.txBadgeText, { color: os.text }]}>
                            {ord.orderStatus}
                          </Text>
                        </View>
                        <Text style={styles.txAmount}>₹{ord.totalAmount}</Text>
                      </View>
                    </View>

                    {/* Toggle button */}
                    <TouchableOpacity
                      style={[styles.payToggle, isPaid ? styles.payTogglePaid : styles.payToggleRefund]}
                      onPress={() =>
                        handleUpdatePayment(ord._id, isPaid ? 'Refunded' : 'Paid')
                      }
                    >
                      <Text style={[styles.payToggleText, { color: isPaid ? '#065F46' : '#991B1B' }]}>
                        {isPaid ? '✅ Paid' : '↩️ Refund'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ════════════ TAB 2 — APPROVALS ════════════ */}
        {activeTab === 'approvals' && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Pending Registrations</Text>
              {pendingRequests.length > 0 && (
                <Pill label={`${pendingRequests.length} pending`} bg={C.goldLight} color={C.goldMid} />
              )}
            </View>

            {pendingRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptyBody}>
                  No pending Manager or Staff registration requests.
                </Text>
              </View>
            ) : (
              pendingRequests.map((reqUser) => {
                const isManager = reqUser.role === 'Manager';
                return (
                  <View key={reqUser._id} style={styles.card}>
                    <View style={styles.memberHeaderRow}>
                      <Avatar
                        name={reqUser.name}
                        bgColor={isManager ? C.indigoDark : C.goldDark}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.memberName}>{reqUser.name}</Text>
                        <Text style={styles.memberEmail} numberOfLines={1}>{reqUser.email}</Text>
                      </View>
                      <Pill
                        label={`Requested: ${reqUser.role}`}
                        bg={isManager ? C.indigoLight : C.goldLight}
                        color={isManager ? C.indigoDark : '#78350F'}
                        small
                      />
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnApprove]}
                        onPress={() =>
                          handleUpdateUser(reqUser._id, { accountStatus: 'Approved' })
                        }
                      >
                        <Text style={styles.actionBtnText}>✓ Approve as {reqUser.role}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnReject]}
                        onPress={() =>
                          handleUpdateUser(reqUser._id, { accountStatus: 'Rejected' })
                        }
                      >
                        <Text style={[styles.actionBtnText, { color: C.redDark }]}>✕ Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ════════════ TAB 3 — TEAM DIRECTORY ════════════ */}
        {activeTab === 'directory' && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Active Team Directory</Text>
              <Pill label={`${activeDirectory.length} members`} bg={C.indigoLight} color={C.indigoDark} />
            </View>

            {/* Filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
            >
              {['All', 'Managers', 'Staff', 'Suspended'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, dirFilter === f && styles.filterPillActive]}
                  onPress={() => setDirFilter(f)}
                >
                  <Text style={[styles.filterPillText, dirFilter === f && styles.filterPillTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredDirectory.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>No members found</Text>
                <Text style={styles.emptyBody}>Try selecting a different filter above.</Text>
              </View>
            ) : (
              filteredDirectory.map((member) => {
                const isApproved  = member.accountStatus === 'Approved';
                const isManager   = member.role === 'Manager';
                return (
                  <View key={member._id} style={styles.card}>
                    <View style={styles.memberHeaderRow}>
                      <Avatar
                        name={member.name}
                        bgColor={isManager ? C.emeraldDark : C.indigoDark}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.memberNameRow}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <View
                            style={[
                              styles.memberStatusDot,
                              { backgroundColor: isApproved ? C.emeraldMid : C.redDark },
                            ]}
                          />
                        </View>
                        <Text style={styles.memberEmail} numberOfLines={1}>{member.email}</Text>
                      </View>
                    </View>

                    <View style={styles.memberBadgeRow}>
                      <Pill
                        label={member.role}
                        bg={isManager ? '#D1FAE5' : C.indigoLight}
                        color={isManager ? C.emeraldDark : C.indigoDark}
                        small
                      />
                      <Pill
                        label={isApproved ? '● Approved' : '● Suspended'}
                        bg={isApproved ? '#D1FAE5' : C.redLight}
                        color={isApproved ? C.emeraldDark : C.redDark}
                        small
                      />
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnSwitch]}
                        onPress={() =>
                          handleUpdateUser(member._id, {
                            role: isManager ? 'Staff' : 'Manager',
                          })
                        }
                      >
                        <Text style={[styles.actionBtnText, { color: C.indigoDark }]}>
                          ⇄ Switch to {isManager ? 'Staff' : 'Manager'}
                        </Text>
                      </TouchableOpacity>

                      {isApproved ? (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnReject]}
                          onPress={() =>
                            handleUpdateUser(member._id, { accountStatus: 'Suspended' })
                          }
                        >
                          <Text style={[styles.actionBtnText, { color: C.redDark }]}>
                            Suspend Access
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.actionBtnApprove]}
                          onPress={() =>
                            handleUpdateUser(member._id, { accountStatus: 'Approved' })
                          }
                        >
                          <Text style={styles.actionBtnText}>Reactivate</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
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
  tabBadgeActive: { backgroundColor: C.emeraldMid },
  tabBadgeText:   { color: C.text, fontSize: 10, fontWeight: '800' },

  // ── Scroll Content ────────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 60 },

  // ── Stable 2-Row Bento Grid ───────────────────────────────────────────────
  bentoContainer: {
    gap: 12,
    marginBottom: 14,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  bentoAccentBar: { height: 4, width: 36, borderRadius: 4, marginBottom: 10 },
  bentoLabel:     { fontSize: 12, color: C.textMid, fontWeight: '700', letterSpacing: 0.5 },
  bentoValue:     { fontSize: 26, fontWeight: '800', color: C.emeraldDark, marginTop: 4 },
  bentoSub:       { fontSize: 12, color: C.textSoft, marginTop: 4, fontWeight: '500' },
  bentoSubTap:    { fontSize: 12, color: C.emeraldDark, marginTop: 4, fontWeight: '700' },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardTitle:     { fontSize: 18, fontWeight: '800', color: C.forest },
  cardSubtitle:  { fontSize: 13, color: C.textMid, marginTop: 3, fontWeight: '500' },
  totalPill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  totalPillText: { color: C.emeraldDark, fontSize: 12, fontWeight: '800' },

  // ── Bar Chart ─────────────────────────────────────────────────────────────
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 195,
    paddingTop: 20,
    paddingHorizontal: 2,
  },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue:  { fontSize: 11, color: C.forest, fontWeight: '700', marginBottom: 4 },
  barTrack: {
    width: 26,
    height: 120,
    backgroundColor: C.barTrack,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill:  { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginTop: 7 },
  orderCountPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  orderCountPillText: { fontSize: 10, color: C.textMid, fontWeight: '700' },

  // ── Payment Breakdown ─────────────────────────────────────────────────────
  statusBoxRow: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  statusBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusBoxNum:   { fontSize: 22, fontWeight: '800' },
  statusBoxLabel: { fontSize: 12, marginTop: 2, fontWeight: '700' },
  pmRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pmLabel: { width: 62, fontSize: 13, fontWeight: '700', color: C.text },
  pmTrack: {
    flex: 1,
    height: 10,
    backgroundColor: C.barTrack,
    borderRadius: 50,
    overflow: 'hidden',
    marginRight: 10,
  },
  pmFill:  { height: '100%', borderRadius: 50 },
  pmCount: { fontSize: 13, fontWeight: '800', width: 32, textAlign: 'right' },

  // ── Transaction Rows ──────────────────────────────────────────────────────
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  tokenAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDFAF3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.emeraldLight,
  },
  tokenAvatarText: { fontSize: 13, fontWeight: '800', color: C.emeraldDark },
  txName:     { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  txBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txBadge: {
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  txBadgeText: { fontSize: 11, fontWeight: '700' },
  txAmount:   { fontSize: 13, fontWeight: '800', color: C.text, marginLeft: 2 },
  payToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 84,
    alignItems: 'center',
  },
  payTogglePaid:   { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#A7F3D0' },
  payToggleRefund: { backgroundColor: C.redLight, borderWidth: 1, borderColor: '#FECACA' },
  payToggleText:   { fontSize: 12, fontWeight: '800' },

  // ── Section Headers ───────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.forest },

  // ── Pill Component ────────────────────────────────────────────────────────
  pill: {
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillSmall: { paddingHorizontal: 9, paddingVertical: 3 },
  pillText:  { fontSize: 13, fontWeight: '800' },
  pillTextSmall: { fontSize: 11, fontWeight: '800' },

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatar:     { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800' },

  // ── Member Cards ──────────────────────────────────────────────────────────
  memberHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memberNameRow:   { flexDirection: 'row', alignItems: 'center' },
  memberName:  { fontSize: 16, fontWeight: '700', color: C.text },
  memberEmail: { fontSize: 13, color: C.textMid, marginTop: 2, fontWeight: '500' },
  memberStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  memberBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },

  // ── Action Buttons ────────────────────────────────────────────────────────
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  actionBtnApprove: {
    backgroundColor: C.emeraldDark,
    borderColor: C.emeraldDark,
  },
  actionBtnReject: {
    backgroundColor: C.redLight,
    borderColor: C.redDark,
  },
  actionBtnSwitch: {
    backgroundColor: C.indigoLight,
    borderColor: C.indigoDark,
  },
  actionBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 13,
  },

  // ── Filter Pills (Directory) ──────────────────────────────────────────────
  filterScroll:        { marginBottom: 14 },
  filterScrollContent: { paddingRight: 16, gap: 8, flexDirection: 'row' },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
  },
  filterPillActive:     { backgroundColor: C.forest, borderColor: C.forest },
  filterPillText:       { fontSize: 13, fontWeight: '700', color: C.text },
  filterPillTextActive: { color: C.white, fontWeight: '800' },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    elevation: 2,
  },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 6 },
  emptyBody:  { fontSize: 14, color: C.textMid, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
});
