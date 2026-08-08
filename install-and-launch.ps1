$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

Write-Output "=== Waiting for emulator boot ==="
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

Write-Output "=== Building debug APK ==="
$buildScript = "c:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\build-local.cmd"
if (Test-Path $buildScript) {
    & cmd /c $buildScript
    if (-not (Test-Path "c:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\android\app\build\outputs\apk\debug\app-debug.apk")) {
        Write-Output "ERROR: APK build failed - app-debug.apk not found"
        exit 1
    }
    Write-Output "APK build successful"
}
else {
    Write-Output "ERROR: Build script not found at $buildScript"
    exit 1
}

Write-Output "=== Uninstalling old APK ==="
& $adb uninstall com.thabilet.slyzahapp 2>$null
Start-Sleep -Seconds 2

Write-Output "=== Installing new APK ==="
& $adb install "c:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\android\app\build\outputs\apk\debug\app-debug.apk"

Write-Output "=== Setting up adb reverse ==="
& $adb reverse tcp:8081 tcp:8081

Write-Output "=== Launching app ==="
& $adb shell am start -n com.thabilet.slyzahapp/com.thabilet.slyzahapp.MainActivity

Write-Output "=== Done ==="