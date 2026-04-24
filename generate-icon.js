/**
 * generate-icon.js
 * 用 Jimp v1.x 生成 Guardian 应用图标
 */
const { Jimp, rgbaToInt } = require('jimp');

async function genIcon() {
  const W = 256, H = 256;
  // v1.x: Jimp 构造函数接受 { width, height, color }
  const img = new Jimp({ width: W, height: H, color: 0x1a1a2eFF });

  const cx = W / 2, cy = H / 2;
  const R = 115;

  // 圆形渐变背景：中心亮 → 边缘暗
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < R) {
        const t = dist / R;
        const r = Math.round(26  + (74  - 26)  * t);
        const g = Math.round(42  + (133 - 42)  * t);
        const b = Math.round(74  + (227 - 74)  * t);
        img.setPixelColor(rgbaToInt(r, g, b, 255), x, y);
      }
    }
  }

  // 画 "G" 字母（Guardian 首字母）
  const S = 52;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const lx = (x - cx) / S;
      const ly = (y - cy) / S;
      const d = Math.sqrt(lx * lx + ly * ly);
      const inChar = (
        // 圆弧（右侧缺口）
        (d > 0.5 && d < 0.85 && lx > -0.3) ||
        // 上横线
        (lx >= -0.3 && lx <= 0.6 && ly >= -0.85 && ly <= -0.55) ||
        // 中横线
        (lx >= -0.3 && lx <= 0.3 && ly >= -0.1 && ly <= 0.2) ||
        // 右竖（连接中横到下弧）
        (lx >= 0.55 && lx <= 0.85 && ly >= -0.1 && ly <= 0.6)
      );
      if (inChar) {
        img.setPixelColor(rgbaToInt(255, 255, 255, 255), x, y);
      }
    }
  }

  await img.write('src/renderer/icon.png');
  console.log('src/renderer/icon.png 已生成 (256x256)');

  // 生成 16x16 小图标
  const img16 = img.clone().resize({ w: 16, h: 16 });
  await img16.write('src/renderer/icon-16.png');
  console.log('src/renderer/icon-16.png 已生成 (16x16)');
}

genIcon().catch(err => { console.error('失败:', err); process.exit(1); });
