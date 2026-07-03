const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">價格/金額</label>',
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">單價</label>'
);
content = content.replace(
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">價格</label>',
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">單價</label>'
);
content = content.replace(
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">單件金額</label>',
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">單價</label>'
);
content = content.replace(
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">購入金額</label>',
  '<label className="block text-xs font-bold text-retro-text/75 mb-1">單價</label>'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Done');
