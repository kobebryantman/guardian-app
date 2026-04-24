var fs = require('fs');
var d = 'd:/明年计设/guardian-app/dist/Guardian访问守卫';
var files = fs.readdirSync(d);
console.log('输出目录内容:');
files.forEach(function(f) {
  var s = fs.statSync(d + '/' + f);
  var size = s.isDirectory() ? '[DIR]' : (s.size > 1024 * 1024 ? (s.size / 1024 / 1024).toFixed(1) + 'MB' : s.size > 1024 ? (s.size / 1024).toFixed(0) + 'KB' : s.size + 'B');
  console.log('  ' + (s.isDirectory() ? '[DIR]' : '[FILE]') + ' ' + f + ' ' + size);
});

// 检查 exe 文件是否存在
var exeExists = fs.existsSync(d + '/Guardian访问守卫.exe');
console.log('\n主程序 exe 存在: ' + exeExists);
