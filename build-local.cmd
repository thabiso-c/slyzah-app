@echo off
cd /d "c:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\android"
set "JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo === Building Slyzah app APK ===
call gradlew.bat app:assembleDebug -PreactNativeArchitectures=x86_64 --no-daemon
echo === BUILD EXIT CODE: %ERRORLEVEL% ===
if exist "app\build\outputs\apk\debug\app-debug.apk" (
  echo APK_SUCCESS
) else (
  echo APK_FAILED
)