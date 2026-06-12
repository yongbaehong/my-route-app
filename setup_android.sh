#!/bin/bash
set -e

echo "=== Starting Android SDK & Emulator Setup ==="

# 1. Update apt and install dependencies (Java, unzip, graphics libs)
echo "Installing packages (OpenJDK 17, graphics libraries)..."
sudo apt-get update
sudo apt-get install -y openjdk-17-jdk-headless unzip libpulse0 libglu1-mesa

# 2. Setup directory
mkdir -p "$HOME/android-sdk/cmdline-tools"

# 3. Download and extract CommandLine Tools
if [ ! -d "$HOME/android-sdk/cmdline-tools/latest" ]; then
  echo "Downloading Android Command Line Tools..."
  wget -q https://dl.google.com/android/repository/commandlinetools-linux-14742923_latest.zip -O /tmp/cmdline-tools.zip
  echo "Extracting tools..."
  unzip -q /tmp/cmdline-tools.zip -d /tmp/cmdline-tools-extracted
  mv /tmp/cmdline-tools-extracted/cmdline-tools "$HOME/android-sdk/cmdline-tools/latest"
  rm -rf /tmp/cmdline-tools.zip /tmp/cmdline-tools-extracted
fi

# 4. Set Environment Variables for current script run
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

# 5. Add to .bashrc if not already there
if ! grep -q "ANDROID_HOME" "$HOME/.bashrc"; then
  echo "Adding environment variables to ~/.bashrc..."
  echo "" >> "$HOME/.bashrc"
  echo "# Android SDK paths" >> "$HOME/.bashrc"
  echo "export ANDROID_HOME=\$HOME/android-sdk" >> "$HOME/.bashrc"
  echo "export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator" >> "$HOME/.bashrc"
fi

# 6. Accept licenses
echo "Accepting Android SDK licenses..."
yes | sdkmanager --licenses

# 7. Install SDK Packages
# We install platform-tools, emulator, platform 34, build tools 34.0.0, and system image API 34 x86_64
echo "Installing Android SDK components (platform-tools, emulator, platforms;android-34, system-images;android-34;google_apis;x86_64)..."
yes | sdkmanager "platform-tools" "emulator" "platforms;android-34" "build-tools;34.0.0" "system-images;android-34;google_apis;x86_64"

# 8. Create AVD
echo "Creating AVD (test_emulator) using system image API 34..."
echo "no" | avdmanager create avd -n test_emulator -k "system-images;android-34;google_apis;x86_64" --device "pixel" --force

echo "=== Android SDK & Emulator Setup Completed Successfully ==="
