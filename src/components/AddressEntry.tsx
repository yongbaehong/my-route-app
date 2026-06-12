import { Search, MapPin, Check } from "lucide-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";

import { GeocodeResult, searchAddress } from "../services/tmapService";

interface AddressEntryProps {
  onSave: (stop: {
    address: string;
    nickname: string;
    lat: number;
    lng: number;
  }) => void;
}

export const AddressEntry: React.FC<AddressEntryProps> = ({ onSave }) => {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<GeocodeResult | null>(null);

  const handleSearch = async () => {
    if (!address.trim()) {
      Alert.alert(t("error"), t("enterAddressPrompt"));
      return;
    }

    setLoading(true);
    try {
      const result = await searchAddress(address);
      if (result) {
        setSearchResult(result);
        // Pre-fill nickname with building name or city district if available
        if (result.buildingName) {
          setNickname(result.buildingName);
        } else if (result.dong) {
          setNickname(result.dong);
        } else {
          setNickname(result.city + " " + result.district);
        }
      } else {
        Alert.alert(t("error"), t("noResults"));
      }
    } catch (error) {
      Alert.alert(t("error"), t("searchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!searchResult) {
      Alert.alert(t("error"), t("searchFirst"));
      return;
    }
    if (!nickname.trim()) {
      Alert.alert(t("error"), t("enterNickname"));
      return;
    }

    onSave({
      address: searchResult.normalizedAddress,
      nickname,
      lat: searchResult.lat,
      lng: searchResult.lng,
    });

    // Reset
    setAddress("");
    setNickname("");
    setSearchResult(null);
  };

  return (
    <View className="space-y-5">
      {/* Address Input Section */}
      <View>
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t("address")}
        </Text>
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 relative">
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder={t("enterAddress")}
              placeholderTextColor="#9CA3AF"
              className="w-full border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 bg-white/20 dark:bg-black/20 text-gray-900 dark:text-white font-medium"
              autoCapitalize="words"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            disabled={loading || !address.trim()}
            className={`h-[48px] px-5 rounded-xl justify-center items-center shadow-sm flex-row space-x-1.5 ${
              loading || !address.trim()
                ? "bg-black/10 dark:bg-white/10"
                : "bg-blue-600 active:bg-blue-700"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Search color="white" size={18} />
                <Text className="text-white font-semibold text-sm">
                  {t("search")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Result Display */}
      {searchResult && (
        <View className="overflow-hidden rounded-2xl border border-emerald-500/25 dark:border-emerald-400/20 bg-emerald-500/10 dark:bg-emerald-400/5 p-4 flex-row items-start space-x-3">
          <View className="p-2 rounded-xl bg-emerald-500/20 dark:bg-emerald-400/20">
            <MapPin color="#10B981" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
              {t("found")}
            </Text>
            <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {searchResult.normalizedAddress}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">
              Lat: {searchResult.lat.toFixed(5)}, Lng: {searchResult.lng.toFixed(5)}
            </Text>
          </View>
        </View>
      )}

      {/* Nickname Input */}
      <View>
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {t("nickname")}
        </Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder={t("enterNickname")}
          placeholderTextColor="#9CA3AF"
          className="border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 bg-white/20 dark:bg-black/20 text-gray-900 dark:text-white font-medium"
          autoCapitalize="words"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={!searchResult || !nickname.trim()}
        className={`w-full py-3.5 rounded-xl flex-row justify-center items-center space-x-2 shadow-lg transition-transform ${
          !searchResult || !nickname.trim()
            ? "bg-black/15 dark:bg-white/10 opacity-70"
            : "bg-emerald-600 active:bg-emerald-700"
        }`}
      >
        <Check color="white" size={18} />
        <Text className="text-white text-center font-bold text-base">
          {t("saveStop")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
