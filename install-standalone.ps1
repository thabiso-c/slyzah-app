$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$emulator = "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe"

Write-Output "=== Step 1: Starting emulator if needed ==="
$devices = & $adb devices
if (-not ($devices -match "emulator")) {
    Write-Output "Starting emulator..."
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

Write-Output "=== Step 2: Building standalone APK ==="
Set-Location "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio1\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Write-Output "Running EAS build (this may take 5-10 minutes)..."
npx eas build --platform android --profile preview --local

Write-Output "=== Step 3: Uninstalling old APK ==="
& $adb uninstall com.thabilet.slyzahapp
Start-Sleep -Seconds 2

Write-Output "=== Step 4: Installing new standalone APK ==="
$apkPath = "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\android\app\build\outputs\apk\release\app-release-unsigned.apk"
if (Test-Path $apkPath) {
    & $adb install $apkPath
    Write-Output "APK_INSTALLED"
}
else {
    Write-Output "ERROR: APK not found at $apkPath"
    Write-Output "Check the EAS build output for the actual APK location"
    exit 1
}

Write-Output "=== Step 5: Launching app (NO METRO NEEDED) ==="
Start-Sleep -Seconds 3
& $adb shell am start -n com.thabilet.slyzahapp/.MainActivity

Write-Output "=== DONE ==="
Write-Output "The app is now running WITHOUT Metro server!"
Write-Output "If you see a blank screen, wait 30 seconds for the JS bundle to load from APK."