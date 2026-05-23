@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   心动配对 - 服务器启动中...
echo ========================================
echo.

:: 检查node_modules
if not exist "node_modules\" (
    echo [1/3] 正在安装依赖...
    call npm install
    echo.
)

:: 杀掉旧进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3457.*LISTENING"') do (
    echo [*] 关闭旧服务器进程 %%a
    taskkill /F /PID %%a >nul 2>&1
)

:: 启动服务器
echo [2/3] 启动本地服务器...
start "心动配对-服务器" /B node server.js > server.log 2>&1
timeout /t 2 /nobreak >nul

:: 验证服务器
curl -s http://localhost:3457/api/all >nul 2>&1
if errorlevel 1 (
    echo [错误] 服务器启动失败！
    pause
    exit /b 1
)
echo       本地服务器: http://localhost:3457
echo.

:: 启动隧道
echo [3/3] 创建公网隧道...
echo.
echo ========================================
echo   公网访问地址（分享给朋友）:
echo.

npx localtunnel --port 3457

echo.
echo 隧道已关闭。按任意键退出...
pause >nul
