import json
import os
import difflib

# Paths
BRAIN_SCRATCH = r'C:\Users\luisk\.gemini\antigravity\brain\9121c448-eac4-4462-b3c1-a2ceae4ca4f9\scratch'
WORK_SCRATCH = r'c:\Users\luisk\Downloads\sesi-eventos\scratch'

CYPHERS_EVENT_ID = 'd8b87e8b-2e6d-4a43-8a3c-a7f57df221f6'

def normalize(name):
    if not name: return ""
    return " ".join(name.strip().lower().split())

def main():
    # Load students from DB dump
    with open(os.path.join(BRAIN_SCRATCH, 'students_dump.json'), 'r', encoding='utf-8') as f:
        db_students = json.load(f)
    
    # Load Cyphers names
    with open(os.path.join(WORK_SCRATCH, 'cyphers_names.txt'), 'r', encoding='utf-8') as f:
        cyphers_names = [line.strip() for line in f if line.strip()]
    
    print(f"Total Cyphers names to process: {len(cyphers_names)}")
    
    # Index DB students by normalized full name
    db_by_name = {}
    for s in db_students:
        full_name = normalize(f"{s['name']} {s.get('surname', '')}")
        if full_name not in db_by_name:
            db_by_name[full_name] = s
            
    matches = []
    missing = []
    ambiguous = []
    
    all_db_names = list(db_by_name.keys())
    
    for full_target_name in cyphers_names:
        norm_target = normalize(full_target_name)
        
        # 1. Exact match
        if norm_target in db_by_name:
            matches.append({
                'target': full_target_name,
                'student': db_by_name[norm_target],
                'reason': 'exact'
            })
            continue
            
        # 2. Fuzzy match
        close_matches = difflib.get_close_matches(norm_target, all_db_names, n=1, cutoff=0.85)
        if close_matches:
            matches.append({
                'target': full_target_name,
                'student': db_by_name[close_matches[0]],
                'reason': 'fuzzy'
            })
            continue
            
        # 3. First name + partial surname match
        target_parts = norm_target.split()
        if len(target_parts) >= 2:
            first = target_parts[0]
            last = target_parts[-1]
            found_partial = False
            for db_name in all_db_names:
                if db_name.startswith(first) and last in db_name:
                    matches.append({
                        'target': full_target_name,
                        'student': db_by_name[db_name],
                        'reason': 'partial'
                    })
                    found_partial = True
                    break
            if found_partial: continue
            
        missing.append(full_target_name)

    print(f"\n--- MATCHES ({len(matches)}) ---")
    sql_updates = []
    sql_registrations = []
    
    for m in matches:
        s = m['student']
        target = m['target']
        # Split target into name and surname (simple split)
        parts = target.split(' ', 1)
        new_name = parts[0]
        new_surname = parts[1] if len(parts) > 1 else ""
        
        # SQL to update name if different
        if normalize(s['name']) != normalize(new_name) or normalize(s.get('surname', '')) != normalize(new_surname):
            sql_updates.append(f"UPDATE students SET name = '{new_name}', surname = '{new_surname}' WHERE id = '{s['id']}';")
            
        # SQL to register for Cyphers
        sql_registrations.append(f"INSERT INTO registrations (event_id, student_id, status) VALUES ('{CYPHERS_EVENT_ID}', '{s['id']}', 'approved');")

    print(f"\n--- MISSING ({len(missing)}) ---")
    for name in missing:
        print(f"MISSING: {name}")

    # Generate SQL file
    with open(os.path.join(WORK_SCRATCH, 'apply_cyphers.sql'), 'w', encoding='utf-8') as f:
        f.write("-- Update student names\n")
        f.write("\n".join(sql_updates) + "\n\n")
        f.write("-- Register for Cyphers\n")
        f.write("\n".join(sql_registrations) + "\n")
        f.write(f"\n-- Update registration count\n")
        f.write(f"UPDATE events SET registration_count = (SELECT COUNT(*) FROM registrations WHERE event_id = '{CYPHERS_EVENT_ID}') WHERE id = '{CYPHERS_EVENT_ID}';\n")

    print(f"\nCreated apply_cyphers.sql with {len(sql_updates)} name updates and {len(sql_registrations)} registrations.")

if __name__ == "__main__":
    main()
