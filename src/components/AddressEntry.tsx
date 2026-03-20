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
    <View className="mb-4">
      <Text className="text-lg font-semibold mb-2">{t("enterAddress")}</Text>

      <View className="flex-row mb-2">
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder={t("address")}
          className="border border-gray-300 rounded p-2 flex-1 mr-2"
        />
        <TouchableOpacity
          onPress={handleSearch}
          disabled={loading}
          className="bg-blue-500 p-2 rounded justify-center"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Search color="white" size={20} />
          )}
        </TouchableOpacity>
      </View>

      {searchResult && (
        <View className="mb-2 p-2 bg-gray-100 rounded">
          <Text className="text-sm">
            {t("found")}: {searchResult.normalizedAddress}
          </Text>
          <Text className="text-xs text-gray-600">
            Lat: {searchResult.lat}, Lng: {searchResult.lng}
          </Text>
        </View>
      )}

      <TextInput
        value={nickname}
        onChangeText={setNickname}
        placeholder={t("nickname")}
        className="border border-gray-300 rounded p-2 mb-2"
      />

      <TouchableOpacity
        onPress={handleSave}
        disabled={!searchResult}
        className={`p-2 rounded ${searchResult ? "bg-green-500" : "bg-gray-300"}`}
      >
        <Text className="text-white text-center">{t("saveStop")}</Text>
      </TouchableOpacity>
    </View>
  );
};
