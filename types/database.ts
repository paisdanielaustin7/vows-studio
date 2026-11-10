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
      business_settings: {
        Row: {
          id: number;
          studio_name: string;
          tagline: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          state_code: string | null;
          pincode: string | null;
          gstin: string | null;
          pan: string | null;
          bank_name: string | null;
          bank_account_holder: string | null;
          bank_account_number: string | null;
          bank_ifsc: string | null;
          upi_id: string | null;
          setup_mode: boolean;
          setup_locked_at: string | null;
          gst_enabled: boolean;
          default_cgst_bps: number;
          default_sgst_bps: number;
          default_igst_bps: number;
          logo_path: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          letterhead_layout: string | null;
          email_signature: string | null;
          social_links: Json | null;
          default_quote_validity_days: number;
          default_quote_terms: string | null;
          default_invoice_terms: string | null;
          default_payment_terms: string | null;
          receipt_note: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          studio_name?: string;
          tagline?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          state_code?: string | null;
          pincode?: string | null;
          gstin?: string | null;
          pan?: string | null;
          bank_name?: string | null;
          bank_account_holder?: string | null;
          bank_account_number?: string | null;
          bank_ifsc?: string | null;
          upi_id?: string | null;
          setup_mode?: boolean;
          setup_locked_at?: string | null;
          gst_enabled?: boolean;
          default_cgst_bps?: number;
          default_sgst_bps?: number;
          default_igst_bps?: number;
          logo_path?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          letterhead_layout?: string | null;
          email_signature?: string | null;
          social_links?: Json | null;
          default_quote_validity_days?: number;
          default_quote_terms?: string | null;
          default_invoice_terms?: string | null;
          default_payment_terms?: string | null;
          receipt_note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          studio_name?: string;
          tagline?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          state_code?: string | null;
          pincode?: string | null;
          gstin?: string | null;
          pan?: string | null;
          bank_name?: string | null;
          bank_account_holder?: string | null;
          bank_account_number?: string | null;
          bank_ifsc?: string | null;
          upi_id?: string | null;
          setup_mode?: boolean;
          setup_locked_at?: string | null;
          gst_enabled?: boolean;
          default_cgst_bps?: number;
          default_sgst_bps?: number;
          default_igst_bps?: number;
          logo_path?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          letterhead_layout?: string | null;
          email_signature?: string | null;
          social_links?: Json | null;
          default_quote_validity_days?: number;
          default_quote_terms?: string | null;
          default_invoice_terms?: string | null;
          default_payment_terms?: string | null;
          receipt_note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      document_number_config: {
        Row: {
          doc_type: string;
          prefix: string;
          padding: number;
          year_format: string;
          fy_start_month: number;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          doc_type: string;
          prefix: string;
          padding?: number;
          year_format?: string;
          fy_start_month?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          doc_type?: string;
          prefix?: string;
          padding?: number;
          year_format?: string;
          fy_start_month?: number;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      email_templates: {
        Row: {
          code: string;
          subject: string;
          body_html: string;
          is_active: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          code: string;
          subject: string;
          body_html: string;
          is_active?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          code?: string;
          subject?: string;
          body_html?: string;
          is_active?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      expense_categories: {
        Row: {
          id: string;
          code: string;
          name: string;
          is_builtin: boolean;
          is_archived: boolean;
          sort: number;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          is_builtin?: boolean;
          is_archived?: boolean;
          sort?: number;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          is_builtin?: boolean;
          is_archived?: boolean;
          sort?: number;
        };
        Relationships: Relationship[];
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          state_code: string | null;
          pincode: string | null;
          gstin: string | null;
          referral_source: string | null;
          notes: string | null;
          search?: unknown;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          full_name: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          state_code?: string | null;
          pincode?: string | null;
          gstin?: string | null;
          referral_source?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          state_code?: string | null;
          pincode?: string | null;
          gstin?: string | null;
          referral_source?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: Relationship[];
      };
      client_phones: {
        Row: {
          id: string;
          client_id: string;
          phone_e164: string;
          label: string | null;
          is_primary: boolean;
          is_international: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          phone_e164: string;
          label?: string | null;
          is_primary?: boolean;
          is_international?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          phone_e164?: string;
          label?: string | null;
          is_primary?: boolean;
          is_international?: boolean;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      client_emails: {
        Row: {
          id: string;
          client_id: string;
          email: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          email: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          email?: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      enquiries: {
        Row: {
          id: string;
          client_id: string | null;
          guest_name: string | null;
          guest_phone: string | null;
          guest_email: string | null;
          event_type: string;
          event_date: string | null;
          event_date_is_approx: boolean;
          venue: string | null;
          guest_count: number | null;
          services_interested: string[] | null;
          budget_paise: number | null;
          source: string;
          status: string;
          assigned_to: string | null;
          message: string | null;
          notes: string | null;
          lost_reason: string | null;
          converted_booking_id: string | null;
          consent_given_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          guest_name?: string | null;
          guest_phone?: string | null;
          guest_email?: string | null;
          event_type: string;
          event_date?: string | null;
          event_date_is_approx?: boolean;
          venue?: string | null;
          guest_count?: number | null;
          services_interested?: string[] | null;
          budget_paise?: number | null;
          source?: string;
          status?: string;
          assigned_to?: string | null;
          message?: string | null;
          notes?: string | null;
          lost_reason?: string | null;
          converted_booking_id?: string | null;
          consent_given_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          guest_name?: string | null;
          guest_phone?: string | null;
          guest_email?: string | null;
          event_type?: string;
          event_date?: string | null;
          event_date_is_approx?: boolean;
          venue?: string | null;
          guest_count?: number | null;
          services_interested?: string[] | null;
          budget_paise?: number | null;
          source?: string;
          status?: string;
          assigned_to?: string | null;
          message?: string | null;
          notes?: string | null;
          lost_reason?: string | null;
          converted_booking_id?: string | null;
          consent_given_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: Relationship[];
      };
      follow_ups: {
        Row: {
          id: string;
          enquiry_id: string;
          due_at: string;
          note: string | null;
          assigned_to: string;
          status: string;
          completed_at: string | null;
          completed_by: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          enquiry_id: string;
          due_at: string;
          note?: string | null;
          assigned_to: string;
          status?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          enquiry_id?: string;
          due_at?: string;
          note?: string | null;
          assigned_to?: string;
          status?: string;
          completed_at?: string | null;
          completed_by?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      activities: {
        Row: {
          id: string;
          client_id: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata: Json | null;
          actor_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          entity_type: string;
          entity_id: string;
          action: string;
          metadata?: Json | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          metadata?: Json | null;
          actor_id?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      services: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          unit: string;
          is_active: boolean;
          show_on_website: boolean;
          sort: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          description?: string | null;
          unit?: string;
          is_active?: boolean;
          show_on_website?: boolean;
          sort?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          category?: string;
          description?: string | null;
          unit?: string;
          is_active?: boolean;
          show_on_website?: boolean;
          sort?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: Relationship[];
      };
      service_prices: {
        Row: {
          id: string;
          service_id: string;
          price_paise: number;
          effective_from: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          price_paise: number;
          effective_from: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          price_paise?: number;
          effective_from?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      packages: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          show_on_website: boolean;
          sort: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          show_on_website?: boolean;
          sort?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          show_on_website?: boolean;
          sort?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: Relationship[];
      };
      package_prices: {
        Row: {
          id: string;
          package_id: string;
          price_paise: number;
          effective_from: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          package_id: string;
          price_paise: number;
          effective_from: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          package_id?: string;
          price_paise?: number;
          effective_from?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      package_items: {
        Row: {
          package_id: string;
          service_id: string;
          quantity: number;
        };
        Insert: {
          package_id: string;
          service_id: string;
          quantity?: number;
        };
        Update: {
          package_id?: string;
          service_id?: string;
          quantity?: number;
        };
        Relationships: Relationship[];
      };
      quotations: {
        Row: {
          id: string;
          root_id: string;
          version_no: number;
          is_current: boolean;
          quotation_number: string;
          client_id: string;
          enquiry_id: string | null;
          status: string;
          event_date: string | null;
          valid_until: string;
          subtotal_paise: number;
          discount_type: string | null;
          discount_bps: number | null;
          discount_fixed_paise: number | null;
          discount_paise: number;
          taxable_paise: number;
          cgst_paise: number;
          sgst_paise: number;
          igst_paise: number;
          tax_paise: number;
          total_paise: number;
          gst_applied: boolean;
          tax_type: string;
          business_gstin: string | null;
          client_gstin: string | null;
          place_of_supply_state_code: string | null;
          notes_to_client: string | null;
          internal_notes: string | null;
          terms: string | null;
          pdf_path: string | null;
          pdf_generated_at: string | null;
          sent_at: string | null;
          accepted_at: string | null;
          rejected_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          root_id?: string;
          version_no?: number;
          is_current?: boolean;
          quotation_number: string;
          client_id: string;
          enquiry_id?: string | null;
          status?: string;
          event_date?: string | null;
          valid_until: string;
          subtotal_paise: number;
          discount_type?: string | null;
          discount_bps?: number | null;
          discount_fixed_paise?: number | null;
          discount_paise?: number;
          taxable_paise: number;
          cgst_paise?: number;
          sgst_paise?: number;
          igst_paise?: number;
          tax_paise?: number;
          total_paise: number;
          gst_applied?: boolean;
          tax_type?: string;
          business_gstin?: string | null;
          client_gstin?: string | null;
          place_of_supply_state_code?: string | null;
          notes_to_client?: string | null;
          internal_notes?: string | null;
          terms?: string | null;
          pdf_path?: string | null;
          pdf_generated_at?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          root_id?: string;
          version_no?: number;
          is_current?: boolean;
          quotation_number?: string;
          client_id?: string;
          enquiry_id?: string | null;
          status?: string;
          event_date?: string | null;
          valid_until?: string;
          subtotal_paise?: number;
          discount_type?: string | null;
          discount_bps?: number | null;
          discount_fixed_paise?: number | null;
          discount_paise?: number;
          taxable_paise?: number;
          cgst_paise?: number;
          sgst_paise?: number;
          igst_paise?: number;
          tax_paise?: number;
          total_paise?: number;
          gst_applied?: boolean;
          tax_type?: string;
          business_gstin?: string | null;
          client_gstin?: string | null;
          place_of_supply_state_code?: string | null;
          notes_to_client?: string | null;
          internal_notes?: string | null;
          terms?: string | null;
          pdf_path?: string | null;
          pdf_generated_at?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          rejected_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: Relationship[];
      };
      quotation_items: {
        Row: {
          id: string;
          quotation_id: string;
          sort: number;
          service_id: string | null;
          package_id: string | null;
          service_archived_flag: boolean;
          description: string;
          quantity: number;
          unit_price_paise: number;
          line_total_paise: number;
          hsn_sac_code: string | null;
          cgst_bps: number | null;
          sgst_bps: number | null;
          igst_bps: number | null;
          line_discount_paise: number;
          line_taxable_paise: number;
          cgst_paise: number;
          sgst_paise: number;
          igst_paise: number;
        };
        Insert: {
          id?: string;
          quotation_id: string;
          sort?: number;
          service_id?: string | null;
          package_id?: string | null;
          service_archived_flag?: boolean;
          description: string;
          quantity: number;
          unit_price_paise: number;
          line_total_paise: number;
          hsn_sac_code?: string | null;
          cgst_bps?: number | null;
          sgst_bps?: number | null;
          igst_bps?: number | null;
          line_discount_paise?: number;
          line_taxable_paise?: number;
          cgst_paise?: number;
          sgst_paise?: number;
          igst_paise?: number;
        };
        Update: {
          id?: string;
          quotation_id?: string;
          sort?: number;
          service_id?: string | null;
          package_id?: string | null;
          service_archived_flag?: boolean;
          description?: string;
          quantity?: number;
          unit_price_paise?: number;
          line_total_paise?: number;
          hsn_sac_code?: string | null;
          cgst_bps?: number | null;
          sgst_bps?: number | null;
          igst_bps?: number | null;
          line_discount_paise?: number;
          line_taxable_paise?: number;
          cgst_paise?: number;
          sgst_paise?: number;
          igst_paise?: number;
        };
        Relationships: Relationship[];
      };
      quotation_templates: {
        Row: {
          id: string;
          name: string;
          event_type: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_type?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          event_type?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      quotation_template_items: {
        Row: {
          id: string;
          template_id: string;
          sort: number;
          service_id: string | null;
          description: string;
          quantity: number;
          unit_price_paise: number;
        };
        Insert: {
          id?: string;
          template_id: string;
          sort?: number;
          service_id?: string | null;
          description: string;
          quantity?: number;
          unit_price_paise: number;
        };
        Update: {
          id?: string;
          template_id?: string;
          sort?: number;
          service_id?: string | null;
          description?: string;
          quantity?: number;
          unit_price_paise?: number;
        };
        Relationships: Relationship[];
      };
      site_content: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      site_page_seo: {
        Row: {
          page_key: string;
          meta_title: string | null;
          meta_description: string | null;
          og_image_path: string | null;
          updated_at: string;
        };
        Insert: {
          page_key: string;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image_path?: string | null;
          updated_at?: string;
        };
        Update: {
          page_key?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          og_image_path?: string | null;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      faq_items: {
        Row: {
          id: string;
          question: string;
          answer: string;
          sort: number;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          sort?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          sort?: number;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      bookings: {
        Row: {
          id: string;
          booking_number: string;
          client_id: string;
          enquiry_id: string | null;
          quotation_id: string | null;
          status: string;
          contract_total_paise: number;
          notes: string | null;
          target_delivery_date: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          cancellation_fee_paise: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          booking_number: string;
          client_id: string;
          enquiry_id?: string | null;
          quotation_id?: string | null;
          status?: string;
          contract_total_paise: number;
          notes?: string | null;
          target_delivery_date?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          cancellation_fee_paise?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          booking_number?: string;
          client_id?: string;
          enquiry_id?: string | null;
          quotation_id?: string | null;
          status?: string;
          contract_total_paise?: number;
          notes?: string | null;
          target_delivery_date?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          cancellation_fee_paise?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: Relationship[];
      };
      booking_line_items: {
        Row: {
          id: string;
          booking_id: string;
          sort: number;
          description: string;
          quantity: number;
          unit_price_paise: number;
          line_total_paise: number;
        };
        Insert: {
          id?: string;
          booking_id: string;
          sort?: number;
          description: string;
          quantity: number;
          unit_price_paise: number;
          line_total_paise: number;
        };
        Update: {
          id?: string;
          booking_id?: string;
          sort?: number;
          description?: string;
          quantity?: number;
          unit_price_paise?: number;
          line_total_paise?: number;
        };
        Relationships: Relationship[];
      };
      events: {
        Row: {
          id: string;
          booking_id: string;
          event_type: string;
          name: string;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          venue_name: string;
          venue_address: string | null;
          requirements: string | null;
          equipment_notes: string | null;
          sort: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          booking_id: string;
          event_type: string;
          name: string;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          venue_name: string;
          venue_address?: string | null;
          requirements?: string | null;
          equipment_notes?: string | null;
          sort?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          booking_id?: string;
          event_type?: string;
          name?: string;
          event_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          venue_name?: string;
          venue_address?: string | null;
          requirements?: string | null;
          equipment_notes?: string | null;
          sort?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: Relationship[];
      };
      crew_members: {
        Row: {
          id: string;
          profile_id: string | null;
          full_name: string;
          role: string;
          crew_type: string;
          phone: string;
          email: string | null;
          rate_paise: number | null;
          rate_unit: string | null;
          bank_details_enc: string | null;
          portfolio_url: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          full_name: string;
          role: string;
          crew_type: string;
          phone: string;
          email?: string | null;
          rate_paise?: number | null;
          rate_unit?: string | null;
          bank_details_enc?: string | null;
          portfolio_url?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          full_name?: string;
          role?: string;
          crew_type?: string;
          phone?: string;
          email?: string | null;
          rate_paise?: number | null;
          rate_unit?: string | null;
          bank_details_enc?: string | null;
          portfolio_url?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      event_crew_assignments: {
        Row: {
          id: string;
          event_id: string;
          crew_member_id: string;
          role: string;
          rate_override_paise: number | null;
          confirmed_at: string | null;
          notes: string | null;
          override_reason: string | null;
          override_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          crew_member_id: string;
          role: string;
          rate_override_paise?: number | null;
          confirmed_at?: string | null;
          notes?: string | null;
          override_reason?: string | null;
          override_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          crew_member_id?: string;
          role?: string;
          rate_override_paise?: number | null;
          confirmed_at?: string | null;
          notes?: string | null;
          override_reason?: string | null;
          override_by?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      crew_unavailability: {
        Row: {
          id: string;
          crew_member_id: string;
          from_ts: string;
          to_ts: string;
          reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          crew_member_id: string;
          from_ts: string;
          to_ts: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          crew_member_id?: string;
          from_ts?: string;
          to_ts?: string;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: Relationship[];
      };
      crew_pay_records: {
        Row: {
          id: string;
          crew_member_id: string;
          booking_id: string;
          event_id: string | null;
          work_dates: string[] | null;
          agreed_paise: number;
          paid_paise: number;
          status: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          crew_member_id: string;
          booking_id: string;
          event_id?: string | null;
          work_dates?: string[] | null;
          agreed_paise: number;
          paid_paise?: number;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          crew_member_id?: string;
          booking_id?: string;
          event_id?: string | null;
          work_dates?: string[] | null;
          agreed_paise?: number;
          paid_paise?: number;
          status?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      delivery_pipelines: {
        Row: {
          id: string;
          booking_id: string;
          target_date: string | null;
          completed_at: string | null;
          notes: string | null;
          share_token_hash: string | null;
          share_expires_at: string | null;
          share_revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          target_date?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          share_token_hash?: string | null;
          share_expires_at?: string | null;
          share_revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          target_date?: string | null;
          completed_at?: string | null;
          notes?: string | null;
          share_token_hash?: string | null;
          share_expires_at?: string | null;
          share_revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Relationship[];
      };
      delivery_stages: {
        Row: {
          id: string;
          pipeline_id: string;
          stage_code: string;
          sort: number;
          status: string;
          started_at: string | null;
          completed_at: string | null;
          blocked_reason: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          pipeline_id: string;
          stage_code: string;
          sort: number;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          blocked_reason?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          pipeline_id?: string;
          stage_code?: string;
          sort?: number;
          status?: string;
          started_at?: string | null;
          completed_at?: string | null;
          blocked_reason?: string | null;
          notes?: string | null;
        };
        Relationships: Relationship[];
      };
    };
    Views: {
      quotations_v: {
        Row: {
          id: string;
          root_id: string;
          version_no: number;
          is_current: boolean;
          quotation_number: string;
          client_id: string;
          enquiry_id: string | null;
          status: string;
          derived_status: string;
          event_date: string | null;
          valid_until: string;
          subtotal_paise: number;
          discount_type: string | null;
          discount_bps: number | null;
          discount_fixed_paise: number | null;
          discount_paise: number;
          taxable_paise: number;
          cgst_paise: number;
          sgst_paise: number;
          igst_paise: number;
          tax_paise: number;
          total_paise: number;
          gst_applied: boolean;
          tax_type: string;
          business_gstin: string | null;
          client_gstin: string | null;
          place_of_supply_state_code: string | null;
          notes_to_client: string | null;
          internal_notes: string | null;
          terms: string | null;
          pdf_path: string | null;
          pdf_generated_at: string | null;
          sent_at: string | null;
          accepted_at: string | null;
          rejected_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Relationships: Relationship[];
      };
      services_current_price_v: {
        Row: {
          id: string;
          name: string;
          category: string;
          description: string | null;
          unit: string;
          is_active: boolean;
          show_on_website: boolean;
          sort: number;
          deleted_at: string | null;
          current_price_paise: number | null;
          price_effective_from: string | null;
        };
        Relationships: Relationship[];
      };
      packages_current_price_v: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          show_on_website: boolean;
          sort: number;
          deleted_at: string | null;
          current_price_paise: number | null;
          price_effective_from: string | null;
        };
        Relationships: Relationship[];
      };
      bookings_ops_v: {
        Row: {
          id: string;
          booking_number: string;
          client_id: string;
          client_name: string;
          enquiry_id: string | null;
          quotation_id: string | null;
          status: string;
          notes: string | null;
          target_delivery_date: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          event_count: number;
        };
        Relationships: Relationship[];
      };
      crew_event_v: {
        Row: {
          assignment_id: string;
          crew_member_id: string;
          profile_id: string | null;
          event_id: string;
          booking_id: string;
          booking_number: string;
          client_name: string;
          event_name: string;
          event_type: string;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          venue_name: string;
          venue_address: string | null;
          requirements: string | null;
          equipment_notes: string | null;
          assigned_role: string;
          confirmed_at: string | null;
          assignment_notes: string | null;
        };
        Relationships: Relationship[];
      };
    };
    Functions: {
      next_document_number: {
        Args: {
          p_doc_type: string;
          p_date?: string;
        };
        Returns: string;
      };
      assign_crew: {
        Args: {
          p_event_id: string;
          p_crew_member_id: string;
          p_role: string;
          p_rate_override_paise?: number;
          p_override_reason?: string;
        };
        Returns: string;
      };
      convert_enquiry_to_booking: {
        Args: {
          p_enquiry_id: string;
          p_target_delivery_date?: string;
        };
        Returns: string;
      };
      create_booking_from_quotation: {
        Args: {
          p_quotation_id: string;
          p_target_delivery_date?: string;
        };
        Returns: string;
      };
      cancel_booking: {
        Args: {
          p_booking_id: string;
          p_reason: string;
          p_fee_paise?: number;
        };
        Returns: void;
      };
      create_quotation: {
        Args: {
          payload: Json;
        };
        Returns: string;
      };
      create_quotation_version: {
        Args: {
          p_root_id: string;
          payload: Json;
        };
        Returns: string;
      };
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
      document_sequences: {
        Row: {
          doc_type: string;
          fy: number;
          last_value: number;
        };
        Insert: {
          doc_type: string;
          fy: number;
          last_value?: number;
        };
        Update: {
          doc_type?: string;
          fy?: number;
          last_value?: number;
        };
        Relationships: Relationship[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      next_document_number: {
        Args: {
          p_doc_type: string;
          p_date?: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
