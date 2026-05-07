
import json
import os
import re

def normalize_name(name):
    if not name: return ""
    # Remove extra spaces, convert to title case, handle common typos
    name = re.sub(r'\s+', ' ', name).strip().title()
    return name

# Path to the files
scratch_dir = r"C:\Users\luisk\.gemini\antigravity\brain\9121c448-eac4-4462-b3c1-a2ceae4ca4f9\scratch"
students_7_path = os.path.join(scratch_dir, "students_7.txt")
students_8_path = os.path.join(scratch_dir, "students_8.txt")
students_9_path = os.path.join(scratch_dir, "students_9.txt")
noosphere_path = os.path.join(scratch_dir, "noosphere_registrations.txt")
students_dump_path = os.path.join(scratch_dir, "students_dump.json")

# Load all students from master lists
master_students = []
with open(students_7_path, 'r', encoding='utf-8') as f:
    master_students.extend([{"name": line.strip(), "grade": "7º Ano EF"} for line in f if line.strip()])
with open(students_8_path, 'r', encoding='utf-8') as f:
    master_students.extend([{"name": line.strip(), "grade": "8º Ano EF"} for line in f if line.strip()])
with open(students_9_path, 'r', encoding='utf-8') as f:
    master_students.extend([{"name": line.strip(), "grade": "9º Ano EF"} for line in f if line.strip()])

# Load current students from DB dump
with open(students_dump_path, 'r', encoding='utf-8') as f:
    db_students = json.load(f)

# Load Noosphere registrations
with open(noosphere_path, 'r', encoding='utf-8') as f:
    noosphere_names = [line.strip() for line in f if line.strip()]

# 1. Update grades for students in DB
sql_updates = []
for db_s in db_students:
    if db_s.get('grade') == 'Desconhecido' or not db_s.get('grade'):
        db_name = normalize_name(db_s['name'])
        for m_s in master_students:
            if normalize_name(m_s['name']) == db_name:
                sql_updates.append(f"UPDATE students SET grade = '{m_s['grade']}' WHERE id = '{db_s['id']}';")
                break

# 2. Find students who are NOT in Noosphere
noosphere_normalized = [normalize_name(n) for n in noosphere_names]
missing_from_noosphere = []
for m_s in master_students:
    m_name = normalize_name(m_s['name'])
    if m_name not in noosphere_normalized:
        missing_from_noosphere.append(m_s)

# Save results
with open(os.path.join(scratch_dir, "update_grades.sql"), 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_updates))

print(f"Total grade updates: {len(sql_updates)}")
print("\nStudents NOT in Noosphere:")
for s in missing_from_noosphere:
    print(f"{s['grade']} - {s['name']}")
