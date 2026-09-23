@echo off
chcp 65001 >nul
title 配方管理系统
cd /d "D:\Minecraft\Mod Develop\recipe-manager"

echo ========================================
echo    配方管理系统 - 启动中
echo ========================================
echo.
echo 正在启动开发服务器...
echo 启动完成后会自动打开浏览器
echo.
echo 按 Ctrl+C 可停止服务器
echo ========================================
echo.

start http://localhost:5173/
npm run dev

pause
