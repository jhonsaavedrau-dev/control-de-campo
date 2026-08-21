@echo off
title Sistema de Control de Campo - PBI
cd /d "%~dp0"

echo.
echo   ====================================================
echo    SISTEMA DE CONTROL DE CAMPO - PBI
echo   ====================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [!] No se encontro Node.js en este computador.
  echo       Descargalo de https://nodejs.org e instalalo,
  echo       luego vuelve a abrir este archivo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo   Primera vez: instalando lo necesario.
  echo   Esto puede tardar un par de minutos...
  echo.
  call npm install --no-audit --no-fund
  echo.
)

echo   Abriendo el sistema en el navegador...
echo.
echo   Direccion:  http://localhost:3000
echo.
echo   ----------------------------------------------------
echo    Para APAGAR el sistema: cierra esta ventana negra
echo    o presiona Ctrl + C
echo   ----------------------------------------------------
echo.

start "" http://localhost:3000
call npm run dev
pause
