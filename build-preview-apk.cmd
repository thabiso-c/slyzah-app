@echo off
cd /d C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app

echo === Building Standalone Preview APK (No Metro Required) ===
echo This creates a production-like APK that runs without Metro
echo.

call npx eas build --platform android --profile preview --local --no-wait

echo.
echo === Build Complete ===
echo Check your APK at: android\app\build\outputs\apk\release\app-release-unsigned.apk