import i18n from "i18next";
import {
  Check,
  MapPin,
  Star,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  Sparkles,
  Navigation,
  ListTodo,
  RefreshCw,
  X,
  Info
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  useColorScheme
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";

import { AddressEntry } from "@/src/components/AddressEntry";
import { useAppDatabase } from "@/src/db/database";
import {
  optimizeRoute,
  prepareTmapPayload,
  updateStopsOrder,
} from "@/src/services/tmap";
import { Stop } from "@/src/types/routes";

export default function TabOneScreen() {
  const db = useAppDatabase();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [stops, setStops] = useState<Stop[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStops = useCallback(async () => {
    try {
      const result = await db.getAllAsync<Stop>(
        "SELECT * FROM stops ORDER BY display_order",
      );
      // Map database integers back to booleans if needed
      const formattedStops = result.map((stop: any) => ({
        ...stop,
        is_important: Boolean(stop.is_important),
        is_completed: Boolean(stop.is_completed),
        is_start: Boolean(stop.is_start),
      }));
      setStops(formattedStops);
    } catch (err) {
      console.error("Failed to load stops:", err);
    }
  }, [db]);

  useEffect(() => {
    loadStops();
  }, [loadStops]);

  const addStop = async (
    address: string,
    nickname: string,
    lat: number,
    lng: number,
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const maxOrder =
      stops.length > 0 ? Math.max(...stops.map((s) => s.display_order)) : 0;
    
    // SQLite uses 0 or 1 for booleans
    const isImportantVal = 0;
    const isCompletedVal = 0;
    const isStartVal = stops.length === 0 ? 1 : 0; // Set first stop as start by default

    await db.runAsync(
      "INSERT INTO stops (id, address, nickname, lat, lng, display_order, is_important, is_completed, is_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, address, nickname || null, lat, lng, maxOrder + 1, isImportantVal, isCompletedVal, isStartVal],
    );
    loadStops();
    showToast(`${nickname || address} added!`, "success");
  };

  const updateStop = async (id: string, field: string, value: any) => {
    // SQLite expects 0/1 for booleans
    const dbValue = typeof value === "boolean" ? (value ? 1 : 0) : value;
    await db.runAsync(`UPDATE stops SET ${field} = ? WHERE id = ?`, [
      dbValue,
      id,
    ]);
    loadStops();
  };

  const setStartPoint = async (id: string) => {
    console.log("📍 Setting start point to:", id);
    await db.runAsync("UPDATE stops SET is_start = 0");
    await db.runAsync("UPDATE stops SET is_start = 1 WHERE id = ?", [id]);
    await loadStops();
    
    showToast("Starting point updated", "info");
    
    // Auto-optimize route with new starting point
    console.log("🚀 Auto-optimizing route with new start point...");
    setTimeout(() => {
      handleOptimizeAuto();
    }, 500);
  };

  const deleteStop = async (id: string) => {
    const stopToDelete = stops.find(s => s.id === id);
    await db.runAsync("DELETE FROM stops WHERE id = ?", [id]);
    await loadStops();
    showToast(
      `${stopToDelete?.nickname || stopToDelete?.address || "Stop"} deleted`,
      "info"
    );
  };

  const clearAllStops = async () => {
    const confirmClear = () => {
      Alert.alert(
        t("clearAll"),
        t("clearConfirm"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("yes"),
            style: "destructive",
            onPress: async () => {
              await db.runAsync("DELETE FROM stops");
              loadStops();
              showToast("All stops cleared", "info");
            },
          },
        ]
      );
    };

    if (Platform.OS === "web") {
      if (confirm(t("clearConfirm"))) {
        await db.runAsync("DELETE FROM stops");
        loadStops();
        showToast("All stops cleared", "info");
      }
    } else {
      confirmClear();
    }
  };

  const runOfflineSimulation = async (currentStops: Stop[]) => {
    if (currentStops.length < 2) return;

    let startStop = currentStops.find((s) => s.is_start);
    if (!startStop) {
      startStop = currentStops[0];
    }

    const others = currentStops.filter((s) => s.id !== startStop!.id);
    const priorityStops = others.filter((s) => s.is_important);
    const regularStops = others.filter((s) => !s.is_important);

    const ordered: Stop[] = [startStop];
    let current = startStop;

    // Nearest neighbor for priority stops
    let tempPriority = [...priorityStops];
    while (tempPriority.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < tempPriority.length; i++) {
        const dist =
          Math.pow(tempPriority[i].lat - current.lat, 2) +
          Math.pow(tempPriority[i].lng - current.lng, 2);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }
      current = tempPriority[nearestIdx];
      ordered.push(current);
      tempPriority.splice(nearestIdx, 1);
    }

    // Nearest neighbor for regular stops
    let tempRegular = [...regularStops];
    while (tempRegular.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;
      for (let i = 0; i < tempRegular.length; i++) {
        const dist =
          Math.pow(tempRegular[i].lat - current.lat, 2) +
          Math.pow(tempRegular[i].lng - current.lng, 2);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }
      current = tempRegular[nearestIdx];
      ordered.push(current);
      tempRegular.splice(nearestIdx, 1);
    }

    // Update display_order in SQLite/mock db
    for (let i = 0; i < ordered.length; i++) {
      await db.runAsync("UPDATE stops SET display_order = ? WHERE id = ?", [
        i,
        ordered[i].id,
      ]);
    }

    await loadStops();
  };

  const handleOptimizeAuto = async () => {
    console.log("🎯 Auto-optimize called");
    try {
      const currentStops = await db.getAllAsync<Stop>(
        "SELECT * FROM stops ORDER BY display_order",
      );

      const payload = await prepareTmapPayload(db);
      if (payload.stops.length < 2) return;

      try {
        const result = await optimizeRoute(payload);
        await updateStopsOrder(db, result, currentStops);
        await loadStops();
      } catch (innerError) {
        // Fallback to offline simulation automatically
        console.warn("⚠️ API Optimization failed. Using offline simulation:", innerError);
        await runOfflineSimulation(currentStops);
      }
    } catch (error) {
      console.error("💥 Auto-optimization failed:", error);
    }
  };

  const handleOptimize = async () => {
    console.log("🎯 Manual optimize button pressed");
    if (stops.length < 2) {
      Alert.alert(t("error"), "Please add at least 2 addresses first.");
      return;
    }

    setIsOptimizing(true);
    try {
      const currentStops = await db.getAllAsync<Stop>(
        "SELECT * FROM stops ORDER BY display_order",
      );

      const payload = await prepareTmapPayload(db);

      try {
        const result = await optimizeRoute(payload);
        await updateStopsOrder(db, result, currentStops);
        await loadStops();
        showToast("Route optimized via Tmap!", "success");
      } catch (apiError: any) {
        console.log("API optimization failed, falling back to offline simulation:", apiError.message);
        
        // Run simulated offline optimization
        await runOfflineSimulation(currentStops);
        showToast(t("simulationSuccess"), "success");
      }
    } catch (error: any) {
      console.error("💥 Optimization failed:", error);
      Alert.alert(t("error"), String(error));
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleLanguageSwitch = () => {
    const newLang = i18n.language === "en" ? "ko" : "en";
    i18n.changeLanguage(newLang);
    showToast(`Language set to ${newLang === "en" ? "English" : "한국어"}`, "info");
  };

  const onDragEnd = async ({ data }: { data: Stop[] }) => {
    setStops(data);
    for (let i = 0; i < data.length; i++) {
      await db.runAsync("UPDATE stops SET display_order = ? WHERE id = ?", [
        i,
        data[i].id,
      ]);
    }
    showToast("Route reordered manually", "info");
  };

  const moveStopWeb = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= stops.length) return;
    const reordered = [...stops];
    const [removed] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, removed);
    setStops(reordered);

    for (let i = 0; i < reordered.length; i++) {
      await db.runAsync("UPDATE stops SET display_order = ? WHERE id = ?", [
        i,
        reordered[i].id,
      ]);
    }
    showToast("Route reordered", "info");
  };

  const renderStopItem = (item: Stop, index: number, drag?: () => void, isActive?: boolean) => {
    const isCompleted = item.is_completed;
    const isStart = item.is_start;
    const isImportant = item.is_important;

    return (
      <View
        className={`mb-3 overflow-hidden rounded-2xl border ${
          isActive
            ? "border-blue-500 bg-blue-500/10"
            : isCompleted
              ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5"
              : "border-white/20 dark:border-white/10 bg-white/45 dark:bg-slate-900/40"
        }`}
      >
        <BlurView
          intensity={isActive ? 85 : 45}
          tint={isDark ? "dark" : "light"}
          className="p-4 flex-row items-center justify-between"
        >
          {/* Drag Handle (Mobile) / Order Buttons (Web) */}
          <View className="flex-row items-center mr-3">
            {Platform.OS === "web" ? (
              <View className="flex-col items-center mr-2">
                <TouchableOpacity
                  onPress={() => moveStopWeb(index, index - 1)}
                  disabled={index === 0}
                  className={`p-1 rounded-md mb-1 ${index === 0 ? "opacity-30" : "hover:bg-white/20"}`}
                >
                  <ArrowUp color={isDark ? "#FFF" : "#000"} size={14} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveStopWeb(index, index + 1)}
                  disabled={index === stops.length - 1}
                  className={`p-1 rounded-md ${index === stops.length - 1 ? "opacity-30" : "hover:bg-white/20"}`}
                >
                  <ArrowDown color={isDark ? "#FFF" : "#000"} size={14} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onLongPress={drag} className="p-2 mr-1 active:scale-95">
                <View className="w-4 h-6 flex-row flex-wrap justify-between content-between">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full m-[1px]" />
                  ))}
                </View>
              </TouchableOpacity>
            )}

            {/* Badge Order number */}
            <View className={`w-6 h-6 rounded-full flex items-center justify-center ${isStart ? "bg-blue-600" : isCompleted ? "bg-emerald-600" : "bg-black/10 dark:bg-white/20"}`}>
              <Text className="text-white text-xs font-bold">{index + 1}</Text>
            </View>
          </View>

          {/* Info Section */}
          <View className="flex-1 pr-2">
            <TextInput
              value={item.nickname || item.address}
              onChangeText={(text) => updateStop(item.id, "nickname", text)}
              className={`text-base font-bold ${
                isCompleted
                  ? "text-gray-400 dark:text-gray-500 line-through"
                  : "text-gray-900 dark:text-white"
              }`}
              placeholder={t("nickname")}
              placeholderTextColor="#9CA3AF"
            />
            <Text
              numberOfLines={1}
              className={`text-xs ${
                isCompleted
                  ? "text-gray-400/80 dark:text-gray-500/80"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {item.address}
            </Text>

            {/* Badges */}
            <View className="flex-row items-center gap-2 mt-1.5">
              {isImportant && (
                <View className="flex-row items-center px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/25">
                  <Star fill="#EAB308" color="#EAB308" size={10} />
                  <Text className="text-[10px] text-yellow-700 dark:text-yellow-400 ml-1 font-bold">
                    {t("priority")}
                  </Text>
                </View>
              )}
              {isStart && (
                <View className="flex-row items-center px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25">
                  <MapPin color="#3B82F6" size={10} />
                  <Text className="text-[10px] text-blue-700 dark:text-blue-400 ml-1 font-bold">
                    {t("startPoint")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Button Operations */}
          <View className="flex-row items-center space-x-1">
            <TouchableOpacity
              onPress={() => setStartPoint(item.id)}
              className={`p-2 rounded-xl border ${
                isStart
                  ? "border-blue-500 bg-blue-500/15"
                  : "border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5"
              }`}
            >
              <MapPin color={isStart ? "#3B82F6" : isDark ? "#A1A1AA" : "#71717A"} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => updateStop(item.id, "is_important", !isImportant)}
              className={`p-2 rounded-xl border ${
                isImportant
                  ? "border-yellow-500 bg-yellow-500/15"
                  : "border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5"
              }`}
            >
              <Star
                fill={isImportant ? "#EAB308" : "none"}
                color={isImportant ? "#EAB308" : isDark ? "#A1A1AA" : "#71717A"}
                size={16}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => updateStop(item.id, "is_completed", !isCompleted)}
              className={`p-2 rounded-xl border ${
                isCompleted
                  ? "border-emerald-500 bg-emerald-500/15"
                  : "border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5"
              }`}
            >
              <Check color={isCompleted ? "#10B981" : isDark ? "#A1A1AA" : "#71717A"} size={16} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deleteStop(item.id)}
              className="p-2 rounded-xl border border-red-500/20 bg-red-500/10"
            >
              <Trash2 color="#EF4444" size={16} />
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    );
  };

  const renderDraggableItem = ({ item, drag, isActive }: any) => {
    const index = stops.findIndex((s) => s.id === item.id);
    return renderStopItem(item, index, drag, isActive);
  };

  return (
    <View className="flex-1 relative bg-slate-100 dark:bg-slate-950">
      {/* Background glowing orbs */}
      <View style={StyleSheet.absoluteFill}>
        <View className="absolute top-[-50px] left-[-50px] w-80 h-80 rounded-full bg-blue-500/15 dark:bg-blue-600/10" />
        <View className="absolute top-[280px] right-[-100px] w-96 h-96 rounded-full bg-fuchsia-500/15 dark:bg-purple-600/10" />
        <View className="absolute bottom-[50px] left-[-80px] w-80 h-80 rounded-full bg-cyan-400/15 dark:bg-indigo-600/10" />
      </View>

      {/* Global Toast Notification */}
      {toast && (
        <View className="absolute top-12 left-4 right-4 z-50 rounded-2xl overflow-hidden border border-white/20 dark:border-white/5 shadow-2xl">
          <BlurView intensity={90} tint={isDark ? "dark" : "light"} className="px-4 py-3 flex-row items-center space-x-3 bg-white/70 dark:bg-slate-900/80">
            {toast.type === "success" && (
              <View className="bg-emerald-500/20 p-1.5 rounded-lg">
                <Check color="#10B981" size={16} />
              </View>
            )}
            {toast.type === "info" && (
              <View className="bg-blue-500/20 p-1.5 rounded-lg">
                <Sparkles color="#3B82F6" size={16} />
              </View>
            )}
            {toast.type === "error" && (
              <View className="bg-red-500/20 p-1.5 rounded-lg">
                <X color="#EF4444" size={16} />
              </View>
            )}
            <Text className="text-gray-900 dark:text-white font-semibold flex-1 text-sm">{toast.message}</Text>
          </BlurView>
        </View>
      )}

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header Panel */}
          <View className="overflow-hidden border-b border-black/5 dark:border-white/10">
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} className="px-6 py-4 flex-row items-center justify-between">
              <View className="flex-row items-center space-x-2.5">
                <View className="bg-blue-600 p-2 rounded-xl shadow-lg">
                  <Navigation color="white" size={20} />
                </View>
                <View>
                  <Text className="text-xl font-black text-gray-900 dark:text-white leading-none">
                    RouteMaster
                  </Text>
                  <Text className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    Apple Frosted Glass Theme
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-center space-x-2">
                {/* Clear DB Button */}
                {stops.length > 0 && (
                  <TouchableOpacity
                    onPress={clearAllStops}
                    className="p-2.5 rounded-xl border border-red-500/10 bg-red-500/5 active:bg-red-500/20"
                    title={t("clearAll")}
                  >
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                )}

                {/* Language Switch */}
                <TouchableOpacity
                  onPress={handleLanguageSwitch}
                  className="px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/10 dark:bg-black/10 flex-row items-center space-x-1.5 active:bg-white/20"
                >
                  <Globe color={isDark ? "#FFF" : "#000"} size={14} />
                  <Text className="text-xs font-bold text-gray-900 dark:text-white">
                    {i18n.language === "en" ? "한" : "EN"}
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

          {/* Main Content Scroll View */}
          <ScrollView
            className="flex-1 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Optimize Route Big Button */}
            <View className="mb-5 overflow-hidden rounded-3xl border border-white/20 dark:border-white/5">
              <BlurView intensity={40} tint={isDark ? "dark" : "light"} className="p-4 bg-white/30 dark:bg-slate-900/30">
                <TouchableOpacity
                  onPress={handleOptimize}
                  disabled={stops.length < 2 || isOptimizing}
                  className={`w-full py-4 rounded-2xl shadow-xl flex-row items-center justify-center space-x-2 ${
                    stops.length < 2
                      ? "bg-black/10 dark:bg-white/5 opacity-60"
                      : "bg-blue-600 active:bg-blue-700"
                  }`}
                >
                  {isOptimizing ? (
                    <RefreshCw color="white" className="animate-spin" size={20} />
                  ) : (
                    <Sparkles color="white" size={20} />
                  )}
                  <Text className="text-white text-lg font-black text-center">
                    {stops.length < 2 ? t("optimize") : `${t("optimize")} (${stops.length})`}
                  </Text>
                </TouchableOpacity>
                
                {stops.length < 2 ? (
                  <View className="flex-row items-center justify-center mt-2.5 space-x-1.5">
                    <Info color="#6B7280" size={12} />
                    <Text className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Add at least 2 stops to optimize
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[10px] text-center text-gray-500 dark:text-gray-400 mt-2 font-medium">
                    {Platform.OS === "web" ? t("webReorder") : t("dragToReorder")}
                  </Text>
                )}
              </BlurView>
            </View>

            {/* Add Stop Card */}
            <View className="mb-6 overflow-hidden rounded-3xl border border-white/30 dark:border-white/10 shadow-lg">
              <BlurView intensity={35} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
                <View className="flex-row items-center space-x-2 mb-4">
                  <ListTodo color={isDark ? "#93C5FD" : "#2563EB"} size={18} />
                  <Text className="text-lg font-black text-gray-900 dark:text-white">
                    {t("addStop")}
                  </Text>
                </View>
                <AddressEntry onSave={addStop} />
              </BlurView>
            </View>

            {/* Stops List */}
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-3.5 px-1">
                <Text className="text-lg font-black text-gray-900 dark:text-white">
                  {t("stopsList")} ({stops.length})
                </Text>
                {stops.length > 0 && !process.env.EXPO_PUBLIC_TMAP_API_KEY && (
                  <View className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25">
                    <Text className="text-[9px] font-bold text-amber-700 dark:text-amber-400">
                      {t("simulationMode")}
                    </Text>
                  </View>
                )}
              </View>

              {stops.length === 0 ? (
                <View className="overflow-hidden rounded-3xl border border-white/20 dark:border-white/5 shadow-md">
                  <BlurView intensity={25} tint={isDark ? "dark" : "light"} className="p-8 items-center bg-white/25 dark:bg-slate-900/20">
                    <View className="p-4 bg-black/5 dark:bg-white/5 rounded-full mb-3">
                      <MapPin color={isDark ? "#9CA3AF" : "#6B7280"} size={28} />
                    </View>
                    <Text className="text-gray-800 dark:text-gray-200 font-bold text-base text-center">
                      {t("noStops")}
                    </Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-sm text-center mt-1">
                      {t("addFirstStop")}
                    </Text>
                  </BlurView>
                </View>
              ) : Platform.OS === "web" ? (
                <View className="space-y-1">
                  {stops.map((stop, index) => renderStopItem(stop, index))}
                </View>
              ) : (
                <View style={{ minHeight: 300 }}>
                  <DraggableFlatList
                    data={stops}
                    renderItem={renderDraggableItem}
                    keyExtractor={(item) => item.id}
                    onDragEnd={onDragEnd}
                    scrollEnabled={false} // Let parent ScrollView do the scrolling
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <StatusBar style="auto" />
    </View>
  );
}
