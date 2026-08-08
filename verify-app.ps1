$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

Write-Output "=== Checking Metro ==="
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8081/status" -UseBasicParsing -TimeoutSec 3
    Write-Output "Metro running: $($r.StatusCode)"
}
catch {
    Write-Output "Metro not responding, starting it..."
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio1\jbr"
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    Start-Process -FilePath cmd.exe -ArgumentList "/c", "cd /d C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app && npx expo start --port 8081 --dev-client > metro.log 2>&1" -WindowStyle Minimized
    Start-Sleep -Seconds 20
}

Write-Output "=== adb reverse ==="
& $adb reverse tcp:8081 tcp:8081

Write-Output "=== Sending dev-client deep link ==="
& $adb shell am start -a android.intent.action.VIEW -d "exp+slyzah-app://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.thabilet.slyzahapp

Start-Sleep -Seconds 15

Write-Output "=== App process ==="
& $adb shell pidof com.thabilet.slyzahapp

Write-Output "=== Foreground activity ==="
& $adb shell dumpsys activity activities | Select-String "topResumedActivity" | Select-Object -Last 1

Write-Output "=== Logcat errors ==="
& $adb logcat -d -t 100 | Select-String "FATAL|AndroidRuntime|DevLauncher" | Select-Object -Last 5

Write-Output "=== Metro log tail ==="
Get-Content "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app\metro.log" -Tail 15 -ErrorAction SilentlyContinue

Write-Output "=== Done ==="
