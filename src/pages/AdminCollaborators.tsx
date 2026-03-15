import React from 'react';
import { AdminParticipantsList } from '../components/AdminParticipantsList';

export default function AdminCollaborators() {
  return (
    <AdminParticipantsList 
      type="collaborator"
      title="Gestão de Colaboradores"
      description="Gerencie o cadastro de professores e funcionários."
      labelSingular="Colaborador"
    />
  );
}
