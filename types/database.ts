import { UserRole } from '@/lib/constants/permissions';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          phone: string | null;
          avatar_path: string | null;
          is_active: boolean;
          locked_until: string | null;
          deactivated_at: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          phone?: string | null;
          avatar_path?: string | null;
          is_active?: boolean;
          locked_until?: string | null;
          deactivated_at?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          phone?: string | null;
          avatar_path?: string | null;
          is_active?: boolean;
          locked_until?: string | null;
          deactivated_at?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          token_hash: string;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role: UserRole;
          token_hash: string;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: UserRole;
          token_hash?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      audit_log: {
        Row: {
          id: number;
          actor_user_id: string | null;
          actor_role: UserRole | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          actor_user_id?: string | null;
          actor_role?: UserRole | null;
          action: string;
          table_name?: string | null;
          record_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          actor_user_id?: string | null;
          actor_role?: UserRole | null;
          action?: string;
          table_name?: string | null;
          record_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          link: string | null;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      files: {
        Row: {
          id: string;
          bucket: string;
          storage_path: string;
          original_name: string | null;
          content_type: string;
          size_bytes: number;
          entity_type: string | null;
          entity_id: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bucket: string;
          storage_path: string;
          original_name?: string | null;
          content_type: string;
          size_bytes: number;
          entity_type?: string | null;
          entity_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          bucket?: string;
          storage_path?: string;
          original_name?: string | null;
          content_type?: string;
          size_bytes?: number;
          entity_type?: string | null;
          entity_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      generation_errors: {
        Row: {
          id: string;
          kind: 'pdf' | 'email' | 'other';
          resource_type: string | null;
          resource_id: string | null;
          message: string;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: 'pdf' | 'email' | 'other';
          resource_type?: string | null;
          resource_id?: string | null;
          message: string;
          detail?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kind?: 'pdf' | 'email' | 'other';
          resource_type?: string | null;
          resource_id?: string | null;
          message?: string;
          detail?: Json | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  app: {
    Tables: {
      auth_attempts: {
        Row: {
          id: number;
          email_ci: string;
          ip: string | null;
          succeeded: boolean;
          attempted_at: string;
        };
        Insert: {
          id?: number;
          email_ci: string;
          ip?: string | null;
          succeeded: boolean;
          attempted_at?: string;
        };
        Update: {
          id?: number;
          email_ci?: string;
          ip?: string | null;
          succeeded?: boolean;
          attempted_at?: string;
        };
        Relationships: Relationship[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
