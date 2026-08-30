# MediSync360 PowerShell Launcher
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          Starting MediSync360 Platform" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot

Write-Host "[1/3] Starting Insurance AI Microservice (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$rootDir/insurance_ai`"; python app.py"

Write-Host "[2/3] Starting Backend API Server (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$rootDir/backend`"; npm run dev"

Write-Host "[3/3] Starting Frontend Web App (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$rootDir/frontend`"; npm run dev"

Write-Host ""
Write-Host "All 3 services are launching in separate PowerShell windows!" -ForegroundColor Green
Write-Host "• Frontend:     http://localhost:3000" -ForegroundColor Green
Write-Host "• Backend API:  http://localhost:5000/api" -ForegroundColor Green
Write-Host "• Insurance AI: http://localhost:5001" -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Cyan
