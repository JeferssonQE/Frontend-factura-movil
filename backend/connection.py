# connection.py - Conexión a Supabase PostgreSQL
import psycopg2
from psycopg2.extras import RealDictCursor
from config import SUPABASE_CONFIG

class Database:
    def __init__(self):
        self.conn = None
        self.cursor = None

    def connect(self):
        """Establece conexión con Supabase PostgreSQL"""
        try:
            self.conn = psycopg2.connect(
                host=SUPABASE_CONFIG["host"],
                port=SUPABASE_CONFIG["port"],
                database=SUPABASE_CONFIG["database"],
                user=SUPABASE_CONFIG["user"],
                password=SUPABASE_CONFIG["password"]
            )
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print("✅ Conexión exitosa a Supabase!")
            return True
        except Exception as e:
            print(f"❌ Error de conexión: {e}")
            return False

    def execute(self, query, params=None):
        """Ejecuta una query"""
        try:
            self.cursor.execute(query, params)
            self.conn.commit()
            return True
        except Exception as e:
            print(f"❌ Error ejecutando query: {e}")
            self.conn.rollback()
            return False

    def fetch_all(self, query, params=None):
        """Ejecuta SELECT y retorna todos los resultados"""
        try:
            self.cursor.execute(query, params)
            return self.cursor.fetchall()
        except Exception as e:
            print(f"❌ Error en fetch: {e}")
            return []

    def fetch_one(self, query, params=None):
        """Ejecuta SELECT y retorna un resultado"""
        try:
            self.cursor.execute(query, params)
            return self.cursor.fetchone()
        except Exception as e:
            print(f"❌ Error en fetch: {e}")
            return None

    def close(self):
        """Cierra la conexión"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
            print("🔌 Conexión cerrada")


# Test de conexión
if __name__ == "__main__":
    db = Database()
    if db.connect():
        result = db.fetch_one("SELECT version();")
        print(f"📦 PostgreSQL version: {result['version']}")
        db.close()
