@echo off
title Control de Generacion - PBI
cd /d "%~dp0"

echo.
echo   ====================================================
echo    CONTROL DE GENERACION - PBI
echo    Gestion Energy SAS
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

if not exist "node_modules\next" (
  echo   Instalando lo necesario. Puede tardar un par de minutos...
  echo.
  call npm install --no-audit --no-fund
  echo.
)

echo   Abriendo en el navegador...
echo.
echo   En este computador:  http://localhost:3000
echo.
echo   Para el celular, busca abajo la linea que dice
echo   "Network" y usa esa direccion (mismo wifi).
echo.
echo   ----------------------------------------------------
echo    Para APAGAR: cierra esta ventana o Ctrl + C
echo   ----------------------------------------------------
echo.

start "" http://localhost:3000
call npm run dev
pause
