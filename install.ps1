# 公考错题助手 - 本地安装脚本
Write-Host "=== 公考错题助手 安装程序 ===" -ForegroundColor Green

# 清理损坏的 electron
Write-Host "`n[1/4] 清理旧的 electron..." -ForegroundColor Yellow
if (Test-Path "node_modules\electron") {
    Remove-Item -Recurse -Force node_modules\electron -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# 安装依赖
Write-Host "`n[2/4] 安装项目依赖（这可能需要几分钟）..." -ForegroundColor Yellow
npm install

# 验证安装
Write-Host "`n[3/4] 验证安装..." -ForegroundColor Yellow
if (Test-Path "node_modules\electron\dist\electron.exe") {
    Write-Host "✓ Electron 安装成功!" -ForegroundColor Green
} else {
    Write-Host "✗ Electron 安装失败，尝试手动修复..." -ForegroundColor Red
    Write-Host "请执行: Remove-Item -Recurse -Force node_modules\electron; npm install electron --save-dev" -ForegroundColor Yellow
}

# 启动应用
Write-Host "`n[4/4] 启动开发模式..." -ForegroundColor Yellow
npm run dev
