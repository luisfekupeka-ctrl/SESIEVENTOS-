import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Event, Registration } from '../types';
import { ChevronLeft, Download, Trash2, Users, FileSpreadsheet, FileText, Copy, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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

    pdfDoc.autoTable({
      startY: 30,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 84, 166] }, // SESI Blue
      styles: { fontSize: 8 }
    });

    pdfDoc.save(`Inscritos_${event.name.replace(/\s+/g, '_')}.pdf`);
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

  if (loading) return <div className="p-8 text-center text-[#0054A6] font-black animate-pulse">Carregando...</div>;
  if (!event) return <div className="p-8 text-center text-red-500 font-bold">Evento não encontrado.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/events')} className="p-2 text-slate-400 hover:text-[#0054A6] hover:bg-[#0054A6]/5 rounded-xl transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 line-clamp-1">{event.name}</h1>
            <p className="text-slate-500 font-medium">Lista de Inscritos ({registrations.length})</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
            {copied ? 'Copiado!' : 'Copiar Lista'}
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-xl text-sm font-bold text-green-700 hover:bg-green-100 transition-all"
          >
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-sm font-bold text-red-700 hover:bg-red-100 transition-all"
          >
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Data</th>
                {event.form_fields.map(field => (
                  <th key={field.id} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">{field.label}</th>
                ))}
                <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrations.map(reg => {
                return (
                  <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      {reg.timestamp ? format(new Date(reg.timestamp), "dd/MM HH:mm") : '-'}
                    </td>
                    {event.form_fields.map(field => (
                      <td key={field.id} className="px-4 py-2 text-[10px] text-slate-600 truncate max-w-[150px]">
                        {reg.form_data[field.label.toLowerCase()] || '-'}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setDeleteId(reg.id)}
                        className="p-1 text-slate-300 hover:text-red-600 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {registrations.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium">
              Nenhuma inscrição realizada para este evento.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-4">Confirmar Remoção</h3>
            <p className="text-slate-500 mb-8 font-medium">
              Deseja remover este aluno da lista de inscritos? Esta ação não pode ser desfeita.
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
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
