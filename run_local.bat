@echo off
chcp 65001 > nul
echo =======================================================
echo   Linear Algebra Visualizer - Local Server Starter
echo =======================================================
echo.
echo  [1/2] Opening browser to: http://localhost:8000
echo  [2/2] Starting Python Local HTTP Server...
echo.
echo  * (Press Ctrl + C inside this window to stop server)
echo =======================================================
echo.

start http://localhost:8000
python -m http.server 8000

pause
