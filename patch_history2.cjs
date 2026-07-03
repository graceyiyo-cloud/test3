const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const historyCode = `
  // --- Hardware Back Button Handling ---
  const expectedHash = confirmDialog ? '#confirm' 
    : cropImageSrc ? '#crop' 
    : fullscreenImage ? '#image' 
    : showAddForm ? '#add'
    : selectedDetailProduct ? '#detail'
    : (currentTab === 'settings' && settingsView === 'category') ? '#settings-category'
    : (currentTab === 'settings' && settingsView === 'history') ? '#settings-history'
    : (currentTab === 'settings' && settingsView === 'apikey') ? '#settings-apikey'
    : '';

  const getHashDepth = (hash: string) => {
    if (hash === '#confirm') return 5;
    if (hash === '#crop' || hash === '#image') return 4;
    if (hash === '#add' || hash === '#detail') return 3;
    if (hash.startsWith('#settings-')) return 2;
    return 1;
  };

  useEffect(() => {
    const syncUrlToState = () => {
      const currentHash = window.location.hash;
      if (currentHash !== expectedHash) {
        const expectedDepth = getHashDepth(expectedHash);
        const currentDepth = getHashDepth(currentHash);
        
        if (expectedDepth > currentDepth) {
          window.history.pushState(null, '', expectedHash);
        } else if (expectedDepth < currentDepth) {
          // Unwind the stack until it matches
          window.history.back();
        } else {
          window.history.replaceState(null, '', expectedHash);
        }
      }
    };
    
    // Run initially and whenever expectedHash changes
    syncUrlToState();
    
    // Also run when hash changes (e.g. from a back() call unwinding the stack)
    window.addEventListener('hashchange', syncUrlToState);
    return () => window.removeEventListener('hashchange', syncUrlToState);
  }, [expectedHash]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      
      if (hash === '' || hash === '#') {
        setConfirmDialog(null);
        setCropImageSrc(null);
        setFullscreenImage(null);
        setShowAddForm(false);
        setSelectedDetailProduct(null);
        if (settingsView !== 'menu') setSettingsView('menu');
      } else if (hash === '#settings-category') {
        setConfirmDialog(null);
        setCropImageSrc(null);
        setFullscreenImage(null);
        setShowAddForm(false);
        setSelectedDetailProduct(null);
        if (settingsView !== 'category') setSettingsView('category');
      } else if (hash === '#settings-history') {
        setConfirmDialog(null);
        setCropImageSrc(null);
        setFullscreenImage(null);
        setShowAddForm(false);
        setSelectedDetailProduct(null);
        if (settingsView !== 'history') setSettingsView('history');
      } else if (hash === '#settings-apikey') {
        setConfirmDialog(null);
        setCropImageSrc(null);
        setFullscreenImage(null);
        setShowAddForm(false);
        setSelectedDetailProduct(null);
        if (settingsView !== 'apikey') setSettingsView('apikey');
      } else if (hash === '#add') {
        setConfirmDialog(null);
        setCropImageSrc(null);
        setFullscreenImage(null);
        setSelectedDetailProduct(null);
      } else if (hash === '#detail') {
        setConfirmDialog(null);
        setCropImageSrc(null);
        setFullscreenImage(null);
        setShowAddForm(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [settingsView]);
`;

const startStr = '// --- Hardware Back Button Handling ---';
const endStr = '// --- Side Effects & Persistence ---';
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + historyCode + '\n  ' + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Patched App.tsx again');
} else {
  console.log('Could not find markers');
}
