import sqlite3

def patch_db():
    print("Patching database...")
    conn = sqlite3.connect('athena.db')
    c = conn.cursor()
    
    try:
        # Create chat_session table
        c.execute('''
            CREATE TABLE IF NOT EXISTS chat_session (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                created_at DATETIME NOT NULL
            )
        ''')
        print("✅ Created chat_session table")
    except Exception as e:
        print(f"⚠️ chat_session: {e}")

    try:
        # Add columns to chat_message
        c.execute('ALTER TABLE chat_message ADD COLUMN session_id INTEGER REFERENCES chat_session(id)')
        print("✅ Added session_id to chat_message")
    except Exception as e:
        print(f"⚠️ chat_message session_id: {e}")

    try:
        # Add columns to automation_rule
        c.execute('ALTER TABLE automation_rule ADD COLUMN session_id INTEGER REFERENCES chat_session(id)')
        c.execute('ALTER TABLE automation_rule ADD COLUMN execution_mode TEXT DEFAULT "sequential"')
        c.execute('ALTER TABLE automation_rule ADD COLUMN commands_json TEXT DEFAULT "[]"')
        c.execute('ALTER TABLE automation_rule ADD COLUMN report_config_json TEXT')
        print("✅ Added columns to automation_rule")
    except Exception as e:
        print(f"⚠️ automation_rule columns: {e}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    patch_db()
