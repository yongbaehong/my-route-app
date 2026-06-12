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
        className={`mb-3.5 overflow-hidden rounded-3xl border ${
          isActive
            ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
            : isCompleted
              ? "border-emerald-500/10 bg-white/40 dark:bg-slate-900/30"
              : "border-slate-200/50 dark:border-slate-800/40 bg-white/70 dark:bg-slate-900/60"
        }`}
      >
        <BlurView
          intensity={isActive ? 80 : 35}
          tint={isDark ? "dark" : "light"}
          className="p-4 flex-row items-center justify-between"
        >
          {/* 1. Drag / Order Controls */}
          <View className="flex-row items-center mr-2">
            {Platform.OS === "web" ? (
              <View className="flex-col items-center mr-1">
                <TouchableOpacity
                  onPress={() => moveStopWeb(index, index - 1)}
                  disabled={index === 0}
                  className={`p-1 rounded-lg mb-0.5 ${index === 0 ? "opacity-20" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"}`}
                >
                  <ArrowUp color={isDark ? "#94a3b8" : "#64748b"} size={13} strokeWidth={2.5} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveStopWeb(index, index + 1)}
                  disabled={index === stops.length - 1}
                  className={`p-1 rounded-lg ${index === stops.length - 1 ? "opacity-20" : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"}`}
                >
                  <ArrowDown color={isDark ? "#94a3b8" : "#64748b"} size={13} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onLongPress={drag} className="p-2 mr-1 active:scale-90 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
                <View className="w-3.5 h-5 flex-row flex-wrap justify-between content-between">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} className="w-[3px] h-[3px] bg-slate-400 dark:bg-slate-500 rounded-full m-[1px]" />
                  ))}
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* 2. Connected Timeline Node */}
          <View className="w-9 items-center justify-center relative self-stretch mr-2">
            {/* Line segment */}
            {stops.length > 1 && (
              <View
                className={`absolute w-[2px] bg-slate-200 dark:bg-slate-800 ${
                  index === 0
                    ? "top-1/2 bottom-0"
                    : index === stops.length - 1
                    ? "top-0 bottom-1/2"
                    : "top-0 bottom-0"
                }`}
              />
            )}
            {/* Circular node */}
            <View
              className={`w-7 h-7 rounded-full items-center justify-center border-2 ${
                isStart
                  ? "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-500/25"
                  : isCompleted
                  ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/10"
                  : isImportant
                  ? "bg-amber-400 border-amber-400 shadow-sm shadow-amber-400/10"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              }`}
            >
              {isStart ? (
                <Navigation size={12} color="#fff" strokeWidth={3} />
              ) : isCompleted ? (
                <Check size={11} color="#fff" strokeWidth={3} />
              ) : isImportant ? (
                <Star size={11} color="#fff" fill="#fff" />
              ) : (
                <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{index + 1}</Text>
              )}
            </View>
          </View>

          {/* 3. Info Content */}
          <View className="flex-1 pr-2">
            <TextInput
              value={item.nickname || item.address}
              onChangeText={(text) => updateStop(item.id, "nickname", text)}
              className={`text-base font-bold tracking-tight p-0 ${
                isCompleted
                  ? "text-slate-400 dark:text-slate-600 line-through"
                  : "text-slate-900 dark:text-white"
              }`}
              placeholder={t("nickname")}
              placeholderTextColor="#94a3b8"
            />
            <Text
              numberOfLines={1}
              className={`text-xs mt-0.5 ${
                isCompleted
                  ? "text-slate-400/70 dark:text-slate-600/75"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {item.address}
            </Text>

            {/* Badges */}
            {(isImportant || isStart) && (
              <View className="flex-row items-center gap-1.5 mt-2">
                {isStart && (
                  <View className="flex-row items-center px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    <MapPin color={isDark ? "#818cf8" : "#4f46e5"} size={9} strokeWidth={2.5} />
                    <Text className="text-[9px] text-indigo-700 dark:text-indigo-300 ml-1 font-extrabold tracking-wide uppercase">
                      {t("startPoint")}
                    </Text>
                  </View>
                )}
                {isImportant && (
                  <View className="flex-row items-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Star fill="#eab308" color="#eab308" size={9} />
                    <Text className="text-[9px] text-amber-700 dark:text-amber-400 ml-1 font-extrabold tracking-wide uppercase">
                      {t("priority")}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 4. Action Controls */}
          <View className="flex-row items-center space-x-1">
            <TouchableOpacity
              onPress={() => setStartPoint(item.id)}
              className={`p-2 rounded-xl border ${
                isStart
                  ? "border-indigo-500 bg-indigo-500/15"
                  : "border-slate-200/50 dark:border-slate-800/40 bg-slate-100/70 dark:bg-slate-800/50"
              } active:scale-95`}
            >
              <MapPin color={isStart ? "#4f46e5" : isDark ? "#94a3b8" : "#64748b"} size={15} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => updateStop(item.id, "is_important", !isImportant)}
              className={`p-2 rounded-xl border ${
                isImportant
                  ? "border-amber-500 bg-amber-500/15"
                  : "border-slate-200/50 dark:border-slate-800/40 bg-slate-100/70 dark:bg-slate-800/50"
              } active:scale-95`}
            >
              <Star
                fill={isImportant ? "#eab308" : "none"}
                color={isImportant ? "#eab308" : isDark ? "#94a3b8" : "#64748b"}
                size={15}
                strokeWidth={2.5}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => updateStop(item.id, "is_completed", !isCompleted)}
              className={`p-2 rounded-xl border ${
                isCompleted
                  ? "border-emerald-500 bg-emerald-500/15"
                  : "border-slate-200/50 dark:border-slate-800/40 bg-slate-100/70 dark:bg-slate-800/50"
              } active:scale-95`}
            >
              <Check color={isCompleted ? "#10b981" : isDark ? "#94a3b8" : "#64748b"} size={15} strokeWidth={2.5} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => deleteStop(item.id)}
              className="p-2 rounded-xl border border-red-500/10 bg-red-500/5 dark:bg-red-500/10 active:scale-95"
            >
              <Trash2 color="#ef4444" size={15} strokeWidth={2.5} />
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
    <View className="flex-1 relative bg-slate-50 dark:bg-[#07090e]">
      {/* Background glowing orbs */}
      <View style={StyleSheet.absoluteFill}>
        <View className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-600/5 blur-3xl" />
        <View className="absolute top-[250px] right-[-150px] w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 dark:bg-purple-600/5 blur-3xl" />
        <View className="absolute bottom-[-100px] left-[-100px] w-96 h-96 rounded-full bg-cyan-500/10 dark:bg-blue-600/5 blur-3xl" />
      </View>

      {/* Global Toast Notification */}
      {toast && (
        <View className="absolute top-14 left-4 right-4 z-50 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800/40 shadow-xl">
          <BlurView intensity={90} tint={isDark ? "dark" : "light"} className="px-5 py-2.5 flex-row items-center space-x-3 bg-white/70 dark:bg-slate-900/80">
            {toast.type === "success" && (
              <View className="bg-emerald-500/20 p-1 rounded-full">
                <Check color="#10B981" size={14} strokeWidth={3} />
              </View>
            )}
            {toast.type === "info" && (
              <View className="bg-indigo-500/20 p-1 rounded-full">
                <Sparkles color="#6366f1" size={14} strokeWidth={2.5} />
              </View>
            )}
            {toast.type === "error" && (
              <View className="bg-red-500/20 p-1 rounded-full">
                <X color="#EF4444" size={14} strokeWidth={3} />
              </View>
            )}
            <Text className="text-slate-800 dark:text-slate-200 font-bold flex-1 text-xs">{toast.message}</Text>
          </BlurView>
        </View>
      )}

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          {/* Header Panel */}
          <View className="overflow-hidden border-b border-slate-200/50 dark:border-slate-800/40">
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} className="px-6 py-4 flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3">
                <View className="bg-gradient-to-tr from-indigo-600 to-violet-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
                  <Navigation color="white" size={18} strokeWidth={2.5} />
                </View>
                <View>
                  <Text className="text-xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-none">
                    RouteMaster
                  </Text>
                  <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                    Logistics Planner
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-center space-x-2">
                {/* Clear DB Button */}
                {stops.length > 0 && (
                  <TouchableOpacity
                    onPress={clearAllStops}
                    className="p-2.5 rounded-xl border border-red-500/10 bg-red-500/5 dark:bg-red-500/10 active:scale-95"
                  >
                    <Trash2 color="#ef4444" size={15} strokeWidth={2.5} />
                  </TouchableOpacity>
                )}

                {/* Language Switch */}
                <TouchableOpacity
                  onPress={handleLanguageSwitch}
                  className="px-3 py-2 rounded-xl border border-slate-200/50 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/40 flex-row items-center space-x-1 active:scale-95"
                >
                  <Globe color={isDark ? "#94a3b8" : "#64748b"} size={13} strokeWidth={2.5} />
                  <Text className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                    {i18n.language === "en" ? "한" : "EN"}
                  </Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>

          {/* Main Content Scroll View */}
          <ScrollView
            className="flex-1 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: 110 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Optimize Route Big Button */}
            <View className="mb-5 overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
              <BlurView intensity={35} tint={isDark ? "dark" : "light"} className="p-4 bg-white/40 dark:bg-slate-900/40">
                <TouchableOpacity
                  onPress={handleOptimize}
                  disabled={stops.length < 2 || isOptimizing}
                  className={`w-full py-4 rounded-2xl flex-row items-center justify-center space-x-2 active:scale-[0.98] ${
                    stops.length < 2
                      ? "bg-slate-200 dark:bg-slate-800/60 opacity-50"
                      : "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25"
                  }`}
                >
                  {isOptimizing ? (
                    <RefreshCw color="white" className="animate-spin" size={18} strokeWidth={2.5} />
                  ) : (
                    <Sparkles color="white" size={18} strokeWidth={2.5} />
                  )}
                  <Text className="text-white text-base font-black tracking-tight text-center">
                    {stops.length < 2 ? t("optimize") : `${t("optimize")} (${stops.length})`}
                  </Text>
                </TouchableOpacity>
                
                {stops.length < 2 ? (
                  <View className="flex-row items-center justify-center mt-2.5 space-x-1">
                    <Info color={isDark ? "#64748b" : "#94a3b8"} size={11} />
                    <Text className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                      Add at least 2 stops to optimize
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2 font-medium">
                    {Platform.OS === "web" ? t("webReorder") : t("dragToReorder")}
                  </Text>
                )}
              </BlurView>
            </View>

            {/* Add Stop Card */}
            <View className="mb-6 overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
              <BlurView intensity={30} tint={isDark ? "dark" : "light"} className="p-5 bg-white/40 dark:bg-slate-900/40">
                <View className="flex-row items-center space-x-2 mb-4">
                  <View className="bg-indigo-500/10 p-1.5 rounded-lg">
                    <ListTodo color={isDark ? "#818cf8" : "#4f46e5"} size={16} strokeWidth={2.5} />
                  </View>
                  <Text className="text-lg font-black tracking-tight text-slate-955 dark:text-white">
                    {t("addStop")}
                  </Text>
                </View>
                <AddressEntry onSave={addStop} />
              </BlurView>
            </View>

            {/* Stops List */}
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-3.5 px-1">
                <Text className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                  {t("stopsList")} ({stops.length})
                </Text>
                {stops.length > 0 && !process.env.EXPO_PUBLIC_TMAP_API_KEY && (
                  <View className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <Text className="text-[9px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                      {t("simulationMode")}
                    </Text>
                  </View>
                )}
              </View>

              {stops.length === 0 ? (
                <View className="overflow-hidden rounded-3xl border border-slate-200/50 dark:border-slate-800/40 shadow-sm">
                  <BlurView intensity={20} tint={isDark ? "dark" : "light"} className="p-8 items-center bg-white/20 dark:bg-slate-900/20">
                    <View className="p-3.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-3 border border-slate-200/50 dark:border-slate-800/45">
                      <MapPin color={isDark ? "#64748b" : "#94a3b8"} size={24} strokeWidth={2.5} />
                    </View>
                    <Text className="text-slate-800 dark:text-slate-200 font-black text-base text-center">
                      {t("noStops")}
                    </Text>
                    <Text className="text-slate-400 dark:text-slate-500 text-xs text-center mt-1 font-medium">
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
