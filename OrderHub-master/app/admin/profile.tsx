import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from 'react-native'
import { getAuth, signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../../firebase/firebaseConfig'
import { useRouter } from 'expo-router'

type AdminSettings = {
  allowNewRegistrations?: boolean
  maintenanceMode?: boolean
  maxTokensPerShop?: number
}

export default function AdminProfile() {
  const auth = getAuth()
  const router = useRouter()
  const user = auth.currentUser

  const [settings, setSettings] = useState<AdminSettings>({
    allowNewRegistrations: true,
    maintenanceMode: false,
    maxTokensPerShop: 50,
  })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'appSettings'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as AdminSettings)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const toggleSetting = async (
    key: keyof AdminSettings,
    value: boolean
  ) => {
    setToggling(key)
    try {
      await updateDoc(doc(db, 'config', 'appSettings'), { [key]: value })
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setToggling(null)
    }
  }

  const handleSignOut = async () => {
    await signOut(auth)
    router.replace('/')
  }

  const clearAllOrders = () => {
    Alert.alert(
      'Clear All Completed Orders',
      'This will permanently delete all completed orders. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const functions = getFunctions()
              const clear = httpsCallable(functions, 'adminClearCompletedOrders')
              await clear()
              Alert.alert('Done', 'All completed orders have been cleared.')
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  const resetAllQueues = () => {
    Alert.alert(
      'Reset All Queues',
      'This will mark all pending/waiting orders as cancelled across every shop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const functions = getFunctions()
              const reset = httpsCallable(functions, 'adminResetAllQueues')
              await reset()
              Alert.alert('Done', 'All queues have been reset.')
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1A1A2E" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>ADMIN</Text>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.email?.[0].toUpperCase() ?? 'A'}
          </Text>
        </View>
        <Text style={styles.emailText}>{user?.email}</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* App settings */}
      <Text style={styles.sectionTitle}>APP SETTINGS</Text>
      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingTitle}>New Registrations</Text>
            <Text style={styles.settingSub}>
              Allow new students to sign up
            </Text>
          </View>
          <Switch
            value={settings.allowNewRegistrations ?? true}
            onValueChange={(v) => toggleSetting('allowNewRegistrations', v)}
            trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
            thumbColor={
              settings.allowNewRegistrations ? '#16A34A' : '#fff'
            }
            disabled={toggling === 'allowNewRegistrations'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingTitle}>Maintenance Mode</Text>
            <Text style={styles.settingSub}>
              Disable app for all users
            </Text>
          </View>
          <Switch
            value={settings.maintenanceMode ?? false}
            onValueChange={(v) => toggleSetting('maintenanceMode', v)}
            trackColor={{ false: '#E5E7EB', true: '#FCA5A5' }}
            thumbColor={settings.maintenanceMode ? '#DC2626' : '#fff'}
            disabled={toggling === 'maintenanceMode'}
          />
        </View>
      </View>

      {/* Danger zone */}
      <Text style={styles.sectionTitle}>DANGER ZONE</Text>
      <View style={styles.dangerCard}>
        <TouchableOpacity
          style={styles.dangerRow}
          onPress={clearAllOrders}
        >
          <View>
            <Text style={styles.dangerTitle}>Clear Completed Orders</Text>
            <Text style={styles.dangerSub}>
              Permanently delete all done orders
            </Text>
          </View>
          <Text style={styles.dangerArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.settingDivider} />

        <TouchableOpacity
          style={styles.dangerRow}
          onPress={resetAllQueues}
        >
          <View>
            <Text style={styles.dangerTitle}>Reset All Queues</Text>
            <Text style={styles.dangerSub}>
              Cancel all pending orders campus-wide
            </Text>
          </View>
          <Text style={styles.dangerArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F4F8' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: '#1A1A2E',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },

  profileCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  emailText: { fontSize: 14, color: '#1A1A2E', fontWeight: '600' },
  adminBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 1.5,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B8B9A',
    letterSpacing: 1.5,
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 8,
  },

  settingsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: { flex: 1, marginRight: 12 },
  settingTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  settingSub: { fontSize: 12, color: '#999', marginTop: 2 },
  settingDivider: {
    height: 0.5,
    backgroundColor: '#F0F0F5',
    marginHorizontal: 16,
  },

  dangerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dangerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  dangerTitle: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  dangerSub: { fontSize: 12, color: '#999', marginTop: 2 },
  dangerArrow: { fontSize: 20, color: '#DC2626' },

  signOutBtn: {
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: { color: '#DC2626', fontWeight: '700', fontSize: 15 },
})
