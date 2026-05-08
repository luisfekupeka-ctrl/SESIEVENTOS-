import json
import os
import difflib
import uuid

# Paths
BRAIN_SCRATCH = r'C:\Users\luisk\.gemini\antigravity\brain\9121c448-eac4-4462-b3c1-a2ceae4ca4f9\scratch'
WORK_SCRATCH = r'c:\Users\luisk\Downloads\sesi-eventos\scratch'

EVENT_ID = '55a69279-8da9-48ef-a6d8-e073ddb830c7'
TARGET_GRADE = '8º Ano EF'

def normalize(name):
    if not name: return ""
    return " ".join(name.strip().lower().split())

def main():
    with open(os.path.join(BRAIN_SCRATCH, 'students_dump.json'), 'r', encoding='utf-8') as f:
        db_students = json.load(f)
    
    with open(os.path.join(WORK_SCRATCH, 'invisible_names.txt'), 'r', encoding='utf-8') as f:
        target_names = [line.strip() for line in f if line.strip()]
    
    db_by_name = {}
    for s in db_students:
        full_name = normalize(f"{s['name']} {s.get('surname', '')}")
        if full_name not in db_by_name:
            db_by_name[full_name] = s
            
    matches = {} 
    missing = []
    
    all_db_names = list(db_by_name.keys())
    
    for full_target_name in target_names:
        norm_target = normalize(full_target_name)
        if norm_target in db_by_name:
            matches[full_target_name] = db_by_name[norm_target]
            continue
        close_matches = difflib.get_close_matches(norm_target, all_db_names, n=1, cutoff=0.85)
        if close_matches:
            matches[full_target_name] = db_by_name[close_matches[0]]
            continue
        missing.append(full_target_name)

    sql_inserts_students = []
    sql_updates_students = []
    sql_registrations = []
    
    for target, s in matches.items():
        parts = target.split(' ', 1)
        new_name = parts[0].strip().replace("'", "''")
        new_surname = parts[1].strip().replace("'", "''") if len(parts) > 1 else ""
        sql_updates_students.append(f"UPDATE students SET name = '{new_name}', surname = '{new_surname}', grade = '{TARGET_GRADE}' WHERE id = '{s['id']}';")
        sql_registrations.append(f"INSERT INTO registrations (event_id, student_id, status) VALUES ('{EVENT_ID}', '{s['id']}', 'approved');")

    for name in missing:
        parts = name.split(' ', 1)
        new_name = parts[0].strip().replace("'", "''")
        new_surname = parts[1].strip().replace("'", "''") if len(parts) > 1 else ""
        new_id = str(uuid.uuid4())
        sql_inserts_students.append(f"INSERT INTO students (id, name, surname, grade, type) VALUES ('{new_id}', '{new_name}', '{new_surname}', '{TARGET_GRADE}', 'student');")
        sql_registrations.append(f"INSERT INTO registrations (event_id, student_id, status) VALUES ('{EVENT_ID}', '{new_id}', 'approved');")

    with open(os.path.join(WORK_SCRATCH, 'apply_invisible.sql'), 'w', encoding='utf-8') as f:
        f.write("-- Create missing students\n")
        f.write("\n".join(sql_inserts_students) + "\n\n")
        f.write("-- Update existing students\n")
        f.write("\n".join(sql_updates_students) + "\n\n")
        f.write(f"DELETE FROM registrations WHERE event_id = '{EVENT_ID}';\n\n")
        f.write("-- Register for event\n")
        f.write("\n".join(sql_registrations) + "\n")
        f.write(f"\nUPDATE events SET registration_count = (SELECT COUNT(*) FROM registrations WHERE event_id = '{EVENT_ID}') WHERE id = '{EVENT_ID}';\n")

    print(f"Total: {len(target_names)} | Matches: {len(matches)} | Missing: {len(missing)}")

if __name__ == "__main__":
    main()
