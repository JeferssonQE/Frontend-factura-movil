# seed_data.py - Script para poblar datos de prueba ACTUALIZADO
# IMPORTANTE: Ejecutar DESPUÉS de crear las tablas y tener un usuario registrado
# Optimizado para probar ProductSearchSelector y funcionalidades de búsqueda
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
    """Poblar datos de prueba optimizados para ProductSearchSelector"""
    db = Database()
    if not db.connect():
        return False

    print(f"\n🌱 Poblando datos de prueba para ProductSearchSelector...")
    print(f"   Usuario Admin: {user_id}")
    print("=" * 60)

    # Statements individuales optimizados
    statements = [
        # 1. Perfil admin
        f"INSERT INTO user_profiles (id, email, name, role) VALUES ('{user_id}', 'admin@factumovil.pe', 'Administrador FactuMovil', 'admin') ON CONFLICT (id) DO UPDATE SET role = 'admin'",
        
        # 2. Empresas de prueba
        f"INSERT INTO senders (user_id, name, ruc) VALUES ('{user_id}', 'BODEGA SANTA ROSA SAC', '20123456789') ON CONFLICT (ruc) DO NOTHING",
        f"INSERT INTO senders (user_id, name, ruc) VALUES ('{user_id}', 'MINIMARKET EL PROGRESO EIRL', '20987654321') ON CONFLICT (ruc) DO NOTHING",
        f"INSERT INTO senders (user_id, name, ruc) VALUES ('{user_id}', 'DISTRIBUIDORA LIMA NORTE SAC', '20456789123') ON CONFLICT (ruc) DO NOTHING",
        
        # 3. PRODUCTOS BODEGA SANTA ROSA (sender_id = 1) - Variedad para búsqueda
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'ARROZ EXTRA COSTEÑO 5KG', 'BOLSA', 22.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'ARROZ SUPERIOR 1KG', 'KILOGRAMO', 4.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'ACEITE VEGETAL PRIMOR 1L', 'UNIDAD', 12.90, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'ACEITE DE OLIVA EXTRA 500ML', 'UNIDAD', 28.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'AZUCAR RUBIA CARTAVIO 1KG', 'KILOGRAMO', 4.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'AZUCAR BLANCA REFINADA 1KG', 'KILOGRAMO', 4.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'LECHE EVAPORADA GLORIA 400G', 'UNIDAD', 4.30, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'LECHE FRESCA GLORIA 1L', 'UNIDAD', 5.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'FIDEOS ESPAGUETI DON VITTORIO 500G', 'UNIDAD', 3.90, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'FIDEOS TALLARIN MOLITALIA 500G', 'UNIDAD', 4.10, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'ATUN EN ACEITE FLORIDA 170G', 'UNIDAD', 6.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'ATUN AL AGUA A-1 170G', 'UNIDAD', 7.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'PAPA BLANCA HUAYRO', 'KILOGRAMO', 3.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'PAPA AMARILLA TUMBAY', 'KILOGRAMO', 4.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'CEBOLLA ROJA AREQUIPEÑA', 'KILOGRAMO', 3.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'TOMATE ITALIANO', 'KILOGRAMO', 5.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'AJO NAPURI', 'KILOGRAMO', 12.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'LIMÓN SUTIL', 'KILOGRAMO', 6.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'PAN FRANCÉS FRESCO', 'UNIDAD', 0.30, false)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (1, 'PAN INTEGRAL BIMBO', 'UNIDAD', 4.50, true)",
        
        # 4. PRODUCTOS MINIMARKET EL PROGRESO (sender_id = 2) - Bebidas y snacks
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'GASEOSA COCA COLA 500ML', 'UNIDAD', 3.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'GASEOSA COCA COLA 1.5L', 'UNIDAD', 6.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'GASEOSA INCA KOLA 500ML', 'UNIDAD', 3.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'GASEOSA INCA KOLA 1.5L', 'UNIDAD', 6.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'AGUA SAN LUIS 625ML', 'UNIDAD', 2.10, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'AGUA CIELO 2.5L', 'UNIDAD', 4.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'CERVEZA PILSEN 650ML', 'UNIDAD', 8.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'CERVEZA CRISTAL 650ML', 'UNIDAD', 8.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'GALLETAS OREO ORIGINAL', 'UNIDAD', 2.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'GALLETAS SODA FIELD', 'UNIDAD', 1.90, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'CHOCOLATE SUBLIME CLÁSICO', 'UNIDAD', 2.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'CHOCOLATE PRINCESA DONOFRIO', 'UNIDAD', 3.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'CIGARROS HAMILTON BOX', 'UNIDAD', 1.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'CIGARROS MARLBORO BOX', 'UNIDAD', 2.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'YOGURT GLORIA FRESA 1L', 'UNIDAD', 7.80, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'YOGURT LAIVE VAINILLA 1L', 'UNIDAD', 8.20, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'HELADO DONOFRIO SUBLIME', 'UNIDAD', 4.50, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (2, 'HELADO PEZIDURI FRESA', 'UNIDAD', 3.80, true)",
        
        # 5. PRODUCTOS DISTRIBUIDORA LIMA NORTE (sender_id = 3) - Al por mayor
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'ARROZ EXTRA COSTEÑO SACO 50KG', 'SACO', 185.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'ACEITE VEGETAL CAJA 12 UNIDADES', 'CAJA', 145.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'AZUCAR RUBIA SACO 50KG', 'SACO', 210.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'LECHE EVAPORADA CAJA 48 LATAS', 'CAJA', 195.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'FIDEOS ESPAGUETI CAJA 20 PAQUETES', 'CAJA', 75.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'ATUN EN ACEITE CAJA 48 LATAS', 'CAJA', 310.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'DETERGENTE BOLIVAR 15KG', 'BOLSA', 88.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'JABÓN BOLIVAR CAJA 20 UNIDADES', 'CAJA', 65.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'PAPEL HIGIÉNICO SUAVE FARDO 12 PAQUETES', 'FARDO', 95.00, true)",
        "INSERT INTO products (sender_id, description, unit, base_price, has_igv) VALUES (3, 'SHAMPOO SEDAL CAJA 12 UNIDADES', 'CAJA', 120.00, true)",
        
        # 6. CLIENTES BODEGA SANTA ROSA
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (1, 'MARÍA GARCÍA LÓPEZ', '12345678', '987654321')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (1, 'JUAN CARLOS PÉREZ CASTRO', '87654321', '912345678')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (1, 'ANA SOFÍA TORRES MENDOZA', '11223344', '965432187')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (1, 'CARLOS ALBERTO RUIZ SILVA', '44332211', '998877665')",
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (1, 'RESTAURANT EL BUEN SABOR SAC', '20111222333', '014567890')",
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (1, 'PANADERÍA SAN MARTÍN EIRL', '20444555666', '017891234')",
        
        # 7. CLIENTES MINIMARKET EL PROGRESO
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (2, 'LUIS FERNANDO MENDOZA RÍOS', '55667788', '999888777')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (2, 'PATRICIA ELENA SILVA VARGAS', '88776655', '966555444')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (2, 'ROBERTO JOSÉ CHÁVEZ MORALES', '99887766', '955443322')",
        "INSERT INTO clients (sender_id, name, dni, phone) VALUES (2, 'CARMEN ROSA FLORES DÍAZ', '66778899', '944332211')",
        
        # 8. CLIENTES DISTRIBUIDORA LIMA NORTE
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (3, 'BODEGA SANTA ROSA SAC', '20123456789', '014445566')",
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (3, 'MINIMARKET EL PROGRESO EIRL', '20987654321', '017778899')",
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (3, 'SUPERMERCADO LA FAMILIA SAC', '20333444555', '016667788')",
        "INSERT INTO clients (sender_id, name, ruc, phone) VALUES (3, 'COMERCIAL NORTE LIMA EIRL', '20777888999', '015554433')",
        
        # 9. FACTURAS/BOLETAS DE EJEMPLO - BODEGA SANTA ROSA
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (1, 1, 'MARÍA GARCÍA LÓPEZ', '12345678', 'BOLETA', 'B001', '00000001', '2026-01-06', 45.76, 8.24, 54.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (1, 2, 'JUAN CARLOS PÉREZ CASTRO', '87654321', 'BOLETA', 'B001', '00000002', '2026-01-07', 76.27, 13.73, 90.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (1, 5, 'RESTAURANT EL BUEN SABOR SAC', '20111222333', 'FACTURA', 'F001', '00000001', '2026-01-08', 169.49, 30.51, 200.00, 'ACEPTADO')",
        
        # 10. FACTURAS/BOLETAS DE EJEMPLO - MINIMARKET EL PROGRESO
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (2, 7, 'LUIS FERNANDO MENDOZA RÍOS', '55667788', 'BOLETA', 'B001', '00000001', '2026-01-06', 33.90, 6.10, 40.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (2, 8, 'PATRICIA ELENA SILVA VARGAS', '88776655', 'BOLETA', 'B001', '00000002', '2026-01-07', 25.42, 4.58, 30.00, 'ACEPTADO')",
        
        # 11. FACTURAS DE EJEMPLO - DISTRIBUIDORA LIMA NORTE
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (3, 11, 'BODEGA SANTA ROSA SAC', '20123456789', 'FACTURA', 'F001', '00000001', '2026-01-05', 847.46, 152.54, 1000.00, 'ACEPTADO')",
        "INSERT INTO invoices (sender_id, client_id, client_name, client_document, type, series, number, date, subtotal, igv, total, status) VALUES (3, 12, 'MINIMARKET EL PROGRESO EIRL', '20987654321', 'FACTURA', 'F001', '00000002', '2026-01-06', 423.73, 76.27, 500.00, 'ACEPTADO')",
        
        # 12. ITEMS DE FACTURAS - Ejemplos realistas
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (1, 1, 'ARROZ EXTRA COSTEÑO 5KG', 1, 'BOLSA', 19.07, true, 22.50)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (1, 3, 'ACEITE VEGETAL PRIMOR 1L', 1, 'UNIDAD', 10.93, true, 12.90)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (1, 7, 'LECHE EVAPORADA GLORIA 400G', 2, 'UNIDAD', 3.64, true, 8.60)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (1, 19, 'PAN FRANCÉS FRESCO', 10, 'UNIDAD', 0.30, false, 3.00)",
        
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (2, 1, 'ARROZ EXTRA COSTEÑO 5KG', 2, 'BOLSA', 19.07, true, 45.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (2, 13, 'PAPA BLANCA HUAYRO', 5, 'KILOGRAMO', 2.71, true, 16.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (2, 15, 'CEBOLLA ROJA AREQUIPEÑA', 3, 'KILOGRAMO', 3.22, true, 11.40)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (2, 9, 'FIDEOS ESPAGUETI DON VITTORIO 500G', 3, 'UNIDAD', 3.31, true, 11.70)",
        
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (3, 1, 'ARROZ EXTRA COSTEÑO 5KG', 4, 'BOLSA', 19.07, true, 90.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (3, 11, 'ATUN EN ACEITE FLORIDA 170G', 8, 'UNIDAD', 5.76, true, 54.40)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (3, 7, 'LECHE EVAPORADA GLORIA 400G', 10, 'UNIDAD', 3.64, true, 43.00)",
        
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (4, 21, 'GASEOSA COCA COLA 500ML', 4, 'UNIDAD', 2.71, true, 12.80)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (4, 25, 'AGUA SAN LUIS 625ML', 3, 'UNIDAD', 1.78, true, 6.30)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (4, 29, 'GALLETAS OREO ORIGINAL', 4, 'UNIDAD', 2.37, true, 11.20)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (4, 35, 'YOGURT GLORIA FRESA 1L', 1, 'UNIDAD', 6.61, true, 7.80)",
        
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (5, 23, 'GASEOSA INCA KOLA 500ML', 3, 'UNIDAD', 2.71, true, 9.60)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (5, 31, 'CHOCOLATE SUBLIME CLÁSICO', 4, 'UNIDAD', 1.86, true, 8.80)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (5, 37, 'HELADO DONOFRIO SUBLIME', 2, 'UNIDAD', 3.81, true, 9.00)",
        
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (6, 39, 'ARROZ EXTRA COSTEÑO SACO 50KG', 3, 'SACO', 156.78, true, 555.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (6, 40, 'ACEITE VEGETAL CAJA 12 UNIDADES', 2, 'CAJA', 122.88, true, 290.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (6, 45, 'DETERGENTE BOLIVAR 15KG', 1, 'BOLSA', 74.58, true, 88.00)",
        
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (7, 42, 'LECHE EVAPORADA CAJA 48 LATAS', 1, 'CAJA', 165.25, true, 195.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (7, 43, 'FIDEOS ESPAGUETI CAJA 20 PAQUETES', 2, 'CAJA', 63.56, true, 150.00)",
        "INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total) VALUES (7, 44, 'ATUN EN ACEITE CAJA 48 LATAS', 1, 'CAJA', 262.71, true, 310.00)",
    ]
    
    success = 0
    errors = []
    
    for i, stmt in enumerate(statements):
        try:
            result = db.execute(stmt + ";")
            if result:
                success += 1
                print(f"   ✓ Statement {i+1:2d}: {stmt[:50]}...")
            else:
                errors.append(f"Statement {i+1}")
                print(f"   ✗ Statement {i+1:2d}: FALLÓ")
        except Exception as e:
            errors.append(f"Statement {i+1}: {str(e)}")
            print(f"   ✗ Statement {i+1:2d}: ERROR - {str(e)}")

    print("=" * 60)
    print(f"✅ {success}/{len(statements)} statements ejecutados exitosamente")
    
    if errors:
        print(f"❌ {len(errors)} errores encontrados:")
        for error in errors[:5]:  # Mostrar solo los primeros 5 errores
            print(f"   • {error}")
        if len(errors) > 5:
            print(f"   • ... y {len(errors) - 5} errores más")

    # Verificar datos creados
    print("\n📊 RESUMEN DE DATOS CREADOS:")
    print("=" * 60)
    
    counts = [
        ('user_profiles', 'Perfiles de Usuario'),
        ('senders', 'Empresas/Emisores'),
        ('products', 'Productos en Catálogo'),
        ('clients', 'Clientes Registrados'),
        ('invoices', 'Facturas/Boletas'),
        ('invoice_items', 'Items de Facturas')
    ]
    
    for table, label in counts:
        try:
            result = db.fetch_one(f"SELECT COUNT(*) as count FROM {table}")
            if result:
                print(f"   📋 {label:.<25} {result['count']:>3} registros")
        except Exception as e:
            print(f"   ❌ {label:.<25} ERROR: {str(e)}")

    # Mostrar productos por empresa para verificar búsqueda
    print(f"\n🔍 PRODUCTOS POR EMPRESA (para probar búsqueda):")
    print("=" * 60)
    
    try:
        empresas = db.fetch_all("SELECT id, name FROM senders ORDER BY id")
        for empresa in empresas:
            productos = db.fetch_all(f"SELECT COUNT(*) as count FROM products WHERE sender_id = {empresa['id']}")
            if productos:
                print(f"   🏢 {empresa['name']:.<35} {productos[0]['count']:>2} productos")
    except Exception as e:
        print(f"   ❌ Error consultando productos: {str(e)}")

    db.close()
    print(f"\n🎉 ¡Datos de prueba creados exitosamente!")
    print(f"   💡 Ahora puedes probar ProductSearchSelector con {success} registros")
    print(f"   🔍 Busca productos como: 'ARROZ', 'ACEITE', 'LECHE', 'GASEOSA'")
    return success > 0


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("❌ USO: python seed_data.py <USER_ID>")
        print("   Obtén el USER_ID de Supabase Dashboard > Authentication > Users")
        print("\n   📋 EJEMPLO:")
        print("   python seed_data.py 0926fe9e-d259-48e6-83cf-7c049...")
        print("\n   🎯 ESTE SCRIPT CREARÁ:")
        print("   • 3 empresas de prueba")
        print("   • 48 productos variados (perfecto para búsqueda)")
        print("   • 14 clientes de ejemplo")
        print("   • 7 facturas/boletas con items")
        print("   • Datos optimizados para ProductSearchSelector")
        print("\n   🔍 PRODUCTOS PARA PROBAR BÚSQUEDA:")
        print("   • 'ARROZ' - Encuentra múltiples tipos de arroz")
        print("   • 'ACEITE' - Diferentes aceites y presentaciones")
        print("   • 'LECHE' - Varios productos lácteos")
        print("   • 'GASEOSA' - Bebidas gaseosas")
        print("   • 'CHOCOLATE' - Dulces y chocolates")
        sys.exit(1)
    
    user_id = sys.argv[1]
    
    print("🚀 INICIANDO CREACIÓN DE DATOS DE PRUEBA")
    print("   Optimizado para ProductSearchSelector")
    print("=" * 60)
    
    success = seed_data(user_id)
    
    if success:
        print("\n🎉 ¡LISTO PARA PROBAR!")
        print("=" * 60)
        print("   ✅ Datos creados exitosamente")
        print("   🔍 Prueba la búsqueda con palabras como:")
        print("      • ARROZ, ACEITE, LECHE, GASEOSA")
        print("   📱 El ProductSearchSelector ahora tiene datos reales")
        print("   🏢 3 empresas con catálogos diferentes")
        print("   💡 Perfecto para demostrar funcionalidad")
    else:
        print("\n❌ HUBO ERRORES EN LA CREACIÓN")
        print("   Revisa los mensajes anteriores")
        sys.exit(1)
