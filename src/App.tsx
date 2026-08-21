import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Database,
  BarChart3,
  Plus,
  Trash2,
  Edit2,
  Circle,
  Check,
} from "lucide-react";

// === FIREBASE FIRESTORE SETUP ===
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCGsd4ZjETtDkN26tdcYlUeRH2w1tXCRFI",
  authDomain: "stit-media-db.firebaseapp.com",
  projectId: "stit-media-db",
  storageBucket: "stit-media-db.firebasestorage.app",
  messagingSenderId: "320419607356",
  appId: "1:320419607356:web:58c126045d9ca94409e439",
  measurementId: "G-KPFLZ7314J",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === STRUKTUR KATEGORI & HIERARKI ===
type CategoryType =
  | "kriteria"
  | "jobdesk"
  | "stakeholder"
  | "program"
  | "peralatan"
  | "output";

interface CategoryConfig {
  label: string;
  col1Label: string;
  hasCol2: boolean;
  col2Label?: string;
  isMultiline: boolean;
  hasStatus: boolean;
  counting: boolean;
  color: string;
}

const config: Record<CategoryType, CategoryConfig> = {
  kriteria: {
    label: "Kriteria",
    col1Label: "Deskripsi Kriteria",
    hasCol2: false,
    isMultiline: true,
    hasStatus: false,
    counting: false,
    color: "bg-amber-50 border-amber-200 text-amber-900",
  },
  jobdesk: {
    label: "Jobdesk",
    col1Label: "Nama Jobdesk",
    hasCol2: true,
    col2Label: "Deskripsi Jobdesk",
    isMultiline: true,
    hasStatus: false,
    counting: false,
    color: "bg-emerald-50 border-emerald-200 text-emerald-900",
  },
  stakeholder: {
    label: "Stakeholder",
    col1Label: "Nama Lengkap",
    hasCol2: false,
    isMultiline: false,
    hasStatus: true,
    counting: true,
    color: "bg-indigo-50 border-indigo-200 text-indigo-900",
  },
  program: {
    label: "Program",
    col1Label: "Nama Program",
    hasCol2: false,
    isMultiline: false,
    hasStatus: true,
    counting: true,
    color: "bg-rose-50 border-rose-200 text-rose-900",
  },
  peralatan: {
    label: "Peralatan",
    col1Label: "Nama Peralatan",
    hasCol2: true,
    col2Label: "Spesifikasi",
    isMultiline: true,
    hasStatus: true,
    counting: true,
    color: "bg-cyan-50 border-cyan-200 text-cyan-900",
  },
  output: {
    label: "Output",
    col1Label: "Deskripsi Output",
    hasCol2: false,
    isMultiline: true,
    hasStatus: true,
    counting: true,
    color: "bg-orange-50 border-orange-200 text-orange-900",
  },
};

interface MasterItem {
  id: string;
  col1: string;
  col2?: string;
  checked: boolean;
}

interface ChildBlock {
  id: string;
  type: CategoryType;
  selectedIds: string[];
}

interface Division {
  id: string;
  title: string;
  blocks: ChildBlock[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"master" | "canvas" | "diagram">(
    "master",
  );

  const [masterData, setMasterData] = useState<
    Record<CategoryType, MasterItem[]>
  >({
    kriteria: [],
    jobdesk: [],
    stakeholder: [],
    program: [],
    peralatan: [],
    output: [],
  });

  const [activeMasterCategory, setActiveMasterCategory] =
    useState<CategoryType>("kriteria");
  const [formData, setFormData] = useState({ col1: "", col2: "" });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ col1: "", col2: "" });

  const [divisions, setDivisions] = useState<Division[]>([]);

  // 1. Ambil data realtime dari Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "stit_data", "main_state"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.masterData) setMasterData(data.masterData);
        if (data.divisions) setDivisions(data.divisions);
      }
    });
    return () => unsub();
  }, []);

  // 2. Simpan data realtime ke Firestore
  const syncToFirestore = async (
    newMaster: typeof masterData,
    newDivisions: Division[],
  ) => {
    try {
      const cleanMaster = JSON.parse(JSON.stringify(newMaster));
      const cleanDivisions = JSON.parse(JSON.stringify(newDivisions));

      await setDoc(doc(db, "stit_data", "main_state"), {
        masterData: cleanMaster,
        divisions: cleanDivisions,
      });
    } catch (err) {
      console.error("Gagal sinkron Firestore:", err);
    }
  };

  // Handler Master Data
  const handleAddMaster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.col1.trim()) return;

    const newItem: MasterItem = {
      id: `item-${Date.now()}`,
      col1: formData.col1,
      col2: config[activeMasterCategory].hasCol2 ? formData.col2 : "",
      checked: false,
    };

    const updated = {
      ...masterData,
      [activeMasterCategory]: [...masterData[activeMasterCategory], newItem],
    };
    setMasterData(updated);
    syncToFirestore(updated, divisions);
    setFormData({ col1: "", col2: "" });
  };

  const handleToggleCheck = (category: CategoryType, id: string) => {
    const updated = {
      ...masterData,
      [category]: masterData[category].map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    };
    setMasterData(updated);
    syncToFirestore(updated, divisions);
  };

  const handleDeleteMaster = (category: CategoryType, id: string) => {
    const updated = {
      ...masterData,
      [category]: masterData[category].filter((item) => item.id !== id),
    };
    setMasterData(updated);
    syncToFirestore(updated, divisions);
  };

  const startEdit = (item: MasterItem) => {
    setEditingId(item.id);
    setEditFormData({ col1: item.col1, col2: item.col2 || "" });
  };

  const saveEdit = (category: CategoryType, id: string) => {
    const updated = {
      ...masterData,
      [category]: masterData[category].map((item) =>
        item.id === id
          ? { ...item, col1: editFormData.col1, col2: editFormData.col2 }
          : item,
      ),
    };
    setMasterData(updated);
    syncToFirestore(updated, divisions);
    setEditingId(null);
  };

  // Handler Kanvas
  const addDivision = () => {
    const updated = [
      ...divisions,
      { id: `div-${Date.now()}`, title: "Divisi Baru", blocks: [] },
    ];
    setDivisions(updated);
    syncToFirestore(masterData, updated);
  };

  const updateDivisionTitle = (id: string, title: string) => {
    const updated = divisions.map((d) => (d.id === id ? { ...d, title } : d));
    setDivisions(updated);
    syncToFirestore(masterData, updated);
  };

  const deleteDivision = (id: string) => {
    const updated = divisions.filter((d) => d.id !== id);
    setDivisions(updated);
    syncToFirestore(masterData, updated);
  };

  const addBlockToDivision = (divId: string, type: CategoryType) => {
    const updated = divisions.map((d) => {
      if (d.id === divId) {
        return {
          ...d,
          blocks: [
            ...d.blocks,
            { id: `block-${Date.now()}`, type, selectedIds: [] },
          ],
        };
      }
      return d;
    });
    setDivisions(updated);
    syncToFirestore(masterData, updated);
  };

  const deleteBlockFromDivision = (divId: string, blockId: string) => {
    const updated = divisions.map((d) =>
      d.id === divId
        ? { ...d, blocks: d.blocks.filter((b) => b.id !== blockId) }
        : d,
    );
    setDivisions(updated);
    syncToFirestore(masterData, updated);
  };

  const selectItemForBlock = (
    divId: string,
    blockId: string,
    itemId: string,
  ) => {
    const updated = divisions.map((d) => {
      if (d.id === divId) {
        return {
          ...d,
          blocks: d.blocks.map((b) => {
            if (b.id === blockId && !b.selectedIds.includes(itemId)) {
              return { ...b, selectedIds: [...b.selectedIds, itemId] };
            }
            return b;
          }),
        };
      }
      return d;
    });
    setDivisions(updated);
    syncToFirestore(masterData, updated);
  };

  const removeBlockItem = (divId: string, blockId: string, itemId: string) => {
    const updated = divisions.map((d) => {
      if (d.id === divId) {
        return {
          ...d,
          blocks: d.blocks.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  selectedIds: b.selectedIds.filter((id) => id !== itemId),
                }
              : b,
          ),
        };
      }
      return d;
    });
    setDivisions(updated);
    syncToFirestore(masterData, updated);
  };

  // Kalkulasi Diagram
  const countingCategories: CategoryType[] = [
    "stakeholder",
    "program",
    "peralatan",
    "output",
  ];
  let totalItems = 0;
  let checkedItems = 0;

  countingCategories.forEach((cat) => {
    const items = masterData[cat];
    totalItems += items.length;
    checkedItems += items.filter((i) => i.checked).length;
  });

  const overallProgress =
    totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      {/* HEADER / HERO (#011f3f dengan aksen #c79d3a) */}
      <header className="sticky top-0 z-50 bg-[#011f3f]/95 backdrop-blur-md border-b-2 border-[#c79d3a]/30 px-6 py-4 shadow-lg">
        <div className="w-full px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo & Judul dengan Indikator Online di Sudut Logo */}
          <div className="flex items-center gap-3">
            <div className="relative inline-block">
              <img
                src="/logostit.png"
                alt="Logo STIT Media"
                className="w-10 h-10 object-contain rounded-xl bg-white p-1 shadow-sm border border-[#c79d3a]/30"
              />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#011f3f]"></span>
              </span>
            </div>

            <div>
              <h1 className="text-xl font-black text-white tracking-wider leading-tight">
                STIT MEDIA
              </h1>
              <p className="text-xs text-[#c79d3a] font-semibold">
                Dashboard & Management System
              </p>
            </div>
          </div>

          {/* Navigasi Menu & Tombol External */}
          {/* Navigasi Utama + Tombol Task */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1 bg-[#022b57] p-1 rounded-xl border border-[#c79d3a]/30 shadow-inner">
              <button
                onClick={() => setActiveTab("master")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "master"
                    ? "bg-white text-[#011f3f] shadow-md"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Database className="w-4 h-4" /> Master Data
              </button>
              <button
                onClick={() => setActiveTab("canvas")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "canvas"
                    ? "bg-white text-[#011f3f] shadow-md"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <FolderKanban className="w-4 h-4" /> Kanvas Modul
              </button>
              <button
                onClick={() => setActiveTab("diagram")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  activeTab === "diagram"
                    ? "bg-white text-[#011f3f] shadow-md"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <BarChart3 className="w-4 h-4" /> Diagram & Progress
              </button>
            </div>

            <a
              href="https://mmedia-wiibs.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 text-[#011f3f] rounded-xl text-sm font-bold shadow-md transition-all border border-white/50"
            >
              <span>Task</span>
            </a>
          </div>
        </div>
      </header>

      <main className="w-full p-6">
        {/* ================= TAB MASTER DATA ================= */}
        {activeTab === "master" && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Kategori */}
            <div className="w-full lg:w-1/4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-1.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 px-3 mb-2">
                Kategori Induk
              </h2>
              {(Object.keys(config) as CategoryType[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveMasterCategory(key)}
                  className={`text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex justify-between items-center ${
                    activeMasterCategory === key
                      ? "bg-[#011f3f] text-[#c79d3a] shadow-md border border-[#c79d3a]/30"
                      : "text-slate-600 hover:bg-[#eced8f]/20 hover:text-slate-900"
                  }`}
                >
                  <span>{config[key].label}</span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      activeMasterCategory === key
                        ? "bg-[#c79d3a] text-slate-950"
                        : "bg-[#eced8f]/50 text-slate-800"
                    }`}
                  >
                    {masterData[key].length}
                  </span>
                </button>
              ))}
            </div>

            {/* Form Input & Tabel Master */}
            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-black text-[#011f3f]">
                  Setup: {config[activeMasterCategory].label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input data acuan yang otomatis tersinkron ke database online.
                </p>
              </div>

              {/* Form Input Box (#eced8f background) */}
              <form
                onSubmit={handleAddMaster}
                className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex flex-col gap-4"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      {config[activeMasterCategory].col1Label}
                    </label>
                    {config[activeMasterCategory].isMultiline ? (
                      <textarea
                        rows={2}
                        placeholder={`Ketik ${config[activeMasterCategory].col1Label}...`}
                        value={formData.col1}
                        onChange={(e) =>
                          setFormData({ ...formData, col1: e.target.value })
                        }
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#c79d3a] outline-none resize-none shadow-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={`Ketik ${config[activeMasterCategory].col1Label}...`}
                        value={formData.col1}
                        onChange={(e) =>
                          setFormData({ ...formData, col1: e.target.value })
                        }
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#c79d3a] outline-none shadow-sm"
                      />
                    )}
                  </div>

                  {config[activeMasterCategory].hasCol2 && (
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        {config[activeMasterCategory].col2Label}
                      </label>
                      <textarea
                        rows={2}
                        placeholder={`Ketik ${config[activeMasterCategory].col2Label}...`}
                        value={formData.col2}
                        onChange={(e) =>
                          setFormData({ ...formData, col2: e.target.value })
                        }
                        className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-[#c79d3a] outline-none resize-none shadow-sm"
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#011f3f] hover:bg-[#022b57] text-[#c79d3a] border border-[#c79d3a]/50 rounded-xl text-sm font-black shadow-md transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Simpan Data
                  </button>
                </div>
              </form>

              {/* Tabel dengan Header Berwarna #eced8f */}
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                      <th className="p-3.5 rounded-l-xl">
                        {config[activeMasterCategory].col1Label}
                      </th>
                      {config[activeMasterCategory].hasCol2 && (
                        <th className="p-3.5">
                          {config[activeMasterCategory].col2Label}
                        </th>
                      )}
                      {config[activeMasterCategory].hasStatus && (
                        <th className="p-3.5 text-center">
                          Status Kepemilikan/Jalan
                        </th>
                      )}
                      <th className="p-3.5 text-center rounded-r-xl">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {masterData[activeMasterCategory].length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-slate-400 italic"
                        >
                          Belum ada data tersimpan.
                        </td>
                      </tr>
                    ) : (
                      masterData[activeMasterCategory].map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-[#eced8f]/10 transition-colors"
                        >
                          <td className="p-3.5 text-slate-800 font-medium">
                            {editingId === item.id ? (
                              <textarea
                                value={editFormData.col1}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    col1: e.target.value,
                                  })
                                }
                                className="w-full p-2 border rounded-lg text-sm bg-white"
                                rows={2}
                              />
                            ) : (
                              <span className="whitespace-pre-wrap">
                                {item.col1}
                              </span>
                            )}
                          </td>

                          {config[activeMasterCategory].hasCol2 && (
                            <td className="p-3.5 text-slate-600">
                              {editingId === item.id ? (
                                <textarea
                                  value={editFormData.col2}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      col2: e.target.value,
                                    })
                                  }
                                  className="w-full p-2 border rounded-lg text-sm bg-white"
                                  rows={2}
                                />
                              ) : (
                                <span className="whitespace-pre-wrap">
                                  {item.col2 || "-"}
                                </span>
                              )}
                            </td>
                          )}

                          {config[activeMasterCategory].hasStatus && (
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() =>
                                  handleToggleCheck(
                                    activeMasterCategory,
                                    item.id,
                                  )
                                }
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 mx-auto ${
                                  item.checked
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {item.checked ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5" />
                                )}
                                {item.checked ? "Sudah / Tersedia" : "Belum"}
                              </button>
                            </td>
                          )}

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {editingId === item.id ? (
                                <button
                                  onClick={() =>
                                    saveEdit(activeMasterCategory, item.id)
                                  }
                                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm"
                                >
                                  Simpan
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEdit(item)}
                                  className="p-1.5 bg-slate-100 hover:bg-[#eced8f] text-slate-600 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleDeleteMaster(
                                    activeMasterCategory,
                                    item.id,
                                  )
                                }
                                className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB KANVAS MODUL ================= */}
        {activeTab === "canvas" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-[#011f3f]">
                Peta Modular Divisi
              </h2>
              <button
                onClick={addDivision}
                className="px-5 py-2.5 bg-[#011f3f] hover:bg-[#022b57] text-[#c79d3a] border border-[#c79d3a]/50 rounded-xl text-sm font-black shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tambah Divisi Baru
              </button>
            </div>

            <div className="flex justify-center gap-6 overflow-x-auto pb-8 items-start h-[70vh]">
              {divisions.length === 0 && (
                <div className="w-full h-full min-h-[300px] border-2 border-dashed border-slate-300 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-400">
                  <FolderKanban className="w-12 h-12 mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">
                    Belum ada divisi.
                  </p>
                </div>
              )}

              {divisions.map((div) => (
                <div
                  key={div.id}
                  className="min-w-[420px] w-[420px] bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col max-h-full"
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <input
                      type="text"
                      value={div.title}
                      onChange={(e) =>
                        updateDivisionTitle(div.id, e.target.value)
                      }
                      className="text-lg font-black text-[#011f3f] bg-transparent outline-none border-b border-transparent focus:border-[#c79d3a] w-full"
                    />
                    <button
                      onClick={() => deleteDivision(div.id)}
                      className="text-slate-300 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4">
                    {div.blocks.map((block) => (
                      <div
                        key={block.id}
                        className={`p-3.5 rounded-xl border ${config[block.type].color} relative shadow-sm`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 px-2 py-0.5 rounded border border-black/10">
                            {config[block.type].label}
                          </span>
                          <button
                            onClick={() =>
                              deleteBlockFromDivision(div.id, block.id)
                            }
                            className="text-black/30 hover:text-red-600"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="space-y-2 mb-2">
                          {block.selectedIds.map((itemId) => {
                            const item = masterData[block.type].find(
                              (m) => m.id === itemId,
                            );
                            if (!item) return null;

                            let statusText = "";
                            let badgeColor = "";
                            if (
                              block.type === "stakeholder" ||
                              block.type === "peralatan"
                            ) {
                              statusText = item.checked ? "Tersedia" : "Belum";
                              badgeColor = item.checked
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600";
                            } else if (
                              block.type === "program" ||
                              block.type === "output"
                            ) {
                              statusText = item.checked
                                ? "Selesai/Sudah berjalan"
                                : "Belum";
                              badgeColor = item.checked
                                ? "bg-[#011f3f] text-[#c79d3a]"
                                : "bg-slate-200 text-slate-600";
                            }

                            return (
                              <div
                                key={itemId}
                                className="bg-white/95 p-2.5 rounded-lg border border-black/10 text-xs flex justify-between items-start gap-2 shadow-sm"
                              >
                                <div>
                                  <span className="font-bold text-slate-800 block whitespace-pre-wrap">
                                    {item.col1}
                                  </span>
                                  {item.col2 && (
                                    <span className="text-slate-500 block mt-0.5 whitespace-pre-wrap">
                                      {item.col2}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {statusText && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}
                                    >
                                      {statusText}
                                    </span>
                                  )}
                                  <button
                                    onClick={() =>
                                      removeBlockItem(div.id, block.id, itemId)
                                    }
                                    className="text-red-400 font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <select
                          value=""
                          onChange={(e) =>
                            selectItemForBlock(div.id, block.id, e.target.value)
                          }
                          className="w-full p-2 bg-white/90 border rounded-lg text-xs outline-none cursor-pointer"
                        >
                          <option value="" disabled>
                            + Pilih dari Master Data...
                          </option>
                          {masterData[block.type]
                            .filter((m) => !block.selectedIds.includes(m.id))
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.col1}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <select
                    value=""
                    onChange={(e) =>
                      addBlockToDivision(div.id, e.target.value as CategoryType)
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none cursor-pointer text-center"
                  >
                    <option value="" disabled>
                      + Tambah Blok Kategori...
                    </option>
                    {(Object.keys(config) as CategoryType[]).map((key) => (
                      <option key={key} value={key}>
                        {config[key].label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB DIAGRAM & PROGRESS ================= */}
        {activeTab === "diagram" &&
          (() => {
            let currentPercent = 0;
            const gradientStops: string[] = [];

            countingCategories.forEach((cat) => {
              const checked = masterData[cat].filter((i) => i.checked).length;
              if (checked > 0 && totalItems > 0) {
                const pct = (checked / totalItems) * 100;
                const color =
                  cat === "stakeholder"
                    ? "#6366f1"
                    : cat === "program"
                      ? "#f43f5e"
                      : cat === "peralatan"
                        ? "#06b6d4"
                        : "#f97316";

                gradientStops.push(
                  `${color} ${currentPercent}% ${currentPercent + pct}%`,
                );
                currentPercent += pct;
              }
            });

            if (currentPercent < 100) {
              gradientStops.push(`#f1f5f9 ${currentPercent}% 100%`);
            }

            const conicString = gradientStops.join(", ");

            return (
              <div className="space-y-6">
                {/* Total Progress Doughnut */}
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-8">
                  <div
                    className="relative w-48 h-48 shrink-0 rounded-full flex items-center justify-center shadow-sm"
                    style={{ background: `conic-gradient(${conicString})` }}
                  >
                    <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                      <span className="text-4xl font-black text-[#011f3f]">
                        {overallProgress}%
                      </span>
                      <span className="text-xs font-bold text-[#c79d3a] uppercase tracking-widest mt-1">
                        Selesai
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full text-center md:text-left">
                    <h2 className="text-2xl font-black text-[#011f3f]">
                      Ringkasan Capaian Keseluruhan
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 mb-6">
                      Kalkulasi persentase otomatis dari 4 kategori utama yang
                      sedang berjalan.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {countingCategories.map((cat) => {
                        const checked = masterData[cat].filter(
                          (i) => i.checked,
                        ).length;
                        const total = masterData[cat].length;

                        const barColor =
                          cat === "stakeholder"
                            ? "bg-indigo-500"
                            : cat === "program"
                              ? "bg-rose-500"
                              : cat === "peralatan"
                                ? "bg-cyan-500"
                                : "bg-orange-500";

                        return (
                          <div
                            key={cat}
                            className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100"
                          >
                            <span
                              className={`w-4 h-4 rounded-full ${barColor} shadow-sm shrink-0`}
                            ></span>
                            <div className="flex-1 text-left">
                              <span className="text-xs font-bold text-[#011f3f] block uppercase">
                                {config[cat].label}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-600">
                                {checked} dari {total} selesai
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Progress Per Kategori */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {countingCategories.map((cat) => {
                    const items = masterData[cat];
                    const checkedCount = items.filter((i) => i.checked).length;
                    const percent =
                      items.length > 0
                        ? Math.round((checkedCount / items.length) * 100)
                        : 0;

                    const barColor =
                      cat === "stakeholder"
                        ? "bg-indigo-500"
                        : cat === "program"
                          ? "bg-rose-500"
                          : cat === "peralatan"
                            ? "bg-cyan-500"
                            : "bg-orange-500";

                    const textColor =
                      cat === "stakeholder"
                        ? "text-indigo-600"
                        : cat === "program"
                          ? "text-rose-600"
                          : cat === "peralatan"
                            ? "text-cyan-600"
                            : "text-orange-600";

                    return (
                      <div
                        key={cat}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-extrabold text-[#011f3f] text-sm uppercase tracking-wider">
                              {config[cat].label}
                            </h3>
                            <span className="text-xs font-bold bg-[#eced8f]/50 text-slate-800 px-2 py-0.5 rounded-full">
                              {checkedCount} / {items.length}
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-4 shadow-inner">
                            <div
                              className={`${barColor} h-full transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>

                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {items.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                Belum ada data.
                              </p>
                            ) : (
                              items.map((item) => (
                                <div
                                  key={item.id}
                                  className="text-xs flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100"
                                >
                                  <span className="font-medium text-slate-700 truncate max-w-[180px]">
                                    {item.col1}
                                  </span>
                                  <span
                                    className={`w-2 h-2 rounded-full ${item.checked ? barColor : "bg-slate-300"}`}
                                  ></span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                          <span className={`text-xs font-black ${textColor}`}>
                            {percent}% Selesai
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
      </main>
    </div>
  );
}
