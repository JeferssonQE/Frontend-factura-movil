# create_tables.py - Script para crear tablas en Supabase
from connection import Database

DROP_TABLES = """
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS senders CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
"""

SCHEMA = """
-- =============================================
-- FACTUMOVIL AI - Schema con Roles
-- =============================================

-- Tabla: user_profiles (Perfiles y Roles)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'empresa' CHECK (role IN ('empresa', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: senders (Empresas emisoras)
CREATE TABLE IF NOT EXISTS senders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ruc VARCHAR(11) NOT NULL UNIQUE,
    sunat_user_encrypted TEXT,
    sunat_pass_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: clients (Clientes)
CREATE TABLE IF NOT EXISTS clients (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES senders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    dni VARCHAR(8),
    ruc VARCHAR(11),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: products (Productos)
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES senders(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    unit VARCHAR(50) DEFAULT 'UNIDAD',
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    has_igv BOOLEAN DEFAULT TRUE,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: invoices (Comprobantes)
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT REFERENCES senders(id) ON DELETE CASCADE,
    client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255),
    client_document VARCHAR(11),
    type VARCHAR(20) NOT NULL CHECK (type IN ('BOLETA', 'FACTURA', 'NOTA_CREDITO')),
    series VARCHAR(10) NOT NULL,
    number VARCHAR(20) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal DECIMAL(10,2) DEFAULT 0,
    igv DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'PROCESANDO', 'ACEPTADO', 'RECHAZADO', 'ANULADO', 'FALLO')),
    task_id VARCHAR(100),
    pdf_base64 TEXT,
    sunat_message TEXT,
    referenced_invoice_id BIGINT REFERENCES invoices(id),
    credit_note_reason VARCHAR(10),
    credit_note_sustento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sender_id, series, number)
);

-- Tabla: invoice_items (Detalle)
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit VARCHAR(50) DEFAULT 'UNIDAD',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    has_igv BOOLEAN DEFAULT TRUE,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_senders_user ON senders(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_sender ON clients(sender_id);
CREATE INDEX IF NOT EXISTS idx_products_sender ON products(sender_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sender ON invoices(sender_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- =============================================
-- FUNCIÓN: Verificar si usuario es admin
-- =============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY con soporte Admin
-- =============================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Políticas user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT USING (is_admin());

-- Políticas senders (Admin ve todo, Empresa solo lo suyo)
DROP POLICY IF EXISTS "Users can view own senders" ON senders;
DROP POLICY IF EXISTS "Users can insert own senders" ON senders;
DROP POLICY IF EXISTS "Users can update own senders" ON senders;
DROP POLICY IF EXISTS "Users can delete own senders" ON senders;
DROP POLICY IF EXISTS "Admins can view all senders" ON senders;
DROP POLICY IF EXISTS "Admins can manage all senders" ON senders;
CREATE POLICY "Users can view own senders" ON senders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own senders" ON senders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own senders" ON senders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own senders" ON senders FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all senders" ON senders FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage all senders" ON senders FOR ALL USING (is_admin());

-- Políticas clients
DROP POLICY IF EXISTS "Users can manage clients" ON clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON clients;
CREATE POLICY "Users can manage clients" ON clients FOR ALL USING (sender_id IN (SELECT id FROM senders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all clients" ON clients FOR ALL USING (is_admin());

-- Políticas products
DROP POLICY IF EXISTS "Users can manage products" ON products;
DROP POLICY IF EXISTS "Admins can manage all products" ON products;
CREATE POLICY "Users can manage products" ON products FOR ALL USING (sender_id IN (SELECT id FROM senders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all products" ON products FOR ALL USING (is_admin());

-- Políticas invoices
DROP POLICY IF EXISTS "Users can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage all invoices" ON invoices;
CREATE POLICY "Users can manage invoices" ON invoices FOR ALL USING (sender_id IN (SELECT id FROM senders WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all invoices" ON invoices FOR ALL USING (is_admin());

-- Políticas invoice_items
DROP POLICY IF EXISTS "Users can manage invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Admins can manage all invoice_items" ON invoice_items;
CREATE POLICY "Users can manage invoice_items" ON invoice_items FOR ALL USING (invoice_id IN (SELECT i.id FROM invoices i JOIN senders s ON i.sender_id = s.id WHERE s.user_id = auth.uid()));
CREATE POLICY "Admins can manage all invoice_items" ON invoice_items FOR ALL USING (is_admin());

-- =============================================
-- TRIGGER: Crear perfil automáticamente al registrarse
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', 'empresa');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
"""


def drop_tables():
    db = Database()
    if not db.connect():
        return False
    print("\n🗑️  Eliminando tablas...")
    for stmt in DROP_TABLES.strip().split(';'):
        if stmt.strip():
            db.execute(stmt + ";")
    db.close()
    print("✅ Tablas eliminadas")
    return True


def create_tables():
    db = Database()
    if not db.connect():
        return False

    print("\n📦 Creando tablas...")
    statements = [s.strip() for s in SCHEMA.split(';') if s.strip()]
    
    success = 0
    for stmt in statements:
        if stmt and db.execute(stmt + ";"):
            success += 1

    print(f"✅ {success}/{len(statements)} ejecutados")
    
    tables = db.fetch_all("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    print("\n📋 Tablas:")
    for t in tables:
        print(f"   • {t['table_name']}")

    db.close()
    return True


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        drop_tables()
    create_tables()
