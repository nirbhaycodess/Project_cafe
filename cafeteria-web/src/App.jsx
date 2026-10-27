// File path: cafeteria-web/src/App.jsx
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import StudentView from './components/StudentView';
import ManagerStaffView from './components/ManagerStaffView';
import SuperAdminView from './components/SuperAdminView';
import {
  Utensils,
  Zap,
  Clock,
  Shield,
  ArrowRight,
  ShoppingBag,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

function MainApp() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');
  const [cartCount, setCartCount] = useState(0);

  // For SuperAdmin: option to switch between Executive Analytics and Operations Queue
  const [adminMode, setAdminMode] = useState('analytics'); // 'analytics' | 'operations'

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7F4] text-[#112A20]">
      {/* Top Sticky Header */}
      <Navbar
        onOpenAuth={() => setAuthModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {user ? (
          /* Role-based logged in views */
          user.role === 'Student' ? (
            <StudentView
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onCartUpdate={setCartCount}
            />
          ) : user.role === 'SuperAdmin' ? (
            <div className="space-y-4">
              {/* Executive Mode Switcher */}
              <div className="bg-[#112A20] text-white py-3 px-4 sm:px-8 border-b border-emerald-900/40">
                <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                      Super Admin Portal
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-white/10 p-1 rounded-xl">
                    <button
                      onClick={() => setAdminMode('analytics')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminMode === 'analytics'
                          ? 'bg-[#52B788] text-[#112A20] shadow-sm'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      📊 Executive Analytics
                    </button>
                    <button
                      onClick={() => setAdminMode('operations')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        adminMode === 'operations'
                          ? 'bg-[#52B788] text-[#112A20] shadow-sm'
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      👨‍🍳 Kitchen & Counter Operations
                    </button>
                  </div>
                </div>
              </div>

              {adminMode === 'analytics' ? <SuperAdminView /> : <ManagerStaffView />}
            </div>
          ) : (
            /* Staff & Manager Views */
            <ManagerStaffView />
          )
        ) : (
          /* Logged-out Landing Hero & Showcase */
          <div className="space-y-12">
            
            {/* Hero Section */}
            <section className="bg-gradient-to-b from-[#1B4332] via-[#24543F] to-[#1B4332] text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(82,183,136,0.18),transparent_50%)]"></div>
              
              <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold shadow-sm">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Next-Gen Campus Dining Experience</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                  Split Billing & Instant <br className="hidden sm:inline" />
                  <span className="text-[#52B788]">Quick Packets</span> for Campus.
                </h1>

                <p className="text-sm sm:text-lg text-emerald-100/90 max-w-2xl mx-auto leading-relaxed font-medium">
                  Separate your hot fresh kitchen meals from grab-and-go packaged drinks & snacks.
                  Skip the long lunch queue with real-time digital counter tokens & QR pickup!
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-400 to-[#52B788] text-[#112A20] rounded-2xl font-black text-sm sm:text-base shadow-xl hover:brightness-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Sign In or Register</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl font-bold text-sm sm:text-base transition-all"
                  >
                    Staff & Manager Portal
                  </button>
                </div>
              </div>
            </section>

            {/* Feature Highlights Grid */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Feature 1 */}
                <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1B4332] flex items-center justify-center font-bold text-xl">
                    🍳
                  </div>
                  <h3 className="font-extrabold text-lg text-gray-900">Fresh Kitchen Prep</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Order hot dosas, bowls, and chef specials. Placed straight into the live kitchen prep
                    queue with live tracking from Received → Preparing → Ready.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-[#FFFBEB] p-7 rounded-3xl shadow-sm border-2 border-amber-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xl">
                    ⚡
                  </div>
                  <h3 className="font-extrabold text-lg text-amber-950">⚡ Quick Packet Pickup</h3>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Grab chips, boxed snacks, and chilled drinks. Instant checkout sets status immediately
                    to <strong>Ready ✓</strong> with a digital counter pickup QR!
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-xl">
                    💬
                  </div>
                  <h3 className="font-extrabold text-lg text-gray-900">Direct Manager Help & Refunds</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Report missing items, request meal refunds, or leave 5-star ratings with a direct
                    communication line between students and cafeteria managers.
                  </p>
                </div>

              </div>
            </section>

            {/* Menu Preview Invitation */}
            <section className="max-w-4xl mx-auto px-4 text-center pb-8 space-y-4">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 space-y-3">
                <Utensils className="w-10 h-10 mx-auto text-[#1B4332]" />
                <h3 className="text-xl font-extrabold text-gray-900">Ready to taste campus dining?</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Create a student account using your College ID in less than 30 seconds.
                </p>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="px-6 py-3 bg-[#1B4332] text-white rounded-xl text-xs font-bold hover:bg-[#2D6A4F] transition-all shadow-md"
                >
                  Get Started Now →
                </button>
              </div>
            </section>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-gray-700">
            © {new Date().getFullYear()} CampusCafé — Smart Digital Dining System
          </p>
          <p className="text-[11px] text-gray-400">
            Split Kitchen & Quick Packets • Live Socket.io Sync • Powered by Vite & Tailwind CSS
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
