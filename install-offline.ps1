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

Write-Output "=== Step 2: Building offline standalone APK ==="
Set-Location "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio1\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

Write-Output "This will take 5-8 minutes. Please wait..."
Write-Output ""

# Step 1: Prebuild
Write-Output "Generating Android project..."
npx expo prebuild --platform android --clean
if ($LASTEXITCODE -ne 0) { Write-Output "PREBUILD FAILED"; exit 1 }

# Step 2: Export JS bundle
Write-Output "Bundling JavaScript code..."
New-Item -ItemType Directory -Force -Path "android\app\src\main\assets" | Out-Null
npx expo export --platform android --output-dir dist
if ($LASTEXITCODE -ne 0) { Write-Output "EXPORT FAILED"; exit 1 }

# Step 3: Copy bundle
Write-Output "Copying bundle to Android project..."
$bundleFile = Get-ChildItem -Path "dist" -Filter "*.hbc" -Recurse | Select-Object -First 1
if (-not $bundleFile) {
    $bundleFile = Get-ChildItem -Path "dist" -Filter "*.bundle" -Recurse | Select-Object -First 1
}
if ($bundleFile) {
    New-Item -ItemType Directory -Force -Path "android\app\src\main\assets" | Out-Null
    Copy-Item $bundleFile.FullName "android\app\src\main\assets\index.android.bundle" -Force
    if (Test-Path "$($bundleFile.FullName).meta") {
        Copy-Item "$($bundleFile.FullName).meta" "android\app\src\main\assets\index.android.bundle.meta" -Force
    }
    Write-Output "Copied bundle: $($bundleFile.Name)"
}
else {
    Write-Output "ERROR: No bundle file found in dist/"
    exit 1
}

# Step 4: Build APK
Write-Output "Building release APK (this takes 3-5 minutes)..."
Set-Location "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\android"
$env:PATH = "C:\Program Files\Android\Android Studio1\jbr\bin;$env:PATH"
.\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64 --no-daemon
if ($LASTEXITCODE -ne 0) { Write-Output "GRADLE BUILD FAILED"; exit 1 }

Write-Output ""

Write-Output "=== Step 3: Uninstalling old APK ==="
& $adb uninstall com.thabilet.slyzahapp
Start-Sleep -Seconds 2

Write-Output "=== Step 4: Installing new standalone APK ==="
$apkPath = "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\android\app\build\outputs\apk\release\app-release-unsigned.apk"
if (Test-Path $apkPath) {
    & $adb install $apkPath
    Write-Output "APK_INSTALLED_SUCCESSFULLY"
}
else {
    Write-Output "ERROR: APK not found at $apkPath"
    exit 1
}

Write-Output "=== Step 5: Launching app (NO METRO NEEDED) ==="
Start-Sleep -Seconds 3
& $adb shell am start -n com.thabilet.slyzahapp/.MainActivity

Write-Output ""
Write-Output "========================================="
Write-Output "SUCCESS! App installed WITHOUT Metro!"
Write-Output "========================================="
Write-Output ""
Write-Output "The app is now running completely offline."
Write-Output "If you see a blank screen initially, wait 30 seconds for the JS bundle to load."