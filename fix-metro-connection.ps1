# Fix Metro Bundler Connection Issue
# This script clears Metro cache and starts Metro with proper network binding

Write-Host "=== Fixing Metro Bundler Connection ===" -ForegroundColor Cyan

# Stop any running Metro processes
Write-Host "`n1. Stopping existing Metro processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*expo*start*" } | Stop-Process -Force
Start-Sleep -Seconds 2

# Clear Metro cache
Write-Host "2. Clearing Metro cache..." -ForegroundColor Yellow
$projectRoot = "C:\Users\Thabiso\OneDrive\Documents\Development\slyzah-app"
$metroCachePath = Join-Path $projectRoot "node_modules\.cache\metro"
$hasteMapPath = Join-Path $projectRoot "node_modules\.cache\haste-map"

if (Test-Path $metroCachePath) {
    Remove-Item -Path $metroCachePath -Recurse -Force
    Write-Host "   Cleared Metro cache" -ForegroundColor Green
}
if (Test-Path $hasteMapPath) {
    Remove-Item -Path $hasteMapPath -Recurse -Force
    Write-Host "   Cleared Haste map cache" -ForegroundColor Green
}

# Clear .expo cache
$expoCachePath = Join-Path $projectRoot ".expo"
if (Test-Path $expoCachePath) {
    Remove-Item -Path (Join-Path $expoCachePath "*.webpack.*") -Force -ErrorAction SilentlyContinue
    Write-Host "   Cleared Expo webpack cache" -ForegroundColor Green
}

Write-Host "`n3. Starting Metro with proper network configuration..." -ForegroundColor Yellow
Write-Host "   Metro will be accessible at:" -ForegroundColor Cyan
Write-Host "   - Localhost: http://localhost:8081" -ForegroundColor White
Write-Host "   - Emulator: http://10.0.2.2:8081" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop Metro`n" -ForegroundColor Gray

# Set environment variables for proper network binding
$env:EXPO_PACKAGER_PROXY_URL = "http://localhost:8081"
$env:RCT_METRO_PORT = "8081"

# Start Metro with --host flag to ensure it's accessible from emulator
Set-Location $projectRoot
npx expo start --port 8081 --dev-client --host 0.0.0.0