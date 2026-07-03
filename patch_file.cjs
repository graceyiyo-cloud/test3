const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '<div className="rounded-xl overflow-hidden bg-stone-50/50 mt-2">',
  '<div className="rounded-xl overflow-hidden bg-stone-50/50 mt-2 border border-retro-text/10">'
);

content = content.replace(
  '<th className="p-2.5 font-bold text-right whitespace-nowrap">金額</th>',
  '<th className="p-2.5 font-bold text-center whitespace-nowrap">數量</th>\n                                <th className="p-2.5 font-bold text-right whitespace-nowrap">單價</th>'
);

content = content.replace(
  '<td className="p-2.5">{inst.purchasePlace || \'-\'}</td>\n                                    <td className="p-2.5 font-mono font-bold text-right text-retro-secondary">{inst.price !== undefined ? `$${inst.price}` : \'-\'}</td>',
  '<td className="p-2.5">{inst.purchasePlace || \'-\'}</td>\n                                    <td className="p-2.5 font-mono text-center">{inst.qty || \'-\'}</td>\n                                    <td className="p-2.5 font-mono font-bold text-right text-retro-secondary">{inst.price !== undefined ? `$${inst.price}` : \'-\'}</td>'
);

fs.writeFileSync('src/App.tsx', content);
console.log('Patched correctly');
