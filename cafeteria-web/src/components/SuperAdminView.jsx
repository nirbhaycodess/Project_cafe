// File path: cafeteria-web/src/components/SuperAdminView.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  CreditCard,
  ShieldCheck,
  RefreshCw,
  Check,
  X,
  ArrowRightLeft,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

export default function SuperAdminView() {
  const [analytics, setAnalytics] = useState(null);
  const [staffManagers, setStaffManagers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'approvals' | 'directory'
  const [dirFilter, setDirFilter] = useState('All');

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
    } catch (err) {
      console.error('SuperAdmin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateUserStatus = async (userId, updates) => {
    try {
      await api.put(`/admin/users/${userId}/status`, updates);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleUpdatePayment = async (orderId, paymentStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/payment`, { paymentStatus });
      fetchAdminData();
    } catch (err) {
      alert('Failed to update payment status.');
    }
  };

  const pendingRequests = staffManagers.filter((u) => u.accountStatus === 'Pending');
  const activeDirectory = staffManagers.filter((u) => u.accountStatus !== 'Pending');

  const filteredDirectory = activeDirectory.filter((m) => {
    if (dirFilter === 'All') return true;
    if (dirFilter === 'Managers') return m.role === 'Manager';
    if (dirFilter === 'Staff') return m.role === 'Staff';
    if (dirFilter === 'Suspended') return m.accountStatus === 'Suspended';
    return true;
  });

  const maxRevenue = Math.max(
    ...(analytics?.dailyChart?.map((d) => d.revenue) || [1]),
    100
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-600">Loading SuperAdmin Executive Portal…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">
      
      {/* ══════════════════ SUB-NAV TAB BAR ══════════════════ */}
      <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-gray-200/80 gap-2">
        <div className="flex items-center space-x-2">
          {[
            { id: 'analytics', label: '📊 Financial & Sales Analytics' },
            {
              id: 'approvals',
              label: '⏳ Role Approvals',
              badge: pendingRequests.length,
              urgent: pendingRequests.length > 0,
            },
            { id: 'directory', label: '👥 Team Directory', badge: activeDirectory.length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#112A20] text-white shadow-md'
                    : tab.urgent
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      isActive
                        ? 'bg-[#52B788] text-[#112A20]'
                        : tab.urgent
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={fetchAdminData}
          title="Refresh Data"
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: FINANCIAL & SALES ANALYTICS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Bento KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total Campus Revenue
                </span>
                <p className="text-3xl font-black text-[#1B4332] mt-2">
                  ₹{analytics?.totalRevenue || 0}
                </p>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-3">Paid & completed orders</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Total Orders Placed
                </span>
                <p className="text-3xl font-black text-[#112A20] mt-2">
                  {analytics?.totalOrders || 0}
                </p>
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-3">All categories & split bills</p>
            </div>

            <div
              onClick={() => setActiveTab('approvals')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-amber-300 transition-colors"
            >
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Pending Approvals
                </span>
                <p className="text-3xl font-black text-amber-600 mt-2">
                  {analytics?.pendingApprovalsCount || 0}
                </p>
              </div>
              <p className="text-xs text-amber-700 font-semibold mt-3">Click to review requests →</p>
            </div>

            <div
              onClick={() => setActiveTab('directory')}
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-emerald-300 transition-colors"
            >
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Active Team Members
                </span>
                <p className="text-3xl font-black text-emerald-700 mt-2">
                  {analytics?.activeStaffCount || 0}
                </p>
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-3">Managers & staff directory →</p>
            </div>
          </div>

          {/* 7-Day Revenue Performance Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">7-Day Revenue & Volume Trend</h3>
                <p className="text-xs text-gray-500">Daily financial collections across all pickup counters</p>
              </div>
              <span className="text-xs font-extrabold px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                Live Data
              </span>
            </div>

            <div className="h-56 flex items-end justify-between pt-8 gap-2 sm:gap-4 px-2">
              {analytics?.dailyChart?.map((day, idx) => {
                const heightPercent = Math.max(Math.round((day.revenue / maxRevenue) * 100), 12);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <span className="text-[11px] font-extrabold text-[#1B4332] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      ₹{day.revenue}
                    </span>
                    <div className="w-full max-w-[40px] bg-emerald-50 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-[#1B4332] to-[#52B788] rounded-t-xl transition-all"
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 mt-2">{day.label}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{day.orders} ord</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Payment Audit Feed */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Recent Payment Audits</h3>
                <p className="text-xs text-gray-500">Toggle payment status or process student refunds directly</p>
              </div>
              <span className="text-xs font-bold text-gray-500">{recentOrders.length} orders</span>
            </div>

            <div className="divide-y divide-gray-100 space-y-2">
              {recentOrders.slice(0, 15).map((ord) => (
                <div key={ord._id} className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-extrabold text-gray-900">
                      Token #{ord.orderToken} • <span className="text-gray-600 font-medium">{ord.user?.name}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Mode: {ord.paymentMethod} • Status: {ord.orderStatus}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="font-extrabold text-sm text-[#1B4332]">₹{ord.totalAmount}</span>

                    <button
                      onClick={() =>
                        handleUpdatePayment(
                          ord._id,
                          ord.paymentStatus === 'Paid' ? 'Refunded' : 'Paid'
                        )
                      }
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition-colors ${
                        ord.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                          : 'bg-red-50 text-red-700 border-red-300 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      {ord.paymentStatus === 'Paid' ? '✓ Paid' : '↩ Refunded'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2: ROLE APPROVALS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#112A20]">Pending Staff & Manager Requests</h2>
              <p className="text-xs text-gray-500">
                Verify identities before authorizing access to kitchen and inventory tools
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {pendingRequests.length} pending
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 space-y-2">
              <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500" />
              <h3 className="font-extrabold text-gray-800 text-base">All Caught Up!</h3>
              <p className="text-xs text-gray-500">No pending staff or manager registrations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pendingRequests.map((reqUser) => (
                <div
                  key={reqUser._id}
                  className="bg-white rounded-2xl p-5 shadow-sm border-2 border-amber-300 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-gray-900">{reqUser.name}</h4>
                      <p className="text-xs text-gray-500">{reqUser.email}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold bg-purple-100 text-purple-800 rounded">
                      Requested: {reqUser.role}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() =>
                        handleUpdateUserStatus(reqUser._id, { accountStatus: 'Approved' })
                      }
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      ✓ Approve Access
                    </button>
                    <button
                      onClick={() =>
                        handleUpdateUserStatus(reqUser._id, { accountStatus: 'Rejected' })
                      }
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition-all"
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3: TEAM DIRECTORY
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-[#112A20]">Active Staff & Manager Directory</h2>
              <p className="text-xs text-gray-500">
                Manage roles, promote staff to manager, or suspend team access
              </p>
            </div>
            <div className="flex items-center space-x-1.5">
              {['All', 'Managers', 'Staff', 'Suspended'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDirFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    dirFilter === filter
                      ? 'bg-[#112A20] text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDirectory.map((m) => {
              const isApproved = m.accountStatus === 'Approved';
              return (
                <div
                  key={m._id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-base text-gray-900">{m.name}</h4>
                        <p className="text-xs text-gray-500">{m.email}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          m.role === 'Manager'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {m.role}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 mt-2">
                      Status: <strong className={isApproved ? 'text-emerald-700' : 'text-red-700'}>{m.accountStatus}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleUpdateUserStatus(m._id, {
                          role: m.role === 'Manager' ? 'Staff' : 'Manager',
                        })
                      }
                      className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all border border-indigo-200"
                    >
                      ⇄ Switch to {m.role === 'Manager' ? 'Staff' : 'Manager'}
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateUserStatus(m._id, {
                          accountStatus: isApproved ? 'Suspended' : 'Approved',
                        })
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        isApproved
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isApproved ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

