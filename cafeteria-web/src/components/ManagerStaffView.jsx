// File path: cafeteria-web/src/components/ManagerStaffView.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Utensils,
  CheckCircle2,
  Clock,
  QrCode,
  Zap,
  Users,
  MessageSquare,
  DollarSign,
  Plus,
  Trash2,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  Send,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

export default function ManagerStaffView() {
  const { user } = useAuth();
  const isManager = user?.role === 'Manager' || user?.role === 'SuperAdmin';

  // Active tab: 'queue' | 'verify' | 'menu' | 'support' | 'staff'
  const [activeTab, setActiveTab] = useState('queue');

  // Data states
  const [queue, setQueue] = useState([]);
  const [verifiedOrders, setVerifiedOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Queue status filter
  const [queueFilter, setQueueFilter] = useState('All');

  // Token verify input
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lastVerifiedReceipt, setLastVerifiedReceipt] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // Add Menu Item modal / form state
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [menuForm, setMenuForm] = useState({
    name: '',
    category: 'Snacks',
    price: '',
    description: '',
    isQuickItem: false,
    stock: -1,
  });
  const [savingItem, setSavingItem] = useState(false);

  // Support Reply Map: { [ticketId]: string }
  const [replyTextMap, setReplyTextMap] = useState({});
  const [resolvingTicketId, setResolvingTicketId] = useState(null);

  // ── Data Fetch ─────────────────────────────────────────────────────────────
  const fetchDashboardData = async () => {
    try {
      const promises = [
        api.get('/orders/queue'),
        isManager ? api.get('/orders/verified') : api.get('/orders/my-verified'),
        api.get('/menu'),
      ];

      if (isManager) {
        promises.push(api.get('/orders/all-support'));
        promises.push(api.get('/orders/staff-list'));
      }

      const results = await Promise.all(promises);
      setQueue(results[0].data);
      setVerifiedOrders(results[1].data);
      setMenuItems(results[2].data);

      if (isManager) {
        setSupportTickets(results[3]?.data || []);
        setStaffList(results[4]?.data || []);
      }
    } catch (err) {
      console.error('ManagerStaffView load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const socket = io(SOCKET_URL);
    socket.on('newOrder', (newOrder) => {
      setQueue((prev) => [newOrder, ...prev]);
    });
    socket.on('orderStatusUpdated', () => {
      fetchDashboardData();
    });
    if (isManager) {
      socket.on('newSupportTicket', (ticket) => {
        setSupportTickets((prev) => [ticket, ...prev]);
      });
    }

    return () => {
      socket.disconnect();
    };
  }, [isManager]);

  // ── Queue Status Change Handler ────────────────────────────────────────────
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  // ── Manual Token Verification ──────────────────────────────────────────────
  const handleVerifyToken = async (e) => {
    e?.preventDefault();
    if (!tokenInput.trim()) return;
    setVerifying(true);
    setVerifyError('');
    setLastVerifiedReceipt(null);
    try {
      const res = await api.put('/orders/verify', { orderToken: tokenInput.trim() });
      setLastVerifiedReceipt(res.data.order);
      setTokenInput('');
      fetchDashboardData();
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Invalid token or order not found.');
    } finally {
      setVerifying(false);
    }
  };

  // ── Menu Management Handlers ───────────────────────────────────────────────
  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) {
      alert('Name and price are required.');
      return;
    }
    setSavingItem(true);
    try {
      await api.post('/menu', {
        ...menuForm,
        price: Number(menuForm.price),
        stock: Number(menuForm.stock),
      });
      setShowAddMenuModal(false);
      setMenuForm({
        name: '',
        category: 'Snacks',
        price: '',
        description: '',
        isQuickItem: false,
        stock: -1,
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create menu item.');
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await api.put(`/menu/${item._id}`, { isAvailable: !item.isAvailable });
      setMenuItems((prev) =>
        prev.map((m) => (m._id === item._id ? { ...m, isAvailable: !m.isAvailable } : m))
      );
    } catch (err) {
      alert('Failed to toggle availability.');
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await api.delete(`/menu/${itemId}`);
      setMenuItems((prev) => prev.filter((m) => m._id !== itemId));
    } catch (err) {
      alert('Failed to delete menu item.');
    }
  };

  // ── Support / Refund Resolution ────────────────────────────────────────────
  const handleResolveTicket = async (ticketId, isRefund = false) => {
    const reply = replyTextMap[ticketId] || (isRefund ? 'Refund approved and processed.' : 'Resolved by Manager.');
    setResolvingTicketId(ticketId);
    try {
      await api.put(`/orders/support/${ticketId}/resolve`, {
        status: isRefund ? 'Refunded' : 'Resolved',
        managerReply: reply,
        markOrderRefunded: isRefund,
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve ticket.');
    } finally {
      setResolvingTicketId(null);
    }
  };

  // ── Staff Approval Handlers ────────────────────────────────────────────────
  const handleStaffStatus = async (staffId, status) => {
    try {
      await api.put(`/orders/staff/${staffId}/status`, { accountStatus: status });
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update staff status.');
    }
  };

  // Filtered queue items
  const filteredQueue = queue.filter((order) => {
    if (queueFilter === 'All') return true;
    return order.orderStatus === queueFilter;
  });

  const pendingStaffCount = staffList.filter((s) => s.accountStatus === 'Pending').length;
  const openTicketsCount = supportTickets.filter((t) => t.status === 'Open').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-600">Loading Manager Operations…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* ══════════════════ SUB-NAV TAB BAR ══════════════════ */}
      <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-gray-200/80 gap-2">
        <div className="flex items-center space-x-2">
          {[
            { id: 'queue', label: 'Live Kitchen Queue', icon: Utensils, badge: queue.length },
            { id: 'verify', label: 'Counter QR / Token', icon: QrCode },
            ...(isManager
              ? [
                  { id: 'menu', label: 'Menu Management', icon: Plus, badge: menuItems.length },
                  {
                    id: 'support',
                    label: 'Complaints & Refunds',
                    icon: MessageSquare,
                    badge: openTicketsCount,
                    urgent: openTicketsCount > 0,
                  },
                  {
                    id: 'staff',
                    label: 'Staff Directory',
                    icon: Users,
                    badge: pendingStaffCount,
                    urgent: pendingStaffCount > 0,
                  },
                ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#1B4332] text-white shadow-md'
                    : tab.urgent
                    ? 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      isActive
                        ? 'bg-[#52B788] text-[#112A20]'
                        : tab.urgent
                        ? 'bg-red-600 text-white'
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
          onClick={fetchDashboardData}
          title="Refresh Queue"
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: LIVE KITCHEN QUEUE
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'queue' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-gray-500">Status Filter:</span>
              {['All', 'Received', 'Preparing', 'Ready'].map((f) => (
                <button
                  key={f}
                  onClick={() => setQueueFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    queueFilter === f
                      ? 'bg-[#1B4332] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-500 font-semibold">
              Showing <strong>{filteredQueue.length}</strong> active queue orders
            </div>
          </div>

          {/* Orders Cards Grid */}
          {filteredQueue.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <h3 className="font-extrabold text-gray-800 text-base">Kitchen Queue is Clear!</h3>
              <p className="text-xs text-gray-500">All student meals and packets have been handed over.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredQueue.map((order) => {
                const isQuick = order.items?.some((i) => i.isQuickItem || i.menuItem?.isQuickItem);
                const isReceived = order.orderStatus === 'Received';
                const isPreparing = order.orderStatus === 'Preparing';
                const isReady = order.orderStatus === 'Ready';

                return (
                  <div
                    key={order._id}
                    className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all flex flex-col justify-between ${
                      isReady
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : isPreparing
                        ? 'border-amber-400 bg-amber-50/20'
                        : 'border-blue-400 bg-blue-50/20'
                    }`}
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-black text-gray-900 tracking-wider">
                              #{order.orderToken}
                            </span>
                            {isQuick && (
                              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300">
                                ⚡ Quick Packet
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 font-medium mt-0.5">
                            {order.user?.name || 'Student'} • ID: {order.user?.collegeId || 'N/A'}
                          </p>
                        </div>

                        <span
                          className={`px-2.5 py-1 text-xs font-black rounded-full uppercase tracking-wider ${
                            isReady
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse'
                              : isPreparing
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {order.orderStatus}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="py-3 space-y-1.5 text-xs">
                        {order.items?.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-gray-800">
                            <span>
                              <strong className="text-black font-extrabold text-sm">{it.quantity}×</strong>{' '}
                              {it.menuItem?.name || 'Meal Item'}{' '}
                              {it.isQuickItem && '⚡'}
                            </span>
                            <span className="font-bold">₹{it.priceAtPurchase * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                        <span className="text-gray-500">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.paymentMethod}
                        </span>
                        <span className="font-extrabold text-base text-[#1B4332]">
                          ₹{order.totalAmount}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons (Deterministic Two-Row Layout) */}
                    <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                      {(isReceived || isPreparing) && (
                        <div className="grid grid-cols-2 gap-2">
                          {isReceived && (
                            <button
                              onClick={() => handleUpdateStatus(order._id, 'Preparing')}
                              className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                            >
                              🍳 Mark Preparing
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(order._id, 'Ready')}
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all"
                          >
                            ✓ Mark Ready
                          </button>
                        </div>
                      )}

                      {/* Verify & Handover */}
                      <button
                        onClick={() => {
                          setTokenInput(order.orderToken);
                          setActiveTab('verify');
                        }}
                        className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center space-x-1"
                      >
                        <span>🤝 Verify & Handover</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2: COUNTER QR / TOKEN VERIFICATION
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'verify' && (
        <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-extrabold text-[#112A20]">Counter Pickup Verification</h2>
              <p className="text-xs text-gray-500">
                Type the student's 6-character order token or paste from scanner to instantly complete pickup
              </p>
            </div>

            {verifyError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyToken} className="space-y-3">
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter 6-char token (e.g. 39162C)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-black tracking-widest text-center text-[#112A20] uppercase focus:bg-white focus:border-[#2D6A4F] outline-none"
                  maxLength={6}
                />
                <button
                  type="submit"
                  disabled={verifying || !tokenInput.trim()}
                  className="px-6 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-sm font-extrabold shadow-md transition-all disabled:opacity-50"
                >
                  {verifying ? 'Verifying…' : 'Verify & Complete'}
                </button>
              </div>
            </form>

            {/* Verified Receipt Card */}
            {lastVerifiedReceipt && (
              <div className="mt-4 p-5 bg-emerald-50 border-2 border-emerald-400 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    <span className="font-extrabold text-sm text-emerald-950">
                      Token #{lastVerifiedReceipt.orderToken} Verified & Claimed!
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                    Status: Completed
                  </span>
                </div>

                <div className="text-xs text-emerald-900 space-y-1">
                  <p>
                    <strong>Student:</strong> {lastVerifiedReceipt.user?.name} (
                    {lastVerifiedReceipt.user?.collegeId || lastVerifiedReceipt.user?.email})
                  </p>
                  <p>
                    <strong>Total Amount:</strong> ₹{lastVerifiedReceipt.totalAmount} (
                    {lastVerifiedReceipt.paymentMethod})
                  </p>
                  <div className="pt-2">
                    <p className="font-bold mb-1">Handed Over Items:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {lastVerifiedReceipt.items?.map((it, idx) => (
                        <li key={idx}>
                          {it.quantity}× {it.menuItem?.name || 'Item'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recently Verified Orders List */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">
              Recently Completed Handover Records ({verifiedOrders.length})
            </h3>

            {verifiedOrders.length === 0 ? (
              <p className="text-xs text-gray-400">No verified orders recorded yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto space-y-2">
                {verifiedOrders.slice(0, 20).map((v) => (
                  <div key={v._id} className="pt-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-black text-gray-900">
                        Token #{v.orderToken} • <span className="font-medium text-gray-600">{v.user?.name}</span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {v.items?.map((i) => `${i.quantity}x ${i.menuItem?.name}`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-[#1B4332]">₹{v.totalAmount}</span>
                      <p className="text-[10px] text-gray-400">
                        {v.verifiedAt ? new Date(v.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Done'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3: MENU MANAGEMENT (Manager & SuperAdmin)
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'menu' && isManager && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#112A20]">Cafeteria Menu Catalog</h2>
              <p className="text-xs text-gray-500">
                Create new meals, toggle instant live availability, or set items as ⚡ Quick Packets
              </p>
            </div>
            <button
              onClick={() => setShowAddMenuModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {menuItems.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                        item.isQuickItem
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.isQuickItem ? '⚡ Quick Packet' : item.category || 'Kitchen'}
                    </span>
                    <span className="text-base font-extrabold text-[#1B4332]">₹{item.price}</span>
                  </div>

                  <h3 className="font-extrabold text-gray-900 mt-2 text-base">{item.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {item.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  {/* Availability toggle */}
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      item.isAvailable
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                    }`}
                  >
                    {item.isAvailable ? '✓ Available' : '✕ Out of Stock'}
                  </button>

                  <button
                    onClick={() => handleDeleteMenuItem(item._id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 4: COMPLAINTS & REFUNDS (Manager & SuperAdmin)
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'support' && isManager && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#112A20]">
                Student Complaints & Refund Approvals
              </h2>
              <p className="text-xs text-gray-500">
                Review inquiries, respond to students, and approve instant order refunds
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {supportTickets.length} total tickets
            </span>
          </div>

          {supportTickets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 space-y-2">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <h3 className="font-extrabold text-gray-800 text-base">No pending tickets</h3>
              <p className="text-xs text-gray-500">All student issues and refunds have been addressed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supportTickets.map((t) => {
                const isRefundReq = t.category === 'Refund Request';
                const isResolved = t.status === 'Resolved' || t.status === 'Refunded';

                return (
                  <div
                    key={t._id}
                    className={`bg-white rounded-2xl p-5 shadow-sm border space-y-3 ${
                      isResolved ? 'border-gray-200' : 'border-amber-300 ring-1 ring-amber-100'
                    }`}
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-900">
                            {t.category}
                          </span>
                          <span className="font-bold text-xs text-gray-500">
                            From: {t.user?.name} ({t.user?.collegeId || t.user?.email})
                          </span>
                        </div>
                        <h3 className="font-extrabold text-base text-gray-900 mt-1">{t.subject}</h3>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                          isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {t.message}
                    </p>

                    {/* Order reference if provided */}
                    {t.order && (
                      <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs flex items-center justify-between text-blue-900">
                        <span>
                          <strong>Referenced Order:</strong> Token #{t.order.orderToken} • Total: ₹{t.order.totalAmount}
                        </span>
                        <span className="font-bold">Payment: {t.order.paymentStatus || 'Paid'}</span>
                      </div>
                    )}

                    {/* Manager's Existing Response */}
                    {t.managerReply && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] font-extrabold text-emerald-900 uppercase">
                          Manager Reply Sent:
                        </span>
                        <p className="text-xs text-emerald-950 font-semibold">{t.managerReply}</p>
                      </div>
                    )}

                    {/* Manager Actions (if not resolved) */}
                    {!isResolved && (
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <input
                          type="text"
                          placeholder="Type reply to student…"
                          value={replyTextMap[t._id] || ''}
                          onChange={(e) =>
                            setReplyTextMap((prev) => ({ ...prev, [t._id]: e.target.value }))
                          }
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#2D6A4F]"
                        />

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleResolveTicket(t._id, false)}
                            disabled={resolvingTicketId === t._id}
                            className="px-4 py-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            ✓ Send Reply & Resolve
                          </button>

                          {(isRefundReq || t.order) && (
                            <button
                              onClick={() => handleResolveTicket(t._id, true)}
                              disabled={resolvingTicketId === t._id}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            >
                              💸 Approve Refund
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 5: STAFF APPROVAL DIRECTORY (Manager & SuperAdmin)
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'staff' && isManager && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#112A20]">Staff Member Approvals</h2>
              <p className="text-xs text-gray-500">
                Review and approve newly registered kitchen & counter staff members
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {staffList.length} staff members
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {staffList.map((st) => {
              const isPending = st.accountStatus === 'Pending';
              const isApproved = st.accountStatus === 'Approved';

              return (
                <div
                  key={st._id}
                  className={`bg-white rounded-2xl p-5 shadow-sm border space-y-3 ${
                    isPending ? 'border-amber-300 ring-2 ring-amber-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-base text-gray-900">{st.name}</h4>
                      <p className="text-xs text-gray-500">{st.email}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isPending
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {st.accountStatus}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100 flex items-center space-x-2">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleStaffStatus(st._id, 'Approved')}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          ✓ Approve Access
                        </button>
                        <button
                          onClick={() => handleStaffStatus(st._id, 'Rejected')}
                          className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition-all"
                        >
                          ✕ Reject
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          handleStaffStatus(st._id, isApproved ? 'Suspended' : 'Approved')
                        }
                        className={`w-full py-2 rounded-xl text-xs font-bold border transition-colors ${
                          isApproved
                            ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {isApproved ? 'Suspend Access' : 'Reactivate Access'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ══════════════════ ADD MENU ITEM MODAL ══════════════════ */}
      {showAddMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-lg text-[#112A20]">Add New Menu Item</h3>
              <button
                onClick={() => setShowAddMenuModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMenuItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. Masala Dosa or Cold Coffee"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#2D6A4F]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 60"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#2D6A4F]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#2D6A4F]"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Optional meal details…"
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-[#2D6A4F]"
                ></textarea>
              </div>

              {/* ⚡ Quick Packet Checkbox */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isQuickItem"
                  checked={menuForm.isQuickItem}
                  onChange={(e) => setMenuForm({ ...menuForm, isQuickItem: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                />
                <label htmlFor="isQuickItem" className="text-xs font-extrabold text-amber-950 cursor-pointer">
                  ⚡ Is Instant Quick Packet (Ready instantly on checkout)
                </label>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="flex-1 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {savingItem ? 'Saving…' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

