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
  Server,
  Database,
  Cpu,
  CheckCircle2
} from "lucide-react-native";

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-1 relative bg-slate-50 dark:bg-[#07090e]">
      {/* Background glowing orbs */}
      <View style={StyleSheet.absoluteFill}>
        <View className="absolute top-[80px] right-[-100px] w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-600/5 blur-3xl" />
        <View className="absolute bottom-[100px] left-[-100px] w-96 h-96 rounded-full bg-fuchsia-500/10 dark:bg-purple-600/5 blur-3xl" />
      </View>

      <SafeAreaView className="flex-1">
        <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 110 }}>
          {/* Hero Section */}
          <View className="items-center mb-8 mt-4">
            <View className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-4 rounded-[26px] shadow-xl shadow-indigo-500/20">
              <Navigation color="white" size={32} strokeWidth={2.5} />
            </View>
            <Text className="text-2xl font-black tracking-tight text-slate-955 dark:text-white text-center mt-4">
              Optimization Engines
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-1.5 max-w-xs font-medium leading-relaxed">
              Understand how RouteMaster plans and arranges your stops.
            </Text>
          </View>

          {/* Engine 1: Tmap API */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center space-x-3 mb-3.5">
                <View className="p-2.5 rounded-xl bg-indigo-500/10">
                  <Server color={isDark ? "#818cf8" : "#4f46e5"} size={20} strokeWidth={2.5} />
                </View>
                <Text className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                  Tmap API Routing (Online)
                </Text>
              </View>
              <Text className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 font-medium">
                Utilizes the SK Telecom Tmap optimization engine to calculate precise routes based on actual traffic, road conditions, and geographical constraints in South Korea.
              </Text>
              <View className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
                <Text className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 mb-2.5 uppercase tracking-wider">KEY BENEFITS</Text>
                <View className="space-y-2">
                  <View className="flex-row items-center space-x-2">
                    <CheckCircle2 color="#10b981" size={13} strokeWidth={3} />
                    <Text className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Live traffic data integration</Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <CheckCircle2 color="#10b981" size={13} strokeWidth={3} />
                    <Text className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Accurate turn-by-turn waypoint ordering</Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <CheckCircle2 color="#10b981" size={13} strokeWidth={3} />
                    <Text className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Dynamic distance calculations</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Engine 2: Simulation Mode */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center space-x-3 mb-3.5">
                <View className="p-2.5 rounded-xl bg-fuchsia-500/10">
                  <Cpu color={isDark ? "#f472b6" : "#d946ef"} size={20} strokeWidth={2.5} />
                </View>
                <Text className="text-lg font-black tracking-tight text-slate-955 dark:text-white">
                  Offline Simulation Heuristic
                </Text>
              </View>
              <Text className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 font-medium">
                Runs a local nearest-neighbor TSP solver (Traveling Salesperson Problem) directly on your device. Activates automatically if the Tmap API key is missing or offline.
              </Text>
              <View className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/30">
                <Text className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 mb-2.5 uppercase tracking-wider">KEY FEATURES</Text>
                <View className="space-y-2">
                  <View className="flex-row items-center space-x-2">
                    <CheckCircle2 color="#10b981" size={13} strokeWidth={3} />
                    <Text className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Instant calculations (under 1ms)</Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <CheckCircle2 color="#10b981" size={13} strokeWidth={3} />
                    <Text className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Respects priority constraints (star items first)</Text>
                  </View>
                  <View className="flex-row items-center space-x-2">
                    <CheckCircle2 color="#10b981" size={13} strokeWidth={3} />
                    <Text className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Maintains designated starting point</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </View>

          {/* Database Specs */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center space-x-3 mb-3.5">
                <View className="p-2.5 rounded-xl bg-emerald-500/10">
                  <Database color={isDark ? "#34d399" : "#10b981"} size={20} strokeWidth={2.5} />
                </View>
                <Text className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                  Cross-Platform Storage
                </Text>
              </View>
              <Text className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Seamless data persistence across platforms. Uses high-performance native SQLite database on iOS and Android devices, and transitions to HTML5 LocalStorage inside web browsers.
              </Text>
            </BlurView>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
