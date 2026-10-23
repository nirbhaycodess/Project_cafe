// src/screens/student/HomeScreen.js
// Student Home — greeting, cafeteria status, menu categories, food cards

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { menuService } from '../../services/menuService';
import { Colors, Typography, Spacing, Radius, Shadows } from '../../theme';
import FoodCard from '../../components/FoodCard';
import { MenuItemSkeleton } from '../../components/LoadingSkeleton';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';

// Derive categories from menu items
function getCategories(items) {
  const cats = [...new Set(items.map((i) => i.category).filter(Boolean))];
  return ['All', ...cats];
}

// Greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ cart, onCartUpdate, onGoToCart }) {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const firstName = user?.name?.split(' ')[0] || 'there';
  const greeting = getGreeting();

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await menuService.getAll();
      setMenuItems(data);
    } catch (e) {
      setError(e.userMessage || 'Failed to load menu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  // Filtering & searching
  const filtered = menuItems.filter((item) => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = getCategories(menuItems);
  const available = menuItems.filter((i) => i.isAvailable);
  const popular = available.slice(0, 5); // top 5 available as "popular"

  const totalCartItems = Object.values(cart).reduce((a, b) => a + b, 0);

  const handleCartChange = (itemId, delta) => {
    onCartUpdate((prev) => {
      const current = prev[itemId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      return { ...prev, [itemId]: next };
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <View style={styles.skeletonScreen}>
          {[1, 2, 3, 4].map((k) => <MenuItemSkeleton key={k} />)}
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        stickyHeaderIndices={[2]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={onGoToCart}>
            <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Cafeteria Status Banner ── */}
        <View style={styles.statusBanner}>
          <View style={styles.statusLeft}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>Cafeteria Open</Text>
          </View>
          <Text style={styles.statusSub}>{available.length} items available today</Text>
        </View>

        {/* ── Search Bar (sticky) ── */}
        <View style={styles.searchArea}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search food, snacks, beverages..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Categories ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Popular picks (only when no search/filter active) ── */}
        {!search && selectedCategory === 'All' && popular.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Popular Picks</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularScroll}>
              {popular.map((item) => (
                <View key={item._id} style={styles.popularCard}>
                  <Text style={styles.popularIcon}>
                    {item.category?.includes('Bev') || item.category?.includes('Drink') ? '🥤' :
                     item.category?.includes('Break') ? '🍳' :
                     item.category?.includes('Snack') ? '🥪' : '🍽️'}
                  </Text>
                  <Text style={styles.popularName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.popularPrice}>₹{item.price}</Text>
                  {(cart[item._id] || 0) > 0 ? (
                    <View style={styles.popularQty}>
                      <TouchableOpacity onPress={() => handleCartChange(item._id, -1)}>
                        <Text style={styles.popularQtyBtn}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.popularQtyNum}>{cart[item._id]}</Text>
                      <TouchableOpacity onPress={() => handleCartChange(item._id, 1)}>
                        <Text style={styles.popularQtyBtn}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.popularAddBtn}
                      onPress={() => handleCartChange(item._id, 1)}
                    >
                      <Text style={styles.popularAddText}>ADD</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Full Menu List ── */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>
              {search ? `Results for "${search}"` : selectedCategory === 'All' ? 'All Items' : selectedCategory}
            </Text>
            <Text style={styles.countLabel}>{filtered.length} items</Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon={search ? '🔍' : '🍽️'}
              title={search ? 'No results found' : 'Nothing here yet'}
              message={search ? `No items match "${search}"` : 'No items in this category.'}
              actionLabel={search ? 'Clear Search' : undefined}
              onAction={search ? () => setSearch('') : undefined}
            />
          ) : (
            filtered.map((item) => (
              <FoodCard
                key={item._id}
                item={item}
                quantity={cart[item._id] || 0}
                onAdd={() => handleCartChange(item._id, 1)}
                onIncrease={() => handleCartChange(item._id, 1)}
                onDecrease={() => handleCartChange(item._id, -1)}
              />
            ))
          )}
        </View>

        {/* Bottom padding for cart bar */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Floating Cart Bar ── */}
      {totalCartItems > 0 && (
        <View style={styles.cartBar}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{totalCartItems}</Text>
            </View>
            <Text style={styles.cartBarLabel}>
              {totalCartItems === 1 ? '1 item' : `${totalCartItems} items`} in cart
            </Text>
          </View>
          <TouchableOpacity style={styles.cartBarBtn} onPress={onGoToCart} activeOpacity={0.9}>
            <Text style={styles.cartBarBtnText}>View Cart →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  skeletonScreen: { padding: Spacing.screen, paddingTop: Spacing.xl },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greeting: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: Typography.weightMedium,
  },
  name: {
    fontSize: Typography.xl,
    fontWeight: Typography.weightExtraBold,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  avatarInitial: {
    color: Colors.textInverse,
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
  },

  // Status banner
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    marginHorizontal: Spacing.screen,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  statusLabel: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
    color: Colors.success,
  },
  statusSub: {
    fontSize: Typography.xs,
    color: Colors.success,
    opacity: 0.8,
  },

  // Search
  searchArea: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm + 2,
    ...Shadows.sm,
    gap: Spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.xs,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.screen,
    marginTop: Spacing.base,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  countLabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },

  // Category chips
  chipsScroll: { paddingBottom: Spacing.sm, gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightSemiBold,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.textInverse },

  // Popular picks
  popularScroll: { paddingBottom: Spacing.sm, gap: Spacing.md },
  popularCard: {
    width: 130,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  popularIcon: { fontSize: 30, marginBottom: Spacing.sm },
  popularName: {
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  popularPrice: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.weightBold,
    marginBottom: Spacing.sm,
  },
  popularQty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  popularQtyBtn: {
    color: Colors.textInverse,
    fontSize: Typography.md,
    fontWeight: Typography.weightBold,
    paddingHorizontal: 2,
  },
  popularQtyNum: {
    color: Colors.textInverse,
    fontSize: Typography.base,
    fontWeight: Typography.weightBold,
    minWidth: 18,
    textAlign: 'center',
  },
  popularAddBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  popularAddText: {
    color: Colors.primary,
    fontSize: Typography.xs,
    fontWeight: Typography.weightBold,
    letterSpacing: 1,
  },

  // Cart bar
  cartBar: {
    position: 'absolute',
    bottom: Spacing.base,
    left: Spacing.screen,
    right: Spacing.screen,
    backgroundColor: Colors.textPrimary,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    ...Shadows.lg,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cartCount: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: {
    color: Colors.textInverse,
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
  },
  cartBarLabel: {
    color: Colors.textInverse,
    fontSize: Typography.base,
    fontWeight: Typography.weightMedium,
  },
  cartBarBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  cartBarBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sm,
    fontWeight: Typography.weightBold,
  },
});

