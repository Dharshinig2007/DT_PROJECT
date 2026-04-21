import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/firebaseConfig'

type Stats = {
  totalShops: number
  activeShops: number
  totalOrders: number
  todayOrders: number
  totalRevenue: number
  todayRevenue: number
  totalUsers: number
  pendingOrders: number
}

type RecentOrder = {
  id: string
  tokenNumber?: number
  shopName?: string
  total?: number
  status?: string
  createdAt?: any
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalShops: 0,
    activeShops: 0,
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    totalUsers: 0,
    pendingOrders: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayTs = Timestamp.fromDate(todayStart)

      // Shops
      const shopsSnap = await getDocs(collection(db, 'shops'))
      const totalShops = shopsSnap.size
      const activeShops = shopsSnap.docs.filter(
        (d) => d.data()?.isQueueActive === true
      ).length

      // Orders
      const ordersSnap = await getDocs(collection(db, 'orders'))
      const allOrders = ordersSnap.docs.map((d) => d.data())
      const totalOrders = allOrders.length
      const totalRevenue = allOrders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0
      )
      const pendingOrders = allOrders.filter(
        (o) => o.status !== 'completed'
      ).length

      // Today orders
      const todaySnap = await getDocs(
        query(
          collection(db, 'orders'),
          where('createdAt', '>=', todayTs)
        )
      )
      const todayOrders = todaySnap.size
      const todayRevenue = todaySnap.docs.reduce(
        (sum, d) => sum + (Number(d.data().total) || 0),
        0
      )

      // Users
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'student'))
      )

      setStats({
        totalShops,
        activeShops,
        totalOrders,
        todayOrders,
        totalRevenue,
        todayRevenue,
        totalUsers: usersSnap.size,
        pendingOrders,
      })
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchStats().finally(() => setLoading(false))

    // Live recent orders
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(8)
    )
    const unsub = onSnapshot(q, (snap) => {
      setRecentOrders(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecentOrder))
      )
    })
    return () => unsub()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
    setRefreshing(false)
  }

  const formatCurrency = (n: number) =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  const formatTime = (ts: any) => {
    if (!ts) return '-'
    const date = ts?.toDate ? ts.toDate() : new Date(ts)
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusColor = (status?: string) => {
    if (status === 'completed') return '#22C55E'
    if (status === 'ready') return '#3B82F6'
    if (status === 'waiting') return '#F59E0B'
    return '#8B8B9A'
  }

  const statusLabel = (status?: string) => {
    if (status === 'completed') return 'DONE'
    if (status === 'ready') return 'READY'
    if (status === 'waiting') return 'WAIT'
    return status?.toUpperCase() ?? '-'
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1A1A2E" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>CAMPUS SHOP</Text>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {/* Today highlight */}
      <View style={styles.todayCard}>
        <View style={styles.todayLeft}>
          <Text style={styles.todayLabel}>TODAY'S REVENUE</Text>
          <Text style={styles.todayAmount}>
            {formatCurrency(stats.todayRevenue)}
          </Text>
          <Text style={styles.todaySub}>
            {stats.todayOrders} orders placed today
          </Text>
        </View>
        <View style={styles.todayRight}>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeNum}>{stats.pendingOrders}</Text>
            <Text style={styles.todayBadgeLbl}>pending</Text>
          </View>
        </View>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.totalShops}</Text>
          <Text style={styles.statLbl}>Total Shops</Text>
          <Text style={styles.statSub}>{stats.activeShops} active now</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.totalOrders}</Text>
          <Text style={styles.statLbl}>All Orders</Text>
          <Text style={styles.statSub}>
            {formatCurrency(stats.totalRevenue)} total
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.totalUsers}</Text>
          <Text style={styles.statLbl}>Students</Text>
          <Text style={styles.statSub}>registered</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.activeShops}</Text>
          <Text style={styles.statLbl}>Queue Active</Text>
          <Text style={styles.statSub}>shops right now</Text>
        </View>
      </View>

      {/* Recent orders */}
      <Text style={styles.sectionTitle}>Recent Orders</Text>
      <View style={styles.ordersCard}>
        {recentOrders.length === 0 ? (
          <Text style={styles.emptyText}>No orders yet</Text>
        ) : (
          recentOrders.map((order, idx) => (
            <View key={order.id}>
              {idx > 0 && <View style={styles.divider} />}
              <View style={styles.orderRow}>
                <View style={styles.orderLeft}>
                  <Text style={styles.orderToken}>
                    #{String(order.tokenNumber ?? 0).padStart(4, '0')}
                  </Text>
                  <Text style={styles.orderShop}>
                    {order.shopName ?? 'Unknown Shop'}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>
                    {formatCurrency(order.total ?? 0)}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusColor(order.status) + '18' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColor(order.status) },
                      ]}
                    >
                      {statusLabel(order.status)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F8' },
  content: { paddingBottom: 32 },
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    gap: 5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  liveText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600' },

  todayCard: {
    backgroundColor: '#1A1A2E',
    marginHorizontal: 16,
    marginTop: -1,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todayLeft: {},
  todayLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  todayAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  todaySub: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  todayRight: {},
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    minWidth: 70,
  },
  todayBadgeNum: { fontSize: 24, fontWeight: '800', color: '#F59E0B' },
  todayBadgeLbl: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    width: '47.5%',
  },
  statNum: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  statLbl: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', marginTop: 2 },
  statSub: { fontSize: 11, color: '#999', marginTop: 3 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B8B9A',
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  ordersCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  divider: { height: 0.5, backgroundColor: '#F0F0F5', marginHorizontal: 16 },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
  },
  orderLeft: {},
  orderToken: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  orderShop: { fontSize: 12, color: '#999', marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderAmount: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 24,
    fontSize: 13,
  },
})
