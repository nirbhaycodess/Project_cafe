// File path: cafeteria-web/src/components/StudentView.jsx
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import api, { SOCKET_URL } from '../services/api';
import {
  Utensils,
  Zap,
  ShoppingBag,
  CreditCard,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Star,
  Search,
  Filter,
  Plus,
  Minus,
  RefreshCw,
  Send,
  MessageSquare,
  DollarSign,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function StudentView({ activeTab, setActiveTab, onCartUpdate }) {
  // Data state
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Cart state split: regular kitchen items vs quick packet items
  // Format: { [itemId]: quantity }
  const [regularCart, setRegularCart] = useState({});
  const [quickCart, setQuickCart] = useState({});

  // Checkout states
  const [regularPaymentMethod, setRegularPaymentMethod] = useState('UPI');
  const [quickPaymentMethod, setQuickPaymentMethod] = useState('UPI');
  const [placingRegular, setPlacingRegular] = useState(false);
  const [placingQuick, setPlacingQuick] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);

  // Active QR modal
  const [viewingQrOrder, setViewingQrOrder] = useState(null);

  // Feedback form state: { [orderId]: { rating: number, comment: string, submitting: boolean } }
  const [feedbackState, setFeedbackState] = useState({});

  // Support ticket form state
  const [ticketCategory, setTicketCategory] = useState('Refund Request');
  const [ticketOrderId, setTicketOrderId] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState('');

  // ── 1. Fetch Student Data ──────────────────────────────────────────────────
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
    } catch (err) {
      console.error('Failed to load student data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();

    // Socket.io real-time connection for live order updates
    const socket = io(SOCKET_URL);
    socket.on('orderStatusUpdated', ({ orderId, status }) => {
      setOrders((prev) =>
        prev.map((ord) => (ord._id === orderId ? { ...ord, orderStatus: status } : ord))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Update total cart count in parent Navbar
  const totalCartCount =
    Object.values(regularCart).reduce((a, b) => a + b, 0) +
    Object.values(quickCart).reduce((a, b) => a + b, 0);

  useEffect(() => {
    onCartUpdate?.(totalCartCount);
  }, [totalCartCount, onCartUpdate]);

  // ── Cart Handlers ──────────────────────────────────────────────────────────
  const updateRegularCart = (id, delta) => {
    setRegularCart((prev) => {
      const current = prev[id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const updateQuickCart = (id, delta) => {
    setQuickCart((prev) => {
      const current = prev[id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  // ── Calculations ───────────────────────────────────────────────────────────
  const regularMenu = menuItems.filter((m) => !m.isQuickItem);
  const quickMenu = menuItems.filter((m) => m.isQuickItem);

  const categories = ['All', ...new Set(menuItems.map((m) => m.category || 'General'))];

  // Bill calculations
  const calculateBill = (cartMap) => {
    let subtotal = 0;
    let count = 0;
    const itemsList = [];

    Object.entries(cartMap).forEach(([itemId, qty]) => {
      const item = menuItems.find((m) => m._id === itemId);
      if (item && qty > 0) {
        const cost = item.price * qty;
        subtotal += cost;
        count += qty;
        itemsList.push({ item, qty, cost });
      }
    });

    return { subtotal, count, itemsList };
  };

  const regularBill = calculateBill(regularCart);
  const quickBill = calculateBill(quickCart);

  // ── Order Checkout Handlers ────────────────────────────────────────────────
  const handlePlaceRegularOrder = async () => {
    if (regularBill.itemsList.length === 0) return;
    setPlacingRegular(true);
    try {
      const payload = {
        items: regularBill.itemsList.map(({ item, qty }) => ({
          menuItemId: item._id,
          quantity: qty,
        })),
        paymentMethod: regularPaymentMethod,
      };
      const res = await api.post('/orders', payload);
      setRegularCart({});
      setLastPlacedOrder(res.data.order);
      setViewingQrOrder(res.data.order);
      fetchStudentData();
      setActiveTab('orders');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place regular order.');
    } finally {
      setPlacingRegular(false);
    }
  };

  const handlePlaceQuickOrder = async () => {
    if (quickBill.itemsList.length === 0) return;
    setPlacingQuick(true);
    try {
      const payload = {
        items: quickBill.itemsList.map(({ item, qty }) => ({
          menuItemId: item._id,
          quantity: qty,
        })),
        paymentMethod: quickPaymentMethod,
      };
      const res = await api.post('/orders', payload);
      setQuickCart({});
      setLastPlacedOrder(res.data.order);
      setViewingQrOrder(res.data.order);
      fetchStudentData();
      setActiveTab('orders');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place quick packet order.');
    } finally {
      setPlacingQuick(false);
    }
  };

  // ── Feedback Submission ────────────────────────────────────────────────────
  const handleFeedbackSubmit = async (orderId) => {
    const feedback = feedbackState[orderId];
    if (!feedback || !feedback.rating) {
      alert('Please select a star rating first.');
      return;
    }
    setFeedbackState((prev) => ({
      ...prev,
      [orderId]: { ...prev[orderId], submitting: true },
    }));
    try {
      await api.post(`/orders/${orderId}/feedback`, {
        rating: feedback.rating,
        comment: feedback.comment || '',
      });
      alert('Thank you! Your meal rating has been submitted.');
      fetchStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setFeedbackState((prev) => ({
        ...prev,
        [orderId]: { ...prev[orderId], submitting: false },
      }));
    }
  };

  // ── Support Ticket Submission ──────────────────────────────────────────────
  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) {
      alert('Please fill out both the Subject and Message.');
      return;
    }
    setSubmittingTicket(true);
    setTicketSuccess('');
    try {
      await api.post('/orders/support', {
        category: ticketCategory,
        orderId: ticketOrderId || undefined,
        subject: ticketSubject,
        message: ticketMessage,
      });
      setTicketSuccess('Support request submitted to the Manager successfully!');
      setTicketSubject('');
      setTicketMessage('');
      setTicketOrderId('');
      fetchStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send support ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Received':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Preparing':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Ready':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse font-extrabold';
      case 'Completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-600">Connecting to Campus Cafeteria…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* ══════════════════ SUB-NAV PILL BAR ══════════════════ */}
      <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-gray-200/80 gap-2">
        <div className="flex items-center space-x-2">
          {[
            { id: 'menu', label: 'Menu & Ordering', icon: Utensils, badge: menuItems.length },
            { id: 'cart', label: 'Split Billing', icon: ShoppingBag, badge: totalCartCount, highlight: totalCartCount > 0 },
            { id: 'orders', label: 'My Orders', icon: Clock, badge: orders.length },
            { id: 'support', label: 'Help & Refund', icon: HelpCircle, badge: supportTickets.length },
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
                    : tab.highlight
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-gray-500'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                      isActive ? 'bg-[#52B788] text-[#112A20]' : 'bg-gray-200 text-gray-700'
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
          onClick={fetchStudentData}
          title="Refresh Data"
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB 1: MENU & ORDERING
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'menu' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Search & Category Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search meals, snacks, drinks…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-gray-500 flex items-center mr-1">
                <Filter className="w-3.5 h-3.5 mr-1" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#1B4332] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION A: Fresh Kitchen Prep Menu (Cooked On Demand) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-emerald-900/10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#1B4332] flex items-center justify-center font-bold">
                  🍳
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#112A20]">
                    Fresh Kitchen Prep
                  </h2>
                  <p className="text-xs text-gray-600">
                    Cooked fresh on demand • Sent to Live Kitchen Prep Queue
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#1B4332] border border-emerald-200">
                {regularMenu.length} items
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {regularMenu
                .filter((item) =>
                  selectedCategory === 'All' ? true : item.category === selectedCategory
                )
                .filter((item) =>
                  item.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => {
                  const qty = regularCart[item._id] || 0;
                  return (
                    <div
                      key={item._id}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-emerald-800">
                            {item.category || 'Kitchen'}
                          </span>
                          <span className="text-base font-extrabold text-[#1B4332]">
                            ₹{item.price}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-gray-900 mt-2 text-base">
                          {item.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {item.description || 'Prepared fresh by campus chefs.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        {item.isAvailable ? (
                          qty > 0 ? (
                            <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                              <button
                                onClick={() => updateRegularCart(item._id, -1)}
                                className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center hover:bg-[#2D6A4F] font-bold text-sm"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-extrabold text-[#1B4332] text-sm">
                                {qty}
                              </span>
                              <button
                                onClick={() => updateRegularCart(item._id, 1)}
                                className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center hover:bg-[#2D6A4F] font-bold text-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => updateRegularCart(item._id, 1)}
                              className="w-full flex items-center justify-center space-x-1.5 py-2 px-4 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-white text-xs font-bold transition-all shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Tray</span>
                            </button>
                          )
                        ) : (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* SECTION B: ⚡ Quick Packet Instant Pickup Menu */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-amber-950 flex items-center space-x-2">
                    <span>⚡ Quick Packet Instant Pickup</span>
                    <span className="text-[10px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Auto Ready
                    </span>
                  </h2>
                  <p className="text-xs text-amber-800/80">
                    Pre-packaged drinks, snacks & boxed items • Instant pickup QR without kitchen waiting!
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {quickMenu.length} items
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {quickMenu
                .filter((item) =>
                  selectedCategory === 'All' ? true : item.category === selectedCategory
                )
                .filter((item) =>
                  item.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => {
                  const qty = quickCart[item._id] || 0;
                  return (
                    <div
                      key={item._id}
                      className="bg-[#FFFBEB] rounded-2xl p-5 shadow-sm border-2 border-amber-200/80 hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-amber-200 text-amber-900 flex items-center space-x-1">
                            <Zap className="w-3 h-3 text-amber-600 fill-amber-500" />
                            <span>Quick Packet</span>
                          </span>
                          <span className="text-base font-extrabold text-amber-900">
                            ₹{item.price}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-gray-900 mt-2 text-base">
                          {item.name}
                        </h3>
                        <p className="text-xs text-amber-900/70 mt-1 line-clamp-2">
                          {item.description || 'Pre-packaged and ready for instant counter retrieval.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between">
                        {item.isAvailable ? (
                          qty > 0 ? (
                            <div className="flex items-center space-x-2 bg-amber-100 border border-amber-300 rounded-xl p-1">
                              <button
                                onClick={() => updateQuickCart(item._id, -1)}
                                className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 font-bold text-sm"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-extrabold text-amber-950 text-sm">
                                {qty}
                              </span>
                              <button
                                onClick={() => updateQuickCart(item._id, 1)}
                                className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 font-bold text-sm"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => updateQuickCart(item._id, 1)}
                              className="w-full flex items-center justify-center space-x-1.5 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Add Instant Packet</span>
                            </button>
                          )
                        ) : (
                          <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                            Sold Out
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Sticky Bottom Floating Tray Button */}
          {totalCartCount > 0 && (
            <div className="fixed bottom-6 inset-x-0 max-w-xl mx-auto px-4 z-40">
              <button
                onClick={() => setActiveTab('cart')}
                className="w-full bg-[#1B4332] text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-500/30 hover:bg-[#2D6A4F] transition-all transform active:scale-[0.99]"
              >
                <div className="flex items-center space-x-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#52B788] text-[#112A20] flex items-center justify-center font-extrabold text-base">
                    {totalCartCount}
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-white">Review Split Billing & Tray</p>
                    <p className="text-xs text-emerald-200">
                      {regularBill.count > 0 && `🍳 ${regularBill.count} Kitchen`}
                      {regularBill.count > 0 && quickBill.count > 0 && ' • '}
                      {quickBill.count > 0 && `⚡ ${quickBill.count} Instant Quick`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg text-emerald-300">
                    ₹{regularBill.subtotal + quickBill.subtotal}
                  </span>
                  <ChevronRight className="w-5 h-5 text-emerald-300" />
                </div>
              </button>
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 2: SPLIT BILLING & CHECKOUT
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'cart' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-emerald-950 text-white p-5 rounded-2xl shadow-md flex items-center justify-between border border-emerald-800">
            <div>
              <h2 className="text-xl font-extrabold">Split Billing Checkout</h2>
              <p className="text-xs text-emerald-200 mt-1">
                Your meals are separated so you can grab instant packets right away while kitchen prepares fresh food!
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-emerald-300 font-medium">Grand Total</span>
              <p className="text-2xl font-black text-[#52B788]">
                ₹{regularBill.subtotal + quickBill.subtotal}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* BILL 1: Fresh Kitchen Prep */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border-2 border-emerald-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🍳</span>
                    <div>
                      <h3 className="font-extrabold text-lg text-[#1B4332]">
                        1. Regular Kitchen Food Bill
                      </h3>
                      <p className="text-xs text-gray-500">
                        Placed in Kitchen Queue with status <strong className="text-blue-700">"Received"</strong>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-emerald-50 text-[#1B4332] border border-emerald-200">
                    {regularBill.count} items
                  </span>
                </div>

                {/* Items List */}
                {regularBill.itemsList.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Utensils className="w-10 h-10 mx-auto text-gray-300" />
                    <p className="text-xs font-bold">No fresh kitchen meals added yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 my-4 space-y-2">
                    {regularBill.itemsList.map(({ item, qty, cost }) => (
                      <div key={item._id} className="pt-2 flex items-center justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">₹{item.price} each</p>
                        </div>
                        <div className="flex items-center space-x-2 mr-3">
                          <button
                            onClick={() => updateRegularCart(item._id, -1)}
                            className="w-6 h-6 rounded bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs hover:bg-gray-200"
                          >
                            −
                          </button>
                          <span className="font-extrabold text-xs">{qty}</span>
                          <button
                            onClick={() => updateRegularCart(item._id, 1)}
                            className="w-6 h-6 rounded bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs hover:bg-gray-200"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-extrabold text-[#1B4332]">₹{cost}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method & Checkout */}
              {regularBill.itemsList.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Select Payment Mode:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['UPI', 'Card', 'Counter'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setRegularPaymentMethod(m)}
                          className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                            regularPaymentMethod === m
                              ? 'bg-emerald-50 border-[#1B4332] text-[#1B4332] ring-1 ring-[#1B4332]'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-extrabold text-base pt-2">
                    <span className="text-gray-700">Kitchen Subtotal</span>
                    <span className="text-[#1B4332] text-xl">₹{regularBill.subtotal}</span>
                  </div>

                  <button
                    onClick={handlePlaceRegularOrder}
                    disabled={placingRegular}
                    className="w-full py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {placingRegular ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Place Kitchen Order (₹{regularBill.subtotal})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* BILL 2: ⚡ Quick Packet Instant Pickup */}
            <div className="bg-[#FFFBEB] rounded-2xl p-6 shadow-sm border-2 border-amber-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">⚡</span>
                    <div>
                      <h3 className="font-extrabold text-lg text-amber-950">
                        2. Quick Packet Instant Bill
                      </h3>
                      <p className="text-xs text-amber-800">
                        Instant Pickup with status <strong className="text-emerald-700 font-extrabold">"READY ✓"</strong>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    {quickBill.count} items
                  </span>
                </div>

                {/* Items List */}
                {quickBill.itemsList.length === 0 ? (
                  <div className="py-12 text-center text-amber-800/60 space-y-2">
                    <Zap className="w-10 h-10 mx-auto text-amber-300" />
                    <p className="text-xs font-bold">No instant quick packets added yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-amber-200/60 my-4 space-y-2">
                    {quickBill.itemsList.map(({ item, qty, cost }) => (
                      <div key={item._id} className="pt-2 flex items-center justify-between text-sm">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{item.name}</p>
                          <p className="text-xs text-amber-800/80">₹{item.price} each</p>
                        </div>
                        <div className="flex items-center space-x-2 mr-3">
                          <button
                            onClick={() => updateQuickCart(item._id, -1)}
                            className="w-6 h-6 rounded bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs hover:bg-amber-300"
                          >
                            −
                          </button>
                          <span className="font-extrabold text-xs text-amber-950">{qty}</span>
                          <button
                            onClick={() => updateQuickCart(item._id, 1)}
                            className="w-6 h-6 rounded bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs hover:bg-amber-300"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-extrabold text-amber-950">₹{cost}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Method & Instant Checkout */}
              {quickBill.itemsList.length > 0 && (
                <div className="mt-6 pt-4 border-t border-amber-200 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-2">
                      Select Payment Mode:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['UPI', 'Card', 'Counter'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setQuickPaymentMethod(m)}
                          className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                            quickPaymentMethod === m
                              ? 'bg-amber-600 border-amber-700 text-white ring-1 ring-amber-600'
                              : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-extrabold text-base pt-2">
                    <span className="text-amber-950">Instant Subtotal</span>
                    <span className="text-amber-950 text-xl font-black">₹{quickBill.subtotal}</span>
                  </div>

                  <button
                    onClick={handlePlaceQuickOrder}
                    disabled={placingQuick}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {placingQuick ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Instant Pay & Generate QR (₹{quickBill.subtotal})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB 3: MY ORDERS & LIVE TRACKER
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#112A20]">My Orders & Live Pickup</h2>
              <p className="text-xs text-gray-500">
                Track preparation status in real-time and show token/QR at the counter for pickup
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500">
              {orders.length} total orders
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 space-y-3">
              <ShoppingBag className="w-12 h-12 mx-auto text-gray-300" />
              <h3 className="font-extrabold text-gray-700 text-base">No orders yet</h3>
              <p className="text-xs text-gray-500">Pick delicious meals or instant snacks from our menu!</p>
              <button
                onClick={() => setActiveTab('menu')}
                className="mt-2 px-4 py-2 bg-[#1B4332] text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {orders.map((order) => {
                const isQuick = order.items?.some((i) => i.isQuickItem || i.menuItem?.isQuickItem);
                const isReady = order.orderStatus === 'Ready';
                const feedback = feedbackState[order._id] || {
                  rating: order.feedback?.rating || 0,
                  comment: order.feedback?.comment || '',
                };

                return (
                  <div
                    key={order._id}
                    className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                      isReady ? 'border-2 border-emerald-500 ring-2 ring-emerald-100' : 'border-gray-200'
                    }`}
                  >
                    {/* Card Header: Token & Status */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-black text-gray-900 tracking-wider">
                          #{order.orderToken}
                        </span>
                        {isQuick && (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
                            ⚡ Quick
                          </span>
                        )}
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-extrabold rounded-full border ${getStatusBadge(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                    </div>

                    {/* Order Details */}
                    <div className="py-3 space-y-1.5 text-xs">
                      {order.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-gray-700">
                          <span>
                            <strong className="text-gray-900">{it.quantity}×</strong> {it.menuItem?.name || 'Meal Item'}
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

                    {/* QR Code Action Button */}
                    <div className="mt-4 flex items-center space-x-2">
                      <button
                        onClick={() => setViewingQrOrder(order)}
                        className="flex-1 flex items-center justify-center space-x-2 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#1B4332] border border-emerald-200 rounded-xl font-bold text-xs transition-colors"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>View Counter Pickup QR</span>
                      </button>
                    </div>

                    {/* Meal Feedback Form (if order completed or ready) */}
                    {(order.orderStatus === 'Completed' || order.orderStatus === 'Ready') && (
                      <div className="mt-4 pt-3 border-t border-gray-100 bg-gray-50/70 p-3 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700">Rate this meal:</span>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() =>
                                  setFeedbackState((prev) => ({
                                    ...prev,
                                    [order._id]: { ...prev[order._id], rating: star },
                                  }))
                                }
                                className="text-amber-400 hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    star <= (feedback.rating || 0)
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {!order.feedback?.rating && (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              placeholder="Add optional review comment…"
                              value={feedback.comment || ''}
                              onChange={(e) =>
                                setFeedbackState((prev) => ({
                                  ...prev,
                                  [order._id]: { ...prev[order._id], comment: e.target.value },
                                }))
                              }
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#2D6A4F]"
                            />
                            <button
                              onClick={() => handleFeedbackSubmit(order._id)}
                              disabled={feedback.submitting}
                              className="px-3 py-1.5 bg-[#1B4332] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#2D6A4F]"
                            >
                              Submit
                            </button>
                          </div>
                        )}
                        {order.feedback?.comment && (
                          <p className="text-[11px] text-gray-500 italic">"{order.feedback.comment}"</p>
                        )}
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
          TAB 4: HELP, COMPLAINT & REFUND REQUEST
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'support' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#112A20]">
                Help, Complaints & Refund Requests
              </h2>
              <p className="text-xs text-gray-500">
                Direct channel to the cafeteria Manager. Request order refunds or report meal quality issues.
              </p>
            </div>

            {ticketSuccess && (
              <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{ticketSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSupportSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Request Category
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:border-[#2D6A4F] outline-none"
                  >
                    <option value="Refund Request">💸 Refund Request</option>
                    <option value="Meal Quality / Missing Item">🍽️ Meal Quality / Missing Item</option>
                    <option value="Payment / Counter Issue">💳 Payment / Counter Issue</option>
                    <option value="General Help">💬 General Help</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Related Order (Optional)
                  </label>
                  <select
                    value={ticketOrderId}
                    onChange={(e) => setTicketOrderId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:bg-white focus:border-[#2D6A4F] outline-none"
                  >
                    <option value="">No specific order</option>
                    {orders.map((o) => (
                      <option key={o._id} value={o._id}>
                        Token #{o.orderToken} — ₹{o.totalAmount} ({o.orderStatus})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Cold beverage missing from tray / Request refund"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#2D6A4F] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Message Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Explain what occurred or why you are requesting a refund…"
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-[#2D6A4F] outline-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submittingTicket}
                className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
              >
                {submittingTicket ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Request to Manager</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Past Support History */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">My Support Tickets History</h3>

            {supportTickets.length === 0 ? (
              <p className="text-xs text-gray-400">No support tickets submitted yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {supportTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                          {ticket.category || 'Help'}
                        </span>
                        <h4 className="font-bold text-sm text-gray-900 mt-1">{ticket.subject}</h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-extrabold rounded-full ${
                          ticket.status === 'Resolved' || ticket.status === 'Refunded'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      {ticket.message}
                    </p>

                    {/* Manager's Official Response */}
                    {ticket.managerReply ? (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Manager's Response:</span>
                        </span>
                        <p className="text-xs font-semibold text-emerald-950">
                          {ticket.managerReply}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Awaiting Manager's review and response…</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════ QR CODE MODAL ══════════════════ */}
      {viewingQrOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-gray-100 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Counter Pickup QR
              </span>
              <button
                onClick={() => setViewingQrOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div className="py-2">
              <h3 className="text-2xl font-black text-gray-900 tracking-wider">
                Token #{viewingQrOrder.orderToken}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Show this QR or 6-digit token to the staff at the counter
              </p>
            </div>

            {/* QR SVG */}
            <div className="flex items-center justify-center p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl shadow-inner w-52 h-52 mx-auto">
              <QRCodeSVG
                value={viewingQrOrder.orderToken}
                size={180}
                bgColor="#F9FAFB"
                fgColor="#112A20"
                level="Q"
              />
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1">
              <p className="font-extrabold text-gray-900">Order Amount: ₹{viewingQrOrder.totalAmount}</p>
              <p className="text-[11px] text-gray-500">
                Status: <strong className="text-emerald-700">{viewingQrOrder.orderStatus}</strong>
              </p>
            </div>

            <button
              onClick={() => setViewingQrOrder(null)}
              className="w-full py-2.5 bg-[#1B4332] text-white rounded-xl text-xs font-bold hover:bg-[#2D6A4F] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

