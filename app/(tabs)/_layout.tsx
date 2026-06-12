import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Map, Cpu } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#818cf8' : '#4f46e5', // Bright Indigo
        tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
          borderRadius: 24,
          height: 64,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          paddingBottom: 4,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <Map color={color} size={size} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Engines',
          tabBarIcon: ({ color, size }) => (
            <Cpu color={color} size={size} strokeWidth={2.5} />
          ),
        }}
      />
    </Tabs>
  );
}
