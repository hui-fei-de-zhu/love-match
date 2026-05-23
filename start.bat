@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   心动配对 - 启动中...
echo ========================================
echo.

REM 检查依赖
if not exist "node_modules\" (
    echo [*] 正在安装依赖，首次运行需等待...
    call npm install --silent
    echo.
)

REM 关闭旧进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3457.*LISTENING" 2^>nul') do (
    echo [*] 关闭旧进程 %%a
    taskkill /F /PID %%a >nul 2>&1
)

REM 启动服务器
echo [*] 启动服务器...
start "心动配对" /B node server.js > server.log 2>&1
timeout /t 3 /nobreak >nul

REM 打开浏览器
echo [*] 打开浏览器...
start "" http://localhost:3457

echo.
echo ========================================
echo   已启动！访问地址：
echo.
echo   本机：http://localhost:3457
echo.
echo   同 WiFi 的朋友用你电脑 IP 访问：
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4" 2^>nul') do (
    echo   http:%%i:3457
)
echo ========================================
echo.
echo 关闭此窗口会停止服务器。使用完后按任意键退出...
pause >nul
taskkill /F /IM node.exe >nul 2>&1
