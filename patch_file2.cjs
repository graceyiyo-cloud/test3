const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">金額</label>',
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">單價</label>'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched amount to unit price correctly');
