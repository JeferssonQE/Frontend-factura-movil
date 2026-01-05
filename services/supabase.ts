// services/supabase.ts - Cliente Supabase con Auth y Roles
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from './crypto';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('⚠️ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});

export type UserRole = 'empresa' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// ==================== AUTH ====================
export const AuthService = {
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// ==================== USER PROFILES ====================
export const ProfileService = {
  async getProfile(): Promise<UserProfile | null> {
    const user = await AuthService.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      // Si no existe perfil, crear uno por defecto
      if (error.code === 'PGRST116') {
        const newProfile = await this.createProfile(user.id, user.email || '', user.user_metadata?.name || '');
        return newProfile;
      }
      console.error('Error obteniendo perfil:', error);
      return null;
    }
    return data;
  },

  async createProfile(userId: string, email: string, name: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({ id: userId, email, name, role: 'empresa' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
  },

  async isAdmin(): Promise<boolean> {
    const profile = await this.getProfile();
    return profile?.role === 'admin';
  },

  async getAllProfiles(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }
};

// ==================== DATABASE ====================
export const SupabaseDB = {
  // SENDERS - Admin ve todos, Empresa solo los suyos
  async getSenders(forceAll = false) {
    // Si es admin y forceAll, obtener todos
    if (forceAll) {
      const isAdmin = await ProfileService.isAdmin();
      if (isAdmin) {
        const { data, error } = await supabase.from('senders').select('*').order('name');
        if (error) throw error;
        return data;
      }
    }
    // Por defecto, RLS filtra automáticamente
    const { data, error } = await supabase.from('senders').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async createSender(sender: { name: string; ruc: string; sunat_user?: string; sunat_pass?: string }) {
    const user = await AuthService.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Encriptar credenciales SUNAT antes de guardar
    const encryptedUser = sender.sunat_user ? await encrypt(sender.sunat_user) : null;
    const encryptedPass = sender.sunat_pass ? await encrypt(sender.sunat_pass) : null;

    const { data, error } = await supabase
      .from('senders')
      .insert({
        name: sender.name,
        ruc: sender.ruc,
        sunat_user_encrypted: encryptedUser,
        sunat_pass_encrypted: encryptedPass,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando sender:', error);
      throw error;
    }
    return data;
  },

  async updateSender(id: string, updates: Partial<{ name: string; ruc: string; sunat_user: string; sunat_pass: string }>) {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.ruc) updateData.ruc = updates.ruc;

    // Encriptar credenciales si se actualizan
    if (updates.sunat_user !== undefined) {
      updateData.sunat_user_encrypted = updates.sunat_user ? await encrypt(updates.sunat_user) : null;
    }
    if (updates.sunat_pass !== undefined) {
      updateData.sunat_pass_encrypted = updates.sunat_pass ? await encrypt(updates.sunat_pass) : null;
    }

    const { data, error } = await supabase
      .from('senders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error actualizando sender:', error);
      throw error;
    }
    return data;
  },

  async deleteSender(id: string | number) {
    const { error } = await supabase.from('senders').delete().eq('id', id);
    if (error) throw error;
  },

  // CLIENTS
  async getClients(senderId: string | number) {
    const { data, error } = await supabase.from('clients').select('*').eq('sender_id', senderId).order('name');
    if (error) throw error;
    return data;
  },

  async createClient(client: { sender_id: string | number; name: string; dni?: string; ruc?: string; phone?: string }) {
    const { data, error } = await supabase.from('clients').insert(client).select().single();
    if (error) throw error;
    return data;
  },

  async updateClient(id: string | number, updates: Partial<{ name: string; dni: string; ruc: string; phone: string }>) {
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteClient(id: string | number) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },

  // PRODUCTS
  async getProducts(senderId: string | number) {
    const { data, error } = await supabase.from('products').select('*').eq('sender_id', senderId).order('description');
    if (error) throw error;
    return data;
  },

  async createProduct(product: { sender_id: string | number; description: string; unit: string; base_price: number; has_igv: boolean; stock?: number }) {
    const { data, error } = await supabase.from('products').insert(product).select().single();
    if (error) throw error;
    return data;
  },

  async updateProduct(id: string | number, updates: Partial<{ description: string; unit: string; base_price: number; has_igv: boolean; stock: number }>) {
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteProduct(id: string | number) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  // INVOICES
  async getInvoices(senderId: string | number) {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('sender_id', senderId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createInvoice(invoice: any, items: any[]) {
    const { data: inv, error: invError } = await supabase.from('invoices').insert(invoice).select().single();
    if (invError) throw invError;

    if (items.length > 0) {
      const itemsWithInvoiceId = items.map(item => ({ ...item, invoice_id: inv.id }));
      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsWithInvoiceId);
      if (itemsError) throw itemsError;
    }

    return inv;
  },

  async updateInvoiceStatus(id: string | number, status: string, extra?: { task_id?: string; pdf_base64?: string; sunat_message?: string }) {
    const { data, error } = await supabase.from('invoices').update({ status, ...extra }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async getNextInvoiceNumber(senderId: string | number, series: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select('number')
      .eq('sender_id', senderId)
      .eq('series', series)
      .order('number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    const lastNumber = data?.[0]?.number ? parseInt(data[0].number) : 0;
    return String(lastNumber + 1).padStart(8, '0');
  },

  // REPORTES
  async getSalesByMonth(senderId: string | number) {
    const { data, error } = await supabase.rpc('get_sales_by_month', { p_sender_id: senderId });
    if (error) throw error;
    return data;
  },

  async getTopProducts(senderId: string | number, limit = 10) {
    const { data, error } = await supabase.rpc('get_top_products', { p_sender_id: senderId, p_limit: limit });
    if (error) throw error;
    return data;
  }
};
