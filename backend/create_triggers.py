# fix_triggers.py - Crear función y triggers para updated_at automático
from connection import Database


def create_triggers():
    """Crea la función y triggers para auto-update de updated_at"""
    db = Database()

    if not db.connect():
        return False

    print("\n🔧 Configurando triggers...")
    print("=" * 50)

    # Crear función
    func_sql = """
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $body$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $body$ language plpgsql;
    """
    db.cursor.execute(func_sql)
    db.conn.commit()
    print("✅ Función update_updated_at_column creada")

    # Crear triggers para cada tabla
    tables = ['senders', 'clients', 'products', 'invoices']
    for table in tables:
        trigger_name = f'update_{table}_updated_at'
        db.cursor.execute(f'DROP TRIGGER IF EXISTS {trigger_name} ON {table};')
        db.cursor.execute(f'''
            CREATE TRIGGER {trigger_name}
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ''')
        db.conn.commit()
        print(f"✅ Trigger {trigger_name}")

    print("=" * 50)
    db.close()
    print("\n🎉 Triggers configurados correctamente!")
    return True


if __name__ == "__main__":
    create_triggers()
