import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { getAuth } from 'firebase/auth';

type ProductForm = {
  name: string;
  price: string;
  description: string;
  emoji: string;
  category: string;
};

const emptyForm: ProductForm = {
  name: '',
  price: '',
  description: '',
  emoji: '',
  category: '',
};

export default function ShopkeeperProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [shopId, setShopId] = useState<string>('');
  const [form, setForm] = useState<ProductForm>(emptyForm);

  useEffect(() => {
    let unsubMenu: (() => void) | undefined;

    const init = async () => {
      try {
        const uid = getAuth().currentUser?.uid;
        if (!uid) {
          Alert.alert('Not logged in', 'Please log in again.');
          setLoading(false);
          return;
        }

        const userSnap = await getDoc(doc(db, 'users', uid));
        const userShopId = userSnap.data()?.shopId ?? '';
        if (!userShopId) {
          Alert.alert('Shop not found', 'No shop is linked to this account.');
          setLoading(false);
          return;
        }

        setShopId(userShopId);
        unsubMenu = onSnapshot(
          collection(db, 'shops', userShopId, 'menu'),
          (snap) => {
            const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setProducts(next);
            setLoading(false);
          },
          () => {
            Alert.alert('Error', 'Failed to listen to menu updates.');
            setLoading(false);
          }
        );
      } catch {
        Alert.alert('Error', 'Failed to load products.');
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubMenu) unsubMenu();
    };
  }, []);

  async function addProduct() {
    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();
    const trimmedEmoji = form.emoji.trim();
    const trimmedCategory = form.category.trim();
    const numericPrice = Number(form.price);

    if (!trimmedName || !form.price || !shopId || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert('Error', 'Name and price are required');
      return;
    }
    try {
      await addDoc(
        collection(db, 'shops', shopId, 'menu'),
        {
          name: trimmedName,
          price: numericPrice,
          description: trimmedDescription,
          emoji: trimmedEmoji || '🍽️',
          category: trimmedCategory || 'General',
          available: true,
          createdAt: new Date().toISOString(),
        }
      );
      setForm({ name: '', price: '', description: '', emoji: '', category: '' });
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function deleteProduct(productId: string) {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(
              doc(db, 'shops', shopId, 'menu', productId)
            );
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C5CFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Menu</Text>
        <TouchableOpacity
          onPress={() => {
            setForm(emptyForm);
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No items yet. Tap + Add to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.emoji}>{item.emoji || '🍽'}</Text>

            <View style={styles.middle}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.price}>₹{item.price}</Text>
            </View>

            <TouchableOpacity onPress={() => deleteProduct(item.id)}>
              <View style={styles.deleteCircle}>
                <Text style={styles.deleteIcon}>🗑</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalRoot}>
          <View style={styles.modalSheet}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            />

            <Text style={styles.inputLabel}>Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={form.price}
              keyboardType="numeric"
              onChangeText={(v) => setForm((p) => ({ ...p, price: v }))}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            />

            <Text style={styles.inputLabel}>Emoji</Text>
            <TextInput
              style={styles.input}
              value={form.emoji}
              onChangeText={(v) => setForm((p) => ({ ...p, emoji: v }))}
              placeholder="e.g. 🍕"
            />

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              value={form.category}
              onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
              placeholder="e.g. Pizza"
            />

            <TouchableOpacity style={styles.submitButton} onPress={addProduct}>
              <Text style={styles.submitButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#7C5CFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999999',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EAE6FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  middle: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    fontSize: 15,
    color: '#1A1A1A',
  },
  category: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  price: {
    fontWeight: '700',
    color: '#7C5CFF',
    marginTop: 4,
  },
  deleteCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 16,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalClose: {
    fontSize: 20,
    color: '#1A1A1A',
  },
  inputLabel: {
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EAE6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#7C5CFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
