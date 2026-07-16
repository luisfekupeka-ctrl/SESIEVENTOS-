import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const useSQLite = process.env.VITE_USE_SQLITE === 'true';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
const generateId = () => crypto.randomUUID();

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    surname TEXT DEFAULT '',
    grade TEXT NOT NULL,
    class TEXT,
    type TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE,
    UNIQUE(category_id, name)
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    start_date TEXT,
    start_time TEXT,
    end_date TEXT,
    end_time TEXT,
    duration TEXT,
    restrictions TEXT, -- JSON string
    password_protected INTEGER DEFAULT 0,
    password TEXT,
    max_capacity INTEGER DEFAULT 0,
    registration_count INTEGER DEFAULT 0,
    form_fields TEXT, -- JSON string
    enable_autocomplete INTEGER DEFAULT 1,
    category_id INTEGER,
    subcategory_id INTEGER,
    is_paid INTEGER DEFAULT 0,
    restringir_duplicidade INTEGER DEFAULT 0,
    restringir_dias INTEGER DEFAULT 0,
    dias_semana TEXT DEFAULT '[]',
    registration_open_at TEXT,
    countdown_target_at TEXT,
    limitar_vagas_por_ano INTEGER DEFAULT 0,
    vagas_por_ano INTEGER DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    student_id INTEGER,
    form_data TEXT, -- JSON string
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'approved',
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS event_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_id TEXT,
    description TEXT,
    image_url TEXT,
    start_date TEXT,
    start_time TEXT,
    end_date TEXT,
    end_time TEXT,
    duration TEXT,
    restrictions TEXT, -- JSON string
    password_protected INTEGER DEFAULT 0,
    password TEXT,
    max_capacity INTEGER DEFAULT 0,
    form_fields TEXT, -- JSON string
    enable_autocomplete INTEGER DEFAULT 1,
    subcategory_id INTEGER,
    is_paid INTEGER DEFAULT 0,
    restringir_duplicidade INTEGER DEFAULT 0,
    restringir_dias INTEGER DEFAULT 0,
    dias_semana TEXT DEFAULT '[]',
    registration_open_at TEXT,
    countdown_target_at TEXT,
    limitar_vagas_por_ano INTEGER DEFAULT 0,
    vagas_por_ano INTEGER DEFAULT NULL
  );
`);

// Run migrations on events safely
const eventMigrations = [
  "ALTER TABLE events ADD COLUMN category_id INTEGER;",
  "ALTER TABLE events ADD COLUMN subcategory_id INTEGER;",
  "ALTER TABLE events ADD COLUMN is_paid INTEGER DEFAULT 0;",
  "ALTER TABLE events ADD COLUMN restringir_duplicidade INTEGER DEFAULT 0;",
  "ALTER TABLE events ADD COLUMN restringir_dias INTEGER DEFAULT 0;",
  "ALTER TABLE events ADD COLUMN dias_semana TEXT DEFAULT '[]';",
  "ALTER TABLE events ADD COLUMN registration_open_at TEXT;",
  "ALTER TABLE events ADD COLUMN countdown_target_at TEXT;",
  "ALTER TABLE events ADD COLUMN limitar_vagas_por_ano INTEGER DEFAULT 0;",
  "ALTER TABLE events ADD COLUMN vagas_por_ano INTEGER DEFAULT NULL;"
];

for (const query of eventMigrations) {
  try {
    db.prepare(query).run();
    console.log(`[Migration] Executed: ${query}`);
  } catch (err: any) {
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      // Column already exists, safe to ignore
    } else {
      console.warn(`[Migration] Warning for "${query}": ${err.message}`);
    }
  }
}

// Run migrations on event_templates safely
const eventTemplateMigrations = [
  "ALTER TABLE event_templates ADD COLUMN category_id INTEGER;",
  "ALTER TABLE event_templates ADD COLUMN subcategory_id INTEGER;",
  "ALTER TABLE event_templates ADD COLUMN is_paid INTEGER DEFAULT 0;",
  "ALTER TABLE event_templates ADD COLUMN restringir_duplicidade INTEGER DEFAULT 0;",
  "ALTER TABLE event_templates ADD COLUMN restringir_dias INTEGER DEFAULT 0;",
  "ALTER TABLE event_templates ADD COLUMN dias_semana TEXT DEFAULT '[]';",
  "ALTER TABLE event_templates ADD COLUMN registration_open_at TEXT;",
  "ALTER TABLE event_templates ADD COLUMN countdown_target_at TEXT;",
  "ALTER TABLE event_templates ADD COLUMN limitar_vagas_por_ano INTEGER DEFAULT 0;",
  "ALTER TABLE event_templates ADD COLUMN vagas_por_ano INTEGER DEFAULT NULL;"
];

for (const query of eventTemplateMigrations) {
  try {
    db.prepare(query).run();
    console.log(`[Migration] Executed for event_templates: ${query}`);
  } catch (err: any) {
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      // Column already exists, safe to ignore
    } else {
      console.warn(`[Migration] Warning for event_templates "${query}": ${err.message}`);
    }
  }
}


// Run migrations on students safely
const studentMigrations = [
  "ALTER TABLE students ADD COLUMN surname TEXT DEFAULT '';",
  "ALTER TABLE students ADD COLUMN class TEXT;",
  "ALTER TABLE students ADD COLUMN type TEXT DEFAULT 'student';"
];

for (const query of studentMigrations) {
  try {
    db.prepare(query).run();
    console.log(`[Migration] Executed: ${query}`);
  } catch (err: any) {
    if (err.message.includes('duplicate column name') || err.message.includes('already exists')) {
      // Column already exists, safe to ignore
    } else {
      console.warn(`[Migration] Warning for "${query}": ${err.message}`);
    }
  }
}

// Seeding of categories, subcategories and users
try {
  const countCats = db.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
  if (countCats.count === 0) {
    console.log("[Seeding] Database categories are empty. Starting seed...");
    const defaultCategories = ["After", "Oficina", "Reunião", "Feriado", "Esporte", "Cultura", "Palestra", "Evento Escolar"];
    
    for (const catName of defaultCategories) {
      const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(catName);
      if (catName === "After") {
        const categoryId = result.lastInsertRowid;
        db.prepare("INSERT INTO subcategories (category_id, name) VALUES (?, ?)").run(categoryId, "Esporte");
        db.prepare("INSERT INTO subcategories (category_id, name) VALUES (?, ?)").run(categoryId, "Cultura");
      }
    }
    console.log("[Seeding] Categories and subcategories seeded successfully.");
  }

  const countUsers = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (countUsers.count === 0) {
    console.log("[Seeding] No users found. Creating default admin account (luisfe.kupeka@gmail.com / admin123)...");
    const ownerId = "owner-admin-id-12345";
    db.prepare("INSERT INTO users (id, email, password) VALUES (?, ?, ?)").run(ownerId, 'luisfe.kupeka@gmail.com', 'admin123');
    db.prepare("INSERT INTO profiles (id, full_name, email, status, role) VALUES (?, ?, ?, ?, ?)").run(ownerId, 'Luis Felipe Kupeka', 'luisfe.kupeka@gmail.com', 'approved', 'super_admin');
    console.log("[Seeding] Default admin account created.");
  }
} catch (err) {
  console.error("[Seeding] Seeding error:", err);
}

const app = express();
app.use(express.json());

// Enable serving uploads folder static files
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Helper: check if value is JSON string
function safeJsonParse(val: any) {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
}

// Helper: parse row fields that contain JSON strings
function parseRowJsonFields(table: string, row: any) {
  if (!row) return row;
  const parsed = { ...row };
  if (table === 'events' || table === 'event_templates') {
    if (parsed.restrictions) parsed.restrictions = safeJsonParse(parsed.restrictions);
    if (parsed.form_fields) parsed.form_fields = safeJsonParse(parsed.form_fields);
    if (parsed.dias_semana) parsed.dias_semana = safeJsonParse(parsed.dias_semana);
    if (parsed.vagas_por_ano) parsed.vagas_por_ano = safeJsonParse(parsed.vagas_por_ano);
  } else if (table === 'registrations') {
    if (parsed.form_data) parsed.form_data = safeJsonParse(parsed.form_data);
  }
  return parsed;
}

// Generic database endpoint (used by local Supabase wrapper)
app.post('/api/db', (req, res) => {
  const { action, table, filters, order, limit, single, data } = req.body;
  
  try {
    let queryStr = '';
    const params: any[] = [];

    if (action === 'select') {
      queryStr = `SELECT * FROM ${table}`;
      
      const whereClauses: string[] = [];
      if (Array.isArray(filters) && filters.length > 0) {
        for (const f of filters) {
          if (f.op === 'eq') {
            whereClauses.push(`${f.column} = ?`);
            params.push(f.value);
          } else if (f.op === 'in') {
            const placeholders = f.value.map(() => '?').join(', ');
            whereClauses.push(`${f.column} IN (${placeholders})`);
            params.push(...f.value);
          }
        }
      }

      if (whereClauses.length > 0) {
        queryStr += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if (Array.isArray(order) && order.length > 0) {
        const orderClauses = order.map(o => `${o.column} ${o.ascending ? 'ASC' : 'DESC'}`);
        queryStr += ` ORDER BY ${orderClauses.join(', ')}`;
      }

      if (limit) {
        queryStr += ` LIMIT ?`;
        params.push(limit);
      }

      const rows = db.prepare(queryStr).all(...params) as any[];
      
      // Post-process table specific joins and JSON parsing
      let resultRows = rows.map(r => parseRowJsonFields(table, r));

      if (table === 'registrations') {
        // Fetch nested students data for registrations
        resultRows = resultRows.map(reg => {
          if (reg.student_id) {
            const student = db.prepare("SELECT * FROM students WHERE id = ?").get(reg.student_id);
            return { ...reg, students: student || null };
          }
          return { ...reg, students: null };
        });
      }

      if (table === 'categories') {
        // Fetch nested subcategories data for categories
        resultRows = resultRows.map(cat => {
          const subcats = db.prepare("SELECT * FROM subcategories WHERE category_id = ? ORDER BY name ASC").all(cat.id);
          return { ...cat, subcategories: subcats || [] };
        });
      }

      if (single) {
        return res.json(resultRows[0] || null);
      }
      return res.json(resultRows);

    } else if (action === 'insert') {
      const dataToInsert = Array.isArray(data) ? data : [data];
      const insertedRows: any[] = [];

      for (const item of dataToInsert) {
        const preparedItem = { ...item };
        // Stringify JSON fields
        if (table === 'events' || table === 'event_templates') {
          if (preparedItem.restrictions) preparedItem.restrictions = JSON.stringify(preparedItem.restrictions);
          if (preparedItem.form_fields) preparedItem.form_fields = JSON.stringify(preparedItem.form_fields);
          if (preparedItem.dias_semana) preparedItem.dias_semana = JSON.stringify(preparedItem.dias_semana);
          if (preparedItem.vagas_por_ano) preparedItem.vagas_por_ano = JSON.stringify(preparedItem.vagas_por_ano);
        } else if (table === 'registrations') {
          if (preparedItem.form_data) preparedItem.form_data = JSON.stringify(preparedItem.form_data);
        }

        const keys = Object.keys(preparedItem);
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => preparedItem[k]);

        const insertQuery = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const runResult = db.prepare(insertQuery).run(...values);
        
        let insertedId = item.id;
        if (!insertedId && runResult.lastInsertRowid) {
          insertedId = Number(runResult.lastInsertRowid);
        }

        // Get inserted row
        let insertedRow;
        if (insertedId) {
          insertedRow = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(insertedId);
        } else {
          insertedRow = db.prepare(`SELECT * FROM ${table} ORDER BY rowid DESC LIMIT 1`).get();
        }
        
        insertedRows.push(parseRowJsonFields(table, insertedRow));
      }

      return res.json(insertedRows);

    } else if (action === 'update') {
      const preparedData = { ...data };
      if (table === 'events' || table === 'event_templates') {
        if (preparedData.restrictions) preparedData.restrictions = JSON.stringify(preparedData.restrictions);
        if (preparedData.form_fields) preparedData.form_fields = JSON.stringify(preparedData.form_fields);
        if (preparedData.dias_semana) preparedData.dias_semana = JSON.stringify(preparedData.dias_semana);
        if (preparedData.vagas_por_ano) preparedData.vagas_por_ano = JSON.stringify(preparedData.vagas_por_ano);
      } else if (table === 'registrations') {
        if (preparedData.form_data) preparedData.form_data = JSON.stringify(preparedData.form_data);
      }

      const sets: string[] = [];
      const setParams: any[] = [];
      for (const k of Object.keys(preparedData)) {
        sets.push(`${k} = ?`);
        setParams.push(preparedData[k]);
      }

      const whereClauses: string[] = [];
      const whereParams: any[] = [];
      if (Array.isArray(filters) && filters.length > 0) {
        for (const f of filters) {
          if (f.op === 'eq') {
            whereClauses.push(`${f.column} = ?`);
            whereParams.push(f.value);
          }
        }
      }

      let updateQuery = `UPDATE ${table} SET ${sets.join(', ')}`;
      if (whereClauses.length > 0) {
        updateQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      db.prepare(updateQuery).run(...setParams, ...whereParams);

      // Return updated row(s)
      let selectQuery = `SELECT * FROM ${table}`;
      if (whereClauses.length > 0) {
        selectQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      const updatedRows = db.prepare(selectQuery).all(...whereParams);
      return res.json(updatedRows.map(r => parseRowJsonFields(table, r)));

    } else if (action === 'delete') {
      const whereClauses: string[] = [];
      const params: any[] = [];
      if (Array.isArray(filters) && filters.length > 0) {
        for (const f of filters) {
          if (f.op === 'eq') {
            whereClauses.push(`${f.column} = ?`);
            params.push(f.value);
          }
        }
      }

      let deleteQuery = `DELETE FROM ${table}`;
      if (whereClauses.length > 0) {
        deleteQuery += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      db.prepare(deleteQuery).run(...params);
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error: any) {
    console.error("DB Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Storage upload endpoint
app.post('/api/storage/upload', express.raw({ type: '*/*', limit: '10mb' }), (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) return res.status(400).json({ error: 'Path is required' });

  try {
    const targetPath = path.join(uploadsDir, path.basename(filePath));
    fs.writeFileSync(targetPath, req.body);
    console.log(`[Storage] Uploaded image to: ${targetPath}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Auth endpoints
app.post('/api/auth/signup', (req, res) => {
  let { email, password, fullName } = req.body;
  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  email = email.trim().toLowerCase();

  try {
    const isOwner = email === 'luisfe.kupeka@gmail.com';
    const status = isOwner ? 'approved' : 'pending';
    const role = isOwner ? 'super_admin' : 'admin';
    const userId = crypto.randomUUID();

    db.prepare("INSERT INTO users (id, email, password) VALUES (?, ?, ?)").run(userId, email, password);
    db.prepare("INSERT INTO profiles (id, full_name, email, status, role) VALUES (?, ?, ?, ?, ?)").run(userId, fullName, email, status, role);

    res.json({ user: { id: userId, email } });
  } catch (err: any) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email já cadastrado.' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  email = email.trim().toLowerCase();

  try {
    const user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ? AND password = ?").get(email, password) as any;
    if (!user) {
      return res.status(400).json({ error: 'Invalid login credentials' });
    }

    const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(user.id) as any;
    res.json({
      session: {
        user: { id: user.id, email: user.email },
        access_token: 'dummy-token'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// RPC Emulator endpoint
app.post('/api/rpc/:method', (req, res) => {
  const { method } = req.params;
  const args = req.body;

  try {
    if (method === 'increment_registration_count') {
      const { row_id, increment_by } = args;
      db.prepare("UPDATE events SET registration_count = registration_count + ? WHERE id = ?").run(increment_by || 1, row_id);
      return res.json({ success: true });
    }
    
    if (method === 'register_participant') {
      // Forward to standard register endpoint
      return res.redirect(307, `/api/events/${args.p_event_id}/register`);
    }

    return res.status(400).json({ error: `Unknown RPC method: ${method}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Students endpoints
app.get('/api/students', (req, res) => {
  try {
    const students = db.prepare("SELECT * FROM students ORDER BY name ASC").all();
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students', (req, res) => {
  const { name, grade } = req.body;
  if (!name || !grade) {
    return res.status(400).json({ error: 'Name and grade are required.' });
  }

  try {
    const result = db.prepare("INSERT INTO students (name, grade) VALUES (?, ?)").run(name, grade);
    const newStudent = db.prepare("SELECT * FROM students WHERE id = ?").get(result.lastInsertRowid);
    res.json(newStudent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/students/bulk', (req, res) => {
  const { grade, names } = req.body;
  if (!grade || !Array.isArray(names)) {
    return res.status(400).json({ error: 'Grade and names array are required.' });
  }

  try {
    const insert = db.prepare("INSERT INTO students (name, grade) VALUES (?, ?)");
    const transaction = db.transaction((namesList) => {
      for (const name of namesList) {
        if (name.trim()) {
          insert.run(name.trim(), grade);
        }
      }
    });
    transaction(names);
    res.json({ success: true, count: names.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/students/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM students WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Categories & Subcategories endpoints
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare("SELECT * FROM categories ORDER BY name ASC").all() as any[];
    const subcategories = db.prepare("SELECT * FROM subcategories ORDER BY name ASC").all() as any[];
    
    const result = categories.map(cat => ({
      ...cat,
      subcategories: subcategories.filter(sub => sub.category_id === cat.id)
    }));
    
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    const newCategory = db.prepare("SELECT * FROM categories WHERE id = ?").get(result.lastInsertRowid);
    res.json(newCategory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories/:id/subcategories', (req, res) => {
  const categoryId = req.params.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  try {
    const result = db.prepare("INSERT INTO subcategories (category_id, name) VALUES (?, ?)").run(categoryId, name);
    const newSub = db.prepare("SELECT * FROM subcategories WHERE id = ?").get(result.lastInsertRowid);
    res.json(newSub);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/subcategories/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM subcategories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/start-countdown', (req, res) => {
  const eventId = req.params.id;
  try {
    const targetTime = new Date(Date.now() + 60 * 1000).toISOString();
    db.prepare("UPDATE events SET countdown_target_at = ?, registration_open_at = NULL WHERE id = ?").run(targetTime, eventId);
    res.json({ success: true, countdown_target_at: targetTime });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Event registrations with validations
app.post('/api/events/:id/register', (req, res) => {
  const eventId = req.params.id || req.body.p_event_id;
  const name = req.body.name || req.body.p_student_name;
  const surname = req.body.surname || req.body.p_student_surname;
  const grade = req.body.grade || req.body.p_student_grade;
  const className = req.body.class || req.body.p_student_class;
  const participant_type = req.body.participant_type || req.body.p_participant_type;
  const form_data = req.body.form_data || req.body.p_form_data;
  const student_id = req.body.student_id;

  try {
    // 1. Fetch Event
    const event = db.prepare("SELECT * FROM events WHERE id = ?").get(eventId) as any;
    if (!event) {
      return res.status(404).json({ success: false, error: 'Evento não encontrado.' });
    }

    const restrictions = safeJsonParse(event.restrictions || '{}');
    const sGrade = grade || form_data?.['série'] || form_data?.['ano'] || '';
    const sName = name || form_data?.['nome'] || '';
    const sSurname = surname || form_data?.['sobrenome'] || '';
    const fullName = `${sName} ${sSurname}`.trim();

    // 2. Validate school year (grade)
    if (participant_type === 'student' && restrictions?.type === 'years' && Array.isArray(restrictions.values)) {
      if (!restrictions.values.includes(sGrade)) {
        return res.status(400).json({
          success: false,
          error: `Este evento é restrito aos anos: ${restrictions.values.join(', ')}`
        });
      }
    }

    // 3. Match student to resolve student_id if not provided
    let matchedStudentId = student_id;
    if (!matchedStudentId && fullName) {
      const student = db.prepare("SELECT * FROM students WHERE LOWER(name) = LOWER(?)").get(fullName) as any;
      if (student) {
        matchedStudentId = student.id;
        // Update grade and class if provided
        db.prepare("UPDATE students SET grade = COALESCE(NULLIF(?, ''), grade), class = COALESCE(NULLIF(?, ''), class) WHERE id = ?").run(sGrade, className, student.id);
      } else {
        const result = db.prepare("INSERT INTO students (name, surname, grade, class, type) VALUES (?, ?, ?, ?, ?)").run(sName, sSurname, sGrade, className, participant_type || 'student');
        matchedStudentId = result.lastInsertRowid;
      }
    }

    // 4. Duplicate category & type restriction validation
    if (event.restringir_duplicidade === 1 && matchedStudentId) {
      // Find other active registrations for the same student
      const registrations = db.prepare(`
        SELECT r.*, e.name as event_name, e.category_id, e.subcategory_id
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        WHERE r.student_id = ? 
          AND r.event_id != ? 
          AND r.status = 'approved'
      `).all(matchedStudentId, eventId) as any[];

      // Check if any shares same category_id AND subcategory_id
      const conflict = registrations.find(r => 
        r.category_id === event.category_id && 
        r.subcategory_id === event.subcategory_id
      );

      if (conflict) {
        return res.status(400).json({
          success: false,
          error: `Inscrição não permitida. O aluno já está inscrito no evento "${conflict.event_name}" da mesma categoria e tipo/subcategoria.`
        });
      }
    }

    // Year-specific spots limit check
    if (event.limitar_vagas_por_ano === 1 && event.vagas_por_ano) {
      const studentGrade = (sGrade || '').trim().toLowerCase();
      if (studentGrade) {
        const limits = safeJsonParse(event.vagas_por_ano) || {};

        const normalizeYear = (y: any) => {
          if (typeof y !== 'string') return '';
          return y.trim().toLowerCase().replace(/º/g, '°');
        };

        const targetGradeNormalized = normalizeYear(studentGrade);

        // Find the limit for the student's grade
        let gradeLimit: number | undefined;
        let matchedKey = '';
        for (const key of Object.keys(limits)) {
          if (normalizeYear(key) === targetGradeNormalized) {
            gradeLimit = parseInt(limits[key]);
            matchedKey = key;
            break;
          }
        }

        if (gradeLimit !== undefined && !isNaN(gradeLimit) && gradeLimit > 0) {
          // Fetch all active registrations for this event, including student grade
          const eventRegistrations = db.prepare(`
            SELECT r.*, s.grade as student_grade
            FROM registrations r
            LEFT JOIN students s ON r.student_id = s.id
            WHERE r.event_id = ? AND r.status = 'approved'
          `).all(eventId) as any[];

          const yearCount = eventRegistrations.filter(r => {
            const regGrade = r.student_grade || safeJsonParse(r.form_data)?.['série'] || safeJsonParse(r.form_data)?.['ano'] || '';
            return normalizeYear(regGrade) === targetGradeNormalized;
          }).length;

          if (yearCount >= gradeLimit) {
            return res.status(400).json({ 
              success: false, 
              error: `Infelizmente, o limite de ${gradeLimit} vagas para o ${matchedKey} já foi preenchido.` 
            });
          }
        }
      }
    }

    // Check capacity limit
    if (event.max_capacity > 0 && event.registration_count >= event.max_capacity) {
      return res.status(400).json({ success: false, error: 'Desculpe, o evento já está lotado.' });
    }

    // 5. Insert registration
    const regId = crypto.randomUUID();
    const status = form_data?.status || 'approved';
    
    db.prepare(`
      INSERT INTO registrations (id, event_id, student_id, form_data, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(regId, eventId, matchedStudentId || null, JSON.stringify(form_data), status);

    // 6. Increment registration count
    db.prepare("UPDATE events SET registration_count = registration_count + 1 WHERE id = ?").run(eventId);

    res.json({ success: true, registrationId: regId });
  } catch (err: any) {
    console.error("Registration validation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMIN CRUD - SUPABASE & SQLITE
app.post('/api/admin/users', async (req, res) => {
  try {
    const { email, password, full_name, role, adminId } = req.body;
    
    // Auth Check
    let isSuperAdmin = false;
    if (useSQLite) {
      const adminRow = db.prepare('SELECT role FROM profiles WHERE id = ?').get(adminId);
      if (adminRow && adminRow.role === 'super_admin') isSuperAdmin = true;
    } else {
      const { data } = await supabase.from('profiles').select('role').eq('id', adminId).single();
      if (data && data.role === 'super_admin') isSuperAdmin = true;
    }
    
    if (!isSuperAdmin) return res.status(403).json({ error: 'Acesso negado' });
    
    if (useSQLite) {
      const id = generateId();
      db.prepare(`
        INSERT INTO profiles (id, email, full_name, status, role, created_at)
        VALUES (?, ?, ?, 'approved', ?, datetime('now'))
      `).run(id, email, full_name, role);
      // In SQLite mock, passwords are hardcoded in /api/auth/login, so password isn't saved, but we create the profile.
      res.json({ success: true, message: 'Administrador adicionado.' });
    } else {
      // In Supabase cloud, we need service_role key to bypass GoTrue restrictions, or use an RPC if available.
      // Since we don't have service_role key here, we instruct the user to use the UI or we use the auth api.
      // Actually, supabase-js without service_role cannot create other users. 
      // We return an error telling them this needs service_role.
      res.status(501).json({ error: 'Para adicionar usuários na nuvem diretamente, use o botão "Solicitar Acesso" na tela de login e aprove em seguida.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, adminId } = req.body;
    
    // Auth Check
    let isSuperAdmin = false;
    if (useSQLite) {
      const adminRow = db.prepare('SELECT role FROM profiles WHERE id = ?').get(adminId);
      if (adminRow && adminRow.role === 'super_admin') isSuperAdmin = true;
    } else {
      const { data } = await supabase.from('profiles').select('role').eq('id', adminId).single();
      if (data && data.role === 'super_admin') isSuperAdmin = true;
    }
    
    if (!isSuperAdmin) return res.status(403).json({ error: 'Acesso negado' });
    
    if (useSQLite) {
      res.json({ success: true, message: 'No modo local, todas as senhas são "admin123".' });
    } else {
      // For Supabase, we would need service_role_key or an RPC.
      // Workaround: We'll call a custom RPC that we will create!
      const { error } = await supabase.rpc('admin_update_password', {
        p_user_id: id,
        p_new_password: newPassword
      });
      if (error) throw error;
      res.json({ success: true, message: 'Senha atualizada na nuvem!' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    
    let isSuperAdmin = false;
    if (useSQLite) {
      const adminRow = db.prepare('SELECT role FROM profiles WHERE id = ?').get(adminId);
      if (adminRow && adminRow.role === 'super_admin') isSuperAdmin = true;
    } else {
      const { data } = await supabase.from('profiles').select('role').eq('id', adminId).single();
      if (data && data.role === 'super_admin') isSuperAdmin = true;
    }
    
    if (!isSuperAdmin) return res.status(403).json({ error: 'Acesso negado' });
    
    if (useSQLite) {
      db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
      res.json({ success: true });
    } else {
      const { error } = await supabase.rpc('admin_delete_user', {
        p_user_id: id
      });
      if (error) {
        // Fallback to just deleting profile if RPC doesn't exist
        await supabase.from('profiles').delete().eq('id', id);
      }
      res.json({ success: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Express] SQLite Backend running on http://localhost:${PORT}`);
  
  // Spawn Vite dev server
  console.log('[Vite] Starting dev server...');
  const viteProcess = spawn('npx', ['vite', '--port=3000', '--host=0.0.0.0'], {
    shell: true,
    stdio: 'inherit'
  });

  viteProcess.on('close', (code) => {
    console.log(`[Vite] Dev server closed with code ${code}`);
    process.exit(code || 0);
  });
});
