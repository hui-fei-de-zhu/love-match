@echo off
echo ========================================
echo   心动配对 - 启动中...
echo ========================================
echo.
echo 正在启动本地服务器...
start /B node server.js > server.log 2>&1
timeout /t 2 /nobreak >nul
echo 服务器已启动: http://localhost:3457
echo.
echo 正在创建公网隧道...
npx localtunnel --port 3457
pause
