import os

file_path = r"C:\Users\luisk\.gemini\antigravity\brain\9121c448-eac4-4462-b3c1-a2ceae4ca4f9\scratch\nuclear_cleanup.sql"
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        print(f.read())
else:
    print(f"File not found: {file_path}")
