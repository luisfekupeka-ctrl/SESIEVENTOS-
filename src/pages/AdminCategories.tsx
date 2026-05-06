import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Category } from '../types';
import { Plus, Trash2, Edit2, X, Check, Tags, Loader2, AlertTriangle } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../constants';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();

    const subscription = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error("Erro ao carregar categorias:", error);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    setIsAdding(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert([{ name: newCategory.trim() }])
        .select();

      if (insertError) throw insertError;
      
      setNewCategory('');
      if (data) {
        setCategories(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        fetchCategories();
      }
    } catch (err: any) {
      console.error("Erro ao adicionar categoria:", err);
      setError(err.message || "Erro ao adicionar categoria.");
    } finally {
      setIsAdding(false);
    }
  };

  const seedCategories = async () => {
    for (const cat of DEFAULT_CATEGORIES) {
      if (!categories.find(c => c.name.toLowerCase() === cat.toLowerCase())) {
        await supabase.from('categories').insert([{ name: cat }]);
      }
    }
    fetchCategories();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setDeleteId(null);
      fetchCategories();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    
    const { error } = await supabase
      .from('categories')
      .update({ name: editingName.trim() })
      .eq('id', editingId);

    if (error) {
      console.error("Erro ao editar categoria:", error);
    } else {
      setEditingId(null);
      fetchCategories();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
        <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Sincronizando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 bg-[#020617]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Gerenciar Categorias</h1>
          <p className="text-sm md:text-base text-slate-300 font-bold">Crie e edite as categorias dos eventos.</p>
        </div>
        {categories.length === 0 && (
          <button
            onClick={seedCategories}
            className="text-xs font-black text-yellow-400 uppercase tracking-widest hover:underline"
          >
            Carregar categorias padrão
          </button>
        )}
      </div>

      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 md:p-10 border-b border-slate-800 bg-slate-950/30">
          <form onSubmit={handleAdd} className="flex flex-col gap-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Nome da nova categoria..."
                className="flex-grow px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-500 shadow-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                disabled={isAdding}
              />
              <button
                type="submit"
                disabled={isAdding || !newCategory.trim()}
                className="bg-yellow-400 text-black px-6 md:px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 flex items-center gap-3 disabled:opacity-50"
              >
                {isAdding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />} 
                {isAdding ? 'Sincronizando...' : 'Adicionar'}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-500 font-bold flex items-center gap-2">
                <AlertTriangle size={18} /> {error}
              </p>
            )}
          </form>
        </div>

        <div className="divide-y divide-slate-800">
          {categories.map(cat => (
            <div key={cat.id} className="p-6 md:p-8 flex items-center justify-between hover:bg-slate-800/30 transition-colors group">
              {editingId === cat.id ? (
                <div className="flex-grow flex gap-4 mr-4 animate-in fade-in slide-in-from-left-4 duration-300">
                  <input
                    type="text"
                    className="flex-grow px-6 py-3 bg-slate-950 border border-yellow-400 rounded-xl focus:outline-none text-white font-bold"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="w-12 h-12 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-green-500/10">
                    <Check size={24} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="w-12 h-12 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-red-500/10">
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center shadow-lg border border-yellow-400/10 group-hover:scale-110 transition-transform">
                      <Tags size={24} />
                    </div>
                    <span className="text-xl font-black text-white tracking-tight">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="w-12 h-12 bg-slate-800 text-slate-400 hover:text-yellow-400 rounded-xl flex items-center justify-center transition-all border border-slate-700 shadow-sm"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => setDeleteId(cat.id)}
                      className="w-12 h-12 bg-red-500/5 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-red-500/20"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-black text-xl uppercase tracking-widest">
              Nenhuma categoria catalogada.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-800">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-red-500/10">
              <Trash2 size={40} />
            </div>
            <h3 className="text-3xl font-black text-white text-center mb-4 tracking-tight">Confirmar Exclusão</h3>
            <p className="text-slate-400 text-center mb-10 font-bold text-lg leading-relaxed">
              Deseja remover esta categoria? Esta ação pode impactar eventos vinculados.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="py-4 bg-slate-800 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleDelete}
                className="py-4 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
