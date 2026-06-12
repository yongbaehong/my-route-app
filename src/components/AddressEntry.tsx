import { Search } from "lucide-react-native";
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
      Alert.alert(t("error"), t("enterAddress"));
      return;
    }

    setLoading(true);
    try {
      const result = await searchAddress(address);
      if (result) {
        setSearchResult(result);
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
    <View>
      {/* Address Input Section */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-white mb-2">
          {t("address")}
        </Text>
        <View className="flex-row space-x-2">
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={t("enterAddress")}
            placeholderTextColor="#9CA3AF"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleSearch}
            disabled={loading || !address.trim()}
            className={`px-4 py-3 rounded-lg justify-center ${
              loading || !address.trim()
                ? "bg-gray-300 dark:bg-gray-600"
                : "bg-blue-600 active:bg-blue-700"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Search color="white" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Result Display */}
      {searchResult && (
        <View className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Text className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
            {t("found")}
          </Text>
          <Text className="text-sm text-green-700 dark:text-green-300">
            {searchResult.normalizedAddress}
          </Text>
          <Text className="text-xs text-green-600 dark:text-green-400 mt-1">
            📍 Lat: {searchResult.lat.toFixed(6)}, Lng:{" "}
            {searchResult.lng.toFixed(6)}
          </Text>
        </View>
      )}

      {/* Nickname Input */}
      <View className="mb-4">
        <Text className="text-base font-medium text-gray-900 dark:text-white mb-2">
          {t("nickname")}
        </Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          placeholder={t("enterNickname")}
          placeholderTextColor="#9CA3AF"
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          autoCapitalize="words"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={!searchResult || !nickname.trim()}
        className={`p-3 rounded-lg ${
          !searchResult || !nickname.trim()
            ? "bg-gray-300 dark:bg-gray-600"
            : "bg-green-600 active:bg-green-700"
        }`}
      >
        <Text className="text-white text-center font-semibold text-base">
          {t("saveStop")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
