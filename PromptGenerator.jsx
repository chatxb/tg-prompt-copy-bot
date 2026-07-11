import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDoc,
  query,
  orderBy,
  onSnapshot
} from "firebase/firestore";

// ১. আপনার দেওয়া ফায়ারবেস কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyBP9d5ekOd0zvO-D7Fq8aXmNoS2aqryvVA",
  authDomain: "tg-bot-prompt-copy.firebaseapp.com",
  projectId: "tg-bot-prompt-copy",
  storageBucket: "tg-bot-prompt-copy.firebasestorage.app",
  messagingSenderId: "623834211164",
  appId: "1:623834211164:web:6dd0bc4875945f99839799",
  measurementId: "G-G0VWDYS8JE"
};

// ফায়ারবেস ইনিশিয়ালাইজেশন
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  // অ্যাপ স্টেটসমূহ
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('admin123'); // ডিফল্ট পাসওয়ার্ড
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState('home'); // home, daily, favorite, menu
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard'); // dashboard, categories, prompts, ads, settings
  
  // ডাইনামিক ডেটা স্টেট
  const [categories, setCategories] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Home');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('fav_prompts');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isPromptGenerated, setIsPromptGenerated] = useState(false);
  const [copied, setCopied] = useState(false);

  // গ্লোবাল সেটিংস এবং অ্যাড স্টেট
  const [globalSettings, setGlobalSettings] = useState({
    appName: "Prompt House",
    welcomeText: "Welcome App",
    telegramLink: "https://t.me/yourchannel",
    contactLink: "https://t.me/yourusername"
  });
  const [adsSettings, setAdsSettings] = useState({
    adsgramBlockId: "",
    monetagTagId: ""
  });

  // ফর্ম স্টেটসমূহ (অ্যাডমিন প্যানেল)
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPromptImg, setNewPromptImg] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState('');

  // ইউআরএল হ্যাশ (#admin) ডিটেক্ট করা
  useEffect(() => {
    const handleHashChange = () => {
      setIsAdminMode(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ফায়ারবেস থেকে রিয়েল-টাইমে ডেটা রিড করা
  useEffect(() => {
    // ক্যাটাগরি লোড
    const unsubscribeCats = onSnapshot(collection(db, "categories"), (snapshot) => {
      const catsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(catsList);
    });

    // প্রম্পট লোড
    const unsubscribePrompts = onSnapshot(collection(db, "prompts"), (snapshot) => {
      const promptsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrompts(promptsList);
    });

    // গ্লোবাল সেটিংস ও অ্যাড সেটিংস লোড
    const loadSettings = async () => {
      const settingsDoc = await getDoc(doc(db, "config", "settings"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.adminPassword) setAdminPassword(data.adminPassword);
        setGlobalSettings({
          appName: data.appName || "Prompt House",
          welcomeText: data.welcomeText || "Welcome App",
          telegramLink: data.telegramLink || "https://t.me/yourchannel",
          contactLink: data.contactLink || "https://t.me/yourusername"
        });
        setAdsSettings({
          adsgramBlockId: data.adsgramBlockId || "",
          monetagTagId: data.monetagTagId || ""
        });
      }
    };
    loadSettings();

    return () => {
      unsubscribeCats();
      unsubscribePrompts();
    };
  }, []);

  // Monetag স্ক্রিপ্ট লোড করার নিয়ম
  useEffect(() => {
    if (adsSettings.monetagTagId) {
      const script = document.createElement("script");
      script.src = `https://growthofalphas.com/act/files/micro.tag.min.js?z=${adsSettings.monetagTagId}`;
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [adsSettings.monetagTagId]);

  // Adsgram স্ক্রিপ্ট লোড করার নিয়ম
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://adsgram.org/sdk/v1/adsgram-sdk.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Adsgram এড দেখানোর লজিক
  const showAdsgramAd = () => {
    return new Promise((resolve) => {
      if (window.Adsgram && adsSettings.adsgramBlockId) {
        const AdController = window.Adsgram.init({ blockId: adsSettings.adsgramBlockId });
        AdController.show()
          .then(() => {
            resolve(true); // অ্যাড দেখা সম্পন্ন হয়েছে
          })
          .catch((err) => {
            console.error("Adsgram error or skipped:", err);
            resolve(true); // কোনো কারণে এরর আসলে ব্যবহারকারীকে আটকে না রেখে ফিচার ওপেন করা হবে
          });
      } else {
        resolve(true); // কোনো অ্যাড আইডি না থাকলে সরাসরি প্রম্পট দেখাবে
      }
    });
  };

  // ফেভারিট টগল
  const toggleFavorite = (id, e) => {
    if (e) e.stopPropagation();
    let updated;
    if (favorites.includes(id)) {
      updated = favorites.filter(favId => favId !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    localStorage.setItem('fav_prompts', JSON.stringify(updated));
  };

  // প্রম্পট জেনারেট ও অ্যাড দেখানো
  const handleGeneratePrompt = async () => {
    setIsPromptGenerated(false);
    await showAdsgramAd(); // প্রথমে অ্যাড রান হবে
    setIsPromptGenerated(true); // অ্যাড শেষ হলে প্রম্পট দেখাবে
  };

  // প্রম্পট কপি
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // অ্যাডমিন অথেন্টিকেশন লগইন
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
    } else {
      alert("ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।");
    }
  };

  // ক্যাটাগরি যুক্ত করা (অ্যাডমিন)
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await addDoc(collection(db, "categories"), { name: newCategoryName });
      setNewCategoryName('');
      alert("ক্যাটাগরি যুক্ত করা হয়েছে!");
    } catch (err) {
      console.error(err);
    }
  };

  // ক্যাটাগরি ডিলিট করা (অ্যাডমিন)
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ক্যাটাগরি ডিলিট করতে চান?")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      alert("ক্যাটাগরি ডিলিট করা হয়েছে!");
    } catch (err) {
      console.error(err);
    }
  };

  // প্রম্পট যুক্ত করা (অ্যাডমিন)
  const handleAddPrompt = async (e) => {
    e.preventDefault();
    if (!newPromptImg || !newPromptText || !newPromptCategory) {
      alert("সবগুলো তথ্য সঠিকভাবে পূরণ করুন!");
      return;
    }
    try {
      await addDoc(collection(db, "prompts"), {
        img: newPromptImg,
        promptText: newPromptText,
        category: newPromptCategory,
        timestamp: new Date().getTime()
      });
      setNewPromptImg('');
      setNewPromptText('');
      setNewPromptCategory('');
      alert("প্রম্পট সফলভাবে যুক্ত করা হয়েছে!");
    } catch (err) {
      console.error(err);
    }
  };

  // প্রম্পট ডিলিট করা (অ্যাডমিন)
  const handleDeletePrompt = async (id) => {
    if (!window.confirm("আপনি কি এই প্রম্পটটি ডিলিট করতে চান?")) return;
    try {
      await deleteDoc(doc(db, "prompts", id));
      alert("প্রম্পট ডিলিট করা হয়েছে!");
    } catch (err) {
      console.error(err);
    }
  };

  // গ্লোবাল এবং অ্যাড সেটিংস আপডেট করা (অ্যাডমিন)
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "config", "settings"), {
        adminPassword,
        ...globalSettings,
        ...adsSettings
      });
      alert("সেটিংস সফলভাবে সেভ করা হয়েছে!");
    } catch (err) {
      console.error(err);
    }
  };

  // ক্যাটাগরি ফিল্টার করা কন্টেন্ট
  const filteredPrompts = prompts.filter(p => {
    if (selectedCategory === 'Home') return true;
    return p.category === selectedCategory;
  });

  // ==========================================
  // ১. অ্যাডমিন প্যানেল ভিউ
  // ==========================================
  if (isAdminMode) {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0f12] text-white p-4">
          <form onSubmit={handleAdminLogin} className="w-full max-w-sm bg-[#161b22] border border-gray-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-center">Prompt House Admin</h2>
            <p className="text-xs text-gray-400 mb-6 text-center">অ্যাডমিন প্যানেলে প্রবেশ করতে পাসওয়ার্ড দিন</p>
            <input 
              type="password" 
              placeholder="পাসওয়ার্ড দিন..." 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full p-3 mb-4 bg-[#0d0f12] border border-gray-800 rounded-xl focus:border-blue-500 outline-none text-sm text-center"
            />
            <button type="submit" className="w-full py-3 bg-[#0066cc] rounded-xl hover:bg-blue-600 font-semibold text-sm transition-colors">
              লগইন করুন
            </button>
          </form>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full flex bg-[#0d0f12] text-white font-sans overflow-x-hidden">
        {/* অ্যাডমিন সাইডবার (গ্লাস মরফিজম) */}
        <aside className="w-64 bg-[#12161f]/80 backdrop-blur-md border-r border-gray-800 p-5 flex flex-col justify-between sticky top-0 h-screen">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
              <h2 className="text-lg font-bold tracking-wide">Prompt House <span className="text-xs text-blue-500">Admin</span></h2>
            </div>
            
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">Navigation</p>
            <nav className="space-y-1 mb-8">
              <button onClick={() => setAdminActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminActiveTab === 'dashboard' ? 'bg-[#1f293d] text-blue-500' : 'text-gray-400 hover:bg-[#12161f]'}`}>
                📊 Dashboard
              </button>
              <button onClick={() => setAdminActiveTab('categories')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminActiveTab === 'categories' ? 'bg-[#1f293d] text-blue-500' : 'text-gray-400 hover:bg-[#12161f]'}`}>
                📁 Categories
              </button>
              <button onClick={() => setAdminActiveTab('prompts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminActiveTab === 'prompts' ? 'bg-[#1f293d] text-blue-500' : 'text-gray-400 hover:bg-[#12161f]'}`}>
                🖼️ Prompts
              </button>
            </nav>

            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">System Configuration</p>
            <nav className="space-y-1">
              <button onClick={() => setAdminActiveTab('ads')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminActiveTab === 'ads' ? 'bg-[#1f293d] text-blue-500' : 'text-gray-400 hover:bg-[#12161f]'}`}>
                📢 Ads Manager
              </button>
              <button onClick={() => setAdminActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminActiveTab === 'settings' ? 'bg-[#1f293d] text-blue-500' : 'text-gray-400 hover:bg-[#12161f]'}`}>
                ⚙️ Global Settings
              </button>
            </nav>
          </div>

          <button onClick={() => setIsAuthenticated(false)} className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl font-semibold text-sm transition-all">
            🚪 Logout
          </button>
        </aside>

        {/* অ্যাডমিন মেইন কন্টেন্ট এলাকা */}
        <main className="flex-1 p-8 overflow-y-auto max-w-4xl">
          {/* ১. ড্যাশবোর্ড স্ক্রিন */}
          {adminActiveTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Dashboard Summary</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-[#161b22] border border-gray-800 rounded-2xl">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Total Categories</p>
                  <p className="text-4xl font-extrabold">{categories.length}</p>
                </div>
                <div className="p-6 bg-[#161b22] border border-gray-800 rounded-2xl">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Total Prompts</p>
                  <p className="text-4xl font-extrabold">{prompts.length}</p>
                </div>
                <div className="p-6 bg-[#161b22] border border-gray-800 rounded-2xl">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Ad Status</p>
                  <p className="text-lg font-bold text-green-500">
                    {adsSettings.adsgramBlockId || adsSettings.monetagTagId ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ২. ক্যাটাগরি তৈরি ও ডিলিট */}
          {adminActiveTab === 'categories' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Manage Categories</h2>
              <form onSubmit={handleAddCategory} className="flex gap-3 mb-8">
                <input 
                  type="text" 
                  placeholder="ক্যাটাগরির নাম লিখুন... (যেমন: Trending 🔥)" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 p-3 bg-[#161b22] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                />
                <button type="submit" className="px-6 py-3 bg-[#0066cc] hover:bg-blue-600 font-semibold text-sm rounded-xl transition-all">
                  যুক্ত করুন
                </button>
              </form>

              <div className="bg-[#161b22] border border-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#1f242c] border-b border-gray-800 text-gray-400 uppercase tracking-wider">
                      <th className="p-4 font-semibold">Category Name</th>
                      <th className="p-4 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id} className="border-b border-gray-800/50 hover:bg-[#1a202c]/50">
                        <td className="p-4 font-medium">{cat.name}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteCategory(cat.id)} className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg text-xs font-semibold transition-all">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ৩. প্রম্পট তৈরি ও ডিলিট */}
          {adminActiveTab === 'prompts' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Manage Prompts</h2>
              <form onSubmit={handleAddPrompt} className="p-6 bg-[#161b22] border border-gray-800 rounded-2xl mb-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Cloudflare Image URL</label>
                    <input 
                      type="url" 
                      placeholder="https://images.cloudflare.com/..." 
                      value={newPromptImg}
                      onChange={(e) => setNewPromptImg(e.target.value)}
                      className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Select Category</label>
                    <select 
                      value={newPromptCategory}
                      onChange={(e) => setNewPromptCategory(e.target.value)}
                      className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm text-gray-400"
                    >
                      <option value="">ক্যাটাগরি সিলেক্ট করুন...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5">Prompt Text</label>
                  <textarea 
                    rows="3"
                    placeholder="AI প্রম্পট কপি রাইটিং লিখুন..." 
                    value={newPromptText}
                    onChange={(e) => setNewPromptText(e.target.value)}
                    className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                  ></textarea>
                </div>
                <button type="submit" className="w-full py-3 bg-[#0066cc] hover:bg-blue-600 font-semibold text-sm rounded-xl transition-all">
                  প্রম্পট পোস্ট করুন
                </button>
              </form>

              <h3 className="text-lg font-bold mb-4">Prompt List ({prompts.length})</h3>
              <div className="grid grid-cols-3 gap-4">
                {prompts.map((item) => (
                  <div key={item.id} className="bg-[#161b22] border border-gray-800 rounded-2xl overflow-hidden p-3 flex flex-col justify-between">
                    <div>
                      <img src={item.img} alt="" className="w-full h-32 object-cover rounded-xl mb-3" loading="lazy" />
                      <p className="text-xs text-blue-500 font-bold mb-1">{item.category}</p>
                      <p className="text-xs text-gray-300 line-clamp-2 mb-3">{item.promptText}</p>
                    </div>
                    <button onClick={() => handleDeletePrompt(item.id)} className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl text-xs font-semibold transition-all">
                      Delete Prompt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ৪. বিজ্ঞাপন সেটিংস */}
          {adminActiveTab === 'ads' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Adsgram & Monetag Settings</h2>
              <form onSubmit={handleSaveSettings} className="p-6 bg-[#161b22] border border-gray-800 rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5">Adsgram.io Block ID</label>
                  <input 
                    type="text" 
                    placeholder="Adsgram Block ID..." 
                    value={adsSettings.adsgramBlockId}
                    onChange={(e) => setAdsSettings({...adsSettings, adsgramBlockId: e.target.value})}
                    className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5">Monetag Native/Smart Tag ID</label>
                  <input 
                    type="text" 
                    placeholder="Monetag Tag ID..." 
                    value={adsSettings.monetagTagId}
                    onChange={(e) => setAdsSettings({...adsSettings, monetagTagId: e.target.value})}
                    className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-[#0066cc] hover:bg-blue-600 font-semibold text-sm rounded-xl transition-all">
                  বিজ্ঞাপন সেটিংস সেভ করুন
                </button>
              </form>
            </div>
          )}

          {/* ৫. গ্লোবাল সেটিংস */}
          {adminActiveTab === 'settings' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Global Application Settings</h2>
              <form onSubmit={handleSaveSettings} className="p-6 bg-[#161b22] border border-gray-800 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">App Name</label>
                    <input 
                      type="text" 
                      value={globalSettings.appName}
                      onChange={(e) => setGlobalSettings({...globalSettings, appName: e.target.value})}
                      className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Welcome Subtitle</label>
                    <input 
                      type="text" 
                      value={globalSettings.welcomeText}
                      onChange={(e) => setGlobalSettings({...globalSettings, welcomeText: e.target.value})}
                      className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Telegram Channel/Group Link</label>
                    <input 
                      type="url" 
                      value={globalSettings.telegramLink}
                      onChange={(e) => setGlobalSettings({...globalSettings, telegramLink: e.target.value})}
                      className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 font-semibold mb-1.5">Contact Link (Support/Developer)</label>
                    <input 
                      type="url" 
                      value={globalSettings.contactLink}
                      onChange={(e) => setGlobalSettings({...globalSettings, contactLink: e.target.value})}
                      className="w-full p-3 bg-[#0d0f12] border border-gray-800 rounded-xl outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold mb-1.5 font-bold text-red-500">Admin Password</label>
                  <input 
                    type="text" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-3 bg-[#0d0f12] border border-red-900 rounded-xl outline-none focus:border-red-500 text-sm font-semibold"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-[#0066cc] hover:bg-blue-600 font-semibold text-sm rounded-xl transition-all">
                  সবগুলো পরিবর্তন সেভ করুন
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ==========================================
  // ২. ইউজার মেইন মিনি অ্যাপ ভিউ
  // ==========================================
  return (
    <div className="min-h-screen w-full flex justify-center bg-[#121212] text-white">
      {/* মোবাইল সাইজ রিকোয়ারমেন্ট কন্টেইনার */}
      <div className="w-full max-w-md flex flex-col relative pb-20 select-none shadow-2xl min-h-screen bg-[#121212]">
        
        {/* যদি প্রিভিউ স্ক্রিন অ্যাক্টিভ না থাকে */}
        {!selectedPrompt ? (
          <>
            {/* হেডার */}
            {(activeTab === 'home' || activeTab === 'daily') && (
              <header className="p-4 flex justify-between items-center bg-[#121212] sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                  </button>
                  <div>
                    <h1 className="text-xl font-bold tracking-wide">{globalSettings.appName}</h1>
                    <p className="text-xs text-gray-400">
                      {activeTab === 'home' ? globalSettings.welcomeText : `${prompts.length} Prompts`}
                    </p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </button>
              </header>
            )}

            {/* ডাইনামিক ক্যাটাগরি চিপস (হোমে) */}
            {activeTab === 'home' && (
              <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar scroll-smooth">
                <button
                  onClick={() => setSelectedCategory('Home')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === 'Home' ? 'bg-[#0066cc] text-white' : 'bg-[#222222] text-gray-300'}`}
                >
                  Home
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat.name ? 'bg-[#0066cc] text-white' : 'bg-[#222222] text-gray-300'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* কন্টেন্ট এরিয়া */}
            <main className="flex-1 p-4">
              
              {/* হোম ট্যাব */}
              {activeTab === 'home' && (
                <div className="grid grid-cols-2 gap-3">
                  {filteredPrompts.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => { setSelectedPrompt(item); setIsPromptGenerated(false); }}
                      className="relative rounded-2xl overflow-hidden border border-gray-800 bg-[#1e1e1e] aspect-[3/4] cursor-pointer hover:scale-[1.02] transition-transform"
                    >
                      <img src={item.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <button 
                        onClick={(e) => toggleFavorite(item.id, e)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white hover:scale-110 transition-transform"
                      >
                        <svg className={`w-5 h-5 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} fill={favorites.includes(item.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ডেইলি ট্যাব (সর্বশেষ ৮টি প্রম্পট দেখাবে) */}
              {activeTab === 'daily' && (
                <div className="grid grid-cols-2 gap-3">
                  {prompts.slice(0, 8).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => { setSelectedPrompt(item); setIsPromptGenerated(false); }}
                      className="relative rounded-2xl overflow-hidden border border-gray-800 bg-[#1e1e1e] aspect-[3/4] cursor-pointer"
                    >
                      <img src={item.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <button onClick={(e) => toggleFavorite(item.id, e)} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                        <svg className={`w-5 h-5 ${favorites.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} fill={favorites.includes(item.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ফেভারিট ট্যাব */}
              {activeTab === 'favorite' && (
                <div>
                  <h2 className="text-xl font-bold mb-1">Favorite Prompts</h2>
                  <p className="text-xs text-gray-400 mb-6">{favorites.length} Favorite Prompts</p>
                  
                  {favorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center mt-20 text-center">
                      <p className="text-gray-400 text-lg font-medium">No Favorite Prompts yet!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {prompts.filter(p => favorites.includes(p.id)).map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => { setSelectedPrompt(item); setIsPromptGenerated(false); }}
                          className="relative rounded-2xl overflow-hidden border border-gray-800 bg-[#1e1e1e] aspect-[3/4] cursor-pointer"
                        >
                          <img src={item.img} alt="" className="w-full h-full object-cover" loading="lazy" />
                          <button onClick={(e) => toggleFavorite(item.id, e)} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                            <svg className="w-5 h-5 fill-red-500 text-red-500" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* সেটিংস/মেনু ট্যাব */}
              {activeTab === 'menu' && (
                <div className="flex flex-col">
                  <div className="flex flex-col items-center py-6">
                    <div className="w-16 h-16 rounded-full bg-[#0066cc]/20 flex items-center justify-center text-[#0066cc] mb-3">
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <h2 className="text-2xl font-bold">Settings</h2>
                  </div>

                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2 tracking-wider">App Actions</p>
                  <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden mb-6">
                    <div className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-[#252528] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">🕒</span>
                        <span>History</span>
                      </div>
                      <span className="text-gray-500">➔</span>
                    </div>

                    <a href={globalSettings.telegramLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-[#252528] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-pink-500/10 text-pink-500">👤</span>
                        <span>Follow Me</span>
                      </div>
                      <span className="text-gray-500">➔</span>
                    </a>

                    <div className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-[#252528] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500">❓</span>
                        <span>How to use?</span>
                      </div>
                      <span className="text-gray-500">➔</span>
                    </div>

                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500">🌙</span>
                        <span>Dark Theme</span>
                      </div>
                      <div className="w-11 h-6 flex items-center bg-[#0066cc] rounded-full p-1 cursor-pointer">
                        <div className="bg-white w-4 h-4 rounded-full translate-x-5" />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2 tracking-wider">Legal & Info</p>
                  <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-[#252528] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500">⭐</span>
                        <span>Rate Us</span>
                      </div>
                      <span className="text-gray-500">➔</span>
                    </div>
                    <a href={globalSettings.contactLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#252528] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-red-500/10 text-red-500">📞</span>
                        <span>Contact Us</span>
                      </div>
                      <span className="text-gray-500">➔</span>
                    </a>
                  </div>
                </div>
              )}

            </main>
          </>
        ) : (
          /* প্রিভিউ স্ক্রিন */
          <div className="flex-1 flex flex-col p-4 bg-[#121212]">
            <header className="flex justify-between items-center py-3 mb-4">
              <button onClick={() => setSelectedPrompt(null)} className="p-1 text-gray-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <h1 className="text-lg font-bold">Preview Prompt</h1>
              <button onClick={(e) => toggleFavorite(selectedPrompt.id, e)} className="p-1">
                <svg className={`w-6 h-6 ${favorites.includes(selectedPrompt.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-white'}`} fill={favorites.includes(selectedPrompt.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
              </button>
            </header>

            <div className="rounded-3xl overflow-hidden border border-gray-800 bg-[#1e1e1e] aspect-[3/4] mb-6">
              <img src={selectedPrompt.img} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>

            <div className="mb-6">
              {!isPromptGenerated ? (
                <button 
                  onClick={handleGeneratePrompt}
                  className="w-full py-4 bg-[#0066cc] text-white font-semibold rounded-2xl hover:bg-[#0052a3] transition-colors"
                >
                  Generate Prompt
                </button>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 bg-[#1c1c1e] rounded-2xl border border-gray-800 text-sm text-gray-300 leading-relaxed">
                    {selectedPrompt.promptText}
                  </div>
                  <button 
                    onClick={() => handleCopy(selectedPrompt.promptText)}
                    className="w-full py-4 bg-transparent border border-[#0066cc] text-[#0066cc] font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#0066cc]/10 transition-all"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                    {copied ? 'Copied!' : 'Copy Prompt'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[#1c1c1e] rounded-2xl overflow-hidden">
              <a href={globalSettings.telegramLink} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-pink-500/10 text-pink-500">👤</span>
                  <div className="text-left">
                    <p className="font-semibold text-sm">Follow Me</p>
                    <p className="text-xs text-gray-500">Stay updated with latest prompts</p>
                  </div>
                </div>
                <span className="text-gray-500">➔</span>
              </a>
              <div className="flex items-center justify-between p-4 cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-teal-500/10 text-teal-500">❓</span>
                  <div className="text-left">
                    <p className="font-semibold text-sm">How to use?</p>
                    <p className="text-xs text-gray-500">Learn to get the most out of it</p>
                  </div>
                </div>
                <span className="text-gray-500">➔</span>
              </div>
            </div>
          </div>
        )}

        {/* বটম নেভিগেশন বার */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-[#1c1c1e]/90 backdrop-blur-md border-t border-gray-800 flex justify-around items-center px-2 z-10">
          <button 
            onClick={() => { setActiveTab('home'); setSelectedPrompt(null); }}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'home' && !selectedPrompt ? 'text-[#0066cc]' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button 
            onClick={() => { setActiveTab('daily'); setSelectedPrompt(null); }}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'daily' && !selectedPrompt ? 'text-[#0066cc]' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
            <span className="text-[10px] font-medium">Daily</span>
          </button>

          <button 
            onClick={() => { setActiveTab('favorite'); setSelectedPrompt(null); }}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'favorite' && !selectedPrompt ? 'text-[#0066cc]' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span className="text-[10px] font-medium">Favorite</span>
          </button>

          <button 
            onClick={() => { setActiveTab('menu'); setSelectedPrompt(null); }}
            className={`flex flex-col items-center gap-1 w-16 transition-colors ${activeTab === 'menu' && !selectedPrompt ? 'text-[#0066cc]' : 'text-gray-500'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
