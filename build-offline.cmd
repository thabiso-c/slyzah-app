@echo off
cd /d C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app

echo === Building Offline Standalone APK for Windows ===
echo This bundles all JS code into the APK - no Metro required
echo.

echo === Step 1: Generating native Android project ===
call npx expo prebuild --platform android --clean

echo === Step 2: Building JS bundle ===
mkdir android\app\src\main\assets\ 2>nul
call npx expo export --platform android --output-dir dist

echo === Step 3: Copying bundle to Android assets ===
xcopy /Y dist\*.bundle android\app\src\main\assets\index.android.bundle
xcopy /Y dist\*.bundle android\app\src\main\assets\index.android.bundle.meta

echo === Step 4: Building release APK ===
cd android
set "JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Building release APK (this takes 3-5 minutes)...
call gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon

echo.
echo === BUILD COMPLETE ===
if exist "app\build\outputs\apk\release\app-release-unsigned.apk" (
    echo SUCCESS! Standalone APK ready at:
    echo android\app\build\outputs\apk\release\app-release-unsigned.apk
    echo.
    echo This APK runs WITHOUT Metro server!
) else (
    echo BUILD FAILED - Check errors above
)