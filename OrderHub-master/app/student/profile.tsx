import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native'
import { getAuth, signOut } from 'firebase/auth'
import { useRouter } from 'expo-router'

export default function StudentProfile() {
  const router = useRouter()
  const auth = getAuth()
  const user = auth.currentUser

  const handleSignOut = async () => {
    await signOut(auth)
    router.replace('/')
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {user?.email?.[0].toUpperCase() ?? 'S'}
          </Text>
        </View>

        {/* Email */}
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>Student</Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          
          {/* Order History */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => router.push('/student/orders')}
          >
            <Text style={styles.optionText}>📦 Order History</Text>
          </TouchableOpacity>

        </View>

        {/* Sign Out */}
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
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    backgroundColor: '#7C5CFF',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  body: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    paddingTop: 40,
  },

  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#7C5CFF',
  },

  email: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },

  role: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    marginBottom: 24,
  },

  optionsContainer: {
    width: '100%',
  },

  optionCard: {
    width: '100%',
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C5CFF',
  },

  signOutBtn: {
    marginTop: 'auto',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },

  signOutText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 15,
  },
})