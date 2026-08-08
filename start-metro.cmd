@echo off
cd /d C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app
set JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%PATH%
npx expo start --port 8081 --dev-client > metro.log 2>&1
