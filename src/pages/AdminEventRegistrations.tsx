import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { Event, Registration } from '../types';
import { ChevronLeft, Download, Trash2, Users, FileSpreadsheet, FileText, Copy, CheckCircle2, Loader2, Calendar, ShieldAlert, Plus, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CLASSES } from '../constants';

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
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterClasses, setFilterClasses] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<'input' | 'review'>('input');
  const [bulkResults, setBulkResults] = useState<{ originalName: string; student: any | null }[]>([]);
  const [reconcileIdx, setReconcileIdx] = useState<number | null>(null);
  const [reconcileQuery, setReconcileQuery] = useState('');
  const [reconcileResults, setReconcileResults] = useState<any[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [participantTypeFilter, setParticipantTypeFilter] = useState('student');
  const [bulkParticipantType, setBulkParticipantType] = useState<'student' | 'collaborator' | 'responsible' | 'other'>('student');

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
    if (data) {
      setAllStudents(data);
      return data;
    }
    return [];
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

      // Refresh local state
      const { data: newRegs } = await supabase
        .from('registrations')
        .select('*, students(*)')
        .eq('event_id', id);
      
      if (newRegs) setRegistrations(newRegs);
      
      // Update local event object to reflect the new count from DB
      const { data: eventUpdate } = await supabase.from('events').select('registration_count').eq('id', id).single();
      if (eventUpdate) setEvent(prev => prev ? { ...prev, registration_count: eventUpdate.registration_count } : null);
      
    } catch (error) {
      console.error('Erro ao adicionar aluno:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddBatch = async () => {
    if (profile?.status !== 'approved' || !event || isAdding) return;
    
    const filtered = allStudents.filter(s => {
      const matchesSearch = `${s.name} ${s.surname}`.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesGrade = filterGrade === 'all' || s.grade === filterGrade;
      const matchesClass = filterClasses.length === 0 || filterClasses.includes(s.class);
      const matchesType = participantTypeFilter === 'all' || s.type === participantTypeFilter;
      return matchesSearch && matchesGrade && matchesClass && matchesType;
    });

    const toAdd = filtered.filter(s => !registrations.some(r => r.student_id === s.id));

    if (toAdd.length === 0) {
      setBatchFeedback('Nenhum aluno novo para adicionar com estes filtros.');
      return;
    }

    if (!confirm(`Deseja adicionar ${toAdd.length} alunos ao evento?`)) return;

    setIsAdding(true);
    setBatchFeedback(`Adicionando ${toAdd.length} alunos...`);

    try {
      const newRegs = toAdd.map(student => ({
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
      }));

      const { error } = await supabase.from('registrations').insert(newRegs);
      if (error) throw error;

      setBatchFeedback(`${toAdd.length} alunos adicionados com sucesso!`);
      setTimeout(() => setBatchFeedback(null), 3000);
      
      // Refresh
      const { data: updatedRegs } = await supabase
        .from('registrations')
        .select('*, students(*)')
        .eq('event_id', id);
      if (updatedRegs) setRegistrations(updatedRegs);
      
      // Update local event object to reflect the new count from DB
      const { data: eventUpdate } = await supabase.from('events').select('registration_count').eq('id', id).single();
      if (eventUpdate) setEvent(prev => prev ? { ...prev, registration_count: eventUpdate.registration_count } : null);

    } finally {
      setIsAdding(false);
    }
  };

  const normalizeName = (name: string) => {
    if (!name) return "";
    return name.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ") // Replace punctuation/special chars with space
      .replace(/\s+/g, " ")
      .trim();
  };

  const handleImportExcel = async (file: File) => {
    if (profile?.status !== 'approved' || !event || isAdding) return;
    setIsAdding(true);
    setBatchFeedback('Lendo arquivo Excel...');

    try {
      const reader = new FileReader();
      const data = await new Promise<any[]>((resolve, reject) => {
        reader.onload = (e) => {
          const ab = e.target?.result;
          const workbook = XLSX.read(ab, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(firstSheet));
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });

      if (data.length === 0) {
        setBatchFeedback('Arquivo vazio ou inválido.');
        setIsAdding(false);
        return;
      }

      setBatchFeedback(`Processando ${data.length} nomes...`);

      // 1. Get all students from DB for matching
      const { data: studentsFromDB } = await supabase.from('students').select('*');
      if (studentsFromDB.length === 0) {
        setBatchFeedback('Erro: O banco de alunos está vazio. Por favor, importe os alunos na aba "Alunos" primeiro.');
        setIsAdding(false);
        return;
      }

      const normalizedDB = studentsFromDB.map(s => ({
        ...s,
        normalized: normalizeName(`${s.name} ${s.surname || ''}`)
      }));

      // 2. Map Excel names to students
      const toRegister: any[] = [];
      const notFound: string[] = [];
      
      for (const row of data) {
        const rawName = row['Nome Completo'] || row['NOME COMPLETO'] || row['Nome'] || row['nome'] || Object.values(row)[0];
        if (!rawName) continue;

        const norm = normalizeName(rawName.toString());
        const match = normalizedDB.find(s => s.normalized === norm);

        if (match) {
          // Check if already registered
          const alreadyInEvent = registrations.some(r => r.student_id === match.id);
          const alreadyInToRegister = toRegister.some(s => s.id === match.id);
          
          if (!alreadyInEvent && !alreadyInToRegister) {
            toRegister.push(match);
          }
        } else {
          notFound.push(rawName.toString());
        }
      }

      if (toRegister.length === 0) {
        if (notFound.length > 0) {
          setBatchFeedback(`Nenhum aluno novo encontrado. ${notFound.length} nomes da planilha não foram localizados no banco de Alunos.`);
        } else {
          setBatchFeedback(`Concluído: Todos os alunos da planilha já estão inscritos neste evento.`);
        }
        setIsAdding(false);
        return;
      }

      if (!confirm(`Sucesso! Encontramos ${toRegister.length} alunos para adicionar.\n\nObservação: ${notFound.length} nomes não foram encontrados no banco da escola.\n\nDeseja prosseguir?`)) {
        setIsAdding(false);
        setBatchFeedback(null);
        return;
      }

      setBatchFeedback(`Inscrevendo ${toRegister.length} alunos...`);

      const newRegs = toRegister.map(student => ({
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
      }));

      const { error } = await supabase.from('registrations').insert(newRegs);
      if (error) throw error;

      setBatchFeedback(`${toRegister.length} alunos inscritos com sucesso!`);
      setTimeout(() => setBatchFeedback(null), 3000);
      
      // Refresh
      const { data: updatedRegs } = await supabase
        .from('registrations')
        .select('*, students(*)')
        .eq('event_id', id);
      if (updatedRegs) setRegistrations(updatedRegs);
      
      // Update local event object to reflect the new count from DB
      const { data: eventUpdate } = await supabase.from('events').select('registration_count').eq('id', id).single();
      if (eventUpdate) setEvent(prev => prev ? { ...prev, registration_count: eventUpdate.registration_count } : null);

    } catch (err: any) {
      console.error(err);
      setBatchFeedback(`Erro: ${err.message || 'Erro ao importar.'}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleReviewBulkPaste = async () => {
    if (profile?.status !== 'approved' || !event || isAdding || !bulkText.trim()) return;
    setIsAdding(true);
    setBatchFeedback('Analisando nomes...');

    try {
      const lines = bulkText.split('\n').filter(l => l.trim());
      if (lines.length === 0) {
        setBatchFeedback('Erro: Lista vazia.');
        setIsAdding(false);
        return;
      }

      const studentsFromDB = await fetchStudents();
      if (!studentsFromDB || studentsFromDB.length === 0) {
        setBatchFeedback('Erro: O banco de alunos está vazio.');
        setIsAdding(false);
        return;
      }

      const normalizedDB = studentsFromDB.map(s => ({
        ...s,
        normalized: normalizeName(`${s.name} ${s.surname || ''}`)
      }));

      // 2. Map names to results using a more robust matching logic
      const results = lines.map(rawName => {
        const norm = normalizeName(rawName);
        const searchWords = norm.split(' ').filter(w => w.length > 0).sort();
        
        // Exact match first
        let match = normalizedDB.find(s => s.normalized === norm);
        
        // Word-based match if no exact match (all words from search must be present in DB name)
        if (!match) {
          match = normalizedDB.find(s => {
            const dbWords = s.normalized.split(' ').filter(w => w.length > 0);
            return searchWords.every(word => dbWords.includes(word));
          });
        }

        return {
          originalName: rawName,
          student: match || null
        };
      });

      setBulkResults(results);
      setBulkStep('review');
      setBatchFeedback(null);
    } catch (err: any) {
      console.error(err);
      setBatchFeedback('Erro ao processar lista.');
    } finally {
      setIsAdding(false);
    }
  };


  const handleReconcileSearch = async (query: string) => {
    setReconcileQuery(query);
    
    // Fallback search: simply search by word across name and surname
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) {
      setReconcileResults(allStudents.slice(0, 50));
      return;
    }

    const qNorm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").trim();
    const searchWords = qNorm.split(/\s+/).filter(w => w.length > 0);
    
    // If state is empty but we have a query, try to use a local copy or refetch
    let source = allStudents;
    if (source.length === 0) {
      console.log("allStudents vazio, tentando recarregar...");
      const fresh = await fetchStudents();
      source = fresh;
    }

    const filtered = source.filter(s => {
      const nameNorm = (s.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ");
      const surnameNorm = (s.surname || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ");
      const fullName = `${nameNorm} ${surnameNorm}`.trim();
      
      // Permissive: if ANY word from search matches ANY word from name
      return searchWords.every(word => fullName.includes(word));
    });

    setReconcileResults(filtered.slice(0, 100));
  };

  const handleFinalizeBulk = async () => {
    if (isAdding || !event) return;
    const toRegister = bulkResults.filter(r => r.student !== null).map(r => r.student);
    
    if (toRegister.length === 0) {
      setBatchFeedback('Nenhum aluno selecionado.');
      return;
    }

    setIsAdding(true);
    setBatchFeedback(`Inscrevendo ${toRegister.length} alunos...`);

    try {
      // 1. Refetch registrations to ensure we have the absolute latest
      const { data: currentRegs } = await supabase.from('registrations').select('student_id').eq('event_id', id);
      const existingIds = new Set((currentRegs || []).map(r => r.student_id));

      // 2. Filter out those already in the event
      const validToRegister = toRegister.filter(s => !existingIds.has(s.id));

      // 3. Deduplicate validToRegister in case same student was matched multiple times
      const uniqueToRegister = [];
      const seenIds = new Set();
      for (const s of validToRegister) {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          uniqueToRegister.push(s);
        }
      }

      if (uniqueToRegister.length === 0) {
        setBatchFeedback('Nenhum aluno novo selecionado.');
        setIsAdding(false);
        return;
      }

      setBatchFeedback(`Inscrevendo ${uniqueToRegister.length} alunos...`);

      const newRegs = uniqueToRegister.map(student => ({
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
      }));

      const { error } = await supabase.from('registrations').insert(newRegs);
      if (error) {
        console.error('Erro no insert batch:', error);
        throw error;
      }

      setBatchFeedback(`${newRegs.length} alunos adicionados com sucesso!`);
      setBulkText('');
      setBulkResults([]);
      setBulkStep('input');
      setIsBulkModalOpen(false);
      
      // Refresh
      const { data: updatedRegs } = await supabase
        .from('registrations')
        .select('*, students(*)')
        .eq('event_id', id);
      if (updatedRegs) setRegistrations(updatedRegs);
      
      const { data: eventUpdate } = await supabase.from('events').select('registration_count').eq('id', id).single();
      if (eventUpdate) setEvent(prev => prev ? { ...prev, registration_count: eventUpdate.registration_count } : null);

    } catch (err: any) {
      console.error(err);
      setBatchFeedback(`Erro ao salvar: ${err.message || 'Erro desconhecido'}`);
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
      
      setRegistrations(prev => prev.filter(reg => reg.id !== deleteId));
      setDeleteId(null);

      // Update local event object to reflect the new count from DB
      const { data: eventUpdate } = await supabase.from('events').select('registration_count').eq('id', id).single();
      if (eventUpdate) setEvent(prev => prev ? { ...prev, registration_count: eventUpdate.registration_count } : null);
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

  const handleDeleteAll = async () => {
    if (!id || profile?.status !== 'approved' || isAdding) return;
    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('event_id', id);
      
      if (error) throw error;
      
      setRegistrations([]);
      setIsDeleteAllModalOpen(false);
      
      // Update local event object count
      const { data: eventUpdate } = await supabase.from('events').select('registration_count').eq('id', id).single();
      if (eventUpdate) setEvent(prev => prev ? { ...prev, registration_count: eventUpdate.registration_count } : null);
      
      setBatchFeedback('Todos os alunos foram removidos.');
      setTimeout(() => setBatchFeedback(null), 3000);
    } catch (error) {
      console.error("Erro ao remover todos:", error);
      alert('Erro ao remover todos os alunos.');
    } finally {
      setIsAdding(false);
    }
  };

  const exportToExcel = () => {
    if (!event || registrations.length === 0) return;
    if (profile?.status !== 'approved') return;
    try {
      const formFields = (event.form_fields as any[]) || [];
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
        
        const formData = reg.form_data || {};
        formFields.forEach(field => {
          const label = field.label.toLowerCase();
          const student = (reg as any).students;
          let value = formData[label] || formData[field.label] || '-';
          
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
      alert("Erro ao exportar para Excel: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const exportToPDF = () => {
    if (!event || registrations.length === 0) return;
    if (profile?.status !== 'approved') return;
    try {
      const pdfDoc = new jsPDF();
      pdfDoc.text(`Lista de Inscritos: ${event.name}`, 14, 15);
      
      const formFields = (event.form_fields as any[]) || [];
      const head = [['Data', ...formFields.map(f => f.label)]];
      const body = registrations.map(reg => {
        let formattedDate = '-';
        try {
          if (reg.timestamp) {
            formattedDate = format(new Date(reg.timestamp), "dd/MM/yyyy");
          }
        } catch (e) {
          console.error("Erro ao formatar data para PDF:", e);
        }

        const formData = reg.form_data || {};
        return [
          formattedDate,
          ...formFields.map(f => {
            const label = f.label.toLowerCase();
            const student = (reg as any).students;
            let value = formData[label] || formData[f.label] || '-';
            
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
      alert("Erro ao exportar para PDF: " + (err instanceof Error ? err.message : String(err)));
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
        
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex flex-wrap items-center gap-3">
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
          </div>

          <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-[1.25rem] border border-slate-800/50">
            <button
              onClick={exportToExcel}
              disabled={profile?.status !== 'approved'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-green-500 hover:bg-green-500 hover:text-white transition-all disabled:opacity-50"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={profile?.status !== 'approved'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
            >
              <FileText size={16} /> PDF
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                fetchStudents();
                setIsBulkModalOpen(true);
              }}
              disabled={profile?.status !== 'approved'}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
            >
              <Plus size={16} /> Colar Lista
            </button>
            <label className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-lg cursor-pointer disabled:opacity-50">
              <Download size={16} /> Importar Excel
              <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportExcel(file);
                }}
                disabled={profile?.status !== 'approved' || isAdding}
              />
            </label>
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              disabled={profile?.status !== 'approved'}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 disabled:opacity-50"
            >
              <Trash2 size={16} /> Limpar Tudo
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
                <h3 className="text-3xl font-black text-white tracking-tight">Adicionar Participante</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 bg-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <ShieldAlert size={20} className="rotate-45" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="relative col-span-12 md:col-span-3">
                  <input
                    type="text"
                    placeholder="Nome..."
                    className="w-full h-14 pl-4 pr-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 transition-all text-xs placeholder:text-slate-500"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                </div>
                <div className="relative col-span-12 sm:col-span-6 md:col-span-2">
                  <select 
                    className="w-full h-14 pl-4 pr-8 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs font-bold outline-none focus:outline-none focus:border-yellow-400 transition-all appearance-none cursor-pointer"
                    value={participantTypeFilter}
                    onChange={(e) => setParticipantTypeFilter(e.target.value)}
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="student">Aluno</option>
                    <option value="collaborator">Colaborador</option>
                    <option value="responsible">Responsável</option>
                    <option value="other">Outro</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                </div>
                <div className="relative col-span-12 sm:col-span-6 md:col-span-3">
                  <select 
                    className="w-full h-14 pl-4 pr-8 bg-slate-950 border border-slate-800 rounded-2xl text-white text-xs font-bold outline-none focus:outline-none focus:border-yellow-400 transition-all appearance-none cursor-pointer truncate"
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                  >
                    <option value="all">Todos os Anos</option>
                    {Array.from(new Set(allStudents.map(s => s.grade))).sort().map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                </div>
                <div className="flex h-14 items-center justify-between bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 col-span-12 md:col-span-4 gap-1.5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex-shrink-0">Turmas:</span>
                  <div className="flex gap-1 items-center overflow-x-auto no-scrollbar">
                    {CLASSES.map(cls => {
                      const isSelected = filterClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setFilterClasses(prev => 
                              prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
                            );
                          }}
                          className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isSelected 
                              ? 'bg-yellow-400 text-black border-yellow-400 shadow-md shadow-yellow-400/10' 
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                  {filterClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterClasses([])}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-700 cursor-pointer flex-shrink-0"
                    >
                      X
                    </button>
                  )}
                </div>
              </div>

              {batchFeedback && (
                <div className={`p-4 border rounded-xl text-[10px] font-black uppercase tracking-widest ${batchFeedback.includes('Erro') ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'} animate-pulse`}>
                  {batchFeedback}
                </div>
              )}

              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Resultados: {allStudents.filter(s => {
                    const ms = `${s.name} ${s.surname}`.toLowerCase().includes(studentSearch.toLowerCase());
                    const mg = filterGrade === 'all' || s.grade === filterGrade;
                    const mc = filterClasses.length === 0 || filterClasses.includes(s.class);
                    const mt = participantTypeFilter === 'all' || s.type === participantTypeFilter;
                    return ms && mg && mc && mt;
                  }).length} pessoas
                </p>
                <button
                  onClick={handleAddBatch}
                  disabled={isAdding}
                  className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-lg shadow-white/5"
                >
                  Adicionar Todos Filtrados
                </button>
              </div>

              <div className="overflow-y-auto max-h-[40vh] space-y-3 custom-scrollbar pr-2">
                {allStudents
                  .filter(s => {
                    const ms = `${s.name} ${s.surname}`.toLowerCase().includes(studentSearch.toLowerCase());
                    const mg = filterGrade === 'all' || s.grade === filterGrade;
                    const mc = filterClasses.length === 0 || filterClasses.includes(s.class);
                    const mt = participantTypeFilter === 'all' || s.type === participantTypeFilter;
                    return ms && mg && mc && mt;
                  })
                  .slice(0, 50)
                  .map(student => {
                    const isRegistered = registrations.some(r => r.student_id === student.id);
                    return (
                      <div key={student.id} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-2xl border border-slate-800 hover:border-yellow-400/30 transition-all">
                        <div>
                          <p className="text-white font-black">{student.name} {student.surname}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            {student.type === 'student' ? `${student.grade}${student.class ? ' • ' + student.class : ''}` : student.type.toUpperCase()}
                          </p>
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

      {/* Bulk Paste Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  {bulkStep === 'input' ? 'Colar Lista' : 'Revisar Participantes'}
                </h2>
                <p className="text-slate-400 font-bold text-sm mt-1">
                  {bulkStep === 'input' 
                    ? 'Cole os nomes (um por linha) para adicionar ao evento.' 
                    : `${bulkResults.length} nomes processados. Verifique abaixo.`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-slate-400 border border-slate-700">
                  {allStudents.length} PESSOAS NO BANCO
                </div>
                <button 
                  onClick={() => {
                    setIsBulkModalOpen(false);
                    setBulkStep('input');
                    setBulkResults([]);
                  }} 
                  className="w-10 h-10 bg-slate-800 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-colors"
                >
                  <ShieldAlert size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              {bulkStep === 'input' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Participantes da Lista</label>
                    <div className="grid grid-cols-4 gap-3">
                      {['student', 'collaborator', 'responsible', 'other'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setBulkParticipantType(type as any)}
                          className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                            bulkParticipantType === type 
                              ? 'bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {type === 'student' ? 'Alunos' : type === 'collaborator' ? 'Colaborad.' : type === 'responsible' ? 'Respons.' : 'Outros'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nomes (um por linha)</label>
                    <textarea
                      className="w-full h-64 px-6 py-6 bg-slate-950 border border-slate-800 rounded-3xl text-white font-bold focus:outline-none focus:border-yellow-400 transition-all resize-none custom-scrollbar"
                      placeholder="Exemplo:&#10;João Silva&#10;Maria Santos&#10;..."
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                  {bulkResults.map((res, idx) => (
                    <div key={idx} className="flex flex-col gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl group hover:border-slate-700 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Nome na Planilha</span>
                          <span className="text-white font-bold">{res.originalName}</span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {res.student ? (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 size={10} /> {reconcileIdx === idx ? 'Selecionado' : 'Encontrado'}
                              </span>
                              <span className="text-slate-300 text-xs font-bold">
                                {res.student.name} {res.student.surname} ({res.student.type.toUpperCase()}{res.student.grade !== 'N/A' ? ` - ${res.student.grade}` : ''})
                              </span>
                              {reconcileIdx === idx && (
                                <button 
                                  onClick={() => setReconcileIdx(null)}
                                  className="text-[10px] text-yellow-400 font-bold hover:underline mt-1"
                                >
                                  Mudar Pessoa
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReconcileIdx(idx);
                                setReconcileQuery(res.originalName);
                                handleReconcileSearch(res.originalName);
                              }}
                              className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                            >
                              Não Encontrado (Clique p/ Buscar)
                            </button>
                          )}
                        </div>
                      </div>

                      {reconcileIdx === idx && (
                        <div className="mt-2 p-4 bg-slate-900 rounded-xl border border-yellow-400/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                            <Users size={16} className="text-yellow-400" />
                            <input 
                              type="text"
                              autoFocus
                              placeholder="Filtrar lista de alunos..."
                              className="bg-transparent text-white text-sm font-bold w-full focus:outline-none"
                              value={reconcileQuery}
                              onChange={(e) => {
                                setReconcileQuery(e.target.value);
                                handleReconcileSearch(e.target.value);
                              }}
                            />
                          </div>
                          
                          {reconcileResults.length === 0 && reconcileQuery && (
                            <div className="py-10 text-center">
                              <p className="text-slate-500 font-bold mb-4">Nenhuma pessoa encontrada para "{reconcileQuery}".</p>
                              <button
                                onClick={async () => {
                                  const fullName = bulkResults[reconcileIdx!].originalName;
                                  const parts = fullName.split(' ');
                                  const name = parts[0];
                                  const surname = parts.slice(1).join(' ');
                                  
                                  const { data, error } = await supabase
                                    .from('students')
                                    .insert({
                                      name,
                                      surname,
                                      type: bulkParticipantType,
                                      grade: 'N/A',
                                      class: 'N/A'
                                    })
                                    .select()
                                    .single();
                                  
                                  if (data) {
                                    const newResults = [...bulkResults];
                                    newResults[reconcileIdx!] = { ...newResults[reconcileIdx!], student: data };
                                    setBulkResults(newResults);
                                    setReconcileIdx(null);
                                    fetchStudents(); // Refresh global list
                                  }
                                }}
                                className="px-6 py-3 bg-yellow-400 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/10"
                              >
                                Cadastrar como Novo ({bulkParticipantType === 'student' ? 'Aluno' : bulkParticipantType === 'collaborator' ? 'Colaborador' : bulkParticipantType === 'responsible' ? 'Responsável' : 'Outro'})
                              </button>
                            </div>
                          )}
                          
                          <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {reconcileResults.length > 0 ? (
                              reconcileResults.map((student) => (
                                <button
                                  key={student.id}
                                  onClick={() => {
                                    const newResults = [...bulkResults];
                                    newResults[idx].student = student;
                                    setBulkResults(newResults);
                                    setReconcileIdx(null);
                                    setReconcileResults([]);
                                  }}
                                  className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-yellow-400 transition-colors text-left"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-white text-xs font-bold">{student.name} {student.surname}</span>
                                    <span className="text-slate-500 text-[10px] font-black uppercase">{student.grade} - {student.class}</span>
                                  </div>
                                  <Plus size={14} className="text-yellow-400" />
                                </button>
                              ))
                            ) : (
                              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest p-4 text-center">
                                {reconcileQuery.length === 0 ? 'Carregando lista...' : 'Nenhum aluno encontrado.'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {batchFeedback && (
                <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                  batchFeedback.includes('sucesso') ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {batchFeedback}
                </div>
              )}

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    if (bulkStep === 'review') {
                      setBulkStep('input');
                    } else {
                      setIsBulkModalOpen(false);
                    }
                  }}
                  className="px-8 py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-white transition-colors"
                >
                  {bulkStep === 'review' ? 'Voltar' : 'Cancelar'}
                </button>
                
                {bulkStep === 'input' ? (
                  <button
                    onClick={handleReviewBulkPaste}
                    disabled={isAdding || !bulkText.trim()}
                    className="px-12 py-4 bg-yellow-400 text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-50"
                  >
                    Analisar Lista
                  </button>
                ) : (
                  <button
                    onClick={handleFinalizeBulk}
                    disabled={isAdding || !bulkResults.some(r => r.student !== null)}
                    className="px-12 py-4 bg-green-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-green-400 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                  >
                    Confirmar Inscrições
                  </button>
                )}
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
      {/* Delete All Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-800 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto border border-red-500/10">
              <Trash2 size={40} />
            </div>
            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Limpar Evento</h3>
            <p className="text-slate-400 mb-10 font-bold text-lg leading-relaxed">
              Deseja remover TODOS os alunos deste evento? Esta ação não pode ser desfeita.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsDeleteAllModalOpen(false)}
                className="py-4 bg-slate-800 text-slate-300 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={isAdding}
                className="py-4 bg-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
              >
                {isAdding ? 'Limpando...' : 'Limpar Tudo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
