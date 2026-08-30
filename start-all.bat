@echo off
title MediSync360 Platform Launcher
echo ===================================================
echo           Starting MediSync360 Platform
echo ===================================================
echo.

echo [1/3] Starting Insurance AI Microservice (Port 5001)...
start "Insurance AI Service" cmd /k "cd /d %~dp0insurance_ai && python app.py"

echo [2/3] Starting Backend API Server (Port 5000)...
start "Backend API Server" cmd /k "cd /d %~dp0backend && npm run dev"

echo [3/3] Starting Frontend Web App (Port 3000)...
start "Frontend Next.js App" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo All services are launching in separate terminal windows!
echo - Frontend:     http://localhost:3000
echo - Backend API:  http://localhost:5000/api
echo - Insurance AI: http://localhost:5001
echo ===================================================
pause
