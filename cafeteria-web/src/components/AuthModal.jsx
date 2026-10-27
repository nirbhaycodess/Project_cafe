// File path: cafeteria-web/src/components/AuthModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, Shield, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('Student'); // 'Student' | 'Staff' | 'Manager'

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [email, setEmail] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (isRegister) {
      if (!name || !password) {
        setErrorMsg('Please enter your full name and password.');
        return;
      }
      if (role === 'Student' && !collegeId) {
        setErrorMsg('College ID is required for Students.');
        return;
      }
      if ((role === 'Staff' || role === 'Manager') && !email) {
        setErrorMsg(`Email is required for ${role} registration.`);
        return;
      }

      const res = await register({
        name,
        role,
        password,
        collegeId: role === 'Student' ? collegeId : undefined,
        email: role !== 'Student' ? email : undefined,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        if (res.accountStatus === 'Approved') {
          // Auto login student if approved
          setTimeout(async () => {
            const loginRes = await login(collegeId, password);
            if (loginRes.success) {
              onClose();
            }
          }, 800);
        }
      } else {
        setErrorMsg(res.error);
      }
    } else {
      // Login
      if (!identifier || !password) {
        setErrorMsg('Please enter your ID/Email and password.');
        return;
      }
      const res = await login(identifier, password);
      if (res.success) {
        onClose();
      } else {
        setErrorMsg(res.error);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        
        {/* Header Banner */}
        <div className="bg-[#1B4332] p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            {isRegister ? 'Join Campus Cafeteria' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            {isRegister
              ? 'Create your account to order and pick up meals'
              : 'Sign in to access your cafeteria portal'}
          </p>

          {/* Mode Tabs */}
          <div className="flex bg-emerald-950/70 p-1 rounded-xl mt-4 border border-emerald-800/50">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !isRegister ? 'bg-[#52B788] text-[#112A20] shadow-sm' : 'text-emerald-300 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isRegister ? 'bg-[#52B788] text-[#112A20] shadow-sm' : 'text-emerald-300 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start space-x-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Registration Role Selector */}
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Student', 'Staff', 'Manager'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                      role === r
                        ? 'bg-emerald-50 border-[#2D6A4F] text-[#1B4332] shadow-sm ring-1 ring-[#2D6A4F]'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {role !== 'Student' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                  ℹ️ Note: <strong>{role}</strong> accounts are placed in review until approved by administration.
                </p>
              )}
            </div>
          )}

          {/* Full Name for Registration */}
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Identifier for Login */}
          {!isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                College ID or Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. STU12345 or manager@campus.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* College ID for Student Registration */}
          {isRegister && role === 'Student' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">College ID</label>
              <div className="relative">
                <Shield className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. BTAI2025030"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none uppercase transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Email for Staff/Manager Registration */}
          {isRegister && role !== 'Student' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Official Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  placeholder="name@campus.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none transition-all"
                  required
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-[#2D6A4F] focus:ring-1 focus:ring-[#2D6A4F] outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 py-3 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isRegister ? 'Register Account' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

