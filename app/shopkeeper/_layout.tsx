import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function ShopkeeperLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7C5CFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          borderTopColor: '#EAE6FF',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scanner',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📷</Text>,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
  name="products"
  options={{
    href: null,
  }}
/>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  )
}