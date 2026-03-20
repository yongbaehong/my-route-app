import { useSQLiteContext } from "expo-sqlite";
import i18n from "i18next";
import { Check, Star, Trash2 } from "lucide-react-native";
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
import { optimizeRoute, prepareTmapPayload } from "@/src/services/tmap";
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
      "INSERT INTO stops (id, address, nickname, lat, lng, display_order) VALUES (?, ?, ?, ?, ?, ?)",
      [id, address, nickname || null, lat, lng, maxOrder + 1],
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

  const deleteStop = async (id: string) => {
    await db.runAsync("DELETE FROM stops WHERE id = ?", [id]);
    loadStops();
  };

  const handleOptimize = async () => {
    try {
      const payload = await prepareTmapPayload(db);
      const result = await optimizeRoute(payload);
      Alert.alert("Success", "Route optimized!");
      // Handle result, perhaps update stops or show map
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const handleLanguageSwitch = () => {
    const newLang = i18n.language === "en" ? "ko" : "en";
    i18n.changeLanguage(newLang);
  };

  const onDragEnd = async ({ data }: { data: Stop[] }) => {
    setStops(data);
    // Update display_order in db
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
      className="flex-row items-center p-4 bg-white dark:bg-gray-800 rounded-lg mb-2 shadow"
    >
      <View className="flex-1">
        <TextInput
          value={item.nickname || item.address}
          onChangeText={(text) => updateStop(item.id, "nickname", text)}
          className="text-lg font-semibold"
          placeholder={t("nickname")}
        />
        <Text className="text-gray-600 dark:text-gray-400">{item.address}</Text>
      </View>
      <TouchableOpacity
        onPress={() =>
          updateStop(item.id, "is_important", item.is_important ? 0 : 1)
        }
      >
        <Star
          fill={item.is_important ? "gold" : "none"}
          color="gold"
          size={24}
        />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() =>
          updateStop(item.id, "is_completed", item.is_completed ? 0 : 1)
        }
        className="ml-2"
      >
        <Check color={item.is_completed ? "green" : "gray"} size={24} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => deleteStop(item.id)} className="ml-2">
        <Trash2 color="red" size={24} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold mb-4">{t("optimize")}</Text>
      <TouchableOpacity
        onPress={handleOptimize}
        className="bg-green-500 p-2 rounded mb-4"
      >
        <Text className="text-white text-center">{t("optimize")}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleLanguageSwitch}
        className="bg-purple-500 p-2 rounded mb-4"
      >
        <Text className="text-white text-center">
          Switch to {i18n.language === "en" ? "Korean" : "English"}
        </Text>
      </TouchableOpacity>

      {/* Add new stop */}
      <AddressEntry
        onSave={({ address, nickname, lat, lng }) =>
          addStop(address, nickname, lat, lng)
        }
      />

      {/* Stops list */}
      <DraggableFlatList
        data={stops}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onDragEnd={onDragEnd}
      />
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
