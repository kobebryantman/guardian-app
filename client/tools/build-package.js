/**
 * build-package.js
 * 手动打包 Guardian 学生端为可分发目录（不需要 electron-builder）
 *
 * 功能：
 *   1. 复制 electron.exe + 项目文件到 dist/
 *   2. 重命名 exe 为应用名称
 *   3. 生成启动脚本和桌面快捷方式 VBS
 *   4. 验证打包目录
 *
 * 用法：node tools/build-package.js
 * 输出：dist/Guardian访问守卫/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const APP_NAME = 'Guardian访问守卫';
const OUTPUT_DIR = path.join(PROJECT_DIR, 'dist', APP_NAME);
const ELECTRON_DIST = path.join(PROJECT_DIR, 'node_modules', 'electron', 'dist');
const ELECTRON_EXE = path.join(ELECTRON_DIST, 'electron.exe');

// ---------- 步骤 1: 复制 ----------
console.log('检查 electron 模块...');
if (!fs.existsSync(ELECTRON_EXE)) {
  console.error('错误：找不到 electron.exe');
  console.log('electron dist 目录内容：', fs.readdirSync(ELECTRON_DIST));
  process.exit(1);
}
console.log('✓ electron.exe 存在');

if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('\n复制 electron 主程序...');
const electronFiles = fs.readdirSync(ELECTRON_DIST);
electronFiles.forEach(f => {
  const src = path.join(ELECTRON_DIST, f);
  const dest = path.join(OUTPUT_DIR, f);
  try {
    copyDir(src, dest);
    const size = (fs.statSync(dest).size / 1024 / 1024).toFixed(1);
    console.log(`  ✓ ${f} (${size} MB)`);
  } catch (e) {
    if (e.code === 'EPERM') {
      console.log(`  跳过(占用): ${f}`);
    } else {
      throw e;
    }
  }
});

console.log('\n复制 resources 目录...');
const resourcesDest = path.join(OUTPUT_DIR, 'resources');
fs.mkdirSync(resourcesDest, { recursive: true });

const appDest = path.join(resourcesDest, 'app');
fs.mkdirSync(appDest, { recursive: true });
fs.readdirSync(path.join(PROJECT_DIR, 'src')).forEach(f => {
  copyDir(path.join(PROJECT_DIR, 'src', f), path.join(appDest, f));
});
console.log('  ✓ src/');

const dataSrc = path.join(PROJECT_DIR, 'data');
if (fs.existsSync(dataSrc)) {
  const dataDest = path.join(resourcesDest, 'data');
  fs.mkdirSync(dataDest, { recursive: true });
  copyDir(dataSrc, dataDest);
  console.log('  ✓ data/');
}

console.log('\n复制 node_modules（仅运行时需要的包）...');
const runtimeModules = ['ws', 'better-sqlite3'];
const nodeModulesDest = path.join(appDest, 'node_modules');
runtimeModules.forEach(mod => {
  const src = path.join(PROJECT_DIR, 'node_modules', mod);
  if (fs.existsSync(src)) {
    copyDir(src, path.join(nodeModulesDest, mod));
    console.log('  ✓ ' + mod);
  } else {
    console.log('  ✗ ' + mod + ' (不存在)');
  }
});

// ---------- 步骤 2: 重命名 exe ----------
console.log('\n重命名 electron.exe → ' + APP_NAME + '.exe');
const oldExe = path.join(OUTPUT_DIR, 'electron.exe');
const newExe = path.join(OUTPUT_DIR, APP_NAME + '.exe');
if (fs.existsSync(oldExe)) {
  fs.renameSync(oldExe, newExe);
  console.log('  ✓ 已重命名');
}

// ---------- 步骤 3: 生成启动脚本 ----------
console.log('\n生成启动脚本...');
const batContent = `@echo off
title ${APP_NAME}
cd /d "%~dp0"
start "" "${APP_NAME}.exe" --disable-gpu --no-sandbox "%~dp0resources\\app"
`;
fs.writeFileSync(path.join(OUTPUT_DIR, '启动Guardian.bat'), batContent, 'utf-8');
console.log('  ✓ 启动Guardian.bat');

const vbsContent = `
Set WshShell = CreateObject("WScript.Shell")
Set oShell = CreateObject("Shell.Application")
Set oFolder = oShell.Namespace(&H10)
Set oFolderItem = oFolder.ParseName(oFolder.Title)
Set oLinks = oFolderItem.GetFolder

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
fs.writeFileSync(path.join(OUTPUT_DIR, '创建快捷方式.vbs'), vbsContent, 'utf-8');
console.log('  ✓ 创建快捷方式.vbs');

// ---------- 步骤 4: 验证 ----------
console.log('\n验证打包目录...');
const files = fs.readdirSync(OUTPUT_DIR);
files.forEach(function(f) {
  const s = fs.statSync(path.join(OUTPUT_DIR, f));
  const size = s.isDirectory()
    ? '[DIR]'
    : (s.size > 1024 * 1024 ? (s.size / 1024 / 1024).toFixed(1) + ' MB' : s.size > 1024 ? (s.size / 1024).toFixed(0) + ' KB' : s.size + ' B');
  console.log('  ' + (s.isDirectory() ? '[DIR]' : '[FILE]') + '  ' + f + '  ' + size);
});

const exeExists = fs.existsSync(newExe);
console.log('主程序 exe 存在: ' + exeExists);

const appPkg = {
  name: 'guardian-app',
  version: '1.0.0',
  main: 'src/main.js'
};
fs.writeFileSync(path.join(appDest, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf-8');

const iconSrc = path.join(PROJECT_DIR, 'src', 'renderer', 'icon.png');
const iconDest = path.join(OUTPUT_DIR, 'icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, iconDest);
  console.log('✓ icon.png');
}

console.log('\n========================================');
console.log('打包完成！');
console.log('输出目录:', OUTPUT_DIR);
console.log('主程序: ' + APP_NAME + '.exe (' + (fs.existsSync(newExe) ? (fs.statSync(newExe).size / 1024 / 1024).toFixed(1) : '?') + ' MB)');
console.log('\n使用方式:');
console.log('1. 双击 "' + APP_NAME + '.exe" 启动 Guardian');
console.log('2. 双击 "启动Guardian.bat" 启动');
console.log('3. 双击 "创建快捷方式.vbs" 在桌面创建快捷方式');
console.log('========================================');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyDir(path.join(src, child), path.join(dest, child));
    });
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    try {
      fs.copyFileSync(src, dest);
    } catch (e) {
      if (e.code === 'EPERM') {
        console.log('  跳过(占用): ' + path.basename(src));
      } else {
        throw e;
      }
    }
  }
}
