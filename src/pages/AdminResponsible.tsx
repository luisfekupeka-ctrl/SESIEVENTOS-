import React from 'react';
import { AdminParticipantsList } from '../components/AdminParticipantsList';

export default function AdminResponsible() {
  return (
    <AdminParticipantsList 
      type="responsible"
      title="Gestão de Responsáveis"
      description="Gerencie o cadastro de pais e responsáveis pelos alunos."
      labelSingular="Responsável"
    />
  );
}
