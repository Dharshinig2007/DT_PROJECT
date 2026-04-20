import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity,
  Switch, Alert, ActivityIndicator } from 'react-native'
import { getAuth, signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, onSnapshot } 
  from 'firebase/firestore'
import { db } from '../../firebase/firebaseConfig'
import { useRouter } from 'expo-router'

export default function ShopkeeperProfile() {
  const router = useRouter()
  const auth = getAuth()
  const user = auth.currentUser
  const [shopId, setShopId] = useState('')
  const [queueActive, setQueueActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    let unsub: any
    const init = async () => {
      const uid = user?.uid
      if (!uid) return
      const userSnap = await getDoc(doc(db, 'users', uid))
      const sid = userSnap.data()?.shopId ?? ''
      setShopId(sid)
      if (!sid) { setLoading(false); return }

      unsub = onSnapshot(doc(db, 'shops', sid), (snap) => {
        setQueueActive(snap.data()?.isQueueActive ?? false)
        setLoading(false)
      })
    }
    init()
    return () => unsub?.()
  }, [user?.uid])

  const toggleQueue = async (value: boolean) => {
    if (!shopId || toggling) return
    setToggling(true)
    try {
      await updateDoc(doc(db, 'shops', shopId), {
        isQueueActive: value
      })
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setToggling(false)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    router.replace('/')
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color="#7C5CFF" />
    </View>
  )

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.email?.[0].toUpperCase() ?? 'S'}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Shopkeeper</Text>

        <View style={styles.queueCard}>
          <View style={styles.queueLeft}>
            <Text style={styles.queueTitle}>
              Digital Queue
            </Text>
            <Text style={styles.queueSub}>
              {queueActive 
                ? 'Queue is ON — students get tokens' 
                : 'Queue is OFF'}
            </Text>
          </View>
          <Switch
            value={queueActive}
            onValueChange={toggleQueue}
            trackColor={{ 
              false: '#e5e7eb', 
              true: '#c4b5fd' 
            }}
            thumbColor={queueActive ? '#7C5CFF' : '#fff'}
            disabled={toggling}
          />
        </View>

        <TouchableOpacity 
          style={styles.signOutBtn} 
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', 
    alignItems: 'center' },
  header: {
    backgroundColor: '#7C5CFF',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  title: { color: '#fff', fontSize: 18, 
    fontWeight: '700' },
  body: { flex: 1, padding: 24, alignItems: 'center',
    paddingTop: 40 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', 
    color: '#7C5CFF' },
  email: { fontSize: 15, color: '#1A1A1A', 
    fontWeight: '500' },
  role: { fontSize: 13, color: '#999', marginTop: 4,
    marginBottom: 32 },
  queueCard: {
    width: '100%',
    backgroundColor: '#F6F4FF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAE6FF',
  },
  queueLeft: { flex: 1, marginRight: 12 },
  queueTitle: { fontSize: 15, fontWeight: '700', 
    color: '#1A1A1A' },
  queueSub: { fontSize: 12, color: '#999', 
    marginTop: 3 },
  signOutBtn: {
    backgroundColor: '#FEE2E2', padding: 16,
    borderRadius: 14, alignItems: 'center',
    width: '100%',
  },
  signOutText: { color: '#DC2626', fontWeight: '700',
    fontSize: 15 },
})