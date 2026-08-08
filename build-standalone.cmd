@echo off
cd /d C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app

echo === Step 1: Exporting JS Bundle ===
call npx expo export --platform android --output-dir dist

echo === Step 2: Building Release APK ===
cd android
set "JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"

call gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon

echo === BUILD EXIT CODE: %ERRORLEVEL% ===
if exist "app\build\outputs\apk\release\app-release-unsigned.apk" (
  echo STANDALONE_APK_READY
  echo Location: app\build\outputs\apk\release\app-release-unsigned.apk
) else (
  echo BUILD_FAILED
)