const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<td className="p-2.5 font-mono font-bold text-right text-retro-secondary">{inst.price !== undefined ? `${inst.price}` : \'-\'}</td>',
  '<td className="p-2.5 font-mono font-bold text-right text-retro-secondary">{inst.price !== undefined ? `$${inst.price}` : \'-\'}</td>'
);

fs.writeFileSync('src/App.tsx', content);
