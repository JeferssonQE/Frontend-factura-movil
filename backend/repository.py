# repository.py - CRUD operations para FactuMovil AI (con Supabase Auth)
from connection import Database
from crypto import encrypt, decrypt
from typing import Optional, List, Dict
import uuid


class Repository:
    def __init__(self):
        self.db = Database()
        self.db.connect()

    def close(self):
        self.db.close()

    # ==================== SENDERS ====================
    def get_senders(self, user_id: str = None) -> List[Dict]:
        if user_id:
            return self.db.fetch_all("SELECT * FROM senders WHERE user_id = %s ORDER BY name", (user_id,))
        return self.db.fetch_all("SELECT * FROM senders ORDER BY name")

    def get_sender_by_id(self, sender_id: str) -> Optional[Dict]:
        sender = self.db.fetch_one("SELECT * FROM senders WHERE id = %s", (sender_id,))
        if sender:
            # Desencriptar credenciales SUNAT
            sender['sunat_user'] = decrypt(sender.get('sunat_user_encrypted'))
            sender['sunat_pass'] = decrypt(sender.get('sunat_pass_encrypted'))
        return sender

    def get_sender_by_ruc(self, ruc: str) -> Optional[Dict]:
        sender = self.db.fetch_one("SELECT * FROM senders WHERE ruc = %s", (ruc,))
        if sender:
            sender['sunat_user'] = decrypt(sender.get('sunat_user_encrypted'))
            sender['sunat_pass'] = decrypt(sender.get('sunat_pass_encrypted'))
        return sender

    def create_sender(self, user_id: str, name: str, ruc: str, sunat_user: str = None, sunat_pass: str = None) -> Optional[str]:
        sender_id = str(uuid.uuid4())
        # Encriptar credenciales SUNAT antes de guardar
        sunat_user_enc = encrypt(sunat_user) if sunat_user else None
        sunat_pass_enc = encrypt(sunat_pass) if sunat_pass else None
        success = self.db.execute(
            "INSERT INTO senders (id, user_id, name, ruc, sunat_user_encrypted, sunat_pass_encrypted) VALUES (%s, %s, %s, %s, %s, %s)",
            (sender_id, user_id, name, ruc, sunat_user_enc, sunat_pass_enc)
        )
        return sender_id if success else None

    def update_sender(self, sender_id: str, **kwargs) -> bool:
        fields = ", ".join([f"{k} = %s" for k in kwargs.keys()])
        values = list(kwargs.values()) + [sender_id]
        return self.db.execute(f"UPDATE senders SET {fields} WHERE id = %s", values)

    def delete_sender(self, sender_id: str) -> bool:
        return self.db.execute("DELETE FROM senders WHERE id = %s", (sender_id,))

    # ==================== CLIENTS ====================
    def get_clients(self, sender_id: str = None) -> List[Dict]:
        if sender_id:
            return self.db.fetch_all("SELECT * FROM clients WHERE sender_id = %s ORDER BY name", (sender_id,))
        return self.db.fetch_all("SELECT * FROM clients ORDER BY name")

    def get_client_by_id(self, client_id: str) -> Optional[Dict]:
        return self.db.fetch_one("SELECT * FROM clients WHERE id = %s", (client_id,))

    def create_client(self, sender_id: str, name: str, dni: str = None, ruc: str = None, phone: str = None) -> Optional[str]:
        client_id = str(uuid.uuid4())
        success = self.db.execute(
            "INSERT INTO clients (id, sender_id, name, dni, ruc, phone) VALUES (%s, %s, %s, %s, %s, %s)",
            (client_id, sender_id, name, dni, ruc, phone)
        )
        return client_id if success else None

    def update_client(self, client_id: str, **kwargs) -> bool:
        fields = ", ".join([f"{k} = %s" for k in kwargs.keys()])
        values = list(kwargs.values()) + [client_id]
        return self.db.execute(f"UPDATE clients SET {fields} WHERE id = %s", values)

    def delete_client(self, client_id: str) -> bool:
        return self.db.execute("DELETE FROM clients WHERE id = %s", (client_id,))

    # ==================== PRODUCTS ====================
    def get_products(self, sender_id: str = None) -> List[Dict]:
        if sender_id:
            return self.db.fetch_all("SELECT * FROM products WHERE sender_id = %s ORDER BY description", (sender_id,))
        return self.db.fetch_all("SELECT * FROM products ORDER BY description")

    def get_product_by_id(self, product_id: str) -> Optional[Dict]:
        return self.db.fetch_one("SELECT * FROM products WHERE id = %s", (product_id,))

    def create_product(self, sender_id: str, description: str, unit: str = "UNIDAD",
                       base_price: float = 0, has_igv: bool = True, stock: int = 0) -> Optional[str]:
        product_id = str(uuid.uuid4())
        success = self.db.execute(
            "INSERT INTO products (id, sender_id, description, unit, base_price, has_igv, stock) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (product_id, sender_id, description, unit, base_price, has_igv, stock)
        )
        return product_id if success else None

    def update_product(self, product_id: str, **kwargs) -> bool:
        fields = ", ".join([f"{k} = %s" for k in kwargs.keys()])
        values = list(kwargs.values()) + [product_id]
        return self.db.execute(f"UPDATE products SET {fields} WHERE id = %s", values)

    def update_stock(self, product_id: str, quantity: int) -> bool:
        """Resta stock después de una venta"""
        return self.db.execute(
            "UPDATE products SET stock = stock - %s WHERE id = %s AND stock >= %s",
            (quantity, product_id, quantity)
        )

    def delete_product(self, product_id: str) -> bool:
        return self.db.execute("DELETE FROM products WHERE id = %s", (product_id,))

    # ==================== INVOICES ====================
    def get_invoices(self, sender_id: str = None, status: str = None) -> List[Dict]:
        query = "SELECT * FROM invoices WHERE 1=1"
        params = []
        if sender_id:
            query += " AND sender_id = %s"
            params.append(sender_id)
        if status:
            query += " AND status = %s"
            params.append(status)
        query += " ORDER BY date DESC, created_at DESC"
        return self.db.fetch_all(query, params if params else None)

    def get_invoice_by_id(self, invoice_id: str) -> Optional[Dict]:
        invoice = self.db.fetch_one("SELECT * FROM invoices WHERE id = %s", (invoice_id,))
        if invoice:
            invoice['items'] = self.get_invoice_items(invoice_id)
        return invoice

    def get_next_number(self, sender_id: str, series: str) -> str:
        """Obtiene el siguiente número correlativo para una serie"""
        result = self.db.fetch_one(
            "SELECT COALESCE(MAX(CAST(number AS INTEGER)), 0) + 1 as next_num FROM invoices WHERE sender_id = %s AND series = %s",
            (sender_id, series)
        )
        return str(result['next_num']).zfill(8) if result else "00000001"

    def create_invoice(self, sender_id: str, client_id: str, client_name: str,
                       inv_type: str, series: str, number: str, date: str,
                       subtotal: float, igv: float, total: float,
                       status: str = "BORRADOR", items: List[Dict] = None,
                       referenced_invoice_id: str = None, credit_note_reason: str = None) -> Optional[str]:
        invoice_id = str(uuid.uuid4())
        success = self.db.execute("""
            INSERT INTO invoices (id, sender_id, client_id, client_name, type, series, number, date,
                                  subtotal, igv, total, status, referenced_invoice_id, credit_note_reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (invoice_id, sender_id, client_id, client_name, inv_type, series, number, date,
              subtotal, igv, total, status, referenced_invoice_id, credit_note_reason))

        if success and items:
            for item in items:
                self.create_invoice_item(invoice_id, **item)

        return invoice_id if success else None

    def update_invoice_status(self, invoice_id: str, status: str,
                              external_id: str = None, pdf_url: str = None,
                              xml_url: str = None, sunat_response: str = None) -> bool:
        return self.db.execute("""
            UPDATE invoices SET status = %s, external_id = %s, pdf_url = %s, xml_url = %s, sunat_response = %s
            WHERE id = %s
        """, (status, external_id, pdf_url, xml_url, sunat_response, invoice_id))

    def delete_invoice(self, invoice_id: str) -> bool:
        return self.db.execute("DELETE FROM invoices WHERE id = %s", (invoice_id,))

    # ==================== INVOICE ITEMS ====================
    def get_invoice_items(self, invoice_id: str) -> List[Dict]:
        return self.db.fetch_all("SELECT * FROM invoice_items WHERE invoice_id = %s", (invoice_id,))

    def create_invoice_item(self, invoice_id: str, product_id: str = None, description: str = "",
                            quantity: float = 1, unit: str = "UNIDAD", unit_price: float = 0,
                            has_igv: bool = True, total: float = 0) -> bool:
        return self.db.execute("""
            INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (invoice_id, product_id, description, quantity, unit, unit_price, has_igv, total))

    # ==================== REPORTES ====================
    def get_sales_by_month(self, sender_id: str, year: int = None) -> List[Dict]:
        """Ventas agrupadas por mes para reportes"""
        query = """
            SELECT
                DATE_TRUNC('month', date) as month,
                COUNT(*) as total_invoices,
                SUM(total) as total_sales,
                SUM(igv) as total_igv
            FROM invoices
            WHERE sender_id = %s AND status = 'ACEPTADO'
        """
        params = [sender_id]
        if year:
            query += " AND EXTRACT(YEAR FROM date) = %s"
            params.append(year)
        query += " GROUP BY DATE_TRUNC('month', date) ORDER BY month DESC"
        return self.db.fetch_all(query, params)

    def get_top_products(self, sender_id: str, limit: int = 10) -> List[Dict]:
        """Productos más vendidos"""
        return self.db.fetch_all("""
            SELECT
                ii.description,
                SUM(ii.quantity) as total_quantity,
                SUM(ii.total) as total_sales
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE i.sender_id = %s AND i.status = 'ACEPTADO'
            GROUP BY ii.description
            ORDER BY total_sales DESC
            LIMIT %s
        """, (sender_id, limit))


if __name__ == "__main__":
    print("✅ Repository listo para usar con Supabase Auth")
    print("   El auth se maneja desde el frontend con @supabase/supabase-js")
