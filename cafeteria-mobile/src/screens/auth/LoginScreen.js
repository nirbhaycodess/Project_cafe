// src/screens/auth/LoginScreen.js
// Auth screen with Sign In + Register modes — full role-based registration flow.

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';

// ─── Constants ──────────────────────────────────────────────────────────────

const MODES = ['Sign In', 'Register'];

const REGISTER_ROLES = [
  { key: 'Student', icon: '🎓', hint: 'College ID' },
  { key: 'Staff',   icon: '👨‍🍳', hint: 'Email' },
  { key: 'Manager', icon: '📋', hint: 'Email' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { signIn } = useAuth();

  // ── Mode: 'signin' | 'register'
  const [mode, setMode] = useState('signin');

  // ── Sign-In state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginIdError, setLoginIdError] = useState('');
  const [loginPassError, setLoginPassError] = useState('');
  const loginPassRef = useRef(null);

  // ── Register state
  const [regRole, setRegRole]         = useState('Student');
  const [regName, setRegName]         = useState('');
  const [regCollegeId, setRegCollegeId] = useState('');
  const [regEmail, setRegEmail]       = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading]   = useState(false);
  const [regErrors, setRegErrors]     = useState({});
  const regIdRef  = useRef(null);
  const regPassRef = useRef(null);

  // ────────────────────────────────────────────────────────────────────────
  // Mode switch helper
  // ────────────────────────────────────────────────────────────────────────
  const switchMode = (next) => {
    setMode(next);
    // Clear all error states on switch
    setLoginIdError('');
    setLoginPassError('');
    setRegErrors({});
  };

  // ────────────────────────────────────────────────────────────────────────
  // SIGN IN
  // ────────────────────────────────────────────────────────────────────────
  const validateLogin = () => {
    let ok = true;
    setLoginIdError('');
    setLoginPassError('');
    if (!identifier.trim()) { setLoginIdError('College ID or email is required'); ok = false; }
    if (!loginPassword)     { setLoginPassError('Password is required'); ok = false; }
    return ok;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;
    setLoginLoading(true);
    try {
      const { token, user } = await authService.login(identifier, loginPassword);
      await signIn(user, token);
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.message || 'Login failed. Check your credentials.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoginLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // REGISTER
  // ────────────────────────────────────────────────────────────────────────
  const validateRegister = () => {
    const errs = {};
    if (!regName.trim()) errs.name = 'Full name is required';

    if (regRole === 'Student') {
      if (!regCollegeId.trim()) errs.identifier = 'College ID is required';
    } else {
      if (!regEmail.trim())   errs.identifier = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(regEmail)) errs.identifier = 'Enter a valid email address';
    }

    if (!regPassword)                  errs.password = 'Password is required';
    else if (regPassword.length < 6)   errs.password = 'Password must be at least 6 characters';

    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validateRegister()) return;
    setRegLoading(true);
    try {
      await authService.register({
        name:       regName,
        role:       regRole,
        collegeId:  regRole === 'Student' ? regCollegeId : undefined,
        email:      regRole !== 'Student' ? regEmail     : undefined,
        password:   regPassword,
      });

      // Determine the identifier that was just registered
      const newIdentifier = regRole === 'Student' ? regCollegeId.trim() : regEmail.trim().toLowerCase();
      const isPending = regRole !== 'Student';

      if (isPending) {
        Alert.alert(
          'Approval Pending ⏳',
          `Welcome, ${regName.trim()}!\nYour ${regRole} registration has been sent to the SuperAdmin for approval. You will be able to sign in once approved.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Account Created! 🎉',
          `Welcome, ${regName.trim()}!\nYour Student account is ready. Sign in to continue.`,
          [{ text: 'SIGN IN NOW' }]
        );
      }

      // Reset register form
      setRegName('');
      setRegCollegeId('');
      setRegEmail('');
      setRegPassword('');
      setRegErrors({});

      // Pre-fill login identifier and switch to Sign In
      setIdentifier(newIdentifier);
      setLoginPassword('');
      switchMode('signin');

    } catch (err) {
      const msg = err.userMessage || err.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setRegLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Role pill handler — also resets identifier fields on switch
  // ────────────────────────────────────────────────────────────────────────
  const handleRoleSelect = (roleKey) => {
    setRegRole(roleKey);
    setRegCollegeId('');
    setRegEmail('');
    setRegErrors((prev) => ({ ...prev, identifier: '' }));
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Branding ─────────────────────────────────── */}
          <View style={styles.brandArea}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🍃</Text>
            </View>
            <Text style={styles.appName}>Campus Cafeteria</Text>
            <Text style={styles.tagline}>Fresh food, zero wait</Text>
          </View>

          {/* ── Auth Card ────────────────────────────────── */}
          <View style={styles.card}>

            {/* Mode toggle — segmented control */}
            <View style={styles.modeToggleTrack}>
              {MODES.map((label, idx) => {
                const key = idx === 0 ? 'signin' : 'register';
                const active = mode === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.modeToggleBtn, active && styles.modeToggleBtnActive]}
                    onPress={() => switchMode(key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.modeToggleText, active && styles.modeToggleTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── SIGN IN FORM ─────────────────────────── */}
            {mode === 'signin' && (
              <View>
                <Text style={styles.cardTitle}>Welcome back</Text>
                <Text style={styles.cardSub}>Sign in to pre-order your meal</Text>

                <AppInput
                  label="College ID or Email"
                  placeholder="e.g. BTAI2025030 or staff@college.edu"
                  value={identifier}
                  onChangeText={(v) => { setIdentifier(v); setLoginIdError(''); }}
                  error={loginIdError}
                  autoCapitalize="none"
                  keyboardType="default"
                  returnKeyType="next"
                  onSubmitEditing={() => loginPassRef.current?.focus()}
                />

                <AppInput
                  label="Password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChangeText={(v) => { setLoginPassword(v); setLoginPassError(''); }}
                  error={loginPassError}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  inputRef={loginPassRef}
                />

                <AppButton
                  label="Sign In"
                  onPress={handleLogin}
                  loading={loginLoading}
                  size="lg"
                  style={styles.submitBtn}
                />

                <TouchableOpacity onPress={() => switchMode('register')} style={styles.switchPrompt}>
                  <Text style={styles.switchPromptText}>
                    New here?{' '}
                    <Text style={styles.switchPromptLink}>Create an account</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── REGISTER FORM ────────────────────────── */}
            {mode === 'register' && (
              <View>
                <Text style={styles.cardTitle}>Create account</Text>
                <Text style={styles.cardSub}>Join the campus food ordering system</Text>

                {/* Role selector */}
                <Text style={styles.fieldLabel}>I am a…</Text>
                <View style={styles.rolePillRow}>
                  {REGISTER_ROLES.map(({ key, icon, hint }) => {
                    const active = regRole === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.rolePill, active && styles.rolePillActive]}
                        onPress={() => handleRoleSelect(key)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.rolePillIcon}>{icon}</Text>
                        <Text style={[styles.rolePillLabel, active && styles.rolePillLabelActive]}>
                          {key}
                        </Text>
                        <Text style={[styles.rolePillHint, active && styles.rolePillHintActive]}>
                          {hint}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Full Name */}
                <AppInput
                  label="Full Name"
                  placeholder="e.g. Priya Sharma"
                  value={regName}
                  onChangeText={(v) => { setRegName(v); setRegErrors((p) => ({ ...p, name: '' })); }}
                  error={regErrors.name}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => regIdRef.current?.focus()}
                />

                {/* Conditional identifier: College ID vs Email */}
                {regRole === 'Student' ? (
                  <AppInput
                    key="collegeId"
                    label="College ID"
                    placeholder="e.g. BTAI2025030"
                    value={regCollegeId}
                    onChangeText={(v) => { setRegCollegeId(v); setRegErrors((p) => ({ ...p, identifier: '' })); }}
                    error={regErrors.identifier}
                    autoCapitalize="characters"
                    returnKeyType="next"
                    onSubmitEditing={() => regPassRef.current?.focus()}
                    inputRef={regIdRef}
                  />
                ) : (
                  <AppInput
                    key="email"
                    label="Email Address"
                    placeholder="e.g. staff@college.edu"
                    value={regEmail}
                    onChangeText={(v) => { setRegEmail(v); setRegErrors((p) => ({ ...p, identifier: '' })); }}
                    error={regErrors.identifier}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => regPassRef.current?.focus()}
                    inputRef={regIdRef}
                  />
                )}

                {/* Password */}
                <AppInput
                  label="Password"
                  placeholder="Minimum 6 characters"
                  value={regPassword}
                  onChangeText={(v) => { setRegPassword(v); setRegErrors((p) => ({ ...p, password: '' })); }}
                  error={regErrors.password}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  inputRef={regPassRef}
                />

                <AppButton
                  label="Create Account"
                  onPress={handleRegister}
                  loading={regLoading}
                  size="lg"
                  style={styles.submitBtn}
                />

                <TouchableOpacity onPress={() => switchMode('signin')} style={styles.switchPrompt}>
                  <Text style={styles.switchPromptText}>
                    Already have an account?{' '}
                    <Text style={styles.switchPromptLink}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Footer info (sign-in only) ────────────── */}
          {mode === 'signin' && (
            <View style={styles.hintSection}>
              <Text style={styles.hintHeading}>Who can sign in?</Text>
              <View style={styles.hintCards}>
                {[
                  { role: 'Student', icon: '🎓', detail: 'College ID' },
                  { role: 'Staff',   icon: '👨‍🍳', detail: 'Email' },
                  { role: 'Manager', icon: '📋', detail: 'Email' },
                ].map((r) => (
                  <View key={r.role} style={styles.hintCard}>
                    <Text style={styles.hintIcon}>{r.icon}</Text>
                    <Text style={styles.hintRole}>{r.role}</Text>
                    <Text style={styles.hintDetail}>{r.detail}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Text style={styles.footer}>
            Having trouble? Contact the cafeteria manager.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: Spacing.screen,
    paddingBottom: Spacing.xxxl,
  },

  // ── Branding
  brandArea: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  logoIcon: { fontSize: 36 },
  appName: {
    fontSize: Typography.xxl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  // ── Auth card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  cardTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  submitBtn: { marginTop: Spacing.sm },

  // ── Mode toggle (segmented control)
  modeToggleTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  modeToggleBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  modeToggleText: {
    fontSize: Typography.base,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textMuted,
  },
  modeToggleTextActive: {
    color: Colors.primary,
    fontWeight: Typography.weightBold,
  },

  // ── Register: role pills
  fieldLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  rolePillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  rolePill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 3,
  },
  rolePillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '12', // 12 = ~7% opacity
  },
  rolePillIcon: { fontSize: 20 },
  rolePillLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
    color: Colors.textSecondary,
  },
  rolePillLabelActive: { color: Colors.primary },
  rolePillHint: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  rolePillHintActive: { color: Colors.primaryLight },

  // ── Switch mode prompt
  switchPrompt: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  switchPromptText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  switchPromptLink: {
    color: Colors.primary,
    fontWeight: Typography.weightBold,
  },

  // ── Role hints (sign-in footer)
  hintSection: { marginBottom: Spacing.xl },
  hintHeading: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  hintCards: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  hintCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  hintIcon: { fontSize: 22, marginBottom: 4 },
  hintRole: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  hintDetail: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Footer
  footer: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
