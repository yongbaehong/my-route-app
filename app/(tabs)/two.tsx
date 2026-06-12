import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";

export default function TabTwoScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-6">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Tab Two
      </Text>
      <View className="w-full max-w-sm h-px bg-gray-200 dark:bg-gray-700 mb-8" />
      <EditScreenInfo path="app/(tabs)/two.tsx" />
    </View>
  );
}
