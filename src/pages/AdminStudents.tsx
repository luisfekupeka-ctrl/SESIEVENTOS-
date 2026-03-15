import React from 'react';
import { AdminParticipantsList } from '../components/AdminParticipantsList';

export default function AdminStudents() {
  return (
    <AdminParticipantsList 
      type="student"
      title="Gestão de Alunos"
      description="Gerencie o cadastro de todos os alunos da instituição."
      labelSingular="Aluno"
    />
  );
}
