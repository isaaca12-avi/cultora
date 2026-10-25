@echo off
setlocal enabledelayedexpansion
set "ROOT=%~dp0"
set "RUNTIME=%LOCALAPPDATA%\CultoraDev"
set "MONGO=%RUNTIME%\mongodb-win32-x86_64-windows-7.0.14\bin\mongod.exe"
set "NODE=%RUNTIME%\node\node.exe"
set "DEVSERVER=%RUNTIME%\dev-server.js"

echo Iniciando Cultora...

netstat -ano | findstr ":27017" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Cultora MongoDB" /min "%MONGO%" --dbpath "%RUNTIME%\mongodb-data" --port 27017 --bind_ip 127.0.0.1 --logpath "%RUNTIME%\mongod.log" --logappend
)

netstat -ano | findstr ":8001" | findstr "LISTENING" >nul
if errorlevel 1 (
  pushd "%ROOT%backend"
  start "Cultora API" /min ".venv\Scripts\python.exe" -m uvicorn server:app --host 127.0.0.1 --port 8001
  popd
)

netstat -ano | findstr ":4318" | findstr "LISTENING" >nul
if errorlevel 1 (
  start "Cultora Preview" /min "%NODE%" "%DEVSERVER%"
)

echo Esperando a que la API este lista (la primera carga puede tardar ~40 s)...
set /a tries=0
:waitapi
netstat -ano | findstr ":8001" | findstr "LISTENING" >nul
if not errorlevel 1 goto open
set /a tries+=1
if !tries! geq 70 goto open
"%SystemRoot%\System32\timeout.exe" /t 1 /nobreak >nul
goto waitapi

:open
start "" http://127.0.0.1:4318
endlocal
