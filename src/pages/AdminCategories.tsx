import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Category } from '../types';
import { Plus, Trash2, Edit2, X, Check, Tags } from 'lucide-react';
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

    // Set up real-time subscription
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    const { error } = await supabase
      .from('categories')
      .insert([{ name: newCategory.trim() }]);

    if (error) {
      console.error("Erro ao adicionar categoria:", error);
    } else {
      setNewCategory('');
      fetchCategories();
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

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Carregando...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Gerenciar Categorias</h1>
          <p className="text-slate-500 font-medium">Crie e edite as categorias dos eventos.</p>
        </div>
        {categories.length === 0 && (
          <button
            onClick={seedCategories}
            className="text-sm font-bold text-[#0054A6] hover:underline"
          >
            Carregar categorias padrão
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <form onSubmit={handleAdd} className="flex gap-4">
            <input
              type="text"
              placeholder="Nome da nova categoria..."
              className="flex-grow px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6] transition-all"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button
              type="submit"
              className="bg-[#0054A6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#004080] transition-colors flex items-center gap-2"
            >
              <Plus size={20} /> Adicionar
            </button>
          </form>
        </div>

        <div className="divide-y divide-slate-100">
          {categories.map(cat => (
            <div key={cat.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              {editingId === cat.id ? (
                <div className="flex-grow flex gap-4 mr-4">
                  <input
                    type="text"
                    className="flex-grow px-4 py-2 border border-[#0054A6] rounded-lg focus:outline-none"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={handleSaveEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <Check size={20} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#0054A6]/5 rounded-lg flex items-center justify-center text-[#0054A6]">
                      <Tags size={20} />
                    </div>
                    <span className="text-lg font-bold text-slate-900">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="p-2 text-slate-400 hover:text-[#0054A6] hover:bg-[#0054A6]/5 rounded-lg transition-all"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => setDeleteId(cat.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium">
              Nenhuma categoria cadastrada.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-4">Confirmar Exclusão</h3>
            <p className="text-slate-500 mb-8 font-medium">
              Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-grow py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-grow py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
