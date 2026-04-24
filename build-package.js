/**
 * build-package.js
 * 手动打包 Guardian 应用为可分发目录（不需要 electron-builder）
 * 直接复制 electron + 项目文件，生成可直接双击运行的 exe
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = __dirname;
const OUTPUT_DIR = path.join(PROJECT_DIR, 'dist', 'Guardian访问守卫');
const ELECTRON_MOD = path.join(PROJECT_DIR, 'node_modules', 'electron');
const ELECTRON_EXE = path.join(ELECTRON_MOD, 'dist', 'electron.exe');

console.log('检查 electron 模块...');
if (!fs.existsSync(ELECTRON_EXE)) {
  console.error('错误：找不到 electron.exe');
  console.log('electron dist 目录内容：', fs.readdirSync(path.join(ELECTRON_MOD, 'dist')));
  process.exit(1);
}
console.log('✓ electron.exe 存在');

// 创建输出目录
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 复制 electron 主程序
console.log('\n复制 electron 主程序...');
const electronDist = path.join(ELECTRON_MOD, 'dist');
const electronFiles = fs.readdirSync(electronDist);
electronFiles.forEach(f => {
  const src = path.join(electronDist, f);
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

// 复制 resources 目录
console.log('\n复制 resources 目录...');
const resourcesSrc = path.join(PROJECT_DIR, 'node_modules', 'electron', 'dist', 'resources');
const resourcesDest = path.join(OUTPUT_DIR, 'resources');
fs.mkdirSync(resourcesDest, { recursive: true });

// 复制项目的 app 资源
const appSrc = path.join(PROJECT_DIR, 'src');
const appDest = path.join(resourcesDest, 'app');
fs.mkdirSync(appDest, { recursive: true });
fs.readdirSync(appSrc).forEach(f => {
  copyDir(path.join(appSrc, f), path.join(appDest, f));
});
console.log('  ✓ src/');

// 复制 server.js 和 remote-client.js
['server.js', 'remote-client.js'].forEach(f => {
  const src = path.join(PROJECT_DIR, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(appDest, f));
    console.log(`  ✓ ${f}`);
  }
});

// 复制 public 目录
const publicSrc = path.join(PROJECT_DIR, 'public');
if (fs.existsSync(publicSrc)) {
  const publicDest = path.join(appDest, 'public');
  fs.mkdirSync(publicDest, { recursive: true });
  copyDir(publicSrc, publicDest);
  console.log('  ✓ public/');
}

// 复制 data 目录
const dataSrc = path.join(PROJECT_DIR, 'data');
if (fs.existsSync(dataSrc)) {
  const dataDest = path.join(resourcesDest, 'data');
  fs.mkdirSync(dataDest, { recursive: true });
  copyDir(dataSrc, dataDest);
  console.log('  ✓ data/');
}

// 复制 node_modules（仅运行时需要的包）
console.log('\n复制 node_modules...');
const runtimeModules = ['ws', 'express', 'better-sqlite3'];
const nodeModulesSrc = path.join(PROJECT_DIR, 'node_modules');
const nodeModulesDest = path.join(appDest, 'node_modules');

runtimeModules.forEach(mod => {
  const src = path.join(nodeModulesSrc, mod);
  if (fs.existsSync(src)) {
    const dest = path.join(nodeModulesDest, mod);
    copyDir(src, dest);
    console.log(`  ✓ ${mod}`);
  } else {
    console.log(`  ✗ ${mod} (不存在)`);
  }
});

// 生成启动脚本
const launchScript = `@echo off
title Guardian 访问守卫
cd /d "%~dp0"
start "" "Guardian访问守卫.exe" --disable-gpu --no-sandbox "%~dp0resources\\app"
`;

fs.writeFileSync(path.join(OUTPUT_DIR, '启动Guardian.bat'), launchScript, 'utf-8');
console.log('\n✓ 启动脚本已生成');

// 生成 package.json（打包后的 app 用）
const appPkg = {
  name: 'guardian-app',
  version: '1.0.0',
  main: 'src/main.js'
};
fs.writeFileSync(path.join(appDest, 'package.json'), JSON.stringify(appPkg, null, 2), 'utf-8');

// 复制自定义图标
const iconSrc = path.join(PROJECT_DIR, 'src', 'renderer', 'icon.png');
const iconDest = path.join(OUTPUT_DIR, 'icon.png');
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, iconDest);
  console.log('✓ icon.png');
}

console.log('\n========================================');
console.log('打包完成！');
console.log('输出目录:', OUTPUT_DIR);
console.log('\n运行方式:');
console.log('1. 双击 "启动Guardian.bat" 启动应用');
console.log('2. 或者直接双击 "Guardian访问守卫.exe"');
console.log('3. 教师端: 在此目录按住 Shift 右键，选择"在此处打开命令行"，输入:');
console.log('   node server.js');
console.log('   然后浏览器打开 http://localhost:3847');
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
        // 文件被占用，跳过
        console.log(`  跳过(占用): ${path.basename(src)}`);
      } else {
        throw e;
      }
    }
  }
}
