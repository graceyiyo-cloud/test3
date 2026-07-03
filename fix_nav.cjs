const fs = require('fs');
let tsx = fs.readFileSync('src/App.tsx', 'utf-8');

tsx = tsx.replace(
  'nav className="fixed bottom-0 left-0 right-0 bg-retro-card border-t border-retro-text/10 flex justify-around items-center pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 max-w-2xl mx-auto overflow-x-auto"',
  'nav className="fixed bottom-0 left-0 right-0 bg-retro-card border-t border-retro-text/10 flex justify-start sm:justify-around items-center pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] px-4 gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 max-w-2xl mx-auto overflow-x-auto"'
);

fs.writeFileSync('src/App.tsx', tsx);
console.log('done nav fix');
