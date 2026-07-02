import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle, logOut } from './firebase';
import { 
  Sparkles, 
  Droplets, 
  Pill, 
  Settings, 
  Camera, 
  Plus, 
  Search, 
  Package, 
  Droplet, 
  Edit3, 
  Archive, 
  Trash2, 
  GripVertical, 
  ListTree, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  X, 
  Info, 
  Calendar,
  Heart,
  Star,
  ShoppingBag,
  ShoppingCart,
  ChevronRight,
  History,
  LucideIcon
} from 'lucide-react';
import { Category, Product, ProductInstance } from './types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from './data';
import { 
  calculateDaysToExpiry, 
  calculatePaoExpiry, 
  checkAllOpenedExpiredProducts 
} from './utils';

// Helper component to render icons based on category settings
const IconMap: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  droplets: Droplets,
  pill: Pill,
  package: Package,
  'shopping-bag': ShoppingBag,
  heart: Heart,
  star: Star,
  settings: Settings
};

function CategoryIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  const IconComponent = IconMap[name] || Sparkles;
  return <IconComponent className={className} />;
}

function MainApp({ user }: { user: User }) {
  // --- Core State ---
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load user data from Firestore on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.categories) setCategories(data.categories);
          if (data.products) setProducts(data.products);
        }
      } catch (err) {
        console.error('Error loading data', err);
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadUserData();
  }, [user.uid]);

  // Save to Firestore whenever data changes (debounce or just save directly since it's simple)
  useEffect(() => {
    if (!isDataLoaded) return;
    const saveUserData = async () => {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          categories,
          products,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error('Error saving data', err);
      }
    };
    saveUserData();
  }, [categories, products, isDataLoaded, user.uid]);

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('cosmetics_gemini_api_key') || '';
  });

  const [currentTab, setCurrentTab] = useState<string>(() => {
    return categories[0]?.id || 'makeup';
  });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set(['prod_1']));

  // --- Gemini API Loading States ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [aiStatusText, setAiStatusText] = useState('正在處理圖片...');

  // --- Form Input States ---
  const [formBrand, setFormBrand] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('makeup');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formCapacity, setFormCapacity] = useState('');
  const [formCapacityUnit, setFormCapacityUnit] = useState('ml');
  const [formUsage, setFormUsage] = useState<'使用中' | '未開封' | '已用完' | '已丟棄'>('使用中');
  const [formThreshold, setFormThreshold] = useState<number | string>(0);
  const [formExpiry, setFormExpiry] = useState('');
  const [formPaoMonths, setFormPaoMonths] = useState<string>(''); // PAO 可使用月數
  const [formOpenedDate, setFormOpenedDate] = useState(''); // 開封日期
  const [formFinishedDate, setFormFinishedDate] = useState(''); // 用完或丟棄的日期
  const [formPhoto, setFormPhoto] = useState<string>(''); // Base64 string
  const [formPurchaseDate, setFormPurchaseDate] = useState('');
  const [formPurchasePlace, setFormPurchasePlace] = useState('');
  const [formPrice, setFormPrice] = useState('');

  // Product Master Detail View State
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'status' | 'purchase' | 'usage'>('status');

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Fullscreen Image Modal State
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const askConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  };

  // Editing state
  const [editingInstanceId, setEditingInstanceId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isEditingMaster, setIsEditingMaster] = useState(false);
  const [isAddingInstanceToExisting, setIsAddingInstanceToExisting] = useState(false);

  // --- Setting View States ---
  const [settingsView, setSettingsView] = useState<'menu' | 'apikey' | 'category' | 'history'>('menu');
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('sparkles');
  const [activeCategoryForSub, setActiveCategoryForSub] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [editingSubCatId, setEditingSubCatId] = useState<string | null>(null);
  const [editingSubIdx, setEditingSubIdx] = useState<number | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSaveApiKey = () => {
    localStorage.setItem('cosmetics_gemini_api_key', apiKeyInput);
    setGeminiApiKey(apiKeyInput);
    showToast('Gemini API 金鑰儲存成功！');
  };

  // --- Notification Center States ---
  const [expiredPaoItems, setExpiredPaoItems] = useState<any[]>([]);
  const [showNotificationBanner, setShowNotificationBanner] = useState(true);

  // --- Drag & Drop Reordering States ---
  const [draggedCatIdx, setDraggedCatIdx] = useState<number | null>(null);
  const [draggedSubIdx, setDraggedSubIdx] = useState<number | null>(null);
  const [draggedSubCatId, setDraggedSubCatId] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPhotoInputRef = useRef<HTMLInputElement>(null);

  // --- Side Effects & Persistence ---
  useEffect(() => {
    // Re-evaluate expired PAO products whenever products change
    const expired = checkAllOpenedExpiredProducts(products);
    setExpiredPaoItems(expired);
  }, [products]);

  useEffect(() => {
    // Initial scan for expired items
    const expired = checkAllOpenedExpiredProducts(products);
    setExpiredPaoItems(expired);
  }, []);

  // Sync tab with updated categories if current tab's category was deleted
  useEffect(() => {
    if (currentTab !== 'settings' && currentTab !== 'history' && !categories.some(c => c.id === currentTab)) {
      if (categories.length > 0) {
        setCurrentTab(categories[0].id);
      } else {
        setCurrentTab('settings');
      }
    }
  }, [categories, currentTab]);

  // Handle Usage status switch - auto fill open date if usage is '使用中' and it is blank
  useEffect(() => {
    if (formUsage === '使用中' && !formOpenedDate) {
      setFormOpenedDate(new Date().toISOString().split('T')[0]);
    }
    if ((formUsage === '已用完' || formUsage === '已丟棄') && !formFinishedDate) {
      setFormFinishedDate(new Date().toISOString().split('T')[0]);
    }
  }, [formUsage]);

  // --- Toast Manager ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // --- File uploads & Photo Handling ---
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isFormPhoto: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isFormPhoto) {
          setFormPhoto(reader.result as string);
        } else {
          // Camera scan trigger
          triggerAiScan(reader.result as string, file.type);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- API Call: Gemini Web Search & Image Recognition ---
  const triggerAiScan = async (base64Data: string, mimeType: string) => {
    if (!geminiApiKey) {
      showToast('尚未設定 API Key，請在設定頁面輸入金鑰！');
      return;
    }

    setIsAnalyzing(true);
    setAiStatusText('正在上傳並解析圖片...');

    try {
      const base64String = base64Data.split(',')[1];
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
      
      const payload = {
        contents: [{
          role: "user",
          parts: [
            { text: "分析此化妝品/保養品/商品圖片，辨識出品牌名稱（brand）與產品全名（name），並判斷類別（category）。回傳嚴格的 JSON 格式，包含三個 key: 'brand' (字串), 'name' (字串), 'category' (字串，請從現有的分類推測，盡量回傳英文id如 makeup, skincare, supplement)。只回傳純 JSON 內容即可，不要包裝 markdown 三個反引號。" },
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64String } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        const data = JSON.parse(text.trim());
        setFormBrand(data.brand || '');
        setFormName(data.name || '');
        
        // Find if detected category matches our options
        const matchCat = categories.find(c => c.id === data.category || c.name.includes(data.category));
        if (matchCat) {
          setFormCategory(matchCat.id);
        } else {
          setFormCategory(categories[0]?.id || 'makeup');
        }

        setFormPhoto(base64Data);
        setEditingInstanceId(null);
        setEditingProductId(null);
        
        // Reset secondary form items
        setFormQty(1);
        setFormCapacity('');
        setFormCapacityUnit('ml');
        setFormUsage('使用中');
        setFormThreshold(0);
        setFormExpiry('');
        setFormPaoMonths('');
        setFormOpenedDate(new Date().toISOString().split('T')[0]);
        setFormFinishedDate('');

        setShowAddForm(true);
        showToast('AI 影像辨識成功，已將資料填入表單！');
      } else {
        throw new Error('No parsing results returned.');
      }
    } catch (err) {
      console.error(err);
      showToast('AI 辨識失敗，請檢查 API Key 是否正確。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAiWebSearch = async (e: React.MouseEvent) => {
    e.preventDefault();
    const keyword = `${formBrand} ${formName}`.trim();
    if (keyword.length < 2) {
      showToast('請至少輸入品牌或產品名稱再進行搜尋！');
      return;
    }

    if (!geminiApiKey) {
      showToast('尚未設定 API 金鑰！請至設定頁面設定您的 Gemini API Key。');
      return;
    }

    setIsSearchingAi(true);

    // Try with Google Search tool first
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`;
      const payload = {
        contents: [{
          parts: [{
            text: `你是一個專業的化妝品與保養品資料庫助理。
請針對使用者輸入的產品關鍵字 "${keyword}" 進行 Google 網路搜尋，尋找其對應的「官方中文/英文品牌名稱」與「官方完整產品全名」（例如：輸入「怪獸唇膏」應帶出品牌「KATE」、產品名「凱婷怪獸級持色唇膏」）。

請將網路搜尋得到的確切資訊，以下列嚴格的 JSON 格式回傳：
{
  "brand": "官方品牌中文或英文名稱 (例如 KATE、Dior、雅詩蘭黛、凱婷)",
  "name": "官方完整產品名稱 (例如 凱婷怪獸級持色唇膏、迪奧精萃再生玫瑰微導粉底)"
}

請務必使用 Google 搜尋工具。
不要回傳任何額外的 Markdown 標籤、註解或說明文字。只回傳 JSON 格式字串。`
          }]
        }],
        tools: [{ googleSearch: {} }],
        generationConfig: { 
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Google Search query failed: ${response.status}`);
      }

      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
        }
        const data = JSON.parse(cleaned);
        if (data.brand) setFormBrand(data.brand);
        if (data.name) setFormName(data.name);
        showToast('品名網搜補全完成！');
        return;
      }
    } catch (err) {
      console.warn('Google Search tool failed, trying fallback model generation...', err);
    }

    // Fallback: Try WITHOUT Google Search tool, using pre-trained knowledge
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`;
      const payload = {
        contents: [{
          parts: [{
            text: `你是一個專業的化妝品與保養品資料庫助理。
請針對產品關鍵字 "${keyword}"，根據你的知識庫，查出其對應的「官方中文/英文品牌名稱」與「官方完整產品全名」（例如：輸入「怪獸唇膏」應帶出品牌「KATE」、產品名「凱婷怪獸級持色唇膏」）。

請將正確的資訊，以下列嚴格的 JSON 格式回傳：
{
  "brand": "官方品牌中文或英文名稱 (例如 KATE、Dior、雅詩蘭黛、凱婷)",
  "name": "官方完整產品名稱 (例如 凱婷怪獸級持色唇膏、迪奧精萃再生玫瑰微導粉底)"
}

不要回傳任何額外的 Markdown 標籤、註解或說明文字。只回傳 JSON 格式字串。`
          }]
        }],
        generationConfig: { 
          responseMimeType: "application/json"
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Fallback model query failed: ${response.status}`);
      }

      const result = await response.json();
      let text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        let cleaned = text.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
        }
        const data = JSON.parse(cleaned);
        if (data.brand) setFormBrand(data.brand);
        if (data.name) setFormName(data.name);
        showToast('品名 AI 補全完成！');
      } else {
        showToast('未搜尋到更完整的產品資訊。');
      }
    } catch (err) {
      console.error('All search/generation attempts failed:', err);
      showToast('網搜補全失敗，請改為手動輸入。');
    } finally {
      setIsSearchingAi(false);
    }
  };

  // --- Category Actions & drag/drop Reordering ---
  const handleCatDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCatIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCatDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCatIdx === null || draggedCatIdx === index) return;
    const newCats = [...categories];
    const draggedCat = newCats[draggedCatIdx];
    newCats.splice(draggedCatIdx, 1);
    newCats.splice(index, 0, draggedCat);
    setCategories(newCats);
    setDraggedCatIdx(null);
    showToast('大分類排序已更新！');
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) {
      showToast('請輸入大分類名稱！');
      return;
    }
    const newId = `cat_${Date.now()}`;
    const newCat: Category = {
      id: newId,
      name: newCatName.trim(),
      icon: newCatIcon,
      subcategories: []
    };
    setCategories([...categories, newCat]);
    setNewCatName('');
    showToast(`已成功建立大分類「${newCat.name}」！`);
  };

  const handleDeleteCategory = (catId: string) => {
    if (categories.length <= 1) {
      showToast('至少必須保留一個分類！');
      return;
    }
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    askConfirmation(
      '刪除大分類',
      `確定要刪除「${cat.name}」分類嗎？\n(注意：該分類下的所有商品在主畫面中將暫時無法顯示)`,
      () => {
        setCategories(categories.filter(c => c.id !== catId));
        showToast(`已刪除大分類「${cat.name}」`);
      }
    );
  };

  // --- Subcategory Actions & Reordering (Requirement 1) ---
  const handleSubDragStart = (e: React.DragEvent, categoryId: string, index: number) => {
    setDraggedSubIdx(index);
    setDraggedSubCatId(categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSubDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSubDrop = (e: React.DragEvent, categoryId: string, index: number) => {
    e.preventDefault();
    if (draggedSubIdx === null || draggedSubCatId !== categoryId || draggedSubIdx === index) return;

    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        const newSubs = [...cat.subcategories];
        const draggedSub = newSubs[draggedSubIdx];
        newSubs.splice(draggedSubIdx, 1);
        newSubs.splice(index, 0, draggedSub);
        return { ...cat, subcategories: newSubs };
      }
      return cat;
    });

    setCategories(updated);
    setDraggedSubIdx(null);
    setDraggedSubCatId(null);
    showToast('小分類拖曳排序已更新！');
  };

  const handleAddSubcategory = (catId: string) => {
    if (!newSubName.trim()) {
      showToast('請輸入小分類名稱！');
      return;
    }
    const updated = categories.map(cat => {
      if (cat.id === catId) {
        if (cat.subcategories.includes(newSubName.trim())) {
          showToast('此小分類名稱已存在於大分類中！');
          return cat;
        }
        return { ...cat, subcategories: [...cat.subcategories, newSubName.trim()] };
      }
      return cat;
    });
    setCategories(updated);
    setNewSubName('');
    showToast(`已在分類中新增小分類「${newSubName.trim()}」`);
  };

  const handleDeleteSubcategory = (catId: string, subIndex: number) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    const subName = cat.subcategories[subIndex];
    askConfirmation(
      '刪除小分類',
      `確定要刪除「${cat.name}」底下的小分類「${subName}」嗎？`,
      () => {
        const updated = categories.map(c => {
          if (c.id === catId) {
            return {
              ...c,
              subcategories: c.subcategories.filter((_, idx) => idx !== subIndex)
            };
          }
          return c;
        });
        setCategories(updated);
        showToast(`已成功移除小分類「${subName}」`);
      }
    );
  };

  const handleSaveSubcategory = (catId: string, subIndex: number) => {
    if (!editingSubName.trim()) {
      showToast('小分類名稱不能為空！');
      return;
    }
    const updated = categories.map(c => {
      if (c.id === catId) {
        const newSubs = [...c.subcategories];
        newSubs[subIndex] = editingSubName.trim();
        return { ...c, subcategories: newSubs };
      }
      return c;
    });
    setCategories(updated);
    setEditingSubCatId(null);
    setEditingSubIdx(null);
    showToast('小分類名稱已成功修改！');
  };

  // --- Product CRUD Actions ---
  const toggleExpandProduct = (prodId: string) => {
    const next = new Set(expandedProductIds);
    if (next.has(prodId)) {
      next.delete(prodId);
    } else {
      next.add(prodId);
    }
    setExpandedProductIds(next);
  };

  const clearForm = () => {
    setFormBrand('');
    setFormName('');
    setFormCategory(currentTab !== 'settings' && currentTab !== 'history' ? currentTab : categories[0]?.id || 'makeup');
    setFormSubcategory('');
    setFormQty(1);
    setFormCapacity('');
    setFormCapacityUnit('ml');
    setFormUsage('使用中');
    setFormThreshold(0);
    setFormExpiry('');
    setFormPaoMonths('');
    setFormOpenedDate(new Date().toISOString().split('T')[0]);
    setFormFinishedDate('');
    setFormPhoto('');
    setFormPurchaseDate('');
    setFormPurchasePlace('');
    setFormPrice('');
    setEditingInstanceId(null);
    setEditingProductId(null);
    setIsEditingMaster(false);
    setIsAddingInstanceToExisting(false);
  };

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    setShowAddForm(false);
    clearForm();
    if (tabId === 'settings') {
      setSettingsView('menu');
    }
  };

  const handleFormSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('請輸入產品名稱！');
      return;
    }

    let subcatValue = formSubcategory.trim();
    if (subcatValue === '自訂子分類' || !subcatValue) {
      subcatValue = '其他';
    }
    const paoVal = formPaoMonths ? parseInt(formPaoMonths) : undefined;
    const openedVal = (formUsage === '使用中' || formUsage === '已用完' || formUsage === '已丟棄') ? formOpenedDate : undefined;
    const finishedVal = (formUsage === '已用完' || formUsage === '已丟棄') ? formFinishedDate : undefined;

    const purchaseDateVal = formPurchaseDate || undefined;
    const purchasePlaceVal = formPurchasePlace.trim() || undefined;
    const priceVal = formPrice ? parseFloat(formPrice) : undefined;
    const finalCapacity = formCapacity ? `${formCapacity}${formCapacityUnit}` : '';

    // A. Edit Master Product Info ONLY (Requirement: Button 3 - editing master info of the product group)
    if (editingProductId && !editingInstanceId) {
      const updatedProducts = products.map(prod => {
        if (prod.id === editingProductId) {
          return {
            ...prod,
            category: formCategory,
            subcategory: subcatValue,
            brand: formBrand.trim(),
            name: formName.trim(),
            photo: formPhoto || prod.photo,
            threshold: Number(formThreshold) || 0
          };
        }
        return prod;
      });
      setProducts(updatedProducts);
      showToast('產品大品項資料修改成功！');
      setShowAddForm(false);
      clearForm();
      return;
    }

    // B. Edit Existing Product Instance
    if (editingInstanceId && editingProductId) {
      const updatedProducts = products.map(prod => {
        if (prod.id === editingProductId) {
          // If the meta parameters (category, brand, subcategory, name) changed, 
          // we might want to migrate or update them.
          const isMetaChanged = 
            prod.category !== formCategory || 
            prod.subcategory !== subcatValue || 
            prod.brand !== formBrand.trim() || 
            prod.name !== formName.trim();

          if (isMetaChanged) {
            // Remove instance from this product
            const filteredInstances = prod.instances.filter(inst => inst.id !== editingInstanceId);
            return { ...prod, instances: filteredInstances };
          } else {
            // In-place update of instance
            const updatedInstances = prod.instances.map(inst => {
              if (inst.id === editingInstanceId) {
                return {
                  ...inst,
                  qty: formQty,
                  capacity: finalCapacity,
                  usage: formUsage,
                  expiry: formExpiry,
                  paoMonths: paoVal,
                  openedDate: openedVal,
                  finishedDate: finishedVal,
                  purchaseDate: purchaseDateVal,
                  purchasePlace: purchasePlaceVal,
                  price: priceVal
                };
              }
              return inst;
            });
            return {
              ...prod,
              photo: formPhoto || prod.photo,
              instances: updatedInstances
            };
          }
        }
        return prod;
      }).filter(p => p.instances.length > 0); // Remove products with 0 instances

      // If meta parameters changed, we insert this instance as new item or group under another matching product
      const isMetaChangedInForm = products.find(p => p.id === editingProductId)?.category !== formCategory ||
                                  products.find(p => p.id === editingProductId)?.subcategory !== subcatValue ||
                                  products.find(p => p.id === editingProductId)?.brand !== formBrand.trim() ||
                                  products.find(p => p.id === editingProductId)?.name !== formName.trim();

      if (isMetaChangedInForm) {
        // Find if there's an existing matching product group to merge into
        const matchProd = updatedProducts.find(p => 
          p.category === formCategory && 
          p.subcategory === subcatValue && 
          p.brand === formBrand.trim() && 
          p.name === formName.trim() && 
          p.status === 'active'
        );

        const newInstance: ProductInstance = {
          id: editingInstanceId,
          qty: formQty,
          capacity: finalCapacity,
          usage: formUsage,
          expiry: formExpiry,
          paoMonths: paoVal,
          openedDate: openedVal,
          finishedDate: finishedVal,
          purchaseDate: purchaseDateVal,
          purchasePlace: purchasePlaceVal,
          price: priceVal
        };

        if (matchProd) {
          matchProd.instances.push(newInstance);
          if (formPhoto) matchProd.photo = formPhoto;
        } else {
          const newProduct: Product = {
            id: `prod_${Date.now()}`,
            category: formCategory,
            subcategory: subcatValue,
            brand: formBrand.trim(),
            name: formName.trim(),
            photo: formPhoto || undefined,
            status: 'active',
            threshold: Number(formThreshold) || 0,
            instances: [newInstance]
          };
          updatedProducts.push(newProduct);
        }
      }

      setProducts(updatedProducts);
      showToast('明細修改成功！');
    } else {
      // C. Create New Product Group or Add Instance to Existing
      const newInstance: ProductInstance = {
        id: `inst_${Date.now()}`,
        qty: formQty,
        capacity: finalCapacity,
        usage: formUsage,
        expiry: formExpiry,
        paoMonths: paoVal,
        openedDate: openedVal,
        finishedDate: finishedVal,
        purchaseDate: purchaseDateVal,
        purchasePlace: purchasePlaceVal,
        price: priceVal
      };

      // Check if product with identical category + subcat + brand + name already exists
      const existingProductIndex = products.findIndex(p => 
        p.category === formCategory && 
        p.subcategory === subcatValue && 
        p.brand === formBrand.trim() && 
        p.name === formName.trim() &&
        p.status === 'active'
      );

      if (existingProductIndex > -1) {
        const updated = [...products];
        updated[existingProductIndex].instances.push(newInstance);
        if (formPhoto) {
          updated[existingProductIndex].photo = formPhoto;
        }
        setProducts(updated);
        // Expand this product to show the new instance
        setExpandedProductIds(prev => {
          const next = new Set(prev);
          next.add(updated[existingProductIndex].id);
          return next;
        });
      } else {
        // Create full new product
        const newProd: Product = {
          id: `prod_${Date.now()}`,
          category: formCategory,
          subcategory: subcatValue,
          brand: formBrand.trim(),
          name: formName.trim(),
          photo: formPhoto || undefined,
          status: 'active',
          threshold: Number(formThreshold) || 0,
          instances: [newInstance]
        };
        setProducts([...products, newProd]);
        setExpandedProductIds(prev => {
          const next = new Set(prev);
          next.add(newProd.id);
          return next;
        });
      }
      showToast(`已成功新增產品：${formName.trim()}`);
    }

    setShowAddForm(false);
    clearForm();
    setCurrentTab(formCategory); // Redirect to corresponding category tab
  };

  const handleEditInstanceTrigger = (prod: Product, inst: ProductInstance) => {
    setEditingProductId(prod.id);
    setEditingInstanceId(inst.id);
    setIsEditingMaster(false);
    setIsAddingInstanceToExisting(false);

    setFormBrand(prod.brand);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormSubcategory(prod.subcategory);
    setFormQty(inst.qty);
    
    // Parse capacity and unit
    let cap = inst.capacity || '';
    let unit = 'ml';
    if (cap.endsWith('ml')) { unit = 'ml'; cap = cap.slice(0, -2); }
    else if (cap.endsWith('g')) { unit = 'g'; cap = cap.slice(0, -1); }
    else if (cap.endsWith('個')) { unit = '個'; cap = cap.slice(0, -1); }
    else if (cap.endsWith('罐')) { unit = '罐'; cap = cap.slice(0, -1); }
    setFormCapacity(cap.trim());
    setFormCapacityUnit(unit);

    setFormUsage(inst.usage);
    setFormThreshold(inst.threshold);
    setFormExpiry(inst.expiry);
    setFormPaoMonths(inst.paoMonths ? String(inst.paoMonths) : '');
    setFormOpenedDate(inst.openedDate || '');
    setFormFinishedDate(inst.finishedDate || '');
    setFormPhoto(prod.photo || '');
    setFormPurchaseDate(inst.purchaseDate || '');
    setFormPurchasePlace(inst.purchasePlace || '');
    setFormPrice(inst.price !== undefined ? String(inst.price) : '');

    setShowAddForm(true);
    // Smooth scroll to form
    setTimeout(() => {
      document.getElementById('manual-add-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleEditProductMasterTrigger = (prod: Product) => {
    setEditingProductId(prod.id);
    setEditingInstanceId(null); // No specific instance edit, editing master product details!
    setIsEditingMaster(true);
    setIsAddingInstanceToExisting(false);
    setFormBrand(prod.brand);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormSubcategory(prod.subcategory);
    setFormPhoto(prod.photo || '');
    // Reset instance specific states to default
    setFormQty(1);
    setFormCapacity('');
    setFormCapacityUnit('ml');
    setFormUsage('使用中');
    setFormThreshold(0);
    setFormExpiry('');
    setFormPaoMonths('');
    setFormOpenedDate(new Date().toISOString().split('T')[0]);
    setFormFinishedDate('');
    setFormPurchaseDate('');
    setFormPurchasePlace('');
    setFormPrice('');

    setShowAddForm(true);
    setSelectedDetailProduct(null); // Close detail screen
    setTimeout(() => {
      document.getElementById('manual-add-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Add same-product as a new instance (Save as new item)
  const handleSaveAsNewInstance = () => {
    setEditingInstanceId(null);
    setEditingProductId(null);
    // Trigger submit indirectly
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    handleFormSave(fakeEvent);
  };

  // Archive a specific product instance (Requirement 4)
  const handleArchiveInstance = (prodId: string, instId: string) => {
    askConfirmation(
      '移至歷史紀錄（封存）',
      '確定要將這個規格明細移到歷史紀錄（封存）嗎？封存後將移至歷史分頁。',
      () => {
        let archivedInstance: ProductInstance | null = null;
        let targetProduct: Product | null = null;

        const nextProducts = products.map(prod => {
          if (prod.id === prodId) {
            targetProduct = prod;
            archivedInstance = prod.instances.find(i => i.id === instId) || null;
            return {
              ...prod,
              instances: prod.instances.filter(i => i.id !== instId)
            };
          }
          return prod;
        }).filter(p => p.instances.length > 0);

        if (archivedInstance && targetProduct) {
          // Create separate archived product group in history
          const newArchivedProd: Product = {
            id: `prod_archived_${Date.now()}`,
            category: (targetProduct as Product).category,
            subcategory: (targetProduct as Product).subcategory,
            brand: (targetProduct as Product).brand,
            name: (targetProduct as Product).name,
            photo: (targetProduct as Product).photo,
            status: 'archived',
            instances: [{
              ...(archivedInstance as ProductInstance),
              id: `inst_archived_${Date.now()}`
            }]
          };
          const finalProducts = [...nextProducts, newArchivedProd];
          setProducts(finalProducts);
          showToast('已將該明細歸檔至歷史紀錄！');

          // If the detailed modal is open for this product, sync it or close if empty
          if (selectedDetailProduct && selectedDetailProduct.id === prodId) {
            const updatedDetailedProduct = finalProducts.find(p => p.id === prodId);
            if (updatedDetailedProduct) {
              setSelectedDetailProduct(updatedDetailedProduct);
            } else {
              setSelectedDetailProduct(null);
            }
          }
        }
      }
    );
  };

  // Delete specific product instance
  const handleDeleteInstance = () => {
    if (editingInstanceId && editingProductId) {
      askConfirmation(
        '永久刪除明細',
        '確定要永久刪除此商品明細嗎？此操作無法復原。',
        () => {
          const nextProducts = products.map(prod => {
            if (prod.id === editingProductId) {
              return {
                ...prod,
                instances: prod.instances.filter(i => i.id !== editingInstanceId)
              };
            }
            return prod;
          }).filter(p => p.instances.length > 0);

          setProducts(nextProducts);
          setShowAddForm(false);
          clearForm();
          showToast('明細已成功永久刪除！');

          // If detail modal is open for this product, sync or close
          if (selectedDetailProduct && selectedDetailProduct.id === editingProductId) {
            const updatedDetailedProduct = nextProducts.find(p => p.id === editingProductId);
            if (updatedDetailedProduct) {
              setSelectedDetailProduct(updatedDetailedProduct);
            } else {
              setSelectedDetailProduct(null);
            }
          }
        }
      );
    }
  };

  const handleDeleteInstanceDirect = (prodId: string, instId: string) => {
    askConfirmation(
      '永久刪除明細',
      '確定要永久刪除此規格明細嗎？此操作無法復原。',
      () => {
        const nextProducts = products.map(prod => {
          if (prod.id === prodId) {
            return {
              ...prod,
              instances: prod.instances.filter(i => i.id !== instId)
            };
          }
          return prod;
        }).filter(p => p.instances.length > 0);

        setProducts(nextProducts);
        showToast('規格明細已成功永久刪除！');

        // If detail modal is open, sync or close
        if (selectedDetailProduct && selectedDetailProduct.id === prodId) {
          const updatedDetailedProduct = nextProducts.find(p => p.id === prodId);
          if (updatedDetailedProduct) {
            setSelectedDetailProduct(updatedDetailedProduct);
          } else {
            setSelectedDetailProduct(null);
          }
        }
      }
    );
  };

  // Quick prepopulate form when adding another instance under a product
  const handleAddAnotherInstanceTrigger = (prod: Product) => {
    clearForm();
    setEditingProductId(prod.id); // set this to ensure we know it belongs to an existing product
    setIsAddingInstanceToExisting(true);
    setIsEditingMaster(false);
    setFormBrand(prod.brand);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormSubcategory(prod.subcategory);
    setFormUsage('未開封');
    setFormPhoto(prod.photo || '');
    
    setShowAddForm(true);
    setTimeout(() => {
      document.getElementById('manual-add-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // --- Search Filtering Helper ---
  const activeProducts = products.filter(prod => {
    // Check if category is active
    if (currentTab === 'history') {
      if (prod.status !== 'archived') return false;
    } else {
      if (prod.status !== 'active') return false;
      if (prod.category !== currentTab) return false;
    }

    if (!searchKeyword.trim()) return true;
    
    const term = searchKeyword.toLowerCase();
    return (
      prod.brand.toLowerCase().includes(term) ||
      prod.name.toLowerCase().includes(term) ||
      prod.subcategory.toLowerCase().includes(term)
    );
  });

  // Calculate statistics for header and category subheaders
  const getSubcategoryStats = (subName: string, categoryId: string) => {
    const matchedProds = products.filter(p => p.status === 'active' && p.category === categoryId && p.subcategory === subName);
    const totalCount = matchedProds.length;
    let totalQty = 0;
    matchedProds.forEach(p => {
      p.instances.forEach(i => {
        totalQty += i.qty;
      });
    });
    return { count: totalCount, qty: totalQty };
  };

  const getCategoryStats = (categoryId: string) => {
    const matchedProds = products.filter(p => p.status === 'active' && p.category === categoryId);
    const totalCount = matchedProds.length;
    let totalQty = 0;
    matchedProds.forEach(p => {
      p.instances.forEach(i => {
        totalQty += i.qty;
      });
    });
    return { count: totalCount, qty: totalQty };
  };

  // Get current subcategories for selected form category
  const currentFormCategoryObj = categories.find(c => c.id === formCategory);
  const currentFormSubcategories = currentFormCategoryObj ? currentFormCategoryObj.subcategories : [];

  return (
    <div className="min-h-screen bg-retro-bg text-retro-text relative pb-24 font-sans select-none antialiased">
      {/* 1. App Header */}
      <header className="px-5 py-5 pt-[max(1.25rem,env(safe-area-inset-top))] flex justify-between items-center bg-retro-bg/90 backdrop-blur-sm sticky top-0 z-40 border-b border-retro-text/10 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
          <span>化妝品管理系統</span>
        </h1>
        <div className="flex gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-11 h-11 rounded-full bg-retro-primary text-retro-card flex items-center justify-center cursor-pointer shadow-md active:scale-95 transition-all hover:brightness-105"
            title="拍照辨識新增"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                clearForm();
              } else {
                clearForm();
                setShowAddForm(true);
                setTimeout(() => {
                  document.getElementById('manual-add-form')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="w-11 h-11 rounded-full bg-retro-secondary text-retro-card flex items-center justify-center cursor-pointer shadow-md active:scale-95 transition-all hover:brightness-105"
            title="手動輸入新增"
          >
            <Plus className="w-5 h-5 transition-transform" style={{ transform: showAddForm ? 'rotate(45deg)' : 'rotate(0)' }} />
          </button>
        </div>
      </header>

      {/* Hidden file triggers */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={(e) => handlePhotoUpload(e, false)}
        accept="image/*" 
        capture="environment" 
        className="hidden"
      />

      <div className="max-w-2xl mx-auto px-4 mt-2">
        {/* 2. Expired Notification Banner (Requirement 3) */}
        {expiredPaoItems.length > 0 && showNotificationBanner && (
          <div className="mb-4 p-4 rounded-xl bg-red-100 border border-red-300 text-red-900 shadow-sm relative overflow-hidden animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1">
                <div className="font-bold text-sm flex justify-between items-center pr-6">
                  <span>📢 開封過期變質警報！</span>
                </div>
                <p className="text-xs text-red-800 mt-1">
                  以下產品已超出開封後建議使用期限，極易滋生細菌變質，請儘速替換：
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {expiredPaoItems.map((item, idx) => (
                    <li key={idx} className="text-xs flex flex-wrap justify-between items-center bg-red-50 p-2 rounded border border-red-200">
                      <div>
                        <span className="font-semibold text-red-950">[{item.product.brand}] {item.product.name}</span>
                        {item.instance.capacity && <span className="ml-1 text-[10px] bg-red-200 text-red-800 px-1 rounded">{item.instance.capacity}</span>}
                      </div>
                      <div className="text-[11px] font-bold text-red-700">
                        已過期 {item.daysOverdue} 天 (開封: {item.instance.openedDate})
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button 
              onClick={() => setShowNotificationBanner(false)}
              className="absolute top-3 right-3 text-red-600 hover:text-red-950 p-0.5 rounded-full hover:bg-red-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. Search Bar */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-retro-text/40 w-4.5 h-4.5" />
          <input 
            type="text" 
            placeholder="搜尋品牌、產品或小分類..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-retro-card rounded-2xl text-sm border border-retro-text/5 focus:outline-none focus:ring-1 focus:ring-retro-primary shadow-inner text-retro-text font-medium"
          />
          {searchKeyword && (
            <button 
              onClick={() => setSearchKeyword('')} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-retro-text/50 hover:text-retro-text p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4. Dynamic AI Status Loading Overlay */}
        {isAnalyzing && (
          <div className="fixed inset-0 bg-stone-900/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
            <div className="bg-retro-card p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-retro-primary/20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-retro-primary border-t-transparent animate-spin"></div>
                <h3 className="font-bold font-display text-lg tracking-wide flex items-center gap-1.5 justify-center">
                  <Sparkles className="w-5 h-5 text-retro-secondary animate-pulse" />
                  AI 影像辨識中...
                </h3>
                <div className="w-full bg-retro-bg rounded-full h-2 overflow-hidden mt-1">
                  <div className="bg-retro-primary h-full animate-progress" style={{ width: '75%' }}></div>
                </div>
                <p className="text-xs text-retro-text/75 font-semibold mt-1">{aiStatusText}</p>
              </div>
            </div>
          </div>
        )}

        {/* 5. Add / Edit Product Form */}
        {showAddForm && (
          <div id="manual-add-form" className="mb-6 p-5 bg-retro-card rounded-2xl border border-retro-primary/30 shadow-md animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-retro-secondary flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {isEditingMaster ? '編輯大品項' : editingInstanceId ? '修改明細資訊' : isAddingInstanceToExisting ? '新增規格明細' : '確認新增品項'}
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddForm(false);
                  clearForm();
                }}
                className="text-retro-text/50 hover:text-retro-text p-1 rounded-full hover:bg-retro-bg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSave} className="space-y-4">
              {/* ====== MASTER PRODUCT FIELDS ====== */}
              {(!editingInstanceId && !isAddingInstanceToExisting) && (
                <div className="space-y-4">
                  {/* Photo Select */}
                  <div>
                    <label className="block text-xs font-bold text-retro-text/75 mb-1.5">
                      產品照片 (選填)
                    </label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="file" 
                        ref={formPhotoInputRef}
                        onChange={(e) => handlePhotoUpload(e, true)}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={() => formPhotoInputRef.current?.click()}
                        className="w-10 h-10 rounded-xl bg-retro-primary text-retro-card flex items-center justify-center cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      {formPhoto ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={formPhoto} 
                            alt="預覽" 
                            className="w-10 h-10 rounded-lg object-cover border border-retro-text/10"
                          />
                          <button 
                            type="button"
                            onClick={() => setFormPhoto('')}
                            className="text-xs text-red-500 font-bold hover:underline"
                          >
                            移除
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-retro-text/40 font-medium">尚未選擇照片</span>
                      )}
                    </div>
                  </div>

                  {/* Main Category & Subcategory */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-retro-text/75 mb-1">主類別</label>
                      <select 
                        value={formCategory}
                        onChange={(e) => {
                          setFormCategory(e.target.value);
                          setFormSubcategory(''); // reset
                        }}
                        className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-retro-text/75 mb-1">子分類</label>
                      <div className="space-y-2">
                        <select 
                          value={
                            currentFormSubcategories.includes(formSubcategory)
                              ? formSubcategory
                              : formSubcategory === '' 
                                ? '' 
                                : 'custom'
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'custom') {
                              setFormSubcategory('自訂子分類');
                            } else {
                              setFormSubcategory(val);
                            }
                          }}
                          className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                        >
                          <option value="">請選擇子分類</option>
                          {currentFormSubcategories.map((sub, idx) => (
                            <option key={idx} value={sub}>{sub}</option>
                          ))}
                          <option value="custom">✍️ 自訂其他...</option>
                        </select>

                        {(formSubcategory !== '' && !currentFormSubcategories.includes(formSubcategory)) && (
                          <input 
                            type="text" 
                            placeholder="請輸入自訂子分類名稱"
                            value={formSubcategory === '自訂子分類' ? '' : formSubcategory}
                            onChange={(e) => setFormSubcategory(e.target.value)}
                            className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Brand Name */}
                  <div>
                    <label className="block text-xs font-bold text-retro-text/75 mb-1">品牌名稱</label>
                    <input 
                      type="text" 
                      placeholder="請輸入品牌"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                    />
                  </div>

                  {/* Product Name & AI Web Search Assist */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-retro-text/75">產品名稱</label>
                      {isSearchingAi && <span className="text-[10px] text-retro-primary animate-pulse font-semibold">AI 正在網搜中...</span>}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="請輸入產品名稱"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="flex-1 p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                      />
                      <button 
                        type="button"
                        onClick={handleAiWebSearch}
                        className="w-10 h-10 rounded-xl bg-retro-primary text-retro-card flex items-center justify-center hover:opacity-90 active:scale-95 transition-all flex-shrink-0"
                        title="網路搜尋官方完整品牌與品名"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Threshold */}
                  <div>
                    <label className="block text-xs font-bold text-retro-text/75 mb-1">補貨門檻數量</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="低於此數量時提醒 (0)"
                      value={formThreshold === 0 ? '' : formThreshold}
                      onChange={(e) => setFormThreshold(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                    />
                    <p className="text-[10px] text-retro-text/50 mt-1">此品項所有未開封明細之數量加總低於此設定時，會顯示補貨提醒</p>
                  </div>
                </div>
              )}

              {/* ====== INSTANCE PRODUCT FIELDS ====== */}
              {!isEditingMaster && (
                <div className={`space-y-4 ${!editingInstanceId && !isAddingInstanceToExisting ? 'pt-4 mt-4 border-t border-retro-text/10' : ''}`}>
                  {/* Quantity and Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-retro-text/75 mb-1">數量</label>
                  <input 
                    type="number" 
                    min="1"
                    placeholder="例如: 1"
                    value={formQty}
                    onChange={(e) => setFormQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-retro-text/75 mb-1">容量與單位</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="例如: 30"
                      value={formCapacity}
                      onChange={(e) => setFormCapacity(e.target.value)}
                      className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                    />
                    <select
                      value={formCapacityUnit}
                      onChange={(e) => setFormCapacityUnit(e.target.value)}
                      className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                    >
                      <option value="ml">ml</option>
                      <option value="g">g</option>
                      <option value="個">個</option>
                      <option value="罐">罐</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Usage */}
              <div>
                <label className="block text-xs font-bold text-retro-text/75 mb-1">使用狀態</label>
                <select 
                  value={formUsage}
                  onChange={(e) => setFormUsage(e.target.value as any)}
                  className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                >
                  <option value="使用中">使用中</option>
                  <option value="未開封">未開封</option>
                  <option value="已用完">已用完</option>
                  <option value="已丟棄">已丟棄</option>
                </select>
              </div>

              {/* Requirement 3: Period After Opening (PAO) & Opening Date fields */}
              {(formUsage === '使用中' || formUsage === '已用完' || formUsage === '已丟棄') && (
                <div className="grid grid-cols-2 gap-3 bg-retro-bg/30 p-3 rounded-xl border border-retro-text/5">
                  <div>
                    <label className="block text-xs font-bold text-retro-text/75 mb-1 flex items-center gap-1 text-retro-secondary">
                      <Calendar className="w-3.5 h-3.5" />
                      開封日期
                    </label>
                    <input 
                      type="date" 
                      value={formOpenedDate}
                      onChange={(e) => setFormOpenedDate(e.target.value)}
                      className="w-full p-2 bg-white border border-retro-text/10 rounded-lg text-xs text-retro-text focus:outline-none focus:border-retro-primary font-semibold"
                    />
                  </div>
                  {formUsage === '使用中' ? (
                    <div>
                      <label className="block text-xs font-bold text-retro-text/75 mb-1 flex items-center gap-1 text-retro-secondary">
                        <ClockIcon className="w-3.5 h-3.5" />
                        開封後可使用月數
                      </label>
                      <input 
                        type="number" 
                        min="1"
                        placeholder="例如: 6, 12, 24"
                        value={formPaoMonths}
                        onChange={(e) => setFormPaoMonths(e.target.value)}
                        className="w-full p-2 bg-white border border-retro-text/10 rounded-lg text-xs text-retro-text focus:outline-none focus:border-retro-primary font-semibold"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-retro-text/75 mb-1 flex items-center gap-1 text-retro-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                        結束日期
                      </label>
                      <input 
                        type="date" 
                        value={formFinishedDate}
                        onChange={(e) => setFormFinishedDate(e.target.value)}
                        className="w-full p-2 bg-white border border-retro-text/10 rounded-lg text-xs text-retro-text focus:outline-none focus:border-retro-primary font-semibold"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Expiration Date */}
              <div>
                <label className="block text-xs font-bold text-retro-text/75 mb-1">有效期限 (到期日)</label>
                <input 
                  type="date" 
                  value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-sm text-retro-text focus:outline-none focus:border-retro-primary font-semibold"
                />
              </div>

              {/* Purchase Records Fields (Requirement 1 - purchase details inputs) */}
              <div className="bg-stone-50/50 p-3.5 rounded-xl border border-retro-text/5 space-y-3">
                <span className="text-xs font-extrabold text-retro-primary/80 uppercase tracking-wider block">
                  🛒 購買與價格紀錄 (選填)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-retro-text/75 mb-1">購買日期</label>
                    <input 
                      type="date" 
                      value={formPurchaseDate}
                      onChange={(e) => setFormPurchaseDate(e.target.value)}
                      className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-xs text-retro-text focus:outline-none focus:border-retro-primary font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-retro-text/75 mb-1">單價 (NTD)</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="例如: 350"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-xs text-retro-text focus:outline-none focus:border-retro-primary font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-retro-text/75 mb-1">購買地點 / 管道</label>
                  <input 
                    type="text" 
                    placeholder="例如: 屈臣氏、MOMO、日本代購..."
                    value={formPurchasePlace}
                    onChange={(e) => setFormPurchasePlace(e.target.value)}
                    className="w-full p-2.5 bg-white/50 border border-retro-text/10 rounded-xl text-xs text-retro-text focus:outline-none focus:border-retro-primary font-semibold"
                  />
                </div>
              </div>

              {/* Action Buttons */}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button 
                  type="submit"
                  className="w-full py-3 bg-retro-secondary text-retro-card font-bold text-sm rounded-xl hover:brightness-105 active:scale-[0.99] transition-all shadow cursor-pointer"
                >
                  {isEditingMaster ? '儲存大品項修改' : editingInstanceId ? '儲存修改' : isAddingInstanceToExisting ? '新增規格明細' : '確認無誤，新增至資料庫'}
                </button>

                {editingInstanceId && (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={handleSaveAsNewInstance}
                      className="py-2.5 bg-retro-primary text-retro-card font-bold text-xs rounded-xl hover:brightness-105 transition-all cursor-pointer"
                      title="保留原明細，以此內容建立一個同商品的新明細項"
                    >
                      另存為新明細 (同品項)
                    </button>
                    <button 
                      type="button"
                      onClick={handleDeleteInstance}
                      className="py-2.5 bg-red-500 text-white font-bold text-xs rounded-xl hover:bg-red-600 transition-all cursor-pointer"
                    >
                      永久刪除此明細
                    </button>
                  </div>
                )}

                {isEditingMaster && (
                  <button 
                    type="button"
                    onClick={() => {
                      if (editingProductId) {
                        askConfirmation(
                          '刪除大品項',
                          '確定要永久刪除此大品項及其所有購買明細嗎？此操作無法復原。',
                          () => {
                            setProducts(products.filter(p => p.id !== editingProductId));
                            setShowAddForm(false);
                            setSelectedDetailProduct(null);
                            clearForm();
                            showToast('大品項已成功刪除！');
                          }
                        );
                      }
                    }}
                    className="w-full py-2.5 bg-red-500 text-white font-bold text-xs rounded-xl hover:bg-red-600 transition-all cursor-pointer mt-2"
                  >
                    永久刪除此大品項 (含所有明細)
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* 6. Active Tab Product List / Settings Screen */}
        {currentTab === 'settings' ? (
          /* =================== SETTINGS VIEW =================== */
          <div className="space-y-6 pb-20">
            {settingsView === 'menu' && (
              <div className="space-y-4 animate-fade-in">
                <h2 className="text-xl font-bold font-display flex items-center gap-2 text-retro-text mb-4">
                  <Settings className="w-5 h-5 text-retro-primary" />
                  設定與分類管理
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => setSettingsView('apikey')} className="p-4 bg-white border border-retro-text/10 rounded-2xl shadow-sm hover:border-retro-primary/50 transition-all flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-retro-primary/10 flex items-center justify-center text-retro-primary">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-retro-text text-sm">設定 Gemini API 金鑰</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-retro-text/30 group-hover:text-retro-primary group-hover:translate-x-1 transition-all" />
                  </button>

                  <button onClick={() => setSettingsView('category')} className="p-4 bg-white border border-retro-text/10 rounded-2xl shadow-sm hover:border-retro-primary/50 transition-all flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-retro-secondary/10 flex items-center justify-center text-retro-secondary">
                        <ListTree className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-retro-text text-sm">設定與管理分類</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-retro-text/30 group-hover:text-retro-primary group-hover:translate-x-1 transition-all" />
                  </button>

                  <button onClick={() => setSettingsView('history')} className="p-4 bg-white border border-retro-text/10 rounded-2xl shadow-sm hover:border-retro-primary/50 transition-all flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-600">
                        <Archive className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-retro-text text-sm">歷史封存紀錄</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-retro-text/30 group-hover:text-retro-primary group-hover:translate-x-1 transition-all" />
                  </button>

                  <div className="pt-4 border-t border-retro-text/10 mt-4">
                    <button onClick={logOut} className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl shadow-sm hover:border-red-200 transition-all flex items-center justify-center group cursor-pointer">
                      <span className="font-bold text-red-600 text-sm">登出帳號</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settingsView === 'apikey' && (
              <div className="space-y-4 animate-fade-in">
                <button onClick={() => setSettingsView('menu')} className="text-xs font-bold text-retro-text/50 hover:text-retro-primary flex items-center gap-1 transition-colors cursor-pointer mb-2">
                  <ChevronDown className="w-4 h-4 rotate-90" /> 返回設定選單
                </button>
                {/* Requirement 2: API KEY INPUT */}
                <div className="p-5 bg-retro-card rounded-2xl border border-retro-text/10 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-retro-secondary flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5" />
                Gemini AI 金鑰設定
              </h3>
              <p className="text-xs text-retro-text/60 leading-relaxed font-medium">
                若要使用「自動網搜補全產品」或「相機拍照影像辨識」功能，請在此處設定您的 Gemini API Key。金鑰會安全保存在您的個人瀏覽器中。
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type={showApiKey ? "text" : "password"}
                    placeholder="請輸入 GEMINI_API_KEY"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full py-2 pl-3 pr-10 bg-white border border-retro-text/10 rounded-xl text-xs font-semibold text-retro-text focus:outline-none focus:border-retro-primary"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-retro-text/50 hover:text-retro-text"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button 
                  onClick={handleSaveApiKey}
                  className="px-4 bg-retro-primary text-retro-card text-xs font-bold rounded-xl hover:brightness-105 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  儲存金鑰
                </button>
              </div>
            </div>
          </div>
          )}

            {settingsView === 'category' && (
              <div className="space-y-4 animate-fade-in">
                <button onClick={() => setSettingsView('menu')} className="text-xs font-bold text-retro-text/50 hover:text-retro-primary flex items-center gap-1 transition-colors cursor-pointer mb-2">
                  <ChevronDown className="w-4 h-4 rotate-90" /> 返回設定選單
                </button>
                {/* Requirement 1: EDIT CATEGORY & SUBCATEGORY NESTED LIST */}
                <div className="p-5 bg-retro-card rounded-2xl border border-retro-text/10 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-retro-secondary flex items-center gap-1.5">
                  <ListTree className="w-4.5 h-4.5" />
                  大分類與小分類管理
                </h3>
              </div>
              <p className="text-xs text-retro-text/60 leading-relaxed font-medium">
                可任意新增、編輯、刪減與<b>拖曳排序</b>大分類與小分類。點擊分類卡片旁的<b>「管理小分類」</b>即可編輯、新增、刪除及拖曳該小分類的細項！
              </p>

              {/* Add New Category */}
              <div className="p-3.5 bg-retro-bg/40 rounded-xl border border-retro-text/5 space-y-3">
                <div className="font-bold text-xs text-retro-text/70">新增大分類</div>
                <div className="flex flex-wrap gap-2">
                  <input 
                    type="text" 
                    placeholder="新分類名稱 (例: 隱形眼鏡)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 min-w-[140px] p-2 bg-white border border-retro-text/10 rounded-xl text-xs text-retro-text focus:outline-none focus:border-retro-primary font-medium"
                  />
                  <select 
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="p-2 bg-white border border-retro-text/10 rounded-xl text-xs font-semibold text-retro-text focus:outline-none"
                  >
                    <option value="sparkles">✨ 閃亮</option>
                    <option value="droplets">💧 水滴</option>
                    <option value="pill">💊 膠囊</option>
                    <option value="package">📦 盒子</option>
                    <option value="shopping-bag">🛍️ 購物袋</option>
                    <option value="heart">❤️ 愛心</option>
                    <option value="star">⭐ 星星</option>
                  </select>
                  <button 
                    onClick={handleAddCategory}
                    className="px-3 py-2 bg-retro-secondary text-retro-card text-xs font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    新增大分類
                  </button>
                </div>
              </div>

              {/* Main Categories Nested Reordering List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-retro-text/60">大分類清單 (拖曳手把排序)</div>
                <div className="space-y-2.5">
                  {categories.map((cat, idx) => (
                    <div 
                      key={cat.id} 
                      className="border border-retro-text/10 rounded-xl bg-white overflow-hidden shadow-sm transition-all"
                    >
                      {/* Big Category Bar */}
                      <div 
                        draggable
                        onDragStart={(e) => handleCatDragStart(e, idx)}
                        onDragOver={handleCatDragOver}
                        onDrop={(e) => handleCatDrop(e, idx)}
                        className="flex items-center justify-between p-3 bg-stone-50 border-b border-stone-100 hover:bg-stone-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="cursor-grab p-1 hover:bg-stone-200 rounded text-stone-400 active:text-stone-700">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="text-sm">
                            <CategoryIcon name={cat.icon} className="w-4.5 h-4.5 text-retro-primary" />
                          </span>
                          <span className="font-bold text-sm text-retro-text">{cat.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => setActiveCategoryForSub(activeCategoryForSub === cat.id ? null : cat.id)}
                            className="text-[11px] font-bold px-2.5 py-1.5 bg-retro-primary/10 text-retro-primary rounded-lg hover:bg-retro-primary/20 transition-colors flex items-center gap-1"
                          >
                            <ListTree className="w-3.5 h-3.5" />
                            管理小分類 ({cat.subcategories.length})
                          </button>
                          {categories.length > 1 && (
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)} 
                              className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="刪除此大分類"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Small Categories Sub-list (Requirement 1) */}
                      {activeCategoryForSub === cat.id && (
                        <div className="p-3 bg-stone-50/50 border-t border-stone-100/60 space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="text-[11px] font-bold text-retro-secondary flex items-center gap-1">
                              <span>【{cat.name}】的小分類管理</span>
                            </div>
                          </div>

                          {/* Add Subcategory Inline */}
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="新小分類名稱 (如: 護底霜)"
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddSubcategory(cat.id);
                              }}
                              className="flex-1 p-2 bg-white border border-stone-200 rounded-lg text-xs text-retro-text focus:outline-none focus:border-retro-primary"
                            />
                            <button 
                              onClick={() => handleAddSubcategory(cat.id)}
                              className="px-3 bg-stone-700 hover:bg-stone-800 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Subcategory draggable list */}
                          <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                            {cat.subcategories.map((sub, sIdx) => (
                              <li 
                                key={sIdx}
                                draggable
                                onDragStart={(e) => handleSubDragStart(e, cat.id, sIdx)}
                                onDragOver={handleSubDragOver}
                                onDrop={(e) => handleSubDrop(e, cat.id, sIdx)}
                                className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-lg text-xs hover:bg-stone-50 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                  <div className="cursor-grab p-0.5 text-stone-400 hover:text-stone-600">
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                  {editingSubIdx === sIdx && editingSubCatId === cat.id ? (
                                    <input 
                                      type="text" 
                                      value={editingSubName}
                                      onChange={(e) => setEditingSubName(e.target.value)}
                                      onBlur={() => handleSaveSubcategory(cat.id, sIdx)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveSubcategory(cat.id, sIdx);
                                      }}
                                      autoFocus
                                      className="flex-1 p-1 py-0.5 border border-stone-400 rounded bg-white text-xs text-stone-800 focus:outline-none"
                                    />
                                  ) : (
                                    <span className="truncate font-semibold text-stone-700">{sub}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {editingSubIdx === sIdx && editingSubCatId === cat.id ? (
                                    <button 
                                      onClick={() => handleSaveSubcategory(cat.id, sIdx)}
                                      className="text-stone-700 hover:text-stone-900 p-0.5"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => {
                                        setEditingSubCatId(cat.id);
                                        setEditingSubIdx(sIdx);
                                        setEditingSubName(sub);
                                      }}
                                      className="text-stone-400 hover:text-stone-700 p-0.5"
                                      title="編輯小分類名稱"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleDeleteSubcategory(cat.id, sIdx)}
                                    className="text-red-400 hover:text-red-600 p-0.5"
                                    title="刪除小分類"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </li>
                            ))}
                            {cat.subcategories.length === 0 && (
                              <li className="text-center text-stone-400 text-[10px] py-4 bg-white border border-stone-100 rounded-lg">
                                尚無小分類，請在上方新增
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
            )}

            {settingsView === 'history' && (
              <div className="space-y-4 animate-fade-in">
                <button onClick={() => setSettingsView('menu')} className="text-xs font-bold text-retro-text/50 hover:text-retro-primary flex items-center gap-1 transition-colors cursor-pointer mb-2">
                  <ChevronDown className="w-4 h-4 rotate-90" /> 返回設定選單
                </button>
                <div className="mb-1 bg-retro-card/40 px-3.5 py-2.5 rounded-xl border border-retro-text/5 text-xs text-retro-text font-bold flex items-center justify-between">
                  <span>歷史封存紀錄</span>
                  <span className="text-retro-secondary bg-retro-secondary/10 px-2 py-0.5 rounded-full">
                    {products.filter(p => p.status === 'archived').length} 件
                  </span>
                </div>
                
                {(() => {
                  const archivedProducts = products.filter(p => p.status === 'archived' && (searchKeyword ? p.name.includes(searchKeyword) || p.brand.includes(searchKeyword) : true));
                  if (archivedProducts.length === 0) {
                    return (
                      <div className="text-center py-12 bg-retro-card rounded-2xl border border-retro-text/5">
                        <p className="text-sm text-retro-text/50 font-medium">尚無符合的封存商品</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {archivedProducts.map(prod => (
                        <div key={prod.id}>
                          <ProductCard 
                            product={prod} 
                            onViewDetail={setSelectedDetailProduct}
                            onEdit={handleEditInstanceTrigger}
                            onArchive={handleArchiveInstance}
                            onAddAnother={handleAddAnotherInstanceTrigger}
                            onImageClick={setFullscreenImage}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          /* =================== MAIN LIST VIEW =================== */
          <div className="space-y-4">
            {/* Category Stats Indicator */}
            <div className="flex justify-between items-center mb-1 bg-retro-card/40 px-3.5 py-2.5 rounded-xl border border-retro-text/5 text-xs text-retro-text">
              <span className="font-bold text-retro-text/80">
                分類：{categories.find(c => c.id === currentTab)?.name || ''}
              </span>
              <span className="font-semibold text-retro-text/70 flex items-center gap-1">
                <span>共 {getCategoryStats(currentTab).count} 品項</span>
                <span className="text-retro-text/30">|</span>
                <Package className="w-3.5 h-3.5 text-retro-primary" />
                <span>總庫存 {getCategoryStats(currentTab).qty}</span>
              </span>
            </div>

            {/* Subcategory Nested Product List */}
            {(() => {
              // Get subcategories of current category
              const currentCatObj = categories.find(c => c.id === currentTab);
              
              // Normal Category Tab with nested subcategory views
              if (!currentCatObj) return null;
              
              // We'll group active products by subcategory
              const subcatGroups = [...currentCatObj.subcategories, '其他'];
              
              // Filter to find subcat groups that have matching active filtered products
              const nonAndEmptyGroups = subcatGroups.filter(subName => {
                const groupProds = activeProducts.filter(p => p.subcategory === subName || (subName === '其他' && !currentCatObj.subcategories.includes(p.subcategory)));
                return groupProds.length > 0;
              });

              if (nonAndEmptyGroups.length === 0) {
                return (
                  <div className="text-center py-12 bg-retro-card rounded-2xl border border-retro-text/5">
                    <p className="text-sm text-retro-text/50 font-semibold">此分類下尚無符合商品</p>
                    <button 
                      onClick={() => {
                        clearForm();
                        setFormCategory(currentTab);
                        setShowAddForm(true);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-retro-primary text-retro-card rounded-xl text-xs font-bold shadow hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      新增商品
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {nonAndEmptyGroups.map(subName => {
                    const groupProds = activeProducts.filter(p => p.subcategory === subName || (subName === '其他' && !currentCatObj.subcategories.includes(p.subcategory)));
                    const stats = getSubcategoryStats(subName, currentTab);

                    return (
                      <div key={subName} className="space-y-2.5 animate-fade-in">
                        <div className="flex items-center text-xs text-retro-text/70 font-bold tracking-wider px-1">
                          <span className="text-retro-text/30 mr-1.5 font-normal">└</span>
                          <span>{subName}</span>
                          <span className="ml-auto text-[10px] bg-retro-primary/10 text-retro-primary px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span>{stats.count}件</span>
                            <span className="opacity-40">|</span>
                            <Package className="w-3 h-3" />
                            <span>{stats.qty}</span>
                          </span>
                        </div>

                        <div className="space-y-3">
                          {groupProds.map(prod => (
                            <div key={prod.id}>
                              <ProductCard 
                                product={prod} 
                                onViewDetail={setSelectedDetailProduct}
                                onEdit={handleEditInstanceTrigger}
                                onArchive={handleArchiveInstance}
                                onAddAnother={handleAddAnotherInstanceTrigger}
                                onImageClick={setFullscreenImage}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* 7. Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-retro-card border-t border-retro-text/10 flex justify-around items-center pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40 max-w-2xl mx-auto overflow-x-auto">
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => handleTabChange(cat.id)}
            className={`flex flex-col items-center gap-1 text-[10px] font-bold min-w-[56px] transition-colors py-1 px-1.5 rounded-lg active:bg-retro-bg/40 ${currentTab === cat.id ? 'text-retro-primary bg-retro-primary/5' : 'text-retro-text/50'}`}
          >
            <CategoryIcon name={cat.icon} className="w-5 h-5" />
            <span className="truncate max-w-[56px]">{cat.name}</span>
          </button>
        ))}
        {/* Fixed Settings Tab */}
        <button 
          onClick={() => handleTabChange('settings')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold min-w-[56px] transition-colors py-1 px-1.5 rounded-lg active:bg-retro-bg/40 ${currentTab === 'settings' ? 'text-retro-primary bg-retro-primary/5' : 'text-retro-text/50'}`}
        >
          <Settings className="w-5 h-5" />
          <span>設定</span>
        </button>
      </nav>

      {/* Toast Alert overlay */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-5 py-3 bg-stone-900/90 text-white rounded-full text-xs font-bold shadow-lg z-50 pointer-events-none transition-all duration-300 transform scale-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-retro-primary animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* ==================== 8. Detailed Product View Modal (Requirement 1: 完整畫面) ==================== */}
      {selectedDetailProduct && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full h-[100dvh] sm:h-auto sm:max-w-md bg-white sm:border-2 border-retro-text sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[85dvh] animate-slide-up pb-safe">
            {/* Top Bar with Drag Handle for Mobile / Header */}
            <div className="relative pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 px-5 border-b border-retro-text/5 flex items-start gap-4 bg-stone-50/50">
              {selectedDetailProduct.photo ? (
                <img 
                  referrerPolicy="no-referrer"
                  src={selectedDetailProduct.photo} 
                  alt={selectedDetailProduct.name}
                  onClick={() => setFullscreenImage(selectedDetailProduct.photo!)}
                  className="w-14 h-18 rounded-xl object-cover border border-retro-text/10 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-14 h-18 rounded-xl bg-retro-primary/10 border border-dashed border-retro-primary/30 flex items-center justify-center text-retro-primary flex-shrink-0">
                  <Camera className="w-6 h-6 opacity-40" />
                </div>
              )}
              
              <div className="flex-1 min-w-0 pr-6">
                <span className="text-[10px] font-extrabold text-retro-secondary tracking-widest uppercase block">
                  {selectedDetailProduct.brand}
                </span>
                <h3 className="text-base font-bold text-retro-text leading-snug mt-0.5 line-clamp-2">
                  {selectedDetailProduct.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] font-bold bg-retro-primary/10 text-retro-primary px-2.5 py-0.5 rounded-full">
                    {categories.find(c => c.id === selectedDetailProduct.category)?.name || selectedDetailProduct.category}
                  </span>
                  {selectedDetailProduct.subcategory && (
                    <span className="text-[10px] font-bold bg-retro-secondary/5 text-retro-secondary border border-retro-secondary/10 px-2.5 py-0.5 rounded-full">
                      {selectedDetailProduct.subcategory}
                    </span>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setSelectedDetailProduct(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer animate-fade-in"
                title="關閉"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Middle Nav Buttons */}
            <div className="p-3 bg-stone-100/50 border-b border-retro-text/5 grid grid-cols-4 gap-2 flex-shrink-0">
              <button
                onClick={() => setDetailActiveTab('status')}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all border flex flex-col items-center gap-0.5 cursor-pointer ${
                  detailActiveTab === 'status'
                    ? 'bg-retro-primary text-retro-card border-retro-primary shadow-sm scale-[1.02]'
                    : 'bg-white text-retro-text/60 border-retro-text/5 hover:text-retro-text hover:bg-stone-50'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>數量狀況</span>
              </button>

              <button
                onClick={() => setDetailActiveTab('purchase')}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all border flex flex-col items-center gap-0.5 cursor-pointer ${
                  detailActiveTab === 'purchase'
                    ? 'bg-retro-secondary text-retro-card border-retro-secondary shadow-sm scale-[1.02]'
                    : 'bg-white text-retro-text/60 border-retro-text/5 hover:text-retro-text hover:bg-stone-50'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>購買紀錄</span>
              </button>

              <button
                onClick={() => setDetailActiveTab('usage')}
                className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all border flex flex-col items-center gap-0.5 cursor-pointer ${
                  detailActiveTab === 'usage'
                    ? 'bg-amber-600 text-retro-card border-amber-600 shadow-sm scale-[1.02]'
                    : 'bg-white text-retro-text/60 border-retro-text/5 hover:text-retro-text hover:bg-stone-50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>使用紀錄</span>
              </button>

              <button
                onClick={() => handleEditProductMasterTrigger(selectedDetailProduct)}
                className="py-2 px-1 text-[11px] font-bold bg-white text-retro-text/60 hover:text-retro-primary border border-retro-text/5 hover:border-retro-primary/20 rounded-xl transition-all flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>編輯大品項</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {detailActiveTab === 'status' ? (
                /* Tab 1 Content: 商品數量狀況 */
                <div className="space-y-4 animate-fade-in">
                  
                  {/* Overall Restock Warning */}
                  {(() => {
                    const totalUnopened = selectedDetailProduct.instances.filter(inst => inst.usage === '未開封').reduce((sum, inst) => sum + inst.qty, 0);
                    if (selectedDetailProduct.threshold > 0 && totalUnopened <= selectedDetailProduct.threshold) {
                      return (
                        <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center gap-2 shadow-sm">
                          <Info className="w-4 h-4 flex-shrink-0" />
                          <span>庫存偏低！目前未開封總計 {totalUnopened} 件，已達補貨門檻 ({selectedDetailProduct.threshold} 件)</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Bento Stats Counters */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-retro-text/5 text-center flex flex-col justify-between min-h-[70px]">
                      <span className="text-[10px] font-bold text-retro-text/50">總數量</span>
                      <span className="text-xl font-extrabold text-retro-primary font-mono">
                        {selectedDetailProduct.instances.reduce((sum, inst) => sum + inst.qty, 0)}
                      </span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-retro-text/5 text-center flex flex-col justify-between min-h-[70px]">
                      <span className="text-[10px] font-bold text-retro-text/50">開封中數量</span>
                      <span className="text-xl font-extrabold text-green-600 font-mono">
                        {selectedDetailProduct.instances.filter(inst => inst.usage === '使用中').reduce((sum, inst) => sum + inst.qty, 0)}
                      </span>
                    </div>
                    <div className="bg-stone-50 p-2.5 rounded-xl border border-retro-text/5 text-center flex flex-col justify-between min-h-[70px]">
                      <span className="text-[10px] font-bold text-retro-text/50">最近到期天數</span>
                      <span className="text-xl font-extrabold text-amber-600 font-mono">
                        {(() => {
                          let minDays = 9999;
                          selectedDetailProduct.instances.forEach(inst => {
                            const days = calculateDaysToExpiry(inst.expiry);
                            if (days < minDays) minDays = days;
                          });
                          return minDays !== 9999 ? minDays : '-';
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Instances List */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-extrabold text-retro-text/50 uppercase tracking-wider block">
                      📋 規格明細與狀態
                    </span>
                    {selectedDetailProduct.instances.map((inst, index) => {
                      const daysLeft = calculateDaysToExpiry(inst.expiry);
                      const isUrgent = daysLeft <= 60;
                      const pao = calculatePaoExpiry(inst.openedDate, inst.paoMonths);

                      return (
                        <div key={inst.id} className="p-3 bg-white border border-retro-text/5 rounded-xl space-y-2 shadow-xs">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-retro-text bg-retro-bg/40 border border-retro-text/5 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                <Package className="w-3 h-3 text-retro-primary" />
                                {inst.qty} 件
                              </span>
                              {inst.capacity && (
                                <span className="text-xs font-bold text-retro-primary bg-retro-primary/10 px-2 py-0.5 rounded-lg">
                                  {inst.capacity}
                                </span>
                              )}
                              <span className={`w-2 h-2 rounded-full ml-1 ${inst.usage === '使用中' ? 'bg-green-500 animate-pulse' : 'bg-stone-300'}`}></span>
                              <span className="text-xs font-bold text-retro-text/80">{inst.usage}</span>
                            </div>

                            {/* Instance edit/archive buttons */}
                            {selectedDetailProduct.status !== 'archived' && (
                              <div className="flex items-center gap-2 bg-stone-50 border border-retro-text/5 rounded-lg px-2 py-0.5">
                                <button 
                                  onClick={() => {
                                    handleEditInstanceTrigger(selectedDetailProduct, inst);
                                    setSelectedDetailProduct(null); // Close modal
                                  }}
                                  className="text-retro-primary hover:text-retro-secondary p-0.5 transition-colors cursor-pointer"
                                  title="編輯此規格"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <span className="w-[1px] h-3 bg-retro-text/10"></span>
                                <button 
                                  onClick={() => handleArchiveInstance(selectedDetailProduct.id, inst.id)}
                                  className="text-retro-secondary hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                  title="歸檔/封存此細項"
                                >
                                  <Archive className="w-3 h-3" />
                                </button>
                                <span className="w-[1px] h-3 bg-retro-text/10"></span>
                                <button 
                                  onClick={() => handleDeleteInstanceDirect(selectedDetailProduct.id, inst.id)}
                                  className="text-red-400 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                                  title="永久刪除此細項"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* PAO Expiry / Date Details */}
                          <div className="space-y-1 text-xs text-retro-text/60">
                            {inst.usage === '使用中' && pao && (
                              <div className={`p-2 rounded-lg text-[11px] font-bold flex flex-col gap-0.5 ${pao.isExpired ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-green-50 text-green-600'}`}>
                                <div className="flex items-center gap-1">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  <span>開封建議可用 {inst.paoMonths} 個月 (開封日: {inst.openedDate?.replace(/-/g, '.')})</span>
                                </div>
                                <span>
                                  建議過期日: {pao.expiryDate.replace(/-/g, '.')}
                                  {pao.isExpired ? ` (已開封過期 ${pao.daysOverdue} 天)` : ` (開封剩餘 ${pao.daysLeft} 天)`}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center gap-1 text-[11px] font-bold text-retro-text/70 pt-1 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-stone-400" />
                              <span>有效期限 (到期日): {inst.expiry ? inst.expiry.replace(/-/g, '.') : '未設定'}</span>
                              {inst.expiry && daysLeft !== 9999 && (
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-600'}`}>
                                  {isUrgent ? `急需使用 (剩 ${daysLeft} 天)` : `剩 ${daysLeft} 天`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : detailActiveTab === 'purchase' ? (
                /* Tab 2 Content: 購買紀錄 */
                (() => {
                  const allPurchaseInstances = products
                    .filter(p => p.brand === selectedDetailProduct.brand && p.name === selectedDetailProduct.name)
                    .flatMap(p => p.instances.map(inst => ({ ...inst, isArchived: p.status === 'archived' })))
                    .sort((a, b) => {
                      if (a.purchaseDate && b.purchaseDate) {
                        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
                      }
                      return 0;
                    });
                    
                  const instancesWithPurchaseInfo = allPurchaseInstances.filter(inst => inst.purchaseDate || inst.purchasePlace || inst.price !== undefined);

                  return (
                    <div className="space-y-4 animate-fade-in">
                      <div className="bg-stone-50 px-3 py-2.5 rounded-xl border border-retro-text/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-retro-text/60">購買明細筆數</span>
                        <span className="text-sm font-extrabold text-retro-secondary font-mono">
                          總筆數：{allPurchaseInstances.length} 筆
                        </span>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[11px] font-extrabold text-retro-text/50 uppercase tracking-wider block">
                          🛒 每一筆的購買明細紀錄 (含封存)
                        </span>
                        
                        <div className="overflow-hidden rounded-xl border border-retro-text/5 bg-white shadow-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-stone-50 border-b border-retro-text/5 text-[10px] uppercase text-retro-text/50">
                                <th className="p-2.5 font-bold whitespace-nowrap">日期</th>
                                <th className="p-2.5 font-bold whitespace-nowrap">地點</th>
                                <th className="p-2.5 font-bold text-right whitespace-nowrap">金額</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-retro-text/5">
                              {allPurchaseInstances.map((inst, index) => {
                                const hasPurchaseInfo = inst.purchaseDate || inst.purchasePlace || inst.price !== undefined;
                                if (!hasPurchaseInfo) return null;
                                return (
                                  <tr key={inst.id} className={`text-xs text-retro-text ${inst.isArchived ? 'opacity-50 grayscale' : ''}`}>
                                    <td className="p-2.5 font-mono">{inst.purchaseDate || '-'}</td>
                                    <td className="p-2.5">{inst.purchasePlace || '-'}</td>
                                    <td className="p-2.5 font-mono font-bold text-right text-retro-secondary">{inst.price !== undefined ? `$${inst.price}` : '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {instancesWithPurchaseInfo.length === 0 && (
                            <div className="py-6 text-center text-xs text-stone-400 font-semibold bg-white">
                              暫無購買紀錄
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-center text-stone-400 font-semibold pt-1">
                        💡 提示：點擊右上角的編輯圖示（數量狀況頁籤中）即可新增購買紀錄
                      </p>
                    </div>
                  );
                })()
              ) : (
                /* Tab 3 Content: 使用紀錄 */
                (() => {
                  const allUsageInstances = products
                    .filter(p => p.brand === selectedDetailProduct.brand && p.name === selectedDetailProduct.name)
                    .flatMap(p => p.instances)
                    .filter(inst => inst.usage === '已用完' || inst.usage === '已丟棄' || (inst.usage === '使用中' && inst.openedDate))
                    .sort((a, b) => {
                      if (a.openedDate && b.openedDate) {
                        return new Date(b.openedDate).getTime() - new Date(a.openedDate).getTime();
                      }
                      return 0;
                    });

                  return (
                    <div className="space-y-4 animate-fade-in">
                      <div className="bg-stone-50 px-3 py-2.5 rounded-xl border border-retro-text/5 flex justify-between items-center">
                        <span className="text-xs font-bold text-retro-text/60">使用紀錄筆數</span>
                        <span className="text-sm font-extrabold text-amber-600 font-mono">
                          總計：{allUsageInstances.length} 筆
                        </span>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[11px] font-extrabold text-retro-text/50 uppercase tracking-wider block">
                          ⌛ 從開封到用完/丟棄的時間
                        </span>
                        
                        <div className="overflow-hidden rounded-xl border border-retro-text/5 bg-white shadow-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-stone-50 border-b border-retro-text/5 text-[10px] uppercase text-retro-text/50">
                                <th className="p-2.5 font-bold whitespace-nowrap">狀態</th>
                                <th className="p-2.5 font-bold whitespace-nowrap">期間</th>
                                <th className="p-2.5 font-bold text-right whitespace-nowrap">花費時間</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-retro-text/5">
                              {allUsageInstances.map(inst => {
                                let durationStr = '-';
                                if (inst.openedDate) {
                                  const endD = (inst.usage === '已用完' || inst.usage === '已丟棄') && inst.finishedDate 
                                    ? new Date(inst.finishedDate) 
                                    : new Date();
                                  const startD = new Date(inst.openedDate);
                                  const diffMs = endD.getTime() - startD.getTime();
                                  if (diffMs >= 0) {
                                    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    const years = Math.floor(totalDays / 365);
                                    const months = Math.floor((totalDays % 365) / 30);
                                    const days = (totalDays % 365) % 30;
                                    
                                    const parts = [];
                                    if (years > 0) parts.push(`${years}年`);
                                    if (months > 0) parts.push(`${months}個月`);
                                    if (years === 0 && months === 0) parts.push(`${days}天`);
                                    durationStr = parts.join('');
                                  }
                                }
                                
                                return (
                                  <tr key={inst.id} className={`text-xs text-retro-text`}>
                                    <td className="p-2.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        inst.usage === '使用中' ? 'bg-green-100 text-green-700' :
                                        inst.usage === '已用完' ? 'bg-stone-200 text-stone-600' :
                                        'bg-red-100 text-red-600'
                                      }`}>
                                        {inst.usage}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-mono text-[10px] text-stone-500">
                                      <div>{inst.openedDate || '-'}</div>
                                      <div>~ {inst.finishedDate || (inst.usage === '使用中' ? '至今' : '-')}</div>
                                    </td>
                                    <td className="p-2.5 font-bold text-right text-amber-600">{durationStr}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {allUsageInstances.length === 0 && (
                            <div className="py-6 text-center text-xs text-stone-400 font-semibold bg-white">
                              暫無使用紀錄 (需設定開封日期)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
            )}
            
            {/* Quick add instance footer */}
            {selectedDetailProduct.status !== 'archived' && (
              <div className="p-3 border-t border-retro-text/5 bg-stone-50/80 flex gap-2 flex-shrink-0">
                <button 
                  onClick={() => {
                    handleAddAnotherInstanceTrigger(selectedDetailProduct);
                    setSelectedDetailProduct(null);
                  }}
                  className="w-full py-2.5 bg-retro-secondary hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  新增此產品的其他庫存/規格
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ==================== 9. Custom Confirmation Dialog (Requirement 2: Resolve iframe window.confirm blocks) ==================== */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white border-2 border-retro-text rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 animate-slide-up">
            <div className="flex items-center gap-2 text-retro-secondary">
              <Info className="w-5 h-5 flex-shrink-0 text-retro-primary" />
              <span className="font-extrabold text-sm uppercase tracking-wider">{confirmDialog.title}</span>
            </div>
            <p className="text-xs font-bold text-stone-600 leading-relaxed whitespace-pre-line">
              {confirmDialog.message}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all border border-stone-200 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 py-2 bg-retro-primary hover:opacity-90 text-retro-card font-extrabold text-xs rounded-xl transition-all shadow-sm cursor-pointer"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 10. Fullscreen Image Modal ==================== */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 bg-stone-900/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setFullscreenImage(null)}
        >
          <img 
            referrerPolicy="no-referrer"
            src={fullscreenImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

// Compact Single Product Card Component (Requirement 1: Click outside total card triggers complete detail view)
function ProductCard({ 
  product, 
  onViewDetail,
  onEdit, 
  onArchive,
  onAddAnother,
  onImageClick
}: { 
  product: Product; 
  onViewDetail: (prod: Product) => void; 
  onEdit: (prod: Product, inst: ProductInstance) => void;
  onArchive: (prodId: string, instId: string) => void;
  onAddAnother: (prod: Product) => void;
  onImageClick?: (url: string) => void;
}) {
  const instances = product.instances;
  const isArchived = product.status === 'archived';

  // Find standard shortest expiry days to show on outer circle badge
  let minDaysToExpiry = 9999;
  let closestExpiryDate = '';
  instances.forEach(inst => {
    const days = calculateDaysToExpiry(inst.expiry);
    if (days < minDaysToExpiry) {
      minDaysToExpiry = days;
      closestExpiryDate = inst.expiry;
    }
  });

  // Calculate standard warning styles
  const isUrgent = minDaysToExpiry <= 60;
  const totalQty = instances.reduce((sum, inst) => sum + inst.qty, 0);
  const totalUnopenedQty = instances.filter(inst => inst.usage === '未開封').reduce((sum, inst) => sum + inst.qty, 0);
  const hasInUse = instances.some(inst => inst.usage === '使用中');
  const needsRestock = product.threshold > 0 && totalUnopenedQty <= product.threshold;

  return (
    <div 
      onClick={() => onViewDetail(product)}
      className={`p-4 rounded-2xl flex items-center justify-between bg-white border border-retro-text/5 hover:border-retro-primary/30 shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.99] group relative ${isArchived ? 'opacity-60 grayscale' : ''}`}
      title="點擊進入商品完整畫面"
    >
      <div className="flex gap-3.5 items-center min-w-0 flex-1">
        {/* Thumb */}
        {product.photo ? (
          <img 
            referrerPolicy="no-referrer"
            src={product.photo} 
            alt={product.name}
            onClick={(e) => {
              if (onImageClick) {
                e.stopPropagation();
                onImageClick(product.photo!);
              }
            }}
            className="w-11 h-14 rounded-lg object-cover border border-retro-text/10 shadow-sm group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-11 h-14 rounded-lg bg-retro-primary/10 border border-dashed border-retro-primary/30 flex items-center justify-center text-retro-primary flex-shrink-0">
            <Camera className="w-5 h-5 opacity-40" />
          </div>
        )}

        {/* Titles */}
        <div className="flex flex-col justify-start min-w-0 flex-1">
          <span className="text-[10px] font-bold text-retro-secondary tracking-wider uppercase truncate flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hasInUse ? 'bg-green-500 animate-pulse' : 'bg-stone-300'}`}></span>
            {product.brand}
          </span>
          <span className="text-sm font-bold font-display text-retro-text leading-snug truncate group-hover:text-retro-primary transition-colors mt-0.5 flex items-center gap-2">
            <span className="truncate">{product.name}</span>
            {needsRestock && (
              <span className="flex-shrink-0 bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Info className="w-3 h-3" />
                補貨
              </span>
            )}
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-semibold text-retro-text/50 bg-stone-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Package className="w-3 h-3 text-retro-primary" />
              共 {totalQty} 件
            </span>
            {instances.length > 1 && (
              <span className="text-[10px] font-semibold text-retro-secondary bg-retro-secondary/5 px-2 py-0.5 rounded-full">
                {instances.length} 種規格
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right Circle Expiry Indicator */}
      <div className="flex items-center gap-3 ml-3 flex-shrink-0">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-stone-50 border border-retro-text/5 flex flex-col items-center justify-center">
            <span className={`text-sm font-bold leading-none ${isUrgent ? 'text-red-500 font-extrabold' : 'text-retro-primary'}`}>
              {minDaysToExpiry !== 9999 ? minDaysToExpiry : '-'}
            </span>
            <span className="text-[8px] text-retro-text/50 font-bold mt-0.5">天到期</span>
          </div>
          {minDaysToExpiry !== 9999 && closestExpiryDate && (
            <span className="text-[9px] font-bold text-retro-text/40 mt-1">
              {closestExpiryDate.replace(/-/g, '/')}
            </span>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-retro-primary group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

// Inline mini Clock icon
function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-retro-bg flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <Sparkles className="w-8 h-8 text-retro-primary animate-pulse" />
          <span className="text-retro-text font-bold text-sm tracking-wider uppercase">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-retro-bg flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-retro-text/10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-retro-primary/10 rounded-2xl flex items-center justify-center text-retro-primary mb-6">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display text-retro-text mb-2">化妝品管理系統</h1>
          <p className="text-retro-text/60 text-sm mb-8">
            精緻復古底片風格的化妝品與保養品庫存管理系統，請登入以存取專屬您的帳號資料。
          </p>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-retro-text text-white py-4 rounded-xl font-bold hover:bg-retro-text/90 transition-all shadow-md active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 bg-white rounded-full p-0.5" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            使用 Google 帳號登入
          </button>
        </div>
      </div>
    );
  }

  return <MainApp user={user} />;
}
