import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, LogOut, Check, Search, Filter, FileText, Plus, Video, Wrench, MessageCircle, RefreshCw, Save, Lock, Shuffle, AlertCircle, Users, Settings, Database, Link as LinkIcon, Star, Edit, Trash2, X, AlertTriangle, Eye, Pencil, UserPlus, Instagram, Store, Phone, MinusCircle, Clock } from 'lucide-react';

// ==========================================
// ▼ 請在這裡貼上您的 Google Sheets CSV 連結 ▼
// ==========================================
const GOOGLE_SHEETS_CONFIG = {
  // 1. 腳本資料 (Scripts) 的 CSV 連結 (讀取用)
  SCRIPTS_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSRijzRNg7145uhzgYAaTP80FMd_sOYRwXNlnDoGObxCp51WHq3PpRqEJLFWbO93ViIwB5jlXg4Jgo/pub?gid=0&single=true&output=csv',
  
  // 2. 使用者權限 (Users) 的 CSV 連結 (讀取用)
  USERS_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSSRijzRNg7145uhzgYAaTP80FMd_sOYRwXNlnDoGObxCp51WHq3PpRqEJLFWbO93ViIwB5jlXg4Jgo/pub?gid=490603336&single=true&output=csv',

  // 3. Google Apps Script 網址 (寫入用 - 儲存選擇結果與新增腳本)
  API_URL: 'https://script.google.com/macros/s/AKfycbwXhAoCochPKQLV1Nm79uqqeTrB4AfQnXaxgvBeixbvKwWLz8j8yXrkRRz9T_AmLSv0/exec', 
};

// ==========================================
// ▼ 分類與代碼設定 ▼
// ==========================================
const CATEGORY_MAPPING = {
  '剪髮': 'CUT',
  '染髮': 'COLOR',
  '燙髮': 'PERM',
  '護髮': 'CARE',
  '頭皮': 'SCALP',
  '造型': 'STYLE',
  '經營': 'BUSINESS',
  '其他': 'OTHER'
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_MAPPING);

// --- Data Parsing Helpers ---
const parseCSV = (text) => {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].replace(/\r/g, '').split(',').map(h => h.trim().toLowerCase());
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    const values = [];
    let match;
    const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
    while ((match = regex.exec(currentLine)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] !== undefined ? match[1] : match[2];
      values.push(val !== undefined ? val.trim() : '');
    }
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    if (!row['id'] && currentLine.split(',').length >= headers.length) {
        const simpleValues = currentLine.split(',');
        headers.forEach((header, index) => {
            row[header] = simpleValues[index] ? simpleValues[index].trim() : '';
        });
    }
    result.push(row);
  }
  return result;
};

const transformScriptData = (csvData) => {
  return csvData.map(row => ({
    id: row.id,
    category: row.category,
    title: row.title,
    project_note: row.project_note || '',
    video_description: row.video_description || '',
    requirements: row.requirements || '',
    material_link: row.material_link || '',
    stages: [
      { name: '起', points: row.start_points, dialogue: row.start_dialogue },
      { name: '承', points: row.develop_points, dialogue: row.develop_dialogue },
      { name: '轉', points: row.twist_points, dialogue: row.twist_dialogue },
      { name: '合', points: row.end_points, dialogue: row.end_dialogue },
    ]
  })).filter(item => item.id); 
};

const transformUserData = (csvData) => {
  return csvData.map(row => ({
    id: row.id,
    name: row.name,
    role: row.role,
    assignedScripts: row.assignedscripts ? row.assignedscripts.split(',').map(s => s.trim()) : [],
    scriptPool: row.script_pool ? row.script_pool.split(',').map(s => s.trim()) : [],
    quota: row.quota ? parseInt(row.quota, 10) : 10,
    contactPerson: row.contact_person || '', 
    instagram: row.instagram || '',
    selectionStartTime: row.selection_start_time ? parseInt(row.selection_start_time, 10) : null
  })).filter(item => item.id);
};

// --- Mock Data ---
const MOCK_SCRIPTS = [
  { id: 's1', category: '剪髮', title: '方形層次剪裁', stages: [{name:'起', points:'...', dialogue:'...'}] },
];
const MOCK_USERS = [
  { id: 'u1', name: '設計師 (範例)', role: 'stylist', assignedScripts: [], quota: 10 },
  { id: 'admin', name: '管理員', role: 'admin', assignedScripts: [] },
];

// --- Helper Functions ---
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const formatTimeLeft = (ms) => {
    if (ms <= 0) return "已結束";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}小時 ${minutes}分`;
};

// --- Components ---

const LoginScreen = ({ loginId, setLoginId, handleLogin, loading }) => (
  <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
      <div className="text-center mb-8">
        <div className="bg-teal-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">美髮腳本選單</h1>
        <p className="text-slate-500 mt-2">請輸入您的 ID 開始選擇腳本</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">使用者 ID</label>
          <input 
            type="text" 
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors flex justify-center items-center"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : '登入'}
        </button>
        <p className="text-xs text-center text-slate-400 mt-4">管理員請輸入 admin 帳號</p>
      </div>
    </div>
  </div>
);

const ScriptDetailModal = ({ script, onClose, onEdit, isEditable }) => {
  if (!script) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50 rounded-t-2xl">
          <div>
            <span className="text-xs font-bold tracking-wider text-teal-600 uppercase bg-teal-50 px-2 py-1 rounded-full">
              {script.category}
            </span>
            <div className="flex items-center gap-2 mt-2">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800">{script.title}</h2>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">{script.id}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && (
                <button 
                    onClick={() => onEdit(script)}
                    className="p-2 bg-teal-50 text-teal-600 rounded-full hover:bg-teal-100 border border-teal-200 shadow-sm flex items-center px-3"
                >
                    <Pencil className="w-4 h-4 mr-1" />
                    <span className="text-sm font-bold">編輯</span>
                </button>
            )}
            <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-200 shadow-sm">✕</button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 bg-white">
          {(script.video_description || script.requirements) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
               {script.video_description && (
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-900 leading-relaxed">
                    <div className="flex items-center font-bold mb-2 text-blue-700"><Video className="w-4 h-4 mr-2"/> 內容簡述</div>
                    {script.video_description}
                 </div>
               )}
               {script.requirements && (
                 <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-amber-900 leading-relaxed">
                    <div className="flex items-center font-bold mb-2 text-amber-700"><Wrench className="w-4 h-4 mr-2"/> 準備事項</div>
                    {script.requirements}
                 </div>
               )}
            </div>
          )}

          <div className="hidden md:block bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-sm border-b border-slate-200">
                  <th className="py-3 px-4 font-bold w-20 text-center">階段</th>
                  <th className="py-3 px-4 font-bold w-1/3">內容要點</th>
                  <th className="py-3 px-4 font-bold">對話參考</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {script.stages?.map((stage, idx) => (
                  <tr key={idx} className="bg-white hover:bg-slate-50">
                    <td className="py-4 px-4 text-center align-top">
                      <span className={`inline-block w-8 h-8 rounded-full text-white font-bold leading-8 text-center shadow-sm
                        ${stage.name === '起' ? 'bg-teal-500' : 
                          stage.name === '承' ? 'bg-blue-500' : 
                          stage.name === '轉' ? 'bg-orange-500' : 'bg-slate-600'}`}>
                        {stage.name}
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top text-slate-700 font-medium leading-relaxed">{stage.points}</td>
                    <td className="py-4 px-4 align-top">
                        <div className="bg-slate-50 p-3 rounded text-slate-600 italic border border-slate-100">
                            "{stage.dialogue}"
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4">
            {script.stages?.map((stage, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center mb-3">
                    <span className={`w-8 h-8 rounded-full text-white font-bold flex items-center justify-center mr-3 shadow-sm
                        ${stage.name === '起' ? 'bg-teal-500' : 
                        stage.name === '承' ? 'bg-blue-500' : 
                        stage.name === '轉' ? 'bg-orange-500' : 'bg-slate-600'}`}>
                    {stage.name}
                    </span>
                    <h3 className="font-bold text-slate-800">階段：{stage.name}</h3>
                </div>
                <div className="mb-3 pl-11">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-1">內容要點</h4>
                    <p className="text-slate-800 leading-relaxed">{stage.points}</p>
                </div>
                <div className="pl-11">
                    <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border border-slate-100 relative">
                        <MessageCircle className="w-4 h-4 absolute -top-2 left-4 text-slate-300 bg-white rounded-full" />
                        "{stage.dialogue}"
                    </div>
                </div>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Confirm Modal ---
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "確認", cancelText = "取消" }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{message}</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                    <button 
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-bold shadow-sm transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Stylist Selection App ---
const StylistApp = ({ currentUser, scripts, handleLogout, onSaveSelection, onStartTimer, isSaving }) => {
  const maxLimit = currentUser.quota || 10;
  const [selectedIds, setSelectedIds] = useState(currentUser.assignedScripts || []);
  const [now, setNow] = useState(Date.now());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });
  
  const timeLimit = 24 * 60 * 60 * 1000; 
  const expirationTime = currentUser.selectionStartTime ? currentUser.selectionStartTime + timeLimit : null;
  const timeLeft = expirationTime ? expirationTime - now : timeLimit;
  const isExpired = expirationTime && now > expirationTime;

  useEffect(() => {
    if (!currentUser.selectionStartTime && !isExpired && currentUser.assignedScripts.length < maxLimit) {
        onStartTimer(currentUser.id, Date.now());
    }
  }, [currentUser.selectionStartTime, currentUser.id]);

  useEffect(() => {
      const timer = setInterval(() => setNow(Date.now()), 1000 * 60);
      return () => clearInterval(timer);
  }, []);

  const isLocked = (currentUser.assignedScripts.length >= maxLimit) || isExpired;

  const [activeTab, setActiveTab] = useState(isLocked ? 'my-scripts' : 'library');
  
  useEffect(() => {
    if (isLocked) setActiveTab('my-scripts');
  }, [isLocked]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewScript, setPreviewScript] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [randomSeed, setRandomSeed] = useState(0);

  const hasSpecificPool = useMemo(() => {
      return currentUser.scriptPool && currentUser.scriptPool.length > 0;
  }, [currentUser.scriptPool]);

  const availableScripts = useMemo(() => {
    if (!hasSpecificPool) {
      return scripts;
    }
    return scripts.filter(script => {
      const isIdAllowed = currentUser.scriptPool.some(allowed => allowed.toLowerCase() === script.id.toLowerCase());
      const isCategoryAllowed = currentUser.scriptPool.some(allowed => {
        if (allowed.toLowerCase().startsWith('cat:')) {
          const categoryName = allowed.split(':')[1]?.trim().toLowerCase();
          return categoryName === script.category.toLowerCase();
        }
        return false;
      });
      return isIdAllowed || isCategoryAllowed;
    });
  }, [scripts, currentUser.scriptPool, hasSpecificPool]);

  const categories = useMemo(() => {
    const cats = new Set(availableScripts.map(s => s.category));
    return ['All', ...Array.from(cats)];
  }, [availableScripts]);

  const randomMenuScripts = useMemo(() => {
    if (hasSpecificPool) return []; 
    let pool = availableScripts;
    if (selectedCategory !== 'All') {
        pool = pool.filter(s => s.category === selectedCategory);
    }
    return shuffleArray(pool).slice(0, 15);
  }, [availableScripts, selectedCategory, randomSeed, hasSpecificPool]);

  const displayScripts = useMemo(() => {
    if (activeTab === 'my-scripts') {
      return scripts.filter(s => selectedIds.includes(s.id));
    } else {
      if (searchTerm) {
        return availableScripts.filter(s => 
          (selectedCategory === 'All' || s.category === selectedCategory) &&
          (s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
           s.id.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      if (hasSpecificPool) {
          if (selectedCategory === 'All') return availableScripts;
          return availableScripts.filter(s => s.category === selectedCategory);
      } else {
          return randomMenuScripts;
      }
    }
  }, [activeTab, selectedIds, scripts, searchTerm, selectedCategory, randomMenuScripts, availableScripts, hasSpecificPool]);

  const toggleSelection = (id) => {
    if (isExpired) {
        alert("選擇時間已過，無法再變更！");
        return;
    }
    
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      if (selectedIds.length >= maxLimit) {
        alert(`您的方案最多只能選擇 ${maxLimit} 支腳本！`);
        return;
      }
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSaveClick = () => {
      const isFullNow = selectedIds.length >= maxLimit;
      const title = isFullNow ? "🔒 確認選滿並鎖定？" : "💾 儲存目前進度";
      const message = isFullNow 
        ? `您已選滿 ${maxLimit} 支腳本！\n\n確認送出後，腳本庫將會關閉，您將無法再更換內容。\n確定要送出嗎？`
        : `您目前選了 ${selectedIds.length} 支，尚未選滿。\n\n儲存後，您可以稍後回來繼續挑選。`;

      setConfirmModal({
          isOpen: true,
          title: title,
          message: message,
          onConfirm: () => {
              onSaveSelection(selectedIds);
              setConfirmModal({ isOpen: false, title: '', message: '' });
          }
      });
  };

  const handleShuffle = () => {
      setRandomSeed(prev => prev + 1);
  };

  const hasChanges = useMemo(() => {
    const current = [...selectedIds].sort();
    const original = [...(currentUser.assignedScripts || [])].sort();
    return JSON.stringify(current) !== JSON.stringify(original);
  }, [selectedIds, currentUser.assignedScripts]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-md mx-auto shadow-2xl relative">
      <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-2">
            <h1 className="font-bold text-slate-800">你好，{currentUser.name}</h1>
            <button onClick={handleLogout} className="text-slate-400 p-1"><LogOut className="w-5 h-5"/></button>
        </div>
        
        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
            <div className="flex items-center text-xs text-slate-500">
                <span className={`font-bold mr-1 ${selectedIds.length >= maxLimit ? 'text-red-500' : 'text-teal-600'}`}>
                    {selectedIds.length} / {maxLimit}
                </span>
                <span>已選</span>
            </div>
            
            <div className={`flex items-center text-xs font-mono font-bold ${isExpired ? 'text-red-500' : 'text-orange-500'}`}>
                <Clock className="w-3 h-3 mr-1" />
                {isExpired ? "時間到" : formatTimeLeft(timeLeft)}
            </div>
        </div>
      </header>

      <div className="bg-white px-4 pb-2 flex gap-4 border-b border-slate-100 sticky top-[84px] z-20">
        {!isLocked && (
            <button 
            onClick={() => setActiveTab('library')}
            className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'library' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-400'}`}
            >
            腳本庫
            </button>
        )}
        <button 
          onClick={() => setActiveTab('my-scripts')}
          className={`flex-1 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'my-scripts' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-400'}`}
        >
          已選 ({selectedIds.length})
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 pb-24">

        {/* 倒數計時提示 Banner */}
        {!isLocked && !isExpired && (
            <div className="mb-4 bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg text-xs flex items-start shadow-sm">
                <Clock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                    <strong>注意：選片有時間限制</strong>
                    <p className="mt-1 opacity-90 leading-relaxed">
                        為了確保專案進度，請於首次登入後 <strong>24 小時內</strong> 完成腳本挑選與確認。時間結束後系統將自動鎖定。
                    </p>
                </div>
            </div>
        )}
        
        {activeTab === 'library' && (
          <div className="mb-4 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setSearchTerm(''); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors
                    ${selectedCategory === cat ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"/>
                    <input 
                        type="text" 
                        placeholder="搜尋關鍵字..." 
                        value={searchTerm}
                        onChange={(e)=>setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                {!hasSpecificPool && !searchTerm && (
                    <button 
                        onClick={handleShuffle}
                        className="flex items-center bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-teal-600 active:scale-95 transition-all"
                    >
                        <Shuffle className="w-3 h-3 mr-1" />
                        換一批
                    </button>
                )}
            </div>
          </div>
        )}

        {isLocked && (
            <div className={`mb-4 border p-4 rounded-lg flex items-start text-sm 
                ${isExpired ? 'bg-red-50 border-red-100 text-red-800' : 'bg-teal-50 border-teal-100 text-teal-800'}`}>
                {isExpired ? <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" /> : <Lock className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />}
                <div>
                    <strong>{isExpired ? '選片時間已結束' : '已選滿額度'}</strong>
                    <p className="mt-1 opacity-80">
                        {isExpired 
                            ? '已超過 24 小時選片時間，系統已自動鎖定您的選擇。' 
                            : '若要更換腳本，請先移除下方的已選項目，腳本庫就會重新開啟。'}
                    </p>
                </div>
            </div>
        )}

        <div className="space-y-3">
          {displayScripts.map((script, index) => {
            const isSelected = selectedIds.includes(script.id);
            return (
              <div key={`${script.id}-${index}`} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                    {script.category}
                  </span>
                  <button 
                    onClick={() => setPreviewScript(script)}
                    className="text-xs text-teal-600 bg-teal-50 px-2 py-1 rounded hover:bg-teal-100"
                  >
                    預覽內容
                  </button>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-1">{script.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {script.stages[0]?.points}
                </p>

                {isSelected ? (
                     <button 
                        onClick={() => toggleSelection(script.id)}
                        disabled={isExpired} 
                        className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center transition-all border border-transparent
                            ${isExpired ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}
                    >
                        {isExpired ? <Lock className="w-4 h-4 mr-1" /> : <MinusCircle className="w-4 h-4 mr-1" />}
                        {isExpired ? '已鎖定' : '移除此腳本'}
                    </button>
                ) : (
                    !isLocked && (
                        <button 
                            onClick={() => toggleSelection(script.id)}
                            className="w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center transition-all bg-teal-600 text-white shadow-md hover:bg-teal-700 active:scale-95"
                        >
                            <Plus className="w-4 h-4 mr-1" /> 加入清單
                        </button>
                    )
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Save Button (Floating) */}
      {hasChanges && !isExpired && (
        <div className="fixed bottom-6 left-0 right-0 px-4 max-w-md mx-auto z-30">
          <button 
            onClick={handleSaveClick}
            disabled={isSaving}
            className={`w-full text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center animate-bounce-subtle
                ${selectedIds.length >= maxLimit ? 'bg-teal-700' : 'bg-slate-800'}`}
          >
            {isSaving ? <RefreshCw className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            {selectedIds.length >= maxLimit ? '確認選滿並鎖定' : `儲存目前進度 (${selectedIds.length}/${maxLimit})`}
          </button>
        </div>
      )}

      <ScriptDetailModal script={previewScript} onClose={() => setPreviewScript(null)} />
      
      {/* Confirm Modal */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

// --- Add/Edit Script Modal ---
const AddScriptModal = ({ onClose, onSave, loading, hasApiUrl, scripts, initialData, isEditing }) => {
  const [formData, setFormData] = useState(initialData || {
    id: '', 
    category: '',
    title: '',
    video_description: '',
    requirements: '',
    material_link: '', 
    stages: [
      { name: '起', points: '', dialogue: '' },
      { name: '承', points: '', dialogue: '' },
      { name: '轉', points: '', dialogue: '' },
      { name: '合', points: '', dialogue: '' }
    ]
  });
  const [error, setError] = useState(null);

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    let newId = formData.id;
    if (!isEditing) {
        const englishName = CATEGORY_MAPPING[category] || 'OTHER';
        const prefix = englishName.substring(0, 3).toUpperCase(); 
        const count = scripts.filter(s => s.id.startsWith(prefix)).length;
        const nextNum = (count + 1).toString().padStart(3, '0');
        newId = `${prefix}-${nextNum}`;
    }
    setFormData(prev => ({ ...prev, category: category, id: newId }));
  };

  const handleStageChange = (idx, field, value) => {
    const newStages = [...formData.stages];
    newStages[idx][field] = value;
    setFormData({ ...formData, stages: newStages });
  };

  const handleSubmit = () => {
    setError(null);
    if (!hasApiUrl) {
        setError('尚未設定 API 網址，無法使用新增功能。請先至設定頁面填寫。');
        return;
    }
    if (!formData.id || !formData.title || !formData.category) {
      setError('請填寫必填欄位：分類與標題');
      return;
    }
    onSave(formData, isEditing);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center">
            {isEditing ? <Edit className="w-5 h-5 mr-2 text-teal-600" /> : <Plus className="w-5 h-5 mr-2 text-teal-600" />}
            {isEditing ? '編輯教學腳本' : '新增教學腳本'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {!hasApiUrl && (
             <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start">
               <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
               <div>
                 <strong>未設定寫入 API：</strong> 目前僅能預覽表單，無法實際儲存。
               </div>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">分類 <span className="text-red-500">*</span></label>
              <select
                value={formData.category}
                onChange={handleCategoryChange}
                disabled={isEditing}
                className={`w-full p-2 border border-slate-300 rounded text-sm ${isEditing ? 'bg-slate-100 cursor-not-allowed' : 'bg-white'}`}
              >
                  <option value="">請選擇分類</option>
                  {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">ID (自動生成)</label>
              <input 
                type="text" 
                value={formData.id}
                readOnly
                className="w-full p-2 border border-slate-300 rounded font-mono text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                placeholder="選擇分類後自動生成"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">標題 <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="例如: 方形層次"
                className="w-full p-2 border border-slate-300 rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">影片簡述</label>
               <textarea
                 rows={3}
                 value={formData.video_description}
                 onChange={(e) => setFormData({...formData, video_description: e.target.value})}
                 className="w-full p-2 border border-slate-300 rounded text-sm"
               />
            </div>
             <div>
               <label className="block text-sm font-bold text-slate-700 mb-1">所需道具 / 模特兒</label>
               <textarea
                 rows={3}
                 value={formData.requirements}
                 onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                 className="w-full p-2 border border-slate-300 rounded text-sm"
               />
            </div>
          </div>

          <div className="space-y-4">
            {formData.stages.map((stage, idx) => (
              <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center mb-3">
                   <span className={`inline-block w-6 h-6 rounded-full text-white text-xs font-bold leading-6 text-center mr-2
                      ${stage.name === '起' ? 'bg-teal-500' : 
                        stage.name === '承' ? 'bg-blue-500' : 
                        stage.name === '轉' ? 'bg-orange-500' : 'bg-slate-600'}`}>
                      {stage.name}
                   </span>
                   <span className="font-bold text-slate-700">階段內容</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">內容要點</label>
                    <textarea 
                      rows={2}
                      value={stage.points}
                      onChange={(e) => handleStageChange(idx, 'points', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">對話參考</label>
                    <textarea 
                      rows={2}
                      value={stage.dialogue}
                      onChange={(e) => handleStageChange(idx, 'dialogue', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-sm resize-none bg-slate-50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex flex-col items-end">
          {error && (
              <div className="text-red-600 text-sm mb-3 font-bold flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
              </div>
          )}
          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
                取消
            </button>
            <button 
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium flex items-center disabled:bg-teal-400"
            >
                {loading ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {isEditing ? '確認修改' : '確認新增'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Add User Modal ---
const AddUserModal = ({ onClose, onSave, loading, hasApiUrl, users }) => {
  const [formData, setFormData] = useState({
    id: '', 
    name: '',
    contactPerson: '',
    instagram: '',
    plan: '10' 
  });
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    setError(null);
    if (!hasApiUrl) {
      setError('尚未設定 API 網址，無法使用新增功能。');
      return;
    }
    if (!formData.id || !formData.name) {
      setError('請填寫客戶代號與店家名稱');
      return;
    }
    if (users.some(u => u.id.toLowerCase() === formData.id.toLowerCase())) {
        setError('此客戶代號已存在');
        return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800 flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-teal-600" />
            新增設計師/客戶
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {!hasApiUrl && (
             <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded text-sm mb-4">
               未設定寫入 API，僅供預覽。
             </div>
          )}
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">客戶代號 (ID) <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={formData.id}
              onChange={(e) => setFormData({...formData, id: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded"
              placeholder="例如: client01"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">店家名稱 <span className="text-red-500">*</span></label>
            <div className="relative">
                <Store className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                type="text" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full pl-9 p-2 border border-slate-300 rounded"
                placeholder="例如: 快樂髮廊"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">聯絡人</label>
                <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                    type="text" 
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    className="w-full pl-9 p-2 border border-slate-300 rounded"
                    placeholder="王小明"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">IG 連結</label>
                <div className="relative">
                    <Instagram className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                    type="text" 
                    value={formData.instagram}
                    onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                    className="w-full pl-9 p-2 border border-slate-300 rounded"
                    placeholder="instagram.com/..."
                    />
                </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">購買方案 (額度)</label>
            <select
                value={formData.plan}
                onChange={(e) => setFormData({...formData, plan: e.target.value})}
                className="w-full p-2 border border-slate-300 rounded bg-white"
            >
                <option value="10">10 支方案 (Quota: 10)</option>
                <option value="30">30 支方案 (Quota: 30)</option>
            </select>
          </div>

        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
            {error && <span className="text-red-500 text-sm flex items-center mr-auto"><AlertCircle className="w-4 h-4 mr-1"/>{error}</span>}
            <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded">取消</button>
            <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 flex items-center disabled:opacity-50"
            >
                {loading ? <RefreshCw className="animate-spin w-4 h-4 mr-2"/> : <Save className="w-4 h-4 mr-2"/>}
                確認新增
            </button>
        </div>
      </div>
    </div>
  );
};

// --- Admin Settings ---
const AdminSettings = ({ sheetsConfig, setSheetsConfig, onSave, onReset }) => {
  const [tempConfig, setTempConfig] = useState(sheetsConfig);

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
        <LinkIcon className="w-6 h-6 mr-2 text-teal-600" />
        資料庫與 API 設定
      </h2>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              Scripts CSV 連結 (讀取用)
            </label>
            <input 
              type="text" 
              value={tempConfig.SCRIPTS_URL}
              onChange={(e) => setTempConfig({...tempConfig, SCRIPTS_URL: e.target.value})}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono text-xs text-slate-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
              <Users className="w-4 h-4 mr-1" />
              Users CSV 連結 (讀取用)
            </label>
            <input 
              type="text" 
              value={tempConfig.USERS_URL}
              onChange={(e) => setTempConfig({...tempConfig, USERS_URL: e.target.value})}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono text-xs text-slate-600"
            />
          </div>
          
          <div className="pt-4 border-t border-slate-100">
             <div className="mb-2 bg-yellow-50 text-yellow-800 p-3 rounded text-sm flex items-start">
               <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
               <div>
                 <strong>進階設定：</strong> 若要啟用「儲存」功能，需填寫 Google Apps Script 網址。
               </div>
             </div>
             <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
              <RefreshCw className="w-4 h-4 mr-1" />
              Google Apps Script API 網址 (寫入用)
            </label>
            <input 
              type="text" 
              value={tempConfig.API_URL || ''}
              onChange={(e) => setTempConfig({...tempConfig, API_URL: e.target.value})}
              placeholder="https://script.google.com/macros/s/..../exec"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 font-mono text-xs text-slate-600"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
           <button 
            onClick={onReset}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
          >
            重置
          </button>
          <button 
            onClick={() => onSave(tempConfig)}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium"
          >
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Admin Dashboard (管理員專用) ---
const AdminDashboard = ({ 
  users, 
  scripts, 
  handleLogout,
  sheetsConfig,
  fetchGoogleSheetsData,
  onSaveUserPool,
  onSaveScript, 
  onAddUser, 
  resetToMockData
}) => {
  const [activeTab, setActiveTab] = useState('users'); 
  const [editingUser, setEditingUser] = useState(null);
  const [scriptFilter, setScriptFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); 
  const [isSaving, setIsSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false); 
  const [previewScript, setPreviewScript] = useState(null);
  const [scriptToEdit, setScriptToEdit] = useState(null); 

  const categories = useMemo(() => {
    const cats = new Set(scripts.map(s => s.category));
    return ['All', ...Array.from(cats)];
  }, [scripts]);

  const toggleScriptInPool = (scriptId) => {
    if (!editingUser) return;
    const currentPool = editingUser.scriptPool || [];
    let newPool;
    if (currentPool.includes(scriptId)) {
        newPool = currentPool.filter(id => id !== scriptId);
    } else {
        newPool = [...currentPool, scriptId];
    }
    setEditingUser({ ...editingUser, scriptPool: newPool });
  };

  const handleSaveClick = async () => {
      setIsSaving(true);
      await onSaveUserPool(editingUser);
      setIsSaving(false);
  };
  
  const handleEditScript = (script) => {
      setScriptToEdit(script);
      setPreviewScript(null); 
      setShowAddModal(true);
  };
  
  const handleAddScript = () => {
      setScriptToEdit(null);
      setShowAddModal(true);
  };

  const isReadOnly = !sheetsConfig.API_URL;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md sticky top-0 z-20">
        <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-teal-400" />
            <h1 className="font-bold text-lg">管理員控制台</h1>
        </div>
        <div className="flex gap-4">
            <button onClick={() => setActiveTab('users')} className={`text-sm font-medium hover:text-white ${activeTab === 'users' ? 'text-white underline' : 'text-slate-400'}`}>設計師管理</button>
            <button onClick={() => setActiveTab('scripts')} className={`text-sm font-medium hover:text-white ${activeTab === 'scripts' ? 'text-white underline' : 'text-slate-400'}`}>腳本庫管理</button>
            <div className="w-px h-5 bg-slate-600 mx-2"></div>
            <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6">
        
        {activeTab === 'settings' && (
             <AdminSettings 
               sheetsConfig={sheetsConfig} 
               setSheetsConfig={() => {}} 
               onSave={fetchGoogleSheetsData} 
               onReset={resetToMockData}
             />
        )}

        {activeTab === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
                {/* 左側：使用者列表 */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h2 className="font-bold text-slate-700 flex items-center"><Users className="w-4 h-4 mr-2" /> 設計師列表</h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowAddUserModal(true)} 
                                className="bg-teal-600 text-white p-1.5 rounded hover:bg-teal-700" 
                                title="新增設計師"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={() => fetchGoogleSheetsData(sheetsConfig)} className="text-slate-400 hover:text-teal-600 p-1.5"><RefreshCw className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                        {users.filter(u => u.role !== 'admin').map((user, index) => (
                            <button 
                                key={`${user.id}-${index}`}
                                onClick={() => setEditingUser(user)}
                                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex justify-between items-center ${editingUser?.id === user.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''}`}
                            >
                                <div><div className="font-bold text-slate-800">{user.name}</div><div className="text-xs text-slate-400">ID: {user.id}</div></div>
                                <div className="text-right"><div className="text-xs font-bold text-teal-600">池: {user.scriptPool?.length || 0}</div></div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 右側：腳本池管理 */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    {!editingUser ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><Users className="w-12 h-12 mb-4 opacity-20" /><p>請選擇一位設計師以管理其腳本池</p></div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h2 className="font-bold text-slate-800">設定 {editingUser.name} 的腳本池</h2>
                                    <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                        <span className="text-teal-600 font-bold">目前開放 {editingUser.scriptPool?.length || 0} 支</span>
                                        <span>|</span>
                                        <span className="text-orange-600">額度 {editingUser.quota}</span>
                                        {editingUser.contactPerson && <span>| {editingUser.contactPerson}</span>}
                                    </div>
                                </div>
                                {!isReadOnly && (
                                    <button onClick={handleSaveClick} disabled={isSaving} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center shadow-sm text-sm font-medium">
                                        {isSaving ? <RefreshCw className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} 儲存
                                    </button>
                                )}
                            </div>
                            <div className="p-4 border-b border-slate-100 space-y-3">
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {categories.map(cat => (
                                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedCategory === cat ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>{cat}</button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input type="text" placeholder="搜尋腳本..." value={scriptFilter} onChange={(e) => setScriptFilter(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm" />
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 p-3 bg-slate-50">
                                <div className="grid grid-cols-1 gap-2">
                                    {scripts.filter(s => {
                                        const matchesSearch = s.title.includes(scriptFilter) || s.category.includes(scriptFilter) || s.id.includes(scriptFilter);
                                        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
                                        return matchesSearch && matchesCategory;
                                    }).map((script, index) => {
                                        const isInPool = editingUser.scriptPool?.includes(script.id);
                                        const isSelectedByUser = editingUser.assignedScripts?.includes(script.id);

                                        return (
                                            <div 
                                                key={`${script.id}-${index}`} 
                                                // 修改：點擊整個卡片預覽，點擊 Checkbox 才是選取
                                                className={`p-3 rounded-lg border flex items-center justify-between transition-all ${isInPool ? 'bg-white border-teal-500 ring-1 ring-teal-500 shadow-sm' : 'bg-white border-slate-200 opacity-80 hover:opacity-100'}`}
                                            >
                                                <div 
                                                    className="flex items-center space-x-3 overflow-hidden cursor-pointer flex-1"
                                                    onClick={() => !isReadOnly && toggleScriptInPool(script.id)}
                                                >
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${isInPool ? 'bg-teal-500 border-teal-500' : 'border-slate-300 bg-slate-50'}`}>{isInPool && <Check className="w-3.5 h-3.5 text-white" />}</div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center"><span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-2 flex-shrink-0">{script.category}</span><span className={`text-sm font-medium truncate ${isInPool ? 'text-teal-900' : 'text-slate-600'}`}>{script.title}</span></div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{script.id}</div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setPreviewScript(script); }}
                                                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {/* 腳本庫管理頁面 (新增) */}
        {activeTab === 'scripts' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[80vh] flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-700 flex items-center"><Database className="w-4 h-4 mr-2" /> 腳本資料庫 ({scripts.length})</h2>
                    <div className="flex gap-2">
                        <button onClick={handleAddScript} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 flex items-center shadow-sm text-sm font-medium"><Plus className="w-4 h-4 mr-2" /> 新增腳本</button>
                    </div>
                </div>
                {/* 腳本列表顯示區域 */}
                <div className="overflow-y-auto flex-1 p-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {scripts.map((script, idx) => (
                            <div key={`${script.id}-${idx}`} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow group relative">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold text-slate-500">{script.category}</span>
                                    <span className="text-xs font-mono text-slate-400">{script.id}</span>
                                </div>
                                <h3 className="font-bold text-slate-800">{script.title}</h3>
                                <div className="mt-2 text-xs text-slate-500 truncate">{script.stages[0]?.points}</div>
                                
                                {/* 預覽與編輯按鈕 */}
                                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleEditScript(script)}
                                        className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-50 hover:text-teal-600 flex items-center"
                                    >
                                        <Edit className="w-3 h-3 mr-1" /> 編輯
                                    </button>
                                    <button 
                                        onClick={() => setPreviewScript(script)}
                                        className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-slate-50 hover:text-teal-600 flex items-center"
                                    >
                                        <Eye className="w-3 h-3 mr-1" /> 預覽
                                    </button>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
        )}

        {/* Add/Edit Script Modal */}
        {showAddModal && (
            <AddScriptModal 
                onClose={() => setShowAddModal(false)}
                onSave={(data, isEditing) => {
                    onSaveScript(data, isEditing);
                    setShowAddModal(false);
                }}
                hasApiUrl={!isReadOnly}
                scripts={scripts} 
                initialData={scriptToEdit}
                isEditing={!!scriptToEdit}
            />
        )}
        
        {/* Add User Modal */}
        {showAddUserModal && (
            <AddUserModal 
                onClose={() => setShowAddUserModal(false)}
                onSave={(data) => {
                    onAddUser(data);
                    setShowAddUserModal(false);
                }}
                hasApiUrl={!isReadOnly}
                users={users}
            />
        )}
        
        {/* Preview Modal */}
        <ScriptDetailModal 
            script={previewScript} 
            onClose={() => setPreviewScript(null)} 
            onEdit={(script) => handleEditScript(script)}
            isEditable={true}
        />

      </main>
    </div>
  );
};

// --- Main Container ---
export default function HairStylistApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const [scripts, setScripts] = useState(MOCK_SCRIPTS);
  const [users, setUsers] = useState(MOCK_USERS);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchGoogleSheetsData = async () => {
    if (!GOOGLE_SHEETS_CONFIG.SCRIPTS_URL || !GOOGLE_SHEETS_CONFIG.USERS_URL) return;
    setLoading(true);
    try {
      const sRes = await fetch(`${GOOGLE_SHEETS_CONFIG.SCRIPTS_URL}&t=${Date.now()}`);
      const sText = await sRes.text();
      setScripts(transformScriptData(parseCSV(sText)));

      const uRes = await fetch(`${GOOGLE_SHEETS_CONFIG.USERS_URL}&t=${Date.now()}`);
      const uText = await uRes.text();
      setUsers(transformUserData(parseCSV(uText)));
    } catch (e) {
      console.error(e);
      showNotification("資料讀取失敗，請檢查網路");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleSheetsData();
  }, []);

  const handleLogin = () => {
    const inputId = loginId.trim().toLowerCase();
    const user = users.find(u => (u.id && u.id.toLowerCase() === inputId));
    if (user) {
      setCurrentUser(user);
    } else {
      showNotification('找不到此 ID');
    }
  };

  const handleSaveSelection = async (newSelectedIds) => {
      if (!GOOGLE_SHEETS_CONFIG.API_URL) {
          alert("未設定 API，無法儲存");
          return;
      }
      setIsSaving(true);
      try {
          await fetch(GOOGLE_SHEETS_CONFIG.API_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'update_user_permissions',
                  id: currentUser.id,
                  assignedScripts: newSelectedIds.join(',')
              })
          });
          
          setCurrentUser(prev => ({ ...prev, assignedScripts: newSelectedIds }));
          setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, assignedScripts: newSelectedIds } : u));
          
          showNotification("儲存成功！");
      } catch (e) {
          showNotification("儲存失敗");
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveUserPool = async (user) => {
      if (!GOOGLE_SHEETS_CONFIG.API_URL) return;
      try {
          await fetch(GOOGLE_SHEETS_CONFIG.API_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'update_user_pool', 
                  id: user.id,
                  scriptPool: user.scriptPool.join(',')
              })
          });
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, scriptPool: user.scriptPool } : u));
          showNotification(`已更新 ${user.name} 的腳本池`);
      } catch (e) {
          showNotification("更新失敗");
      }
  };

  const handleSaveScript = async (scriptData, isEditing) => {
    if (!GOOGLE_SHEETS_CONFIG.API_URL) return;
    try {
        const action = isEditing ? 'update' : 'create';
        const payload = {
            action: action,
            id: scriptData.id,
            category: scriptData.category,
            title: scriptData.title,
            video_description: scriptData.video_description,
            requirements: scriptData.requirements,
            material_link: scriptData.material_link,
            start_points: scriptData.stages[0].points,
            start_dialogue: scriptData.stages[0].dialogue,
            develop_points: scriptData.stages[1].points,
            develop_dialogue: scriptData.stages[1].dialogue,
            twist_points: scriptData.stages[2].points,
            twist_dialogue: scriptData.stages[2].dialogue,
            end_points: scriptData.stages[3].points,
            end_dialogue: scriptData.stages[3].dialogue
        };

        await fetch(GOOGLE_SHEETS_CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        showNotification(isEditing ? "修改指令已發送！" : "新增指令已發送！");
        // Don't auto fetch immediately as network might be slower than UI feedback
    } catch (e) {
        showNotification("操作失敗");
    }
  };

  const handleAddUser = async (userData) => {
    if (!GOOGLE_SHEETS_CONFIG.API_URL) return;
    
    // 1. Optimistic Update (立即更新畫面)
    const newUser = {
        id: userData.id,
        name: userData.name,
        role: 'stylist',
        assignedScripts: [],
        scriptPool: [],
        quota: parseInt(userData.plan, 10),
        contactPerson: userData.contactPerson,
        instagram: userData.instagram
    };
    
    setUsers(prev => [...prev, newUser]); // Update local state immediately
    showNotification("已新增！正在背景同步至 Google Sheets...");
    
    // 3秒後自動同步
    setTimeout(() => fetchGoogleSheetsData(GOOGLE_SHEETS_CONFIG), 3000);

    try {
        const payload = {
            action: 'create_user',
            id: userData.id,
            name: userData.name,
            role: 'stylist',
            quota: userData.plan,
            contact_person: userData.contactPerson,
            instagram: userData.instagram,
            assignedScripts: '',
            scriptPool: ''
        };

        await fetch(GOOGLE_SHEETS_CONFIG.API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // Background sync handles the rest
    } catch (e) {
        showNotification("同步失敗，但暫存於本地");
        console.error(e);
    }
  };

  // 處理「啟動計時器」
  const handleStartTimer = async (userId, startTime) => {
      if (!GOOGLE_SHEETS_CONFIG.API_URL) return;
      
      // 先更新本地狀態，讓使用者馬上看到倒數
      setCurrentUser(prev => ({ ...prev, selectionStartTime: startTime }));
      
      try {
          await fetch(GOOGLE_SHEETS_CONFIG.API_URL, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'start_user_timer', // 對應後端的 action
                  id: userId,
                  selectionStartTime: startTime
              })
          });
      } catch (e) {
          console.error("計時器啟動失敗", e);
      }
  };

  return (
    <div className="font-sans text-slate-800 bg-slate-200 min-h-screen">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl z-[60] text-sm">
          {notification}
        </div>
      )}
      
      {!currentUser ? (
        <LoginScreen 
          loginId={loginId} 
          setLoginId={setLoginId} 
          handleLogin={handleLogin} 
          loading={loading}
        />
      ) : (
        currentUser.role === 'admin' ? (
            <AdminDashboard 
                users={users}
                scripts={scripts}
                handleLogout={() => { setCurrentUser(null); setLoginId(''); }}
                sheetsConfig={GOOGLE_SHEETS_CONFIG}
                fetchGoogleSheetsData={fetchGoogleSheetsData}
                onSaveUserPool={handleSaveUserPool}
                onSaveScript={handleSaveScript}
                onAddUser={handleAddUser}
                resetToMockData={() => {}}
            />
        ) : (
            <StylistApp 
                currentUser={currentUser} 
                scripts={scripts} 
                handleLogout={() => { setCurrentUser(null); setLoginId(''); }} 
                onSaveSelection={handleSaveSelection}
                onStartTimer={handleStartTimer}
                isSaving={isSaving}
            />
        )
      )}
    </div>
  );
}