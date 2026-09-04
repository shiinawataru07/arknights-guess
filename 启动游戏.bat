@echo off
setlocal
title Arknights Guess - Launcher
pushd "%~dp0"
if errorlevel 1 goto folder_error

where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node

if exist "node_modules\.package-lock.json" if exist "node_modules\vite\bin\vite.js" goto launch
echo Installing dependencies for the first launch. Internet access is required...
call npm install
if errorlevel 1 goto install_error

:launch
echo Opening the game in your browser...
echo Keep this window open while playing. Close it to stop the game.
call npm run dev -- --host 127.0.0.1 --open
if errorlevel 1 goto launch_error
popd
exit /b 0

:missing_node
echo Node.js or npm was not found.
echo Please install a supported Node.js LTS version from https://nodejs.org/
echo Then close this window and double-click this launcher again.
goto failed

:install_error
echo Dependency installation failed. Check your internet connection and try again.
goto failed

:launch_error
echo The game could not start. See the error message above.
goto failed

:folder_error
echo Cannot open the game folder. Please extract the ZIP before launching.
pause
exit /b 1

:failed
popd
pause
exit /b 1
