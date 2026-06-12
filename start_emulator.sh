#!/bin/bash
set -e

# Set environment variables
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

echo "=== Launching Android Emulator ==="
# Check if emulator is installed
if ! command -v emulator &> /dev/null; then
  echo "Error: Android emulator not found. Please wait for setup_android.sh to complete first."
  exit 1
fi

# Check if AVD is created
if ! emulator -list-avds | grep -q "test_emulator"; then
  echo "Error: test_emulator AVD not found. Creating it now..."
  echo "no" | avdmanager create avd -n test_emulator -k "system-images;android-34;google_apis;x86_64" --device "pixel" --force
fi

# Run emulator in background
# We run it with GPU host acceleration for smooth performance.
# If GPU acceleration fails on ChromeOS, it will automatically fallback to swiftshader.
emulator -avd test_emulator -gpu host -netdelay none -netspeed full > /dev/null 2>&1 &
EMULATOR_PID=$!

echo "Waiting for emulator device online..."
adb wait-for-device

echo "Waiting for Android OS boot to complete..."
while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ] ; do
  sleep 3
done

echo "=== Emulator is booted and ready! ==="
echo "Starting Expo project on Android..."
npm run android
