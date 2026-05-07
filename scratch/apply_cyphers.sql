-- Update student names
UPDATE students SET name = 'Eduardo', surname = 'Cambuy Gonçalves' WHERE id = 'eede7d52-e612-4962-adbe-3b38a0920aca';
UPDATE students SET name = 'Gustavo', surname = 'Lopes dos Santos' WHERE id = '05e20c1b-cf95-4381-8d48-8be52b240bdd';
UPDATE students SET name = 'Juliana', surname = 'Valente de Oliveira e Silva' WHERE id = 'c0c135c4-840a-4da9-9ba8-8ff044119661';
UPDATE students SET name = 'Maria', surname = 'Luísa Stenzinger Mendes' WHERE id = '25b3256a-1f93-4e88-b31c-8ca4da594203';
UPDATE students SET name = 'Yasmin', surname = 'Schneider do Nascimento' WHERE id = '0e1f91df-a01b-4ead-a453-3f8eec2f721b';
UPDATE students SET name = 'Valentina', surname = 'lanzen de oliveira Carneiro' WHERE id = '1abc74da-37a4-488f-9dd4-51c55be0fc87';
UPDATE students SET name = 'Enzo', surname = 'Ravagni Dias' WHERE id = '7445c6f7-8606-4432-950e-d01554b91b38';
UPDATE students SET name = 'Sofia', surname = 'Buchak Miranda' WHERE id = '529f5f07-6435-463a-bc52-b0008f88b8f3';
UPDATE students SET name = 'Gabriel', surname = 'Camargo Alves' WHERE id = '503a70fb-910e-457f-bd6d-94b070183115';
UPDATE students SET name = 'Bernardo', surname = 'Engel de Souza' WHERE id = '4f858d07-5cb2-4bae-9d52-dea75a5b7ea4';
UPDATE students SET name = 'Isabel', surname = 'Atem Miranda' WHERE id = '074a6df0-1fb8-4515-80bb-b40118654ce7';

-- Register for Cyphers
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', 'eede7d52-e612-4962-adbe-3b38a0920aca', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '05e20c1b-cf95-4381-8d48-8be52b240bdd', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', 'c0c135c4-840a-4da9-9ba8-8ff044119661', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '25b3256a-1f93-4e88-b31c-8ca4da594203', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '0e1f91df-a01b-4ead-a453-3f8eec2f721b', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '1abc74da-37a4-488f-9dd4-51c55be0fc87', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '7445c6f7-8606-4432-950e-d01554b91b38', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '529f5f07-6435-463a-bc52-b0008f88b8f3', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '503a70fb-910e-457f-bd6d-94b070183115', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '4f858d07-5cb2-4bae-9d52-dea75a5b7ea4', 'approved');
INSERT INTO registrations (event_id, student_id, status) VALUES ('d8b87e8b-2e6d-4a43-8a3c-a7f57df221f6', '074a6df0-1fb8-4515-80bb-b40118654ce7', 'approved');

-- Update registration count
UPDATE events SET registration_count = (SELECT COUNT(*) FROM registrations WHERE event_id = 'd8b87e8b-2e6d-4a43-8a3c-a7f57df221f6') WHERE id = 'd8b87e8b-2e6d-4a43-8a3c-a7f57df221f6';
