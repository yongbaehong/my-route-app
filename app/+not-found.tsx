import { Link, Stack } from "expo-router";

import { Text, View } from "@/components/Themed";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 p-5">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          This screen doesn't exist.
        </Text>

        <Link href="/" className="mt-4 py-4">
          <Text className="text-base text-blue-600 dark:text-blue-400">
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}
