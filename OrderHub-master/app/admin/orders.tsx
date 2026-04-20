import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/firebaseConfig'

type Order = {
  id: string
  tokenNumber?: number
  shopId?: string
  shopName?: string
  userId?: string
  status?: string
  total?: number
  items?: { name?: string; qty?: number; price?: number }[]
  createdAt?: any
  completedAt?: any
}

type FilterTab = 'all' | 'waiting' | 'ready' | 'completed'

const TAB_LABELS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'ready', label: 'Ready' },
  { key: 'completed', label: 'Done' },
]

const STATUS_COLORS: Record<string, string> = {
  waiting: '#F59E0B',
  ready: '#3B82F6',
  completed: '#22C55E',
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)))
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return orders
    return orders.filter((o) => o.status === activeTab)
  }, [orders, activeTab])

  const counts = useMemo(() => ({
    all: orders.length,
    waiting: orders.filter((o) => o.status === 'waiting').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  }), [orders])

  const forceComplete = (order: Order) => {
    Alert.alert(
      'Force Complete',
      `Mark Token #${String(order.tokenNumber ?? 0).padStart(4, '0')} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'orders', order.id), {
                status: 'completed',
                completedAt: serverTimestamp(),
              })
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  const formatTime = (ts: any) => {
    if (!ts) return '-'
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
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
          <Text style={styles.headerTitle}>All Orders</Text>
        </View>
        <View style={styles.countChip}>
          <Text style={styles.countChipText}>{orders.length} total</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabs}>
        {TAB_LABELS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, activeTab === key && styles.tabActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === key && styles.tabTextActive,
              ]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === key && styles.tabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === key && styles.tabBadgeTextActive,
                ]}
              >
                {counts[key]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {activeTab} orders</Text>
          </View>
        }
        renderItem={({ item }) => {
          const expanded = expandedId === item.id
          const color = STATUS_COLORS[item.status ?? ''] ?? '#8B8B9A'

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                setExpandedId(expanded ? null : item.id)
              }
              activeOpacity={0.85}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <Text style={styles.tokenText}>
                    #{String(item.tokenNumber ?? 0).padStart(4, '0')}
                  </Text>
                  <Text style={styles.shopText}>
                    {item.shopName ?? 'Unknown Shop'}
                  </Text>
                </View>
                <View style={styles.cardTopRight}>
                  <Text style={styles.amountText}>
                    ₹{Number(item.total ?? 0).toFixed(0)}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: color + '18' },
                    ]}
                  >
                    <Text style={[styles.statusText, { color }]}>
                      {(item.status ?? 'unknown').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>

              {expanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.expandDivider} />
                  {(item.items ?? []).map((it, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemName}>
                        {it.qty}× {it.name}
                      </Text>
                      <Text style={styles.itemPrice}>
                        ₹{(it.price ?? 0) * (it.qty ?? 0)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.expandTotal}>
                    <Text style={styles.expandTotalLabel}>Total</Text>
                    <Text style={styles.expandTotalVal}>
                      ₹{Number(item.total ?? 0).toFixed(0)}
                    </Text>
                  </View>
                  <Text style={styles.uidText}>
                    User: {item.userId ?? '-'}
                  </Text>
                  {item.status !== 'completed' && (
                    <TouchableOpacity
                      style={styles.forceBtn}
                      onPress={() => forceComplete(item)}
                    >
                      <Text style={styles.forceBtnText}>
                        Force Complete
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
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
  countChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  tabActive: { backgroundColor: '#1A1A2E' },
  tabText: { fontSize: 12, color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  tabBadge: {
    backgroundColor: '#F0F0F5',
    borderRadius: 100,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabBadgeText: { fontSize: 10, color: '#666', fontWeight: '700' },
  tabBadgeTextActive: { color: '#fff' },

  listContent: { padding: 16, gap: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTopLeft: {},
  tokenText: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  shopText: { fontSize: 12, color: '#999', marginTop: 2 },
  cardTopRight: { alignItems: 'flex-end', gap: 4 },
  amountText: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  timeText: { fontSize: 11, color: '#C0C0CC', marginTop: 6 },

  expandedContent: { marginTop: 12 },
  expandDivider: {
    height: 0.5,
    backgroundColor: '#F0F0F5',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: { fontSize: 13, color: '#444' },
  itemPrice: { fontSize: 13, color: '#1A1A2E', fontWeight: '500' },
  expandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E7EB',
  },
  expandTotalLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  expandTotalVal: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
  uidText: { fontSize: 11, color: '#C0C0CC', marginTop: 8 },
  forceBtn: {
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  forceBtnText: { color: '#B45309', fontWeight: '700', fontSize: 13 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 15, color: '#999' },
})
