import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Event, Registration } from '../types';
import { ChevronLeft, Download, Trash2, Users, FileSpreadsheet, FileText, Copy, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminEventRegistrations() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
          .select('*')
          .eq('event_id', id);

        if (regsData) {
          setRegistrations(regsData as Registration[]);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const regsChannel = supabase.channel('registrations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `event_id=eq.${id}` }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(regsChannel);
    };
  }, [id]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', deleteId);
      
      if (error) throw error;
      
      // Update local state immediately for better UX
      setRegistrations(prev => prev.filter(reg => reg.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const exportToExcel = () => {
    if (!event) return;
    const data = registrations.map(reg => {
      const row: any = {
        'Data Inscrição': format(new Date(reg.timestamp), "dd/MM/yyyy HH:mm")
      };
      
      event.form_fields.forEach(field => {
        row[field.label] = reg.form_data[field.label.toLowerCase()] || '-';
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
    XLSX.writeFile(wb, `Inscritos_${event.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportToPDF = () => {
    if (!event) return;
    try {
      const pdfDoc = new jsPDF();
      pdfDoc.text(`Lista de Inscritos: ${event.name}`, 14, 15);
      pdfDoc.setFontSize(10);
      pdfDoc.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);

      const tableData = registrations.map(reg => {
        const row = [
          format(new Date(reg.timestamp), "dd/MM/yyyy")
        ];

        // Add custom fields
        event.form_fields.forEach(field => {
          row.push(reg.form_data[field.label.toLowerCase()] || '-');
        });

        return row;
      });

      const headers = ['Inscrição'];
      event.form_fields.forEach(field => headers.push(field.label));

      autoTable(pdfDoc, {
        startY: 30,
        head: [headers],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 84, 166] }, // SESI Blue
        styles: { fontSize: 8 }
      });

      pdfDoc.save(`Inscritos_${event.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar o arquivo PDF. Tente usar a exportação para Excel.");
    }
  };

  const copyToClipboard = () => {
    if (!event) return;
    
    // Create header row
    const headers = ['Data Inscrição'];
    event.form_fields.forEach(field => headers.push(field.label));
    
    // Create data rows
    const rows = registrations.map(reg => {
      const row = [
        format(new Date(reg.timestamp), "dd/MM/yyyy HH:mm")
      ];
      
      event.form_fields.forEach(field => {
        row.push(reg.form_data[field.label.toLowerCase()] || '-');
      });
      
      return row.join('\t'); // Tab separated for Excel
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

  if (loading) return <div className="p-8 text-center text-yellow-500 font-black animate-pulse uppercase tracking-widest">Sincronizando...</div>;
  if (!event) return <div className="p-8 text-center text-red-500 font-bold">Evento não encontrado.</div>;

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/admin/events')} className="w-14 h-14 bg-black text-slate-400 hover:text-yellow-500 rounded-2xl flex items-center justify-center transition-all border border-white/5">
            <ChevronLeft size={28} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white line-clamp-1 tracking-tight">{event.name}</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Lista de Inscritos • {registrations.length} Alunos</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-6 py-3 bg-black border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-[#0F0F0F] transition-all"
          >
            {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-6 py-3 bg-green-500/10 border border-green-500/10 rounded-2xl text-xs font-black uppercase tracking-widest text-green-500 hover:bg-green-500 hover:text-white transition-all"
          >
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/10 rounded-2xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-[#0A0A0A] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data</th>
                {event.form_fields.map(field => (
                  <th key={field.id} className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{field.label}</th>
                ))}
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {registrations.map(reg => {
                return (
                  <tr key={reg.id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="px-8 py-5 text-xs text-slate-500 font-bold whitespace-nowrap uppercase tracking-widest">
                      {formatRegDate(reg.timestamp)}
                    </td>
                    {event.form_fields.map(field => (
                      <td key={field.id} className="px-8 py-5 text-sm text-white font-bold truncate max-w-[200px]">
                        {reg.form_data[field.label.toLowerCase()] || '-'}
                      </td>
                    ))}
                    <td className="px-8 py-5 text-right">
                      <button
                        onClick={() => setDeleteId(reg.id)}
                        className="w-10 h-10 bg-red-500/5 text-slate-600 hover:text-red-500 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {registrations.length === 0 && (
            <div className="p-32 text-center">
              <Users size={60} className="mx-auto text-slate-800 mb-6 opacity-20" />
              <p className="text-slate-600 font-black text-xl uppercase tracking-widest">
                Nenhuma inscrição catalogada.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A0A0A] w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 animate-in fade-in zoom-in duration-300 border border-white/10 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto">
              <Trash2 size={40} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Confirmar Remoção</h3>
            <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">
              Deseja remover este aluno da lista oficial? Esta ação é irreversível.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-grow py-4 bg-black text-slate-400 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-[#0F0F0F] transition-all"
              >
                Voltar
              </button>
              <button
                onClick={handleDelete}
                className="flex-grow py-4 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
