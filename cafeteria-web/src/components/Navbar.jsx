// File path: cafeteria-web/src/components/Navbar.jsx
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Utensils, LogOut, User, ShoppingBag, ShieldCheck, Wifi } from 'lucide-react';

export default function Navbar({ onOpenAuth, activeTab, setActiveTab, cartCount = 0 }) {
  const { user, logout } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'SuperAdmin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Manager':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Staff':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#1B4332] text-white shadow-lg border-b border-emerald-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab?.('menu')}>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-[#2D6A4F] flex items-center justify-center shadow-md border border-emerald-400/30">
              <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-2xl tracking-tight text-white">
                  Campus<span className="text-[#52B788]">Cafe</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/80 text-emerald-300 border border-emerald-600/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                  Live Connected
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/80 font-medium hidden xs:block">
                Smart Digital Dining & Instant Quick Packets
              </p>
            </div>
          </div>

          {/* User Controls & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {user ? (
              <>
                {/* Cart Shortcut for Students */}
                {user.role === 'Student' && (
                  <button
                    onClick={() => setActiveTab('cart')}
                    className={`relative flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${
                      activeTab === 'cart'
                        ? 'bg-[#52B788] text-[#112A20]'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span className="hidden sm:inline">Tray / Bill</span>
                    {cartCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-[11px] font-extrabold bg-amber-400 text-gray-900 rounded-full shadow-sm animate-bounce">
                        {cartCount}
                      </span>
                    )}
                  </button>
                )}

                {/* User Info Pill */}
                <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1.5 rounded-xl">
                  <div className="w-7 h-7 rounded-lg bg-emerald-700/60 flex items-center justify-center text-xs font-bold text-emerald-200">
                    {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                    <p className="text-[10px] text-emerald-300 leading-tight">
                      {user.collegeId ? `ID: ${user.collegeId}` : user.email || user.role}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to sign out?')) {
                      logout();
                    }
                  }}
                  className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-300" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-[#52B788] text-[#112A20] hover:brightness-105 active:scale-95 transition-all shadow-md"
              >
                <User className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}

