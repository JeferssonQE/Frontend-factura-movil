# config.py - Configuración de conexión a Supabase
import os

SUPABASE_CONFIG = {
    "host": "aws-0-us-west-2.pooler.supabase.com",
    "port": 5432,
    "database": "postgres",
    "user": "postgres.pkrqyoevoxwnlchipgmw",
    "password": "lrf9z5MLXEmabELp"
}

# Connection string para psycopg2
DATABASE_URL = f"postgresql://{SUPABASE_CONFIG['user']}:{SUPABASE_CONFIG['password']}@{SUPABASE_CONFIG['host']}:{SUPABASE_CONFIG['port']}/{SUPABASE_CONFIG['database']}"
