// src/screens/auth/LoginScreen.js
// Premium redesign of the login screen — connects to existing /api/auth/login

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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';

const ROLE_HINTS = [
  { role: 'Student', hint: 'Use your College ID', icon: '🎓' },
  { role: 'Staff', hint: 'Use your email', icon: '👨‍🍳' },
  { role: 'Manager', hint: 'Use your email', icon: '📋' },
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [idError, setIdError] = useState('');
  const [passError, setPassError] = useState('');
  const passwordRef = useRef(null);

  const validate = () => {
    let ok = true;
    setIdError('');
    setPassError('');
    if (!identifier.trim()) { setIdError('College ID or email is required'); ok = false; }
    if (!password) { setPassError('Password is required'); ok = false; }
    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { token, user } = await authService.login(identifier, password);
      await signIn(user, token);
    } catch (err) {
      const msg = err.userMessage || err.response?.data?.message || 'Login failed. Check your credentials.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

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
          {/* Branding header */}
          <View style={styles.brandArea}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🍃</Text>
            </View>
            <Text style={styles.appName}>Campus Cafeteria</Text>
            <Text style={styles.tagline}>Fresh food, zero wait</Text>
          </View>

          {/* Login card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to pre-order your meal</Text>

            <AppInput
              label="College ID or Email"
              placeholder="e.g. CS2023001 or staff@campus.edu"
              value={identifier}
              onChangeText={(v) => { setIdentifier(v); setIdError(''); }}
              error={idError}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <AppInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(v) => { setPassword(v); setPassError(''); }}
              error={passError}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              inputRef={passwordRef}
            />

            <AppButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={styles.loginBtn}
            />
          </View>

          {/* Role hints */}
          <View style={styles.hintSection}>
            <Text style={styles.hintHeading}>Who can sign in?</Text>
            <View style={styles.hintCards}>
              {ROLE_HINTS.map((r) => (
                <View key={r.role} style={styles.hintCard}>
                  <Text style={styles.hintIcon}>{r.icon}</Text>
                  <Text style={styles.hintRole}>{r.role}</Text>
                  <Text style={styles.hintDetail}>{r.hint}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.footer}>
            Having trouble? Contact the cafeteria manager.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: Spacing.screen,
    paddingBottom: Spacing.xxxl,
  },

  // Brand
  brandArea: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
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

  // Card
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
    marginBottom: 4,
  },
  cardSub: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  loginBtn: { marginTop: Spacing.sm },

  // Role hints
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

  footer: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

