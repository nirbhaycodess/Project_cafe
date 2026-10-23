// src/screens/manager/MenuManagementScreen.js
// Manager menu CRUD — add, edit availability, delete items

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { menuService } from '../../services/menuService';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import ConfirmationModal from '../../components/ConfirmationModal';
import { MenuItemSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';

export default function MenuManagementScreen() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  // Add item form
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: '', description: '', price: '', category: 'Snacks', stock: '-1' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]       = useState(false);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  // Toggle availability
  const [toggling, setToggling]   = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await menuService.getAll();
      setMenuItems(data);
    } catch (e) {
      setError(e.userMessage || 'Failed to load menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateForm = () => {
    const errs = {};
    if (!form.name.trim())    errs.name = 'Item name is required';
    if (!form.price.trim() || isNaN(Number(form.price)) || Number(form.price) < 0)
      errs.price = 'Enter a valid price (₹)';
    if (!form.category.trim()) errs.category = 'Category is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddItem = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        price:       Number(form.price),
        category:    form.category.trim(),
        isAvailable: true,
        stock:       Number(form.stock) || -1,
      };
      const newItem = await menuService.create(payload);
      setMenuItems((prev) => [newItem, ...prev]);
      setForm({ name: '', description: '', price: '', category: 'Snacks', stock: '-1' });
      setShowForm(false);
    } catch (e) {
      Alert.alert('Add Failed', e.userMessage || 'Could not create menu item.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    setToggling(item._id);
    try {
      const updated = await menuService.toggleAvailability(item);
      setMenuItems((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    } catch (e) {
      Alert.alert('Update Failed', e.userMessage || 'Could not update availability.');
    } finally {
      setToggling(null);
    }
  };

  const confirmDelete = (item) => setDeleteTarget(item);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await menuService.remove(deleteTarget._id);
      setMenuItems((prev) => prev.filter((m) => m._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (e) {
      Alert.alert('Delete Failed', e.userMessage || 'Could not delete item.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu Management</Text>
        </View>
        <View style={{ padding: Spacing.screen }}>
          {[1, 2, 3].map((k) => <MenuItemSkeleton key={k} />)}
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState message={error} onRetry={() => { setLoading(true); load(); }} />
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemMeta}>
          {item.category} · ₹{item.price}
          {item.stock !== -1 ? ` · Stock: ${item.stock}` : ''}
        </Text>
        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.availBtn, { backgroundColor: item.isAvailable ? Colors.successLight : Colors.errorLight }]}
          onPress={() => handleToggle(item)}
          disabled={toggling === item._id}
        >
          <Text style={[styles.availBtnText, { color: item.isAvailable ? Colors.success : Colors.error }]}>
            {toggling === item._id ? '...' : item.isAvailable ? 'Available' : 'Sold Out'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ConfirmationModal
        visible={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This will permanently remove the item from the menu. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        dangerous
      />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Menu Management</Text>
          <Text style={styles.subtitle}>{menuItems.length} items</Text>
        </View>
        <AppButton
          label={showForm ? 'Cancel' : '+ Add Item'}
          onPress={() => setShowForm((v) => !v)}
          variant={showForm ? 'outline' : 'primary'}
          size="sm"
          fullWidth={false}
        />
      </View>

      <FlatList
        data={menuItems}
        keyExtractor={(i) => i._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          showForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>New Menu Item</Text>
              <AppInput
                label="Item Name *"
                placeholder="e.g. Masala Dosa"
                value={form.name}
                onChangeText={(v) => setField('name', v)}
                error={formErrors.name}
              />
              <AppInput
                label="Description"
                placeholder="Short description (optional)"
                value={form.description}
                onChangeText={(v) => setField('description', v)}
                multiline
                numberOfLines={2}
              />
              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <AppInput
                    label="Price (₹) *"
                    placeholder="e.g. 45"
                    value={form.price}
                    onChangeText={(v) => setField('price', v)}
                    keyboardType="numeric"
                    error={formErrors.price}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Stock (-1 = unlimited)"
                    placeholder="-1"
                    value={form.stock}
                    onChangeText={(v) => setField('stock', v)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <AppInput
                label="Category *"
                placeholder="e.g. Snacks, Beverages, Breakfast"
                value={form.category}
                onChangeText={(v) => setField('category', v)}
                error={formErrors.category}
              />
              <AppButton
                label="Add to Menu"
                onPress={handleAddItem}
                loading={saving}
                size="md"
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="🍴"
            title="No menu items"
            message="Add your first item using the button above."
          />
        }
        renderItem={renderItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    marginTop: 2,
  },
  list: { padding: Spacing.screen, paddingBottom: Spacing.xxxl },

  // Add item form
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight + '40',
  },
  formTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  rowInputs: { flexDirection: 'row' },

  // Menu item card
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    ...Shadows.sm,
  },
  itemInfo: { flex: 1, paddingRight: Spacing.sm },
  itemName: {
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  itemMeta: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  itemDesc: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  itemActions: { alignItems: 'flex-end', gap: Spacing.sm },
  availBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
  },
  availBtnText: {
    fontSize: Typography.xs,
    fontWeight: Typography.weightBold,
  },
  deleteBtn: {
    padding: Spacing.xs + 2,
  },
  deleteBtnText: { fontSize: 18 },
});

