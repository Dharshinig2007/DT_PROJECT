import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { COLORS } from '../utils/colors';

const roles = ['Student', 'Shopkeeper', 'Admin'];
const shops = ['REC Cafe', 'Hut Cafe', 'REC Mart', 'Dominos', 'Black Bug Cafe'];

export default function LoginScreen() {
  const auth = getAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Student');
  const [selectedShop, setSelectedShop] = useState('REC Cafe');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@rajalakshmi\.edu\.in$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please use your @rajalakshmi.edu.in email');
      return;
    }
    setLoading(true);
    try {
      const emailPrefix = email.split('@')[0].toLowerCase();

      if (selectedRole === 'Shopkeeper' &&
          emailPrefix !== 'shopkeeper') {
        Alert.alert('Access Denied',
          'Use shopkeeper@rajalakshmi.edu.in');
        setLoading(false);
        return;
      }

      if (selectedRole === 'Admin' &&
          emailPrefix !== 'admin') {
        Alert.alert('Access Denied',
          'Use admin@rajalakshmi.edu.in');
        setLoading(false);
        return;
      }

      if (selectedRole === 'Student' &&
          (emailPrefix === 'shopkeeper' ||
           emailPrefix === 'admin')) {
        Alert.alert('Access Denied',
          'Use your student email');
        setLoading(false);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const authEmail = userCredential.user.email ?? email;
      const authEmailPrefix = authEmail.split('@')[0].toLowerCase();
      const parsedRole =
        authEmailPrefix.startsWith('sk_')
          ? 'shopkeeper'
          : authEmailPrefix.startsWith('adm_')
            ? 'admin'
            : 'student';

      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      const userPayload: Record<string, any> = {
        uid: userCredential.user.uid,
        email: authEmail,
        role: parsedRole,
        displayName: userCredential.user.displayName || authEmailPrefix,
        shopId: selectedRole === 'Shopkeeper'
          ? selectedShop.toLowerCase().replace(/\s+/g, '_')
          : '',
        updatedAt: new Date().toISOString(),
      };
      if (!userSnap.exists()) {
        userPayload.createdAt = serverTimestamp();
      }

      await setDoc(userRef, userPayload, { merge: true });

      if (selectedRole === 'Admin') {
        router.replace('/admin');
      } else if (selectedRole === 'Shopkeeper') {
        router.replace('/shopkeeper');
      } else {
        router.replace('/student');
      }
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/app-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>OrderHub</Text>
        <Text style={styles.college}>Rajalakshmi Engineering College</Text>
        <Text style={styles.tagline}>Campus Food Ordering System</Text>
      </View>

      {/* Form Card */}
      <View style={styles.card}>

        {/* Email */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="yourname@rajalakshmi.edu.in"
          placeholderTextColor={COLORS.textSecondary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor={COLORS.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Role */}
        <Text style={styles.label}>Role</Text>
        <View style={styles.roleRow}>
          {roles.map(role => (
            <TouchableOpacity
              key={role}
              style={[
                styles.roleButton,
                selectedRole === role && styles.roleButtonActive,
              ]}
              onPress={() => setSelectedRole(role)}
            >
              <Text style={[
                styles.roleText,
                selectedRole === role && styles.roleTextActive,
              ]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Shop selector — only for Shopkeeper */}
        {selectedRole === 'Shopkeeper' && (
          <>
            <Text style={styles.label}>Select Your Shop</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.shopRow}>
                {shops.map(shop => (
                  <TouchableOpacity
                    key={shop}
                    style={[
                      styles.shopChip,
                      selectedShop === shop && styles.shopChipActive,
                    ]}
                    onPress={() => setSelectedShop(shop)}
                  >
                    <Text style={[
                      styles.shopChipText,
                      selectedShop === shop && styles.shopChipTextActive,
                    ]}>
                      {shop}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </>
        )}

        {/* Sign In */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>Only @rajalakshmi.edu.in accounts allowed</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.lightBackground,
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 14,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  college: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 13,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  roleTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  shopRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    paddingVertical: 4,
  },
  shopChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  shopChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  shopChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  shopChipTextActive: {
    color: COLORS.background,
    fontWeight: '500',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});