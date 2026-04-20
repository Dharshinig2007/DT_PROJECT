import React, { useEffect, useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../../firebase/firebaseConfig'

type AppUser = {
  id: string
  email?: string
  role?: 'student' | 'shopkeeper' | 'admin'
  shopId?: string
  displayName?: string
  createdAt?: any
  disabled?: boolean
  expoPushToken?: string
}

const ROLE_COLORS: Record<string, string> = {
  student: '#3B82F6',
  shopkeeper: '#7C5CFF',
  admin: '#DC2626',
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'shopkeeper' | 'admin'>('all')

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppUser)))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    let list = users
    if (roleFilter !== 'all') list = list.filter((u) => u.role === roleFilter)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(
        (u) =>
          u.email?.toLowerCase().includes(s) ||
          u.displayName?.toLowerCase().includes(s)
      )
    }
    return list
  }, [users, roleFilter, search])

  const counts = useMemo(() => ({
    all: users.length,
    student: users.filter((u) => u.role === 'student').length,
    shopkeeper: users.filter((u) => u.role === 'shopkeeper').length,
    admin: users.filter((u) => u.role === 'admin').length,
  }), [users])

  const toggleDisable = (user: AppUser) => {
    const action = user.disabled ? 'Enable' : 'Disable'
    Alert.alert(
      `${action} User`,
      `${action} account for ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: user.disabled ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const functions = getFunctions()
              const toggleUser = httpsCallable(functions, 'adminToggleUser')
              await toggleUser({ uid: user.id, disabled: !user.disabled })
              // Optimistic update in Firestore
              await updateDoc(doc(db, 'users', user.id), {
                disabled: !user.disabled,
              })
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  const promoteToAdmin = (user: AppUser) => {
    Alert.alert(
      'Promote to Admin',
      `Give admin privileges to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            try {
              const functions = getFunctions()
              const setRole = httpsCallable(functions, 'adminSetUserRole')
              await setRole({ uid: user.id, role: 'admin' })
              await updateDoc(doc(db, 'users', user.id), { role: 'admin' })
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  const formatDate = (ts: any) => {
    if (!ts) return '-'
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const initials = (user: AppUser) => {
    const name = user.displayName ?? user.email ?? ''
    return name.slice(0, 2).toUpperCase()
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
          <Text style={styles.headerTitle}>Users</Text>
        </View>
        <View style={styles.countChip}>
          <Text style={styles.countText}>{users.length} total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email or name..."
          placeholderTextColor="#C4C4D0"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Role filter */}
      <View style={styles.roleRow}>
        {(['all', 'student', 'shopkeeper', 'admin'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              styles.roleChip,
              roleFilter === r && styles.roleChipActive,
            ]}
            onPress={() => setRoleFilter(r)}
          >
            <Text
              style={[
                styles.roleChipText,
                roleFilter === r && styles.roleChipTextActive,
              ]}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)} ({counts[r]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
        renderItem={({ item }) => {
          const roleColor =
            ROLE_COLORS[item.role ?? ''] ?? '#8B8B9A'

          return (
            <View style={[styles.card, item.disabled && styles.cardDisabled]}>
              <View style={styles.cardMain}>
                {/* Avatar */}
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: roleColor + '18' },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: roleColor }]}>
                    {initials(item)}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <View style={styles.infoTop}>
                    <Text
                      style={[
                        styles.emailText,
                        item.disabled && styles.disabledText,
                      ]}
                      numberOfLines={1}
                    >
                      {item.email ?? item.id}
                    </Text>
                    <View
                      style={[
                        styles.rolePill,
                        { backgroundColor: roleColor + '18' },
                      ]}
                    >
                      <Text
                        style={[styles.rolePillText, { color: roleColor }]}
                      >
                        {item.role?.toUpperCase() ?? 'USER'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateText}>
                    Joined {formatDate(item.createdAt)}
                    {item.shopId ? '  ·  Has shop' : ''}
                    {item.disabled ? '  ·  DISABLED' : ''}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                {item.role !== 'admin' && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => promoteToAdmin(item)}
                  >
                    <Text style={styles.actionBtnText}>Make Admin</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    item.disabled
                      ? styles.enableBtn
                      : styles.disableBtn,
                  ]}
                  onPress={() => toggleDisable(item)}
                >
                  <Text
                    style={[
                      styles.actionBtnText,
                      {
                        color: item.disabled ? '#16A34A' : '#DC2626',
                      },
                    ]}
                  >
                    {item.disabled ? 'Enable' : 'Disable'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
      />
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
  countChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  countText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1A1A2E', paddingVertical: 12 },
  clearBtn: { fontSize: 12, color: '#999', padding: 4 },

  roleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  roleChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  roleChipActive: { backgroundColor: '#1A1A2E', borderColor: '#1A1A2E' },
  roleChipText: { fontSize: 11, color: '#666', fontWeight: '600' },
  roleChipTextActive: { color: '#FFFFFF' },

  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  cardDisabled: { opacity: 0.6 },
  cardMain: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  info: { flex: 1 },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A2E',
    flex: 1,
  },
  disabledText: { color: '#999' },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  rolePillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  dateText: { fontSize: 11, color: '#999', marginTop: 3 },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  enableBtn: { borderColor: '#DCFCE7', backgroundColor: '#F0FDF4' },
  disableBtn: { borderColor: '#FEE2E2', backgroundColor: '#FFF5F5' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#1A1A2E' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#999' },
})
