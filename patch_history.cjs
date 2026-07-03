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
    const currentHash = window.location.hash;
    if (currentHash !== expectedHash) {
      const expectedDepth = getHashDepth(expectedHash);
      const currentDepth = getHashDepth(currentHash);
      
      if (expectedDepth > currentDepth) {
        window.history.pushState(null, '', expectedHash);
      } else if (expectedDepth < currentDepth) {
        // We closed something programmatically.
        // We use replaceState if we just want to clear the URL without messing up history too much,
        // but history.back() is better to actually pop the stack.
        // However, if the user navigated multiple layers, a single back() might not be enough.
        // For simplicity, a single back() usually works for 1 layer closing.
        window.history.back();
      } else {
        // Same depth, different hash (e.g. switching between siblings? shouldn't happen here)
        window.history.replaceState(null, '', expectedHash);
      }
    }
  }, [expectedHash]);

  useEffect(() => {
    const handleHashChange = () => {
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
        // keep settingsView as is
      } else if (hash === '#detail') {
        setConfirmDialog(null);
        setCropImageSrc(null);
        setFullscreenImage(null);
        setShowAddForm(false);
        // keep settingsView as is
      }
      // if #confirm, #crop, #image, we don't force close the others because they are children!
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [settingsView]);
`;

// Replace the old useEffect with the new one
const startStr = '// --- Hardware Back Button Handling ---';
const endStr = '// --- Side Effects & Persistence ---';
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + historyCode + '\n  ' + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Patched App.tsx');
} else {
  console.log('Could not find markers');
}
