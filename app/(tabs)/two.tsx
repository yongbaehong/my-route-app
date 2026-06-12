import React from "react";
import {
  Text,
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  useColorScheme
} from "react-native";
import { BlurView } from "expo-blur";
import {
  Navigation,
  Sparkles,
  Info,
  Server,
  Database,
  Cpu,
  Layers
} from "lucide-react-native";

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1 relative bg-slate-100 dark:bg-slate-950">
      {/* Background glowing orbs */}
      <View style={StyleSheet.absoluteFill}>
        <View className="absolute top-[80px] right-[-50px] w-80 h-80 rounded-full bg-blue-500/10 dark:bg-blue-600/5" />
        <View className="absolute bottom-[100px] left-[-80px] w-80 h-80 rounded-full bg-fuchsia-500/10 dark:bg-purple-600/5" />
      </View>

      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Hero Section */}
          <View className="items-center mb-8">
            <View className="bg-blue-600 p-4 rounded-3xl shadow-xl mb-4">
              <Navigation color="white" size={36} />
            </View>
            <Text className="text-2xl font-black text-gray-900 dark:text-white text-center">
              Optimization Engines
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 max-w-xs">
              Understand how RouteMaster plans and arranges your stops.
            </Text>
          </View>

          {/* Engine 1: Tmap API */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-white/20 dark:border-white/5 shadow-md">
            <BlurView intensity={35} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center space-x-3 mb-3">
                <View className="p-2 rounded-xl bg-blue-500/20">
                  <Server color="#3B82F6" size={20} />
                </View>
                <Text className="text-lg font-black text-gray-900 dark:text-white">
                  Tmap API Routing (Online)
                </Text>
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                Utilizes the SK Telecom Tmap optimization engine to calculate precise routes based on actual traffic, road conditions, and geographical constraints in South Korea.
              </Text>
              <View className="bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-black/5 dark:border-white/5">
                <Text className="text-xs font-bold text-gray-700 dark:text-gray-400 mb-1">KEY BENEFITS:</Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">• Live traffic data integration</Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">• Accurate turn-by-turn waypoint ordering</Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">• Dynamic distance calculations</Text>
              </View>
            </BlurView>
          </View>

          {/* Engine 2: Simulation Mode */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-white/20 dark:border-white/5 shadow-md">
            <BlurView intensity={35} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center space-x-3 mb-3">
                <View className="p-2 rounded-xl bg-fuchsia-500/20">
                  <Cpu color="#D946EF" size={20} />
                </View>
                <Text className="text-lg font-black text-gray-900 dark:text-white">
                  Offline Simulation Heuristic
                </Text>
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                Runs a local nearest-neighbor TSP solver (Traveling Salesperson Problem) directly on your device. Activates automatically if the Tmap API key is missing or offline.
              </Text>
              <View className="bg-black/5 dark:bg-white/5 p-3.5 rounded-2xl border border-black/5 dark:border-white/5">
                <Text className="text-xs font-bold text-gray-700 dark:text-gray-400 mb-1">KEY FEATURES:</Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400 mb-1">• Instant calculations (under 1ms)</Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">• Respects priority constraints (star items first)</Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">• Maintains your designated starting point</Text>
              </View>
            </BlurView>
          </View>

          {/* Database Specs */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-white/20 dark:border-white/5 shadow-md">
            <BlurView intensity={35} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center space-x-3 mb-3">
                <View className="p-2 rounded-xl bg-emerald-500/20">
                  <Database color="#10B981" size={20} />
                </View>
                <Text className="text-lg font-black text-gray-900 dark:text-white">
                  Cross-Platform Storage
                </Text>
              </View>
              <Text className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Seamless data persistence across platforms. Uses high-performance native SQLite database on iOS and Android devices, and transitions to HTML5 LocalStorage inside web browsers.
              </Text>
            </BlurView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
