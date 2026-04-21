import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { doc, onSnapshot } from 'firebase/firestore'
import QRCode from 'react-native-qrcode-svg'
import { db } from '../../firebase/firebaseConfig'

const formatToken = (n: number) => String(n).padStart(4, '0')
const formatPrice = (amount: number) => `₹${Number(amount).toFixed(2)}`

const formatDate = (ts: any) => {
  const date =
    typeof ts === 'object' && ts?.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleString('en-IN')
}

const COLORS = {
  primary: '#7C5CFF',
  background: '#FFFFFF',
  card: '#FFFFFF',
  soft: '#F6F4FF',
  border: '#EAE6FF',
  text: '#1A1A1A',
  subText: '#6B6B6B',
  textMuted: '#A0A0A0',
  success: '#22C55E',
  successSoft: '#E9F9EF',
}

export default function EBillScreen() {
  const router = useRouter()
  const { orderId } = useLocalSearchParams<{ orderId?: string | string[] }>()

  const safeOrderId =
    typeof orderId === 'string'
      ? orderId
      : Array.isArray(orderId)
      ? orderId[0]
      : undefined

  const [order, setOrder] = useState<any>(null)
  const [shopData, setShopData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!safeOrderId) return

    const unsub = onSnapshot(doc(db, 'orders', safeOrderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()

        setOrder({
          orderId: snap.id,
          tokenNumber: data.tokenNumber ?? 0,
          shopName: data.shopName ?? 'OrderHub',
          shopId: data.shopId ?? '',
          items: data.items ?? [],
          total: data.total ?? 0,
          createdAt: data.createdAt ?? new Date(),
          status: data.status ?? 'pending',
          qrScanned: data.qrScanned === true || data.status === 'completed',
        })
      } else {
        setOrder(null)
      }
      setLoading(false)
    })

    return unsub
  }, [safeOrderId])

  useEffect(() => {
    if (!order?.shopId) return

    const unsub = onSnapshot(doc(db, 'shops', order.shopId), (snap) => {
      if (snap.exists()) setShopData(snap.data())
    })

    return unsub
  }, [order?.shopId])

  const queueActive = shopData?.isQueueActive === true
  const activeToken = shopData?.activeToken ?? 0

  const isScanned = order?.qrScanned === true
  const isCompletedView = isScanned // 🔥 MAIN FLAG

  const isMyTurn = shopData?.activeToken === order?.tokenNumber
  const ahead = Math.max(0, order?.tokenNumber - activeToken - 1)

  const statusText = isScanned
    ? 'Order Completed'
    : isMyTurn
    ? 'Your Turn!'
    : 'Preparing Order'

  useEffect(() => {
    if (!queueActive || !isMyTurn || isScanned) return

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    )

    loop.start()
    return () => loop.stop()
  }, [queueActive, isMyTurn, isScanned])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C5CFF" />
      </View>
    )
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>No order found</Text>
      </View>
    )
  }

  const qrValue = JSON.stringify({
    orderId: order.orderId,
    token: formatToken(order.tokenNumber),
    shopId: order.shopId,
    total: order.total,
  })

  const subtotal = order.items.reduce(
    (sum: number, i: any) => sum + i.price * i.qty,
    0
  )

  const handleShare = async () => {
    await Share.share({
      message:
        `🧾 Order Confirmed\n` +
        `Token: #${formatToken(order.tokenNumber)}\n` +
        `Total: ${formatPrice(order.total)}`,
    })
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Order</Text>

        <TouchableOpacity onPress={handleShare}>
          <Text style={styles.share}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>

        {/* 🚨 ONLY SHOW WHEN NOT COMPLETED */}
        {!isCompletedView && (
          <>
            {queueActive && (
              <View style={styles.tokenCard}>
                <Text style={styles.tokenLabel}>YOUR TOKEN</Text>

                <Animated.Text
                  style={[
                    styles.token,
                    isMyTurn && { transform: [{ scale: pulse }] },
                  ]}
                >
                  #{formatToken(order.tokenNumber)}
                </Animated.Text>

                <Text style={styles.shop}>{order.shopName}</Text>

                <Text style={styles.status}>{statusText}</Text>
              </View>
            )}

            {!queueActive && (
              <View style={styles.walkInCard}>
                <Text style={styles.walkInEmoji}>🧾</Text>
                <Text style={styles.walkInTitle}>Walk-in Order</Text>
                <Text style={styles.walkInSub}>
                  Show QR at counter
                </Text>
              </View>
            )}

            {queueActive && !isScanned && (
              <View style={styles.queueCard}>
                <View style={styles.queueRow}>
                  <Text>Now serving</Text>
                  <Text>#{formatToken(activeToken)}</Text>
                </View>

                <View style={styles.queueRow}>
                  <Text>People ahead</Text>
                  <Text>{ahead}</Text>
                </View>

                <View style={styles.queueRow}>
                  <Text>Wait</Text>
                  <Text>{ahead * 3} min</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* QR (always show but changes state) */}
        <View style={styles.qrCard}>
          <Text style={styles.qrText}>
            {isScanned ? 'QR Completed' : 'Show at counter'}
          </Text>

          {isScanned ? (
            <View style={styles.doneWrap}>
              <Text style={styles.tick}>✓</Text>
              <Text style={styles.doneTitle}>Order Completed</Text>
            </View>
          ) : (
            <QRCode value={qrValue} size={180} />
          )}

          <Text style={styles.meta}>{order.orderId}</Text>
          <Text style={styles.meta}>{formatDate(order.createdAt)}</Text>
        </View>

        {/* SUMMARY ALWAYS SHOWN */}
        <View style={styles.summary}>
          <Text style={styles.section}>Summary</Text>

          {order.items.map((i: any, idx: number) => (
            <View key={idx} style={styles.row}>
              <Text>{i.qty}x {i.name}</Text>
              <Text>{formatPrice(i.qty * i.price)}</Text>
            </View>
          ))}

          <View style={styles.row}>
            <Text>Total</Text>
            <Text>{formatPrice(subtotal)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={{ fontWeight: '700' }}>Paid</Text>
            <Text style={{ fontWeight: '700' }}>
              {formatPrice(order.total)}
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

/* styles unchanged (same as yours) */

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 44,
    paddingHorizontal: 15,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },

  title: { color: '#fff', fontWeight: '700', fontSize: 20 },
  iconBtn: {
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  back: { color: '#fff', fontSize: 28 },
  share: { color: '#fff', fontWeight: '600' },

  container: { padding: 15, paddingBottom: 24 },

  tokenCard: {
    backgroundColor: COLORS.soft,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  tokenLabel: { color: COLORS.subText, letterSpacing: 1.2, fontSize: 12 },
  token: { fontSize: 40, fontWeight: '800', color: COLORS.primary },
  shop: { color: COLORS.subText, marginTop: 4, fontWeight: '500' },

  status: {
    marginTop: 10,
    fontWeight: '600',
    color: COLORS.success,
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },

  statusMuted: {
    color: COLORS.textMuted,
    backgroundColor: '#F3F4F6',
  },

  statusTurn: { fontWeight: '700' },

  walkInCard: {
    backgroundColor: COLORS.soft,
    padding: 24,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  walkInEmoji: { fontSize: 36, marginBottom: 8 },
  walkInTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  walkInSub: {
    fontSize: 13,
    color: COLORS.subText,
    textAlign: 'center',
  },

  queueCard: {
    padding: 14,
    backgroundColor: COLORS.soft,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },

  queueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  queueLabel: { color: COLORS.subText, fontSize: 13 },
  queueValue: { color: COLORS.text, fontWeight: '700' },

  qrCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: COLORS.card,
  },

  qrText: {
    marginBottom: 10,
    color: COLORS.subText,
    fontWeight: '500',
  },

  doneWrap: { alignItems: 'center', padding: 20 },
  tick: { fontSize: 40, color: COLORS.success },
  doneTitle: { fontWeight: '700' },
  doneSub: { color: COLORS.subText, fontSize: 12 },

  meta: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  summary: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 15,
    backgroundColor: COLORS.card,
  },

  section: {
    fontWeight: '700',
    marginBottom: 10,
    fontSize: 15,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },

  line: { height: 1, backgroundColor: '#ddd', marginVertical: 10 },
});