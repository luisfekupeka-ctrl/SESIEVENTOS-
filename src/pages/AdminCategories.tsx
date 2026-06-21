import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Category, Subcategory } from '../types';
import { Plus, Trash2, Edit2, X, Check, Tags, Loader2, AlertTriangle, ListFilter } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Subcategory management state
  const [newSubNames, setNewSubNames] = useState<Record<string, string>>({});
  const [addingSubId, setAddingSubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data, error: err } = await supabase
        .from('categories')
        .select('*, subcategories(*)')
        .order('name', { ascending: true });
      if (err) throw err;
      setCategories(data || []);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar categorias e tipos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    setIsAdding(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('categories')
        .insert({ name: newCategory.trim() });
      if (err) throw err;
      
      setNewCategory('');
      fetchCategories();
    } catch (err: any) {
      console.error("Erro ao adicionar categoria:", err);
      setError(err.message || "Erro ao adicionar categoria.");
    } finally {
      setIsAdding(false);
    }
  };

  const seedCategories = async () => {
    setError(null);
    setLoading(true);
    try {
      for (const cat of DEFAULT_CATEGORIES) {
        if (!categories.find(c => c.name.toLowerCase() === cat.toLowerCase())) {
          const { error: err } = await supabase
            .from('categories')
            .insert({ name: cat });
          if (err) throw err;
        }
      }
      fetchCategories();
    } catch (err: any) {
      setError('Erro ao carregar categorias padrão.');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error: err } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteId);
      if (err) throw err;
      setDeleteId(null);
      fetchCategories();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      setError('Erro ao excluir categoria.');
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    
    try {
      // Use proxy update generic query
      const { error: err } = await supabase
        .from('categories')
        .update({ name: editingName.trim() })
        .eq('id', editingId);

      if (err) throw err;
      setEditingId(null);
      fetchCategories();
    } catch (error: any) {
      console.error("Erro ao editar categoria:", error);
      setError('Erro ao atualizar nome da categoria.');
    }
  };

  // Add subcategory to category
  const handleAddSubcategory = async (catId: string) => {
    const rawName = newSubNames[catId];
    if (!rawName) return;
    
    // Split by comma, semicolon or newline and filter empty
    const subNames = rawName
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (subNames.length === 0) return;

    setAddingSubId(catId);
    setError(null);
    try {
      const inserts = subNames.map(name => ({ category_id: catId, name }));
      const { error: err } = await supabase
        .from('subcategories')
        .insert(inserts);
        
      if (err) throw err;
      
      setNewSubNames(prev => ({ ...prev, [catId]: '' }));
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      setError('Erro ao adicionar tipo(s)/subcategoria(s).');
    } finally {
      setAddingSubId(null);
    }
  };

  // Delete subcategory
  const handleDeleteSubcategory = async (subId: string) => {
    setError(null);
    try {
      const { error: err } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subId);
      if (err) throw err;
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError('Erro ao remover tipo/subcategoria.');
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
    <div className="space-y-10 bg-[#020617] text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Categorias e Tipos</h1>
          <p className="text-sm md:text-base text-slate-300 font-bold">Crie e edite as categorias dos eventos e gerencie seus tipos correspondentes.</p>
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

      {error && (
        <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold flex items-center gap-3">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Add New Category form */}
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
                {isAdding ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>

        {/* Categories List with Nested Subcategories */}
        <div className="divide-y divide-slate-850">
          {categories.map(cat => (
            <div key={cat.id} className="p-6 md:p-8 space-y-6 hover:bg-slate-800/10 transition-colors">
              <div className="flex items-center justify-between">
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
                      <div className="w-14 h-14 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center shadow-lg border border-yellow-400/10">
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

              {/* Subcategories (Types) Panel */}
              <div className="pl-6 md:pl-20 border-l border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2 flex items-center gap-1.5">
                    <ListFilter size={12} /> Tipos cadastrados:
                  </span>
                  
                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    cat.subcategories.map(sub => (
                      <span
                        key={sub.id}
                        className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:border-red-500/30 hover:text-red-400 transition-colors group"
                      >
                        {sub.name}
                        <button
                          onClick={() => handleDeleteSubcategory(sub.id)}
                          className="text-slate-500 hover:text-red-500 cursor-pointer"
                          title="Remover tipo"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 font-bold italic">Nenhum tipo cadastrado</span>
                  )}
                </div>

                {/* Add Subcategory Inline Input */}
                <div className="flex items-center gap-3 max-w-md pt-2">
                  <input
                    type="text"
                    placeholder="Adicionar tipos (separados por vírgula)..."
                    className="flex-grow px-4 py-2 text-xs bg-slate-950/50 border border-slate-850 rounded-xl focus:outline-none focus:border-yellow-400 transition-all text-white font-bold placeholder:text-slate-600"
                    value={newSubNames[cat.id] || ''}
                    onChange={(e) => setNewSubNames(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    disabled={addingSubId === cat.id}
                  />
                  <button
                    onClick={() => handleAddSubcategory(cat.id)}
                    disabled={addingSubId === cat.id || !newSubNames[cat.id]?.trim()}
                    className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-yellow-400 hover:text-black transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
                  >
                    {addingSubId === cat.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-20 text-center text-slate-450 font-black text-xl uppercase tracking-widest">
              Nenhuma categoria catalogada.
            </div>
          )}
        </div>
      </div>

      {/* Delete Category Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-800">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-red-500/10">
              <Trash2 size={40} />
            </div>
            <h3 className="text-3xl font-black text-white text-center mb-4 tracking-tight">Excluir Categoria</h3>
            <p className="text-slate-400 text-center mb-10 font-bold text-lg leading-relaxed">
              Deseja remover esta categoria? Tipos e subcategorias associadas também serão apagados, e isso pode afetar eventos cadastrados.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="py-4 bg-slate-850 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-800 transition-all"
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
