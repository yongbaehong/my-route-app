import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme
} from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import {
  Settings,
  Key,
  Database,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X
} from "lucide-react-native";

import { useAppDatabase } from "@/src/db/database";
import { Stop } from "@/src/types/routes";

export default function ModalScreen() {
  const router = useRouter();
  const db = useAppDatabase();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [stopsCount, setStopsCount] = useState(0);
  const apiKey = process.env.EXPO_PUBLIC_TMAP_API_KEY;
  const isKeyAvailable = Boolean(apiKey && apiKey.length > 0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await db.getAllAsync<Stop>("SELECT * FROM stops");
        setStopsCount(result.length);
      } catch (err) {
        console.log("Failed to fetch stops for stats:", err);
      }
    };
    fetchStats();
  }, [db]);

  return (
    <View className="flex-1 relative bg-slate-100 dark:bg-slate-950">
      {/* Background glowing orbs */}
      <View style={StyleSheet.absoluteFill}>
        <View className="absolute top-[50px] left-[-30px] w-72 h-72 rounded-full bg-blue-500/10 dark:bg-blue-600/5" />
        <View className="absolute bottom-[50px] right-[-30px] w-72 h-72 rounded-full bg-emerald-500/10 dark:bg-emerald-600/5" />
      </View>

      {/* Main container */}
      <View className="flex-1 p-5 justify-between">
        <ScrollView className="flex-1 mt-4" showsVerticalScrollIndicator={false}>
          {/* Header Panel */}
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-row items-center space-x-3">
              <View className="bg-blue-600 p-2.5 rounded-2xl shadow-lg">
                <Settings color="white" size={22} />
              </View>
              <Text className="text-2xl font-black text-gray-900 dark:text-white">
                Diagnostics
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-2.5 rounded-full border border-black/10 dark:border-white/10 bg-white/10 dark:bg-black/10 active:scale-95"
            >
              <X color={isDark ? "#FFF" : "#000"} size={16} />
            </TouchableOpacity>
          </View>

          {/* Card 1: API Configuration Status */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-white/20 dark:border-white/5 shadow-md">
            <BlurView intensity={35} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center space-x-2.5">
                  <Key color={isDark ? "#93C5FD" : "#2563EB"} size={20} />
                  <Text className="text-base font-black text-gray-900 dark:text-white">
                    Tmap API Configuration
                  </Text>
                </View>
                {isKeyAvailable ? (
                  <View className="flex-row items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25">
                    <CheckCircle2 color="#10B981" size={12} />
                    <Text className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">ACTIVE</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center space-x-1 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25">
                    <XCircle color="#EF4444" size={12} />
                    <Text className="text-[10px] font-extrabold text-red-700 dark:text-red-400">INACTIVE</Text>
                  </View>
                )}
              </View>

              <Text className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                {isKeyAvailable
                  ? `API key loaded successfully: ${apiKey!.substring(0, 5)}***${apiKey!.substring(apiKey!.length - 4)}`
                  : "No Tmap API Key found in env variables. The app is running in local offline Simulation Mode."}
              </Text>

              {!isKeyAvailable && (
                <View className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                  <View className="flex-row items-center space-x-1.5 mb-1.5">
                    <HelpCircle color="#D946EF" size={14} />
                    <Text className="text-xs font-black text-gray-900 dark:text-white">To Enable Live Routing:</Text>
                  </View>
                  <Text className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                    Create a file named <Text className="font-mono font-bold">.env</Text> in your project root and add:{"\n"}
                    <Text className="font-mono font-bold text-blue-600 dark:text-blue-400">EXPO_PUBLIC_TMAP_API_KEY=your_key</Text>
                  </Text>
                </View>
              )}
            </BlurView>
          </View>

          {/* Card 2: Database persistently */}
          <View className="mb-5 overflow-hidden rounded-3xl border border-white/20 dark:border-white/5 shadow-md">
            <BlurView intensity={35} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
              <View className="flex-row items-center space-x-2.5 mb-3">
                <Database color={isDark ? "#34D399" : "#059669"} size={20} />
                <Text className="text-base font-black text-gray-900 dark:text-white">
                  Database Persistence
                </Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-black/5 dark:border-white/5">
                <Text className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Engine</Text>
                <Text className="text-xs text-gray-900 dark:text-white font-bold">
                  {Platform.OS === "web" ? "HTML5 LocalStorage" : "SQLite Database"}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-black/5 dark:border-white/5">
                <Text className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Stops Persistence</Text>
                <Text className="text-xs text-gray-900 dark:text-white font-bold">{stopsCount} stops cached</Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Current Platform</Text>
                <Text className="text-xs text-gray-900 dark:text-white font-bold capitalize">{Platform.OS}</Text>
              </View>
            </BlurView>
          </View>
        </ScrollView>

        {/* Close Modal footer Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-full py-4 rounded-2xl bg-blue-600 active:bg-blue-700 shadow-xl mb-4"
        >
          <Text className="text-white text-center font-black text-base">
            Done
          </Text>
        </TouchableOpacity>
      </View>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}
