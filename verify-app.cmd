@echo off
cd /d C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app
set JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%PATH%

echo === Waiting for Metro ===
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8081/status' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { Write-Output 'Metro ready'; exit 0 } } catch {}" 2>nul
    if !errorlevel! equ 0 (
        echo === Metro is running ===
        goto metro_ready
    )
    timeout /t 2 /nobreak >nul
)
echo === Metro not ready ===
exit /b 1

:metro_ready
echo === Sending deep link to load app ===
%ANDROID_HOME%\platform-tools\adb.exe reverse tcp:8081 tcp:8081
%ANDROID_HOME%\platform-tools\adb.exe shell am start -a android.intent.action.VIEW -d "exp+slyzah-app://expo-development-client/?url=http%%3A%%2F%%2Flocalhost%%3A8081" com.thabilet.slyzahapp

timeout /t 15 /nobreak >nul

echo === App process ===
%ANDROID_HOME%\platform-tools\adb.exe shell pidof com.thabilet.slyzahapp

echo === Foreground activity ===
%ANDROID_HOME%\platform-tools\adb.exe shell dumpsys activity activities | findstr "topResumedActivity"

echo === Metro log tail ===
powershell -NoProfile -Command "Get-Content metro.log -Tail 20"

echo === Done ===
