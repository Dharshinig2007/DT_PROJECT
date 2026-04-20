import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../utils/colors';

type MenuItem = {
  id: string;
  name: string;
  price: number;
  image: string;
};

type CartMap = Record<string, number>;

const getCartKey = (id: string) => `student_cart_${id}`;
const getMenuKey = (id: string) => `student_menu_${id}`;
const LAST_SHOP_KEY = 'student_last_shop_id';

export default function CartScreen() {
  const router = useRouter();
  const {
    shopName,
    cart: cartParam,
    menuItems: menuItemsParam,
  } = useLocalSearchParams<{
    shopName?: string;
    cart?: string;
    menuItems?: string;
  }>();

  const initialCart = useMemo(() => {
    try {
      const parsed = JSON.parse((cartParam as string) ?? '{}');
      return parsed && typeof parsed === 'object' ? (parsed as CartMap) : {};
    } catch {
      return {};
    }
  }, [cartParam]);

  const initialMenuItems = useMemo(() => {
    try {
      const parsed = JSON.parse((menuItemsParam as string) ?? '[]');
      return Array.isArray(parsed) ? (parsed as MenuItem[]) : [];
    } catch {
      return [];
    }
  }, [menuItemsParam]);

  const [cartState, setCartState] = useState<CartMap>(initialCart);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [resolvedShopId, setResolvedShopId] = useState<string>('');

  const initFromStorage = useCallback(async () => {
      const shopNameValue = typeof shopName === 'string' ? shopName : '';
      const shopIdFromParam = shopNameValue.toLowerCase().replace(/\s+/g, '_');
      const fallbackShopId = await AsyncStorage.getItem(LAST_SHOP_KEY);
      const activeShopId = shopIdFromParam || fallbackShopId || '';
      setResolvedShopId(activeShopId);

      if (activeShopId) {
        try {
          const rawCart = await AsyncStorage.getItem(getCartKey(activeShopId));
          if (rawCart) {
            const parsed = JSON.parse(rawCart);
            if (parsed && typeof parsed === 'object') {
              setCartState(parsed as CartMap);
            } else {
              setCartState({});
            }
          } else {
            setCartState({});
          }
        } catch {
          // ignore malformed cart
          setCartState({});
        }
      } else {
        setCartState({});
      }

      if (activeShopId) {
        try {
          const rawMenu = await AsyncStorage.getItem(getMenuKey(activeShopId));
          if (rawMenu) {
            const parsed = JSON.parse(rawMenu);
            if (Array.isArray(parsed)) {
              setMenuItems(parsed as MenuItem[]);
            } else if (initialMenuItems.length > 0) {
              setMenuItems(initialMenuItems);
            } else {
              setMenuItems([]);
            }
          } else if (initialMenuItems.length > 0) {
            setMenuItems(initialMenuItems);
          } else {
            setMenuItems([]);
          }
        } catch {
          // ignore malformed menu
          if (initialMenuItems.length > 0) {
            setMenuItems(initialMenuItems);
          } else {
            setMenuItems([]);
          }
        }
      }
    }, [initialMenuItems, shopName]);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  useFocusEffect(
    useCallback(() => {
      initFromStorage();
    }, [initFromStorage])
  );

  useEffect(() => {
    if (!resolvedShopId) return;
    AsyncStorage.setItem(getCartKey(resolvedShopId), JSON.stringify(cartState));
  }, [cartState, resolvedShopId]);

  const itemById = useMemo(() => {
    return menuItems.reduce<Record<string, MenuItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [menuItems]);

  const cartItems = useMemo(() => {
    return Object.entries(cartState)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = itemById[id];
        return {
          id,
          qty,
          name: item?.name ?? 'Item',
          price: item?.price ?? 0,
          image:
            item?.image ??
            'https://source.unsplash.com/200x200/?food',
        };
      })
      .filter((item) => item.name.trim().length > 0 && item.price > 0);
  }, [cartState, itemById]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
  }, [cartItems]);

  const updateQty = (id: string, change: number) => {
    setCartState((prev) => {
      const updatedCart = { ...prev };
      const newQty = (updatedCart[id] || 0) + change;
      if (newQty <= 0) delete updatedCart[id];
      else updatedCart[id] = newQty;
      return updatedCart;
    });
  };

  const handleBackToMenu = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/student' as any);
  };

  const clearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setCartState({});
            if (resolvedShopId) {
              await AsyncStorage.removeItem(getCartKey(resolvedShopId));
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMenu}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>My Cart</Text>

          {cartItems.length > 0 ? (
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* EMPTY */}
        {cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>

            <TouchableOpacity
              style={styles.browseButton}
              onPress={handleBackToMenu}
            >
              <Text style={styles.browseButtonText}>
                Browse Menu
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* LIST */}
            <FlatList
              data={cartItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Image
                    source={{ uri: item.image }}
                    style={styles.image}
                  />

                  <View style={styles.info}>
                    <Text style={styles.name}>
                      {item.name}
                    </Text>

                    <Text style={styles.price}>
                      ₹{item.price * item.qty}
                    </Text>
                  </View>

                  <View style={styles.stepper}>
                    <TouchableOpacity
                      onPress={() =>
                        updateQty(item.id, -1)
                      }
                      style={styles.stepperButton}
                    >
                      <Text>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.qty}>
                      {item.qty}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        updateQty(item.id, 1)
                      }
                      style={styles.stepperButtonPrimary}
                    >
                      <Text style={{ color: '#fff' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />

            {/* CHECKOUT */}
            <View style={styles.checkoutBar}>
              <Text style={styles.total}>
                ₹{totalAmount}
              </Text>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={() =>
                  router.push({
                    pathname: '/student/checkout' as any,
                    params: {
                      shopName: shopName ?? '',
                      cart: JSON.stringify(cartState),
                      menuItems: JSON.stringify(menuItems),
                      totalAmount: String(totalAmount),
                    },
                  } as any)
                }
              >
                <Text style={styles.checkoutText}>
                  Checkout
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

/* 🎨 STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.primary },
  content: { flex: 1, backgroundColor: COLORS.lightBackground },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.primary,
  },
  back: { color: '#fff', fontSize: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clearText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  listContent: { padding: 16, paddingBottom: 120 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },

  image: { width: 60, height: 60, borderRadius: 10 },

  info: { flex: 1, marginLeft: 10 },

  name: { fontWeight: '700' },

  price: { color: COLORS.primary },

  stepper: { flexDirection: 'row', alignItems: 'center' },

  stepperButton: {
    padding: 6,
    backgroundColor: '#eee',
    borderRadius: 6,
  },

  stepperButtonPrimary: {
    padding: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },

  qty: { marginHorizontal: 8 },

  checkoutBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },

  total: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },

  checkoutButton: {
    marginTop: 10,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  checkoutText: { color: '#fff', fontWeight: '700' },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: { fontSize: 18, fontWeight: '700' },

  browseButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 10,
    borderRadius: 10,
  },

  browseButtonText: { color: COLORS.primary },
});