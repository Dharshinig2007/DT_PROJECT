import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  where,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../../firebase/firebaseConfig'

type Shop = {
  id: string
  name?: string
  description?: string
  isQueueActive?: boolean
  createdAt?: any
  shopkeeperId?: string
  shopkeeperEmail?: string
  category?: string
}

const CATEGORIES = ['Canteen', 'Snacks', 'Beverages', 'Stationery', 'Other']

export default function AdminShops() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Canteen')
  const [shopkeeperEmail, setShopkeeperEmail] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'shops'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop)))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const openAdd = () => {
    setEditingShop(null)
    setName('')
    setDescription('')
    setCategory('Canteen')
    setShopkeeperEmail('')
    setModalVisible(true)
  }

  const openEdit = (shop: Shop) => {
    setEditingShop(shop)
    setName(shop.name ?? '')
    setDescription(shop.description ?? '')
    setCategory(shop.category ?? 'Canteen')
    setShopkeeperEmail(shop.shopkeeperEmail ?? '')
    setModalVisible(true)
  }

  const saveShop = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Shop name is required.')
      return
    }
    setSaving(true)
    try {
      if (editingShop) {
        await updateDoc(doc(db, 'shops', editingShop.id), {
          name: name.trim(),
          description: description.trim(),
          category,
          shopkeeperEmail: shopkeeperEmail.trim(),
        })
      } else {
        // Call Cloud Function to create shop + shopkeeper account
        const functions = getFunctions()
        const createShop = httpsCallable(functions, 'adminCreateShop')
        await createShop({
          name: name.trim(),
          description: description.trim(),
          category,
          shopkeeperEmail: shopkeeperEmail.trim(),
        })
      }
      setModalVisible(false)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleQueue = async (shop: Shop) => {
    try {
      await updateDoc(doc(db, 'shops', shop.id), {
        isQueueActive: !shop.isQueueActive,
      })
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  const deleteShop = (shop: Shop) => {
    Alert.alert(
      'Delete Shop',
      `Are you sure you want to delete "${shop.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const functions = getFunctions()
              const del = httpsCallable(functions, 'adminDeleteShop')
              await del({ shopId: shop.id })
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  const getOrderCount = async (shopId: string): Promise<number> => {
    const snap = await getDocs(
      query(collection(db, 'orders'), where('shopId', '==', shopId))
    )
    return snap.size
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A1A2E" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>ADMIN</Text>
          <Text style={styles.headerTitle}>Shops</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add Shop</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={shops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No shops added yet</Text>
            <Text style={styles.emptySub}>
              Tap "+ Add Shop" to create the first one
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Text style={styles.shopName}>{item.name}</Text>
                <Text style={styles.shopCategory}>
                  {item.category ?? 'Canteen'}
                </Text>
              </View>
              <Switch
                value={item.isQueueActive ?? false}
                onValueChange={() => toggleQueue(item)}
                trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                thumbColor={item.isQueueActive ? '#16A34A' : '#fff'}
              />
            </View>

            {item.description ? (
              <Text style={styles.shopDesc}>{item.description}</Text>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {item.shopkeeperEmail ?? 'No shopkeeper assigned'}
              </Text>
              <View
                style={[
                  styles.activePill,
                  {
                    backgroundColor: item.isQueueActive
                      ? '#DCFCE7'
                      : '#F3F4F6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.activePillText,
                    { color: item.isQueueActive ? '#16A34A' : '#9CA3AF' },
                  ]}
                >
                  {item.isQueueActive ? 'Queue ON' : 'Queue OFF'}
                </Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEdit(item)}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => deleteShop(item)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingShop ? 'Edit Shop' : 'Add New Shop'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>SHOP NAME *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Campus Café"
                placeholderTextColor="#C4C4D0"
              />

              <Text style={styles.fieldLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What does this shop sell?"
                placeholderTextColor="#C4C4D0"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.fieldLabel}>CATEGORY</Text>
              <View style={styles.categoryRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      category === cat && styles.catChipActive,
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        category === cat && styles.catChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!editingShop && (
                <>
                  <Text style={styles.fieldLabel}>SHOPKEEPER EMAIL *</Text>
                  <TextInput
                    style={styles.input}
                    value={shopkeeperEmail}
                    onChangeText={setShopkeeperEmail}
                    placeholder="shopkeeper@college.edu"
                    placeholderTextColor="#C4C4D0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text style={styles.fieldHint}>
                    A shopkeeper account will be created with a temporary
                    password. They will receive login details.
                  </Text>
                </>
              )}

              {editingShop && (
                <>
                  <Text style={styles.fieldLabel}>SHOPKEEPER EMAIL</Text>
                  <TextInput
                    style={styles.input}
                    value={shopkeeperEmail}
                    onChangeText={setShopkeeperEmail}
                    placeholder="shopkeeper@college.edu"
                    placeholderTextColor="#C4C4D0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={saveShop}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingShop ? 'Save Changes' : 'Create Shop'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#1A1A2E',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  addBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  addBtnText: { color: '#1A1A2E', fontWeight: '700', fontSize: 13 },

  listContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  shopName: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  shopCategory: { fontSize: 11, color: '#999', marginTop: 2 },
  shopDesc: { fontSize: 13, color: '#555', marginBottom: 8, lineHeight: 18 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  metaText: { fontSize: 12, color: '#999', flex: 1, marginRight: 8 },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  activePillText: { fontSize: 11, fontWeight: '600' },

  cardActions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1A1A2E',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  editBtnText: { color: '#1A1A2E', fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  emptySub: { fontSize: 13, color: '#999', marginTop: 6 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B8B9A',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFA',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 6,
    lineHeight: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catChipActive: {
    backgroundColor: '#1A1A2E',
    borderColor: '#1A1A2E',
  },
  catChipText: { fontSize: 12, color: '#666' },
  catChipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: {
    flex: 2,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
})
