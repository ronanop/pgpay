export type TicketStatus = 'pending' | 'approved' | 'rejected' | 'refunded' | 'closed';

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  phone: string;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  ifsc_code: string | null;
  bank_name: string | null;
  upi_id: string | null;
  created_at: string;
  updated_at: string;
}

export type UsdtType = 'mixed' | 'stock' | 'game';

export interface PaymentTicket {
  id: string;
  user_id: string;
  amount: number;
  notes: string | null;
  proof_url: string | null;
  status: TicketStatus;
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  usdt_type: UsdtType | null;
  usdt_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLog {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  created_at: string;
}

export type AdminPermission = 
  | 'view_tickets' 
  | 'delete_tickets' 
  | 'process_tickets' 
  | 'view_users' 
  | 'delete_users' 
  | 'manage_settings' 
  | 'manage_admins';

export interface AdminPermissionRecord {
  id: string;
  user_id: string;
  permission: AdminPermission;
  granted_by: string | null;
  created_at: string;
}
