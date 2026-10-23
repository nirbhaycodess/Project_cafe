// src/screens/staff/QRScannerScreen.js
// Camera-based QR scanning for staff pickup verification

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { orderService } from '../../services/orderService';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import AppButton from '../../components/AppButton';
import OrderCard from '../../components/OrderCard';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [scanned, setScanned]           = useState(false);
  const [verifying, setVerifying]       = useState(false);
  const [manualToken, setManualToken]   = useState('');
  const [result, setResult]             = useState(null); // { type: 'success'|'error', order?, message }

  const verifyToken = async (token) => {
    const clean = token.trim().toUpperCase();
    if (!clean || clean.length !== 6) {
      Alert.alert('Invalid Token', 'Please enter a valid 6-character token.');
      return;
    }
    setVerifying(true);
    setResult(null);
    try {
      const data = await orderService.verifyToken(clean);
      setScannerOpen(false);
      setManualToken('');
      setResult({ type: 'success', order: data.order, message: data.message });
    } catch (err) {
      setScannerOpen(false);
      const msg = err.userMessage || err.response?.data?.message || 'Verification failed.';
      setResult({ type: 'error', message: msg });
    } finally {
      setVerifying(false);
      // Allow re-scan after a short delay
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned || verifying) return;
    setScanned(true);
    verifyToken(data);
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to scan QR codes.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    setScanned(false);
    setResult(null);
    setScannerOpen(true);
  };

  const resetScanner = () => {
    setScannerOpen(false);
    setScanned(false);
    setResult(null);
    setManualToken('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text style={styles.title}>Verify Pickup</Text>
        <Text style={styles.subtitle}>Scan student QR or enter token</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Camera scanner */}
        {!scannerOpen ? (
          <TouchableOpacity style={styles.cameraPlaceholder} onPress={openScanner} activeOpacity={0.85}>
            <View style={styles.cameraFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.cameraLabel}>Tap to Open Camera</Text>
              <Text style={styles.cameraSub}>Point at student's QR code</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            {/* Scanner overlay */}
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL, styles.cornerLight]} />
                <View style={[styles.corner, styles.cornerTR, styles.cornerLight]} />
                <View style={[styles.corner, styles.cornerBL, styles.cornerLight]} />
                <View style={[styles.corner, styles.cornerBR, styles.cornerLight]} />
              </View>
              <Text style={styles.scanHint}>Align QR code within the frame</Text>
            </View>
            {verifying && (
              <View style={styles.verifyingOverlay}>
                <ActivityIndicator color={Colors.textInverse} size="large" />
                <Text style={styles.verifyingText}>Verifying...</Text>
              </View>
            )}
            <TouchableOpacity style={styles.closeCamera} onPress={() => setScannerOpen(false)}>
              <Text style={styles.closeCameraText}>✕ Close Scanner</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual token entry */}
        <View style={styles.manualCard}>
          <Text style={styles.manualLabel}>Or enter token manually</Text>
          <View style={styles.manualRow}>
            <TextInput
              style={styles.tokenInput}
              placeholder="e.g. A3F9B2"
              placeholderTextColor={Colors.textMuted}
              value={manualToken}
              onChangeText={(v) => setManualToken(v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              keyboardType="ascii-capable"
            />
            <AppButton
              label="Verify"
              onPress={() => verifyToken(manualToken)}
              loading={verifying}
              size="md"
              fullWidth={false}
              style={styles.verifyBtn}
            />
          </View>
        </View>

        {/* Result card */}
        {result && (
          <View style={[styles.resultCard, result.type === 'success' ? styles.resultSuccess : styles.resultError]}>
            {result.type === 'success' ? (
              <>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIcon}>✅</Text>
                  <Text style={[styles.resultTitle, { color: Colors.success }]}>
                    Verified & Completed
                  </Text>
                </View>
                {result.order && <OrderCard order={result.order} compact />}
                <AppButton
                  label="Scan Next Order"
                  onPress={resetScanner}
                  variant="outline"
                  size="sm"
                  style={styles.nextBtn}
                />
              </>
            ) : (
              <>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultIcon}>❌</Text>
                  <Text style={[styles.resultTitle, { color: Colors.error }]}>
                    Verification Failed
                  </Text>
                </View>
                <Text style={styles.errorMsg}>{result.message}</Text>
                <AppButton
                  label="Try Again"
                  onPress={resetScanner}
                  variant="outline"
                  size="sm"
                  style={styles.nextBtn}
                />
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  scroll: { padding: Spacing.screen, paddingBottom: Spacing.xxxl },

  // Camera placeholder
  cameraPlaceholder: {
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.xl,
    aspectRatio: 1,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cameraFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  cameraIcon: { fontSize: 48, marginBottom: Spacing.md },
  cameraLabel: {
    color: Colors.textInverse,
    fontSize: Typography.lg,
    fontWeight: Typography.weightBold,
    marginBottom: 4,
  },
  cameraSub: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
    textAlign: 'center',
  },

  // Camera active
  cameraWrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    aspectRatio: 1,
    marginBottom: Spacing.base,
    ...Shadows.md,
  },
  camera: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  scanHint: {
    color: Colors.textInverse,
    fontSize: Typography.sm,
    marginTop: Spacing.xl,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  verifyingText: {
    color: Colors.textInverse,
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
  },
  closeCamera: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: Spacing.md,
    alignItems: 'center',
  },
  closeCameraText: {
    color: Colors.textInverse,
    fontWeight: Typography.weightBold,
    fontSize: Typography.base,
  },

  // Corner markers
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.accent,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cornerLight: { borderColor: Colors.textInverse },

  // Manual entry
  manualCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  manualLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weightSemiBold,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  manualRow: { flexDirection: 'row', gap: Spacing.sm },
  tokenInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.xl,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
    letterSpacing: 4,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  verifyBtn: { flex: 0 },

  // Result
  resultCard: {
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 2,
    ...Shadows.sm,
  },
  resultSuccess: {
    backgroundColor: Colors.successLight,
    borderColor: Colors.successBorder,
  },
  resultError: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.errorBorder,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  resultIcon: { fontSize: 24 },
  resultTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
  },
  errorMsg: {
    fontSize: Typography.base,
    color: Colors.error,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeightBase,
  },
  nextBtn: { marginTop: Spacing.sm },
});

