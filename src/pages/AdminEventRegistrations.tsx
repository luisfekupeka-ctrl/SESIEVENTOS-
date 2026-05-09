import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Event, Registration } from '../types';
import { ChevronLeft, Download, Trash2, Users, FileSpreadsheet, FileText, Copy, CheckCircle2, Loader2, Calendar, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminEventRegistrations() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();
        
        if (eventData) {
          setEvent(eventData as Event);
        }

        const { data: regsData } = await supabase
          .from('registrations')
          .select('*, students(*)')
          .eq('event_id', id);

        if (regsData) {
          const sortedRegs = (regsData as any[]).sort((a, b) => {
            const nameA = `${a.students?.name || ''} ${a.students?.surname || ''}`.toLowerCase().trim();
            const nameB = `${b.students?.name || ''} ${b.students?.surname || ''}`.toLowerCase().trim();
            
            // Fallback for form_data if student is missing
            const fallbackA = (a.form_data?.nome || a.form_data?.['nome completo'] || '').toString().toLowerCase();
            const fallbackB = (b.form_data?.nome || b.form_data?.['nome completo'] || '').toString().toLowerCase();
            
            return (nameA || fallbackA).localeCompare(nameB || fallbackB);
          });
          setRegistrations(sortedRegs);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchStudents();

    const regsChannel = supabase.channel('registrations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `event_id=eq.${id}` }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(regsChannel);
    };
  }, [id]);

  const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*').order('name');
    if (data) setAllStudents(data);
  };

  const handleAddStudent = async (student: any) => {
    if (profile?.status !== 'approved' || !event || isAdding) return;
    
    // Check if already registered
    const isAlreadyRegistered = registrations.some(reg => reg.student_id === student.id);
    if (isAlreadyRegistered) {
      alert('Este aluno já está inscrito neste evento.');
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .insert({
          event_id: id,
          student_id: student.id,
          status: 'approved',
          form_data: {
            nome: `${student.name} ${student.surname || ''}`.trim(),
            'nome completo': `${student.name} ${student.surname || ''}`.trim(),
            'série': student.grade,
            'ano': student.grade,
            'turma': student.class,
            status: 'approved'
          }
        });

      if (error) throw error;

      // Update count
      await supabase
        .from('events')
        .update({ registration_count: (event.registration_count || 0) + 1 })
        .eq('id', id);

      // Refresh local state
      const { data: newRegs } = await supabase
        .from('registrations')
        .select('*, students(*)')
        .eq('event_id', id);
      
      if (newRegs) setRegistrations(newRegs);
      setEvent(prev => prev ? { ...prev, registration_count: (prev.registration_count || 0) + 1 } : null);
      
    } catch (error) {
      console.error('Erro ao adicionar aluno:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || profile?.status !== 'approved') return;
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', deleteId);
      
      if (error) throw error;
      
      if (event) {
        await supabase
          .from('events')
          .update({ registration_count: Math.max(0, (event.registration_count || 0) - 1) })
          .eq('id', id);
        
        setEvent(prev => prev ? { ...prev, registration_count: Math.max(0, (prev.registration_count || 0) - 1) } : null);
      }
      
      setRegistrations(prev => prev.filter(reg => reg.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleApprove = async (regId: string) => {
    if (profile?.status !== 'approved') return;
    try {
      const reg = registrations.find(r => r.id === regId);
      const newFormData = { ...reg?.form_data, status: 'approved' };
      
      const { error } = await supabase
        .from('registrations')
        .update({ 
          status: 'approved',
          form_data: newFormData
        })
        .eq('id', regId);
      
      if (error) throw error;
      
      setRegistrations(prev => prev.map(r => 
        r.id === regId ? { ...r, status: 'approved', form_data: newFormData } : r
      ));
    } catch (error) {
      console.error("Erro ao aprovar:", error);
    }
  };

  const exportToExcel = () => {
    if (!event || registrations.length === 0) return;
    if (profile?.status !== 'approved') return;
    try {
      const data = registrations.map(reg => {
        let formattedDate = '-';
        try {
          if (reg.timestamp) {
            formattedDate = format(new Date(reg.timestamp), "dd/MM/yyyy HH:mm");
          }
        } catch (e) {
          console.error("Erro ao formatar data para Excel:", e);
        }

        const row: any = {
          'Data Inscrição': formattedDate
        };
        
        event.form_fields.forEach(field => {
          const label = field.label.toLowerCase();
          const student = (reg as any).students;
          let value = reg.form_data[label] || reg.form_data[field.label] || '-';
          
          if (student) {
            if (label.includes('nome')) value = `${student.name} ${student.surname || ''}`.trim();
            else if (label.includes('série') || label.includes('ano')) value = student.grade || value;
            else if (label.includes('turma')) value = student.class || value;
          }
          
          row[field.label] = value;
        });
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
      XLSX.writeFile(wb, `Inscritos_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    } catch (err) {
      console.error("Erro no Excel:", err);
    }
  };

  const exportToPDF = () => {
    if (!event || registrations.length === 0) return;
    if (profile?.status !== 'approved') return;
    try {
      const pdfDoc = new jsPDF();
      pdfDoc.text(`Lista de Inscritos: ${event.name}`, 14, 15);
      
      const head = [['Data', ...event.form_fields.map(f => f.label)]];
      const body = registrations.map(reg => {
        let formattedDate = '-';
        try {
          if (reg.timestamp) {
            formattedDate = format(new Date(reg.timestamp), "dd/MM/yyyy");
          }
        } catch (e) {
          console.error("Erro ao formatar data para PDF:", e);
        }

        return [
          formattedDate,
          ...event.form_fields.map(f => {
            const label = f.label.toLowerCase();
            const student = (reg as any).students;
            let value = reg.form_data[label] || reg.form_data[f.label] || '-';
            
            if (student) {
              if (label.includes('nome')) value = `${student.name} ${student.surname || ''}`.trim();
              else if (label.includes('série') || label.includes('ano')) value = student.grade || value;
              else if (label.includes('turma')) value = student.class || value;
            }
            return value;
          })
        ];
      });

      autoTable(pdfDoc, {
        head,
        body,
        startY: 25,
        theme: 'grid',
        headStyles: { fillColor: [234, 179, 8] },
        styles: { fontSize: 8 }
      });

      pdfDoc.save(`Inscritos_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error("Erro no PDF:", err);
    }
  };

  const copyToClipboard = () => {
    if (!event) return;
    
    const headers = ['Data Inscrição'];
    event.form_fields.forEach(field => headers.push(field.label));
    
    const rows = registrations.map(reg => {
      let formattedDate = '-';
      try {
        if (reg.timestamp) {
          formattedDate = format(new Date(reg.timestamp), "dd/MM/yyyy HH:mm");
        }
      } catch (e) {
        console.error("Erro ao formatar data para Clipboard:", e);
      }

      const row = [
        formattedDate
      ];
      
      event.form_fields.forEach(field => {
        const label = field.label.toLowerCase();
        const student = (reg as any).students;
        let value = reg.form_data[label] || reg.form_data[field.label] || '-';
        
        if (student) {
          if (label.includes('nome')) value = `${student.name} ${student.surname || ''}`.trim();
          else if (label.includes('série') || label.includes('ano')) value = student.grade || value;
          else if (label.includes('turma')) value = student.class || value;
        }
        row.push(value);
      });
      
      return row.join('\t');
    });

    const fullText = [headers.join('\t'), ...rows].join('\n');

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatRegDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return format(date, "dd/MM HH:mm");
    } catch (e) {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
        <p className="text-slate-300 font-black uppercase tracking-widest text-sm">Sincronizando inscrições...</p>
      </div>
    );
  }

  if (!event) return <div className="p-20 text-center text-red-500 font-bold bg-[#020617]">Evento não encontrado.</div>;

  return (
    <div className="space-y-10 bg-[#020617]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/admin/events')} className="w-14 h-14 bg-slate-900 text-slate-400 hover:text-yellow-400 rounded-2xl flex items-center justify-center transition-all border border-slate-800 shadow-lg">
            <ChevronLeft size={28} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white line-clamp-1 tracking-tight">{event.name}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Lista de Inscritos • <span className="text-yellow-400">{registrations.length}</span> Participantes</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:flex items-center gap-2 md:gap-4">
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={profile?.status !== 'approved'}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-400 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50"
          >
            <Users size={16} /> Adicionar Aluno
          </button>
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-lg"
          >
            {copied ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
            {copied ? 'Copiado!' : 'Copiar Dados'}
          </button>
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
            <button
              onClick={exportToExcel}
              disabled={profile?.status !== 'approved'}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-green-500 hover:bg-green-500 hover:text-white transition-all shadow-lg shadow-green-500/5 disabled:opacity-50 disabled:grayscale"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={profile?.status !== 'approved'}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 disabled:opacity-50 disabled:grayscale"
            >
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>
      </div>

      {profile?.status !== 'approved' && (
        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl mb-10 flex items-center gap-4 text-amber-500">
          <ShieldAlert size={20} />
          <p className="text-xs font-bold uppercase tracking-widest">
            Exportação e Aprovação bloqueadas. Aguarde a aprovação da sua conta.
          </p>
        </div>
      )}

      <div className="bg-slate-900/40 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800">
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data</th>
                {event.form_fields.map(field => (
                  <th key={field.id} className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{field.label}</th>
                ))}
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-6 md:px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {registrations.map(reg => {
                const regStatus = (reg as any).status || reg.form_data?.status || 'approved';
                const student = (reg as any).students;
                
                return (
                  <tr key={reg.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 md:px-10 py-6 text-xs text-slate-400 font-bold whitespace-nowrap uppercase tracking-widest">
                      {formatRegDate(reg.timestamp)}
                    </td>
                    {event.form_fields.map(field => {
                      const label = field.label.toLowerCase();
                      let value = reg.form_data[label] || reg.form_data[field.label] || '-';
                      
                      // Interceptar campos conhecidos para usar dados canônicos do banco
                      if (student) {
                        if (label.includes('nome')) {
                          value = `${student.name} ${student.surname || ''}`.trim();
                        } else if (label.includes('série') || label.includes('ano')) {
                          value = student.grade || value;
                        } else if (label.includes('turma')) {
                          value = student.class || value;
                        }
                      }

                      return (
                        <td key={field.id} className="px-6 md:px-10 py-6 text-sm text-white font-bold truncate max-w-[250px]">
                          {value}
                        </td>
                      );
                    })}
                    <td className="px-6 md:px-10 py-6">
                      <div className="flex items-center gap-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${regStatus === 'approved' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.4)]'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${regStatus === 'approved' ? 'text-green-500' : 'text-amber-500'}`}>
                          {regStatus === 'approved' ? 'Confirmado' : 'Pendente'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 md:px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {regStatus === 'pending' && (
                          <button
                            onClick={() => handleApprove(reg.id)}
                            className="w-11 h-11 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-green-500/10 shadow-lg"
                            title="Aprovar Inscrição"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteId(reg.id)}
                          className="w-11 h-11 bg-red-500/5 text-slate-500 hover:text-red-500 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {registrations.length === 0 && (
            <div className="p-32 text-center">
              <Users size={64} className="mx-auto text-slate-800 mb-6" />
              <p className="text-slate-400 font-black text-xl uppercase tracking-widest">
                Nenhuma inscrição catalogada.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-2xl max-h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-800 overflow-hidden">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-400/10 text-yellow-400 rounded-2xl flex items-center justify-center">
                  <Users size={24} />
                </div>
                <h3 className="text-3xl font-black text-white tracking-tight">Adicionar Aluno</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 bg-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <ShieldAlert size={20} className="rotate-45" /> {/* Close icon fallback */}
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar aluno por nome..."
                  className="w-full pl-12 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              <div className="overflow-y-auto max-h-[40vh] space-y-3 custom-scrollbar pr-2">
                {allStudents
                  .filter(s => `${s.name} ${s.surname}`.toLowerCase().includes(studentSearch.toLowerCase()))
                  .slice(0, 50)
                  .map(student => {
                    const isRegistered = registrations.some(r => r.student_id === student.id);
                    return (
                      <div key={student.id} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-800 hover:border-yellow-400/30 transition-all">
                        <div>
                          <p className="text-white font-black">{student.name} {student.surname}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{student.grade} • {student.class}</p>
                        </div>
                        <button
                          onClick={() => handleAddStudent(student)}
                          disabled={isRegistered || isAdding}
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            isRegistered 
                              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                              : 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/10'
                          }`}
                        >
                          {isRegistered ? 'Inscrito' : 'Adicionar'}
                        </button>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-800 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-red-500/10">
              <Trash2 size={40} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Confirmar Remoção</h3>
            <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">
              Deseja remover este aluno da lista oficial? Esta ação é irreversível.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="py-4 bg-slate-800 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="py-4 bg-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
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
