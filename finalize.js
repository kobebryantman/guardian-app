/**
 * finalize.js — 给打包后的 Guardian 应用重命名 exe 并设置图标
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DIST = 'd:/明年计设/guardian-app/dist/Guardian访问守卫';
const APP_NAME = 'Guardian访问守卫';
const ICON_PNG = path.join(DIST, 'icon.png');

console.log('1. 重命名 electron.exe → ' + APP_NAME + '.exe');
const oldExe = path.join(DIST, 'electron.exe');
const newExe = path.join(DIST, APP_NAME + '.exe');
fs.renameSync(oldExe, newExe);
console.log('   ✓ 已重命名');

// 2. 创建 ICO 文件（从 PNG 生成）
console.log('\n2. 从 icon.png 生成 icon.ico...');
try {
  const Jimp = require('jimp');
  const ico = require('jimp/write-templates/ico');

  async function makeIco() {
    const image = await Jimp.read(ICON_PNG);

    // 生成多种尺寸的 ICO
    const sizes = [16, 32, 48, 256];
    const images = await Promise.all(
      sizes.map(s => {
        const img = image.clone();
        img.resize(s, s);
        return img;
      })
    );

    // 保存为 ICO
    await image.writeAsync(path.join(DIST, 'icon.ico'));
    console.log('   ✓ icon.ico 已生成');
  }
  makeIco().catch(e => console.log('   ⚠ ICO生成跳过:', e.message));
} catch(e) {
  console.log('   ⚠ 图标生成跳过（jimp 不可用）');
}

// 3. 更新启动脚本（直接运行新 exe 名称）
console.log('\n3. 更新启动脚本...');
const bat = `@echo off
title ${APP_NAME}
cd /d "%~dp0"
start "" "${APP_NAME}.exe" --disable-gpu --no-sandbox "%~dp0resources\\app"
`;
fs.writeFileSync(path.join(DIST, '启动Guardian.bat'), bat, 'utf-8');
console.log('   ✓ 启动脚本已更新');

// 4. 创建桌面快捷方式（PowerShell 脚本）
console.log('\n4. 创建桌面快捷方式...');
const wshShellCode = `
Set WshShell = CreateObject("WScript.Shell")
Set oShell = CreateObject("Shell.Application")
Set oFolder = oShell.Namespace(&H10)  ' CSIDL_DESKTOP
Set oFolderItem = oFolder.ParseName(oFolder.Title)
Set oLinks = oFolderItem.GetFolder

' 创建快捷方式对象（通过文件系统）
Dim desktopPath
Set oEnv = WshShell.Environment("PROCESS")
desktopPath = oEnv("USERPROFILE") & "\\Desktop"

Dim oShortcut
Set oShortcut = WshShell.CreateShortcut(desktopPath & "\\${APP_NAME}.lnk")
oShortcut.TargetPath = WshShell.CurrentDirectory & "\\${APP_NAME}.exe"
oShortcut.WorkingDirectory = WshShell.CurrentDirectory
oShortcut.Description = "Guardian 访问守卫 - 机房网页管控"
oShortcut.Save

WScript.Echo "快捷方式已创建在桌面"
`.trim();

fs.writeFileSync(path.join(DIST, '创建快捷方式.vbs'), wshShellCode, 'utf-8');
console.log('   ✓ VBS 脚本已生成（双击运行以创建桌面快捷方式）');

console.log('\n======================================');
console.log('最终目录: ' + DIST);
console.log('主程序: ' + APP_NAME + '.exe (' + (fs.statSync(newExe).size / 1024 / 1024).toFixed(1) + ' MB)');
console.log('======================================');
console.log('\n使用说明:');
console.log('1. 直接双击 "' + APP_NAME + '.exe" 启动 Guardian');
console.log('2. 双击 "启动Guardian.bat" 启动');
console.log('3. 双击 "创建快捷方式.vbs" 在桌面创建快捷方式');
console.log('4. 教师端运行: 打开命令行, cd 到此目录, 输入: node server.js');
console.log('   然后浏览器打开 http://localhost:3847');
