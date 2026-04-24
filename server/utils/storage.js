/**
 * JSON 文件读写工具
 */
const fs = require('fs');

function loadJSON(file, defaults) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) { console.error('loadJSON error', file, e.message); }
  return defaults;
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { loadJSON, saveJSON };
