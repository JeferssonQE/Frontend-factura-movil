# seed_data.py - Script para poblar datos de prueba
# IMPORTANTE: Ejecutar DESPUÉS de crear las tablas y tener un usuario registrado
from connection import Database
import os

# ID del usuario admin (obtener de Supabase Auth después de registrarse)
# Puedes encontrarlo en: Supabase Dashboard > Authentication > Users
ADMIN_USER_ID = os.getenv('ADMIN_USER_ID', 'TU_USER_ID_AQUI')

SEED_SQL = """
-- =============================================
-- DATOS DE PRUEBA - FACTUMOVIL AI
-- =============================================

-- 1. Crear perfil admin para el usuario
INSERT INTO user_profiles (id, email, name, role) 
VALUES ('{user_id}', 'admin@factumovil.pe', 'Administrador', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 2. Crear 3 empresas
INSERT INTO senders (user_id, name, ruc, sunat_user_encrypted, sunat_pass_encrypted) VALUES
('{user_id}', 'BODEGA DON PEPE SAC', '20123456789', NULL, NULL),
('{user_id}', 'MINIMARKET LA ESQUINA EIRL', '20987654321', NULL, NULL),
('{user_id}', 'DISTRIBUIDORA CENTRAL SAC', '20456789123', NULL, NULL)
ON CONFLICT (ruc) DO NOTHING;

-- 3. Obtener IDs de las empresas creadas
-- (Asumiendo que son los primeros 3)

-- 4. Crear productos para BODEGA DON PEPE (sender_id = 1)
INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES
(1, 'ARROZ COSTEÑO 5KG', 'BOLSA', 22.00, true, 50),
(1, 'ACEITE PRIMOR 1L', 'UNIDAD', 12.50, true, 30),
(1, 'AZUCAR RUBIA 1KG', 'KILOGRAMO', 4.50, true, 100),
(1, 'LECHE GLORIA 400G', 'UNIDAD', 4.20, true, 80),
(1, 'FIDEOS DON VITTORIO 500G', 'UNIDAD', 3.80, true, 60),
(1, 'ATUN FLORIDA 170G', 'UNIDAD', 6.50, true, 40),
(1, 'PAPA BLANCA', 'KILOGRAMO', 3.50, true, 200),
(1, 'CEBOLLA ROJA', 'KILOGRAMO', 4.00, true, 150);

-- 5. Crear productos para MINIMARKET LA ESQUINA (sender_id = 2)
INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES
(2, 'GASEOSA COCA COLA 500ML', 'UNIDAD', 3.00, true, 100),
(2, 'GASEOSA INCA KOLA 500ML', 'UNIDAD', 3.00, true, 100),
(2, 'AGUA SAN LUIS 625ML', 'UNIDAD', 2.00, true, 150),
(2, 'GALLETAS OREO', 'UNIDAD', 2.50, true, 80),
(2, 'CHOCOLATE SUBLIME', 'UNIDAD', 2.00, true, 60),
(2, 'CIGARROS HAMILTON', 'UNIDAD', 1.50, true, 200),
(2, 'PAN FRANCES', 'UNIDAD', 0.30, false, 500),
(2, 'YOGURT GLORIA 1L', 'UNIDAD', 7.50, true, 40);

-- 6. Crear productos para DISTRIBUIDORA CENTRAL (sender_id = 3)
INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES
(3, 'ARROZ COSTEÑO 50KG', 'SACO', 180.00, true, 20),
(3, 'ACEITE PRIMOR CAJA 12U', 'CAJA', 140.00, true, 15),
(3, 'AZUCAR RUBIA 50KG', 'SACO', 200.00, true, 25),
(3, 'LECHE GLORIA CAJA 48U', 'CAJA', 190.00, true, 10),
(3, 'FIDEOS DON VITTORIO CAJA 20U', 'CAJA', 70.00, true, 30),
(3, 'DETERGENTE BOLIVAR 15KG', 'BOLSA', 85.00, true, 40);

-- 7. Crear clientes para BODEGA DON PEPE (sender_id = 1)
INSERT INTO clients (sender_id, name, dni, ruc, phone) VALUES
(1, 'MARIA GARCIA LOPEZ', '12345678', NULL, '987654321'),
(1, 'JUAN PEREZ CASTRO', '87654321', NULL, '912345678'),
(1, 'RESTAURANT EL BUEN SABOR SAC', NULL, '20111222333', '014567890');

-- 8. Crear clientes para MINIMARKET LA ESQUINA (sender_id = 2)
INSERT INTO clients (sender_id, name, dni, ruc, phone) VALUES
(2, 'CARLOS MENDOZA RIOS', '11223344', NULL, '999888777'),
(2, 'ANA TORRES SILVA', '44332211', NULL, '966555444');

-- 9. Crear clientes para DISTRIBUIDORA CENTRAL (sender_id = 3)
INSERT INTO clients (sender_id, name, dni, ruc, phone) VALUES
(3, 'BODEGA DON PEPE SAC', NULL, '20123456789', '014445566'),
(3, 'MINIMARKET LA ESQUINA EIRL', NULL, '20987654321', '017778899'),
(3, 'TIENDA ROSITA EIRL', NULL, '20333444555', '016667788');

-- 10. Crear facturas/boletas para BODEGA DON PEPE
INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES
(1, 1, 'MARIA GARCIA LOPEZ', '12345678', 'BOLETA', 'B001', '00000001', '2026-01-03', 42.37, 7.63, 50.00, 'ACEPTADO'),
(1, 2, 'JUAN PEREZ CASTRO', '87654321', 'BOLETA', 'B001', '00000002', '2026-01-04', 84.75, 15.25, 100.00, 'ACEPTADO'),
(1, 3, 'RESTAURANT EL BUEN SABOR SAC', '20111222333', 'FACTURA', 'F001', '00000001', '2026-01-05', 254.24, 45.76, 300.00, 'ACEPTADO');

-- 11. Crear facturas/boletas para MINIMARKET LA ESQUINA
INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES
(2, 4, 'CARLOS MENDOZA RIOS', '11223344', 'BOLETA', 'B001', '00000001', '2026-01-03', 25.42, 4.58, 30.00, 'ACEPTADO'),
(2, 5, 'ANA TORRES SILVA', '44332211', 'BOLETA', 'B001', '00000002', '2026-01-04', 16.95, 3.05, 20.00, 'ACEPTADO');

-- 12. Crear facturas para DISTRIBUIDORA CENTRAL
INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES
(3, 6, 'BODEGA DON PEPE SAC', '20123456789', 'FACTURA', 'F001', '00000001', '2026-01-02', 847.46, 152.54, 1000.00, 'ACEPTADO'),
(3, 7, 'MINIMARKET LA ESQUINA EIRL', '20987654321', 'FACTURA', 'F001', '00000002', '2026-01-03', 423.73, 76.27, 500.00, 'ACEPTADO');

-- 13. Crear items de las facturas
-- Items para Boleta B001-00000001 (Bodega Don Pepe)
INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES
(1, 1, 'ARROZ COSTEÑO 5KG', 1, 'BOLSA', 18.64, true, 22.00),
(1, 2, 'ACEITE PRIMOR 1L', 1, 'UNIDAD', 10.59, true, 12.50),
(1, 3, 'AZUCAR RUBIA 1KG', 2, 'KILOGRAMO', 3.81, true, 9.00),
(1, 4, 'LECHE GLORIA 400G', 1, 'UNIDAD', 3.56, true, 4.20);

-- Items para Boleta B001-00000002 (Bodega Don Pepe)
INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES
(2, 1, 'ARROZ COSTEÑO 5KG', 2, 'BOLSA', 18.64, true, 44.00),
(2, 7, 'PAPA BLANCA', 5, 'KILOGRAMO', 2.97, true, 17.50),
(2, 8, 'CEBOLLA ROJA', 3, 'KILOGRAMO', 3.39, true, 12.00),
(2, 5, 'FIDEOS DON VITTORIO 500G', 3, 'UNIDAD', 3.22, true, 11.40);

-- Items para Factura F001-00000001 (Bodega Don Pepe)
INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES
(3, 1, 'ARROZ COSTEÑO 5KG', 5, 'BOLSA', 18.64, true, 110.00),
(3, 2, 'ACEITE PRIMOR 1L', 5, 'UNIDAD', 10.59, true, 62.50),
(3, 6, 'ATUN FLORIDA 170G', 10, 'UNIDAD', 5.51, true, 65.00),
(3, 4, 'LECHE GLORIA 400G', 10, 'UNIDAD', 3.56, true, 42.00);

-- Items para Boleta B001-00000001 (Minimarket)
INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES
(4, 9, 'GASEOSA COCA COLA 500ML', 3, 'UNIDAD', 2.54, true, 9.00),
(4, 11, 'AGUA SAN LUIS 625ML', 2, 'UNIDAD', 1.69, true, 4.00),
(4, 12, 'GALLETAS OREO', 2, 'UNIDAD', 2.12, true, 5.00),
(4, 15, 'PAN FRANCES', 20, 'UNIDAD', 0.30, false, 6.00);

-- Items para Boleta B001-00000002 (Minimarket)
INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES
(5, 10, 'GASEOSA INCA KOLA 500ML', 2, 'UNIDAD', 2.54, true, 6.00),
(5, 13, 'CHOCOLATE SUBLIME', 3, 'UNIDAD', 1.69, true, 6.00),
(5, 16, 'YOGURT GLORIA 1L', 1, 'UNIDAD', 6.36, true, 7.50);

-- Items para Factura F001-00000001 (Distribuidora)
INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES
(6, 17, 'ARROZ COSTEÑO 50KG', 3, 'SACO', 152.54, true, 540.00),
(6, 18, 'ACEITE PRIMOR CAJA 12U', 2, 'CAJA', 118.64, true, 280.00),
(6, 19, 'AZUCAR RUBIA 50KG', 1, 'SACO', 169.49, true, 200.00);

-- Items para Factura F001-00000002 (Distribuidora)
INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES
(7, 20, 'LECHE GLORIA CAJA 48U', 1, 'CAJA', 161.02, true, 190.00),
(7, 21, 'FIDEOS DON VITTORIO CAJA 20U', 2, 'CAJA', 59.32, true, 140.00),
(7, 22, 'DETERGENTE BOLIVAR 15KG', 2, 'BOLSA', 72.03, true, 170.00);
"""

def seed_data(user_id: str):
    """Poblar datos de prueba"""
    db = Database()
    if not db.connect():
        return False

    print(f"\n🌱 Poblando datos de prueba...")
    print(f"   Usuario Admin: {user_id}")
    print("=" * 50)

    # Statements individuales
    statements = [
        # 1. Perfil admin
        f"INSERT INTO user_profiles (id, email, name, role) VALUES ('{user_id}', 'admin@factumovil.pe', 'Administrador', 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin'",
        
        # 2. Empresas
        f"INSERT INTO senders (user_id, name, ruc) VALUES ('{user_id}', 'BODEGA DON PEPE SAC', '20123456789') ON CONFLICT (ruc) DO NOTHING",
        f"INSERT INTO senders (user_id, name, ruc) VALUES ('{user_id}', 'MINIMARKET LA ESQUINA EIRL', '20987654321') ON CONFLICT (ruc) DO NOTHING",
        f"INSERT INTO senders (user_id, name, ruc) VALUES ('{user_id}', 'DISTRIBUIDORA CENTRAL SAC', '20456789123') ON CONFLICT (ruc) DO NOTHING",
        
        # 3. Productos Bodega Don Pepe (sender_id = 1)
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (1, 'ARROZ COSTEÑO 5KG', 'BOLSA', 22.00, true, 50)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (1, 'ACEITE PRIMOR 1L', 'UNIDAD', 12.50, true, 30)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (1, 'AZUCAR RUBIA 1KG', 'KILOGRAMO', 4.50, true, 100)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (1, 'LECHE GLORIA 400G', 'UNIDAD', 4.20, true, 80)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (1, 'PAPA BLANCA', 'KILOGRAMO', 3.50, true, 200)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (1, 'CEBOLLA ROJA', 'KILOGRAMO', 4.00, true, 150)",
        
        # 4. Productos Minimarket (sender_id = 2)
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (2, 'GASEOSA COCA COLA 500ML', 'UNIDAD', 3.00, true, 100)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (2, 'GASEOSA INCA KOLA 500ML', 'UNIDAD', 3.00, true, 100)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (2, 'AGUA SAN LUIS 625ML', 'UNIDAD', 2.00, true, 150)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (2, 'GALLETAS OREO', 'UNIDAD', 2.50, true, 80)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (2, 'PAN FRANCES', 'UNIDAD', 0.30, false, 500)",
        
        # 5. Productos Distribuidora (sender_id = 3)
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (3, 'ARROZ COSTEÑO 50KG', 'SACO', 180.00, true, 20)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (3, 'ACEITE PRIMOR CAJA 12U', 'CAJA', 140.00, true, 15)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv, stock) VALUES (3, 'AZUCAR RUBIA 50KG', 'SACO', 200.00, true, 25)",
        
        # 6. Clientes Bodega Don Pepe
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (1, 'MARIA GARCIA LOPEZ', '12345678', '987654321')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (1, 'JUAN PEREZ CASTRO', '87654321', '912345678')",
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (1, 'RESTAURANT EL BUEN SABOR SAC', '20111222333', '014567890')",
        
        # 7. Clientes Minimarket
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (2, 'CARLOS MENDOZA RIOS', '11223344', '999888777')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (2, 'ANA TORRES SILVA', '44332211', '966555444')",
        
        # 8. Clientes Distribuidora
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (3, 'BODEGA DON PEPE SAC', '20123456789', '014445566')",
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (3, 'MINIMARKET LA ESQUINA EIRL', '20987654321', '017778899')",
        
        # 9. Facturas Bodega Don Pepe
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (1, 1, 'MARIA GARCIA LOPEZ', '12345678', 'BOLETA', 'B001', '00000001', '2026-01-03', 42.37, 7.63, 50.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (1, 2, 'JUAN PEREZ CASTRO', '87654321', 'BOLETA', 'B001', '00000002', '2026-01-04', 84.75, 15.25, 100.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (1, 3, 'RESTAURANT EL BUEN SABOR SAC', '20111222333', 'FACTURA', 'F001', '00000001', '2026-01-05', 254.24, 45.76, 300.00, 'ACEPTADO')",
        
        # 10. Facturas Minimarket
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (2, 4, 'CARLOS MENDOZA RIOS', '11223344', 'BOLETA', 'B001', '00000001', '2026-01-03', 25.42, 4.58, 30.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (2, 5, 'ANA TORRES SILVA', '44332211', 'BOLETA', 'B001', '00000002', '2026-01-04', 16.95, 3.05, 20.00, 'ACEPTADO')",
        
        # 11. Facturas Distribuidora
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (3, 6, 'BODEGA DON PEPE SAC', '20123456789', 'FACTURA', 'F001', '00000001', '2026-01-02', 847.46, 152.54, 1000.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (3, 7, 'MINIMARKET LA ESQUINA EIRL', '20987654321', 'FACTURA', 'F001', '00000002', '2026-01-03', 423.73, 76.27, 500.00, 'ACEPTADO')",
        
        # 12. Items de facturas
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (1, 1, 'ARROZ COSTEÑO 5KG', 1, 'BOLSA', 18.64, true, 22.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (1, 2, 'ACEITE PRIMOR 1L', 1, 'UNIDAD', 10.59, true, 12.50)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (2, 1, 'ARROZ COSTEÑO 5KG', 2, 'BOLSA', 18.64, true, 44.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (2, 5, 'PAPA BLANCA', 5, 'KILOGRAMO', 2.97, true, 17.50)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (3, 1, 'ARROZ COSTEÑO 5KG', 5, 'BOLSA', 18.64, true, 110.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (4, 7, 'GASEOSA COCA COLA 500ML', 3, 'UNIDAD', 2.54, true, 9.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (4, 11, 'PAN FRANCES', 20, 'UNIDAD', 0.30, false, 6.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (5, 8, 'GASEOSA INCA KOLA 500ML', 2, 'UNIDAD', 2.54, true, 6.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (6, 12, 'ARROZ COSTEÑO 50KG', 3, 'SACO', 152.54, true, 540.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (7, 13, 'ACEITE PRIMOR CAJA 12U', 2, 'CAJA', 118.64, true, 280.00)",
    ]
    
    success = 0
    for i, stmt in enumerate(statements):
        result = db.execute(stmt + ";")
        if result:
            success += 1
            print(f"   ✓ Statement {i+1}")
        else:
            print(f"   ✗ Statement {i+1} falló")

    print("=" * 50)
    print(f"✅ {success}/{len(statements)} statements ejecutados")

    # Verificar datos
    print("\n📊 Resumen de datos:")
    
    counts = [
        ('user_profiles', 'Perfiles'),
        ('senders', 'Empresas'),
        ('products', 'Productos'),
        ('clients', 'Clientes'),
        ('invoices', 'Facturas/Boletas'),
        ('invoice_items', 'Items')
    ]
    
    for table, label in counts:
        result = db.fetch_one(f"SELECT COUNT(*) as count FROM {table}")
        if result:
            print(f"   • {label}: {result['count']}")

    db.close()
    print("\n✅ Datos de prueba creados exitosamente!")
    return True


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("❌ Uso: python seed_data.py <USER_ID>")
        print("   Obtén el USER_ID de Supabase Dashboard > Authentication > Users")
        print("\n   Ejemplo:")
        print("   python seed_data.py 0926fe9e-d259-48e6-83cf-7c049...")
        sys.exit(1)
    
    user_id = sys.argv[1]
    seed_data(user_id)
