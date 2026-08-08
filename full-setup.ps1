$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$emulator = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"

Write-Output "=== Step 1: Starting emulator ==="
$devices = & $adb devices
if (-not ($devices -match "emulator")) {
    Start-Process -FilePath $emulator -ArgumentList "-avd", "Pixel_10_Pro_XL", "-no-snapshot-load" -WindowStyle Minimized
    Write-Output "Waiting for emulator to boot..."
    for ($i = 0; $i -lt 60; $i++) {
        $d = & $adb devices
        if ($d -match "emulator-\d+\s+device") {
            $boot = (& $adb shell getprop sys.boot_completed 2>$null).Trim()
            if ($boot -eq "1") {
                Write-Output "EMULATOR_READY"
                break
            }
        }
        Start-Sleep -Seconds 5
    }
}
else {
    Write-Output "Emulator already running"
}

Write-Output "=== Step 2: Uninstalling old APK ==="
& $adb uninstall com.thabilet.slyzahapp
Start-Sleep -Seconds 2

Write-Output "=== Step 3: Installing new APK ==="
& $adb install "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Output "=== Step 4: Setting up adb reverse ==="
& $adb reverse tcp:8081 tcp:8081

Write-Output "=== Step 5: Starting Metro ==="
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio1\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
Start-Process -FilePath cmd.exe -ArgumentList "/c", "cd /d C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app && set JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr && set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk && set PATH=%JAVA_HOME%\bin;%PATH% && npx expo start --port 8081 --dev-client > metro.log 2>&1" -WindowStyle Minimized

Write-Output "Waiting for Metro..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8081/status" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            Write-Output "Metro ready!"
            break
        }
    }
    catch {
        Start-Sleep -Seconds 3
    }
}

Write-Output "=== Step 6: Sending deep link ==="
& $adb shell am start -a android.intent.action.VIEW -d "exp+slyzah-app://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.thabilet.slyzahapp

Start-Sleep -Seconds 20

Write-Output "=== Step 7: Verifying app state ==="
Write-Output "App process:"
& $adb shell pidof com.thabilet.slyzahapp
Write-Output "Foreground activity:"
& $adb shell dumpsys activity activities | Select-String "topResumedActivity" | Select-Object -Last 1
Write-Output "Logcat errors:"
& $adb logcat -d -t 200 | Select-String "FATAL|AndroidRuntime|DevLauncher" | Select-Object -Last 5
Write-Output "Metro log:"
Get-Content "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\metro.log" -Tail 15 -ErrorAction SilentlyContinue

Write-Output "=== Done ==="
