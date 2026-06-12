import { useSQLiteContext } from "expo-sqlite";
import i18n from "i18next";
import { Check, MapPin, Star, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";

import { AddressEntry } from "@/src/components/AddressEntry";
import {
  optimizeRoute,
  prepareTmapPayload,
  updateStopsOrder,
} from "@/src/services/tmap";
import { Stop } from "@/src/types/routes";

function MobileTabOneScreen() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const [stops, setStops] = useState<Stop[]>([]);

  const loadStops = useCallback(async () => {
    const result = await db.getAllAsync<Stop>(
      "SELECT * FROM stops ORDER BY display_order",
    );
    setStops(result);
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
    await db.runAsync(
      "INSERT INTO stops (id, address, nickname, lat, lng, display_order, is_important, is_completed, is_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, address, nickname || null, lat, lng, maxOrder + 1, 0, 0, 0],
    );
    loadStops();
  };

  const updateStop = async (id: string, field: string, value: any) => {
    await db.runAsync(`UPDATE stops SET ${field} = ? WHERE id = ?`, [
      value,
      id,
    ]);
    loadStops();
  };

  const setStartPoint = async (id: string) => {
    console.log("📍 Setting start point to:", id);
    // Clear is_start from all stops
    await db.runAsync("UPDATE stops SET is_start = 0");
    // Set is_start for the selected stop
    await db.runAsync("UPDATE stops SET is_start = 1 WHERE id = ?", [id]);

    // Reload stops to update UI
    await loadStops();

    // Auto-optimize route with new starting point
    console.log("🚀 Auto-optimizing route with new start point...");
    setTimeout(() => {
      handleOptimizeAuto(id);
    }, 500);
  };

  const deleteStop = async (id: string) => {
    await db.runAsync("DELETE FROM stops WHERE id = ?", [id]);
    loadStops();
  };

  const handleOptimizeAuto = async (selectedStartId?: string) => {
    console.log("🎯 Auto-optimize called (start point:", selectedStartId, ")");
    try {
      // Get fresh data from database
      const currentStops = await db.getAllAsync<Stop>(
        "SELECT * FROM stops ORDER BY display_order",
      );
      console.log("📋 Current stops from DB:", currentStops.length);
      console.log(
        "📋 Stop details:",
        currentStops.map((s) => ({
          id: s.id,
          nickname: s.nickname,
          address: s.address,
          is_start: s.is_start,
        })),
      );

      console.log("📊 Preparing payload from database...");
      const payload = await prepareTmapPayload(db);
      console.log("📊 Payload prepared with", payload.stops.length, "stops");
      console.log("📊 Payload stops coordinates:", payload.stops);

      if (payload.stops.length < 2) {
        console.warn("⚠️ Less than 2 stops found", payload.stops.length);
        return;
      }

      console.log("🚀 Calling optimizeRoute...");
      const result = await optimizeRoute(payload);
      console.log("✅ Optimization result:", JSON.stringify(result, null, 2));

      // Update stops order based on optimization result
      console.log("🔄 Updating stops order based on optimization...");
      await updateStopsOrder(db, result, currentStops);

      // Force a small delay to ensure DB updates are complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reload stops to show new order
      console.log("🔄 Reloading stops from database...");
      const updatedStops = await db.getAllAsync<Stop>(
        "SELECT * FROM stops ORDER BY display_order",
      );
      console.log(
        "✅ Updated stops order:",
        updatedStops.map((s, i) => ({
          order: i,
          id: s.id,
          nickname: s.nickname,
          is_start: s.is_start,
        })),
      );
      setStops(updatedStops);
    } catch (error) {
      console.error("💥 Auto-optimization failed:", error);
      console.error(
        "💥 Error stack:",
        error instanceof Error ? error.stack : String(error),
      );
    }
  };

  const handleOptimize = async () => {
    console.log("🎯 Manual optimize button pressed");
    try {
      // Get fresh data from database
      const currentStops = await db.getAllAsync<Stop>(
        "SELECT * FROM stops ORDER BY display_order",
      );
      console.log("📋 Current stops from DB:", currentStops.length);
      console.log(
        "📋 Stop details:",
        currentStops.map((s) => ({
          id: s.id,
          nickname: s.nickname,
          address: s.address,
          is_start: s.is_start,
        })),
      );

      console.log("📊 Preparing payload from database...");
      const payload = await prepareTmapPayload(db);
      console.log("📊 Payload prepared with", payload.stops.length, "stops");
      console.log("📊 Payload stops coordinates:", payload.stops);

      if (payload.stops.length === 0) {
        console.warn("⚠️ No stops found in database");
        Alert.alert(
          "Error",
          "No stops added. Please add at least 2 addresses first.",
        );
        return;
      }

      if (payload.stops.length < 2) {
        console.warn(
          "⚠️ Only one stop found, need at least 2 for optimization",
        );
        Alert.alert(
          "Error",
          "Please add at least 2 addresses for route optimization.",
        );
        return;
      }

      console.log("🚀 Calling optimizeRoute...");
      const result = await optimizeRoute(payload);
      console.log(
        "✅ Optimization successful:",
        JSON.stringify(result, null, 2),
      );

      // Update stops order based on optimization result
      console.log("🔄 Updating stops order...");
      await updateStopsOrder(db, result, currentStops);

      // Force a small delay to ensure DB updates are complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reload stops to show new order
      console.log("🔄 Reloading stops from database...");
      const updatedStops = await db.getAllAsync<Stop>(
        "SELECT * FROM stops ORDER BY display_order",
      );
      console.log(
        "✅ Final stops order:",
        updatedStops.map((s, i) => ({
          order: i,
          id: s.id,
          nickname: s.nickname,
          is_start: s.is_start,
        })),
      );
      setStops(updatedStops);

      Alert.alert("Success", "Route optimized and reordered!");
    } catch (error) {
      console.error("💥 Optimization failed:", error);
      console.error(
        "💥 Error stack:",
        error instanceof Error ? error.stack : String(error),
      );
      Alert.alert("Error", String(error));
    }
  };

  const handleLanguageSwitch = () => {
    const newLang = i18n.language === "en" ? "ko" : "en";
    i18n.changeLanguage(newLang);
  };

  const onDragEnd = async ({ data }: { data: Stop[] }) => {
    setStops(data);
    // Update display_order in db (0-indexed)
    for (let i = 0; i < data.length; i++) {
      await db.runAsync("UPDATE stops SET display_order = ? WHERE id = ?", [
        i,
        data[i].id,
      ]);
    }
  };

  const renderItem = ({
    item,
    drag,
    isActive,
  }: {
    item: Stop;
    drag: () => void;
    isActive: boolean;
  }) => (
    <TouchableOpacity
      onLongPress={drag}
      disabled={isActive}
      className={`flex-row items-center p-4 mb-3 rounded-xl shadow-md ${
        isActive
          ? "bg-blue-100 dark:bg-blue-900 shadow-xl"
          : item.is_completed
            ? "bg-green-50 dark:bg-green-800"
            : "bg-white dark:bg-gray-800"
      }`}
    >
      {/* Drag Handle */}
      <View className="mr-3">
        <View className="w-1 h-8 bg-gray-300 dark:bg-gray-600 rounded-full mr-1" />
        <View className="w-1 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
      </View>

      {/* Content */}
      <View className="flex-1">
        <TextInput
          value={item.nickname || item.address}
          onChangeText={(text) => updateStop(item.id, "nickname", text)}
          className={`text-lg font-semibold mb-1 ${
            item.is_completed
              ? "text-gray-500 dark:text-gray-400 line-through"
              : "text-gray-900 dark:text-white"
          }`}
          placeholder={t("nickname")}
          placeholderTextColor="#9CA3AF"
        />
        <Text
          className={`text-sm ${
            item.is_completed
              ? "text-gray-400 dark:text-gray-500"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          {item.address}
        </Text>
        <View className="flex-row items-center gap-2 mt-1">
          {item.is_important && (
            <View className="flex-row items-center">
              <Star fill="gold" color="gold" size={14} />
              <Text className="text-xs text-yellow-600 dark:text-yellow-400 ml-1 font-medium">
                {t("priority")}
              </Text>
            </View>
          )}
          {item.is_start && (
            <View className="flex-row items-center">
              <MapPin color="#3B82F6" size={14} />
              <Text className="text-xs text-blue-600 dark:text-blue-400 ml-1 font-medium">
                {t("startPoint")}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center space-x-2">
        <TouchableOpacity
          onPress={() => setStartPoint(item.id)}
          className={`p-2 rounded-lg ${
            item.is_start
              ? "bg-blue-100 dark:bg-blue-900"
              : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          <MapPin color={item.is_start ? "#3B82F6" : "#6B7280"} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            updateStop(item.id, "is_important", item.is_important ? 0 : 1)
          }
          className={`p-2 rounded-lg ${
            item.is_important
              ? "bg-yellow-100 dark:bg-yellow-900"
              : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          <Star
            fill={item.is_important ? "gold" : "none"}
            color={item.is_important ? "gold" : "#6B7280"}
            size={20}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            updateStop(item.id, "is_completed", item.is_completed ? 0 : 1)
          }
          className={`p-2 rounded-lg ${
            item.is_completed
              ? "bg-green-100 dark:bg-green-900"
              : "bg-gray-100 dark:bg-gray-700"
          }`}
        >
          <Check color={item.is_completed ? "#10B981" : "#6B7280"} size={20} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => deleteStop(item.id)}
          className="p-2 rounded-lg bg-red-100 dark:bg-red-900"
        >
          <Trash2 color="#EF4444" size={20} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header Section */}
      <View className="mb-6">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t("optimize")}
        </Text>
        <Text className="text-gray-600 dark:text-gray-400 text-base">
          {t("planRoute")}
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="mb-6 space-y-3">
        <TouchableOpacity
          onPress={handleOptimize}
          className="bg-green-600 hover:bg-green-700 active:bg-green-800 p-4 rounded-xl shadow-lg"
          disabled={stops.length < 2}
        >
          <View className="flex-row items-center justify-center">
            <Text className="text-white text-lg font-semibold text-center mr-2">
              {t("optimize")}
            </Text>
            {stops.length >= 2 && (
              <Text className="text-white text-sm">({stops.length} stops)</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLanguageSwitch}
          className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 p-3 rounded-xl shadow-md border border-purple-500"
        >
          <Text className="text-white text-center font-medium">
            🌐 {i18n.language === "en" ? "한국어" : "English"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Stop Section */}
      <View className="mb-6">
        <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {t("addStop")}
        </Text>
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
          <AddressEntry
            onSave={({ address, nickname, lat, lng }) =>
              addStop(address, nickname, lat, lng)
            }
          />
        </View>
      </View>

      {/* Stops List Section */}
      <View className="flex-1">
        <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {t("stopsList")} ({stops.length})
        </Text>
        {stops.length === 0 ? (
          <View className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md items-center">
            <Text className="text-gray-500 dark:text-gray-400 text-center">
              {t("noStops")}
            </Text>
            <Text className="text-gray-400 dark:text-gray-500 text-sm text-center mt-2">
              {t("addFirstStop")}
            </Text>
          </View>
        ) : (
          <DraggableFlatList
            data={stops}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            onDragEnd={onDragEnd}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </View>
  );
}

function WebTabOneScreen() {
  const { t } = useTranslation();
  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-xl text-center">
        This app is designed for mobile devices. Please run on iOS or Android.
      </Text>
    </View>
  );
}

export default function TabOneScreen() {
  return Platform.OS === "web" ? <WebTabOneScreen /> : <MobileTabOneScreen />;
}
