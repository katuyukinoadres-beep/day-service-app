export type Database = {
  public: {
    Tables: {
      facilities: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          plan: string | null;
          notes: string | null;
          paper_mode_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          plan?: string | null;
          notes?: string | null;
          paper_mode_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
          plan?: string | null;
          notes?: string | null;
          paper_mode_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          facility_id: string;
          display_name: string;
          role: "admin" | "staff";
          is_super_admin: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          facility_id: string;
          display_name: string;
          role?: "admin" | "staff";
          is_super_admin?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          display_name?: string;
          role?: "admin" | "staff";
          is_super_admin?: boolean;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      children: {
        Row: {
          id: string;
          facility_id: string;
          name: string;
          name_kana: string | null;
          birth_date: string | null;
          school: string | null;
          grade: string | null;
          icon_color: string;
          goals: string[];
          domain_tags: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          name: string;
          name_kana?: string | null;
          birth_date?: string | null;
          school?: string | null;
          grade?: string | null;
          icon_color?: string;
          goals?: string[];
          domain_tags?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          name?: string;
          name_kana?: string | null;
          birth_date?: string | null;
          school?: string | null;
          grade?: string | null;
          icon_color?: string;
          goals?: string[];
          domain_tags?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendances: {
        Row: {
          id: string;
          facility_id: string;
          child_id: string;
          date: string;
          is_present: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          child_id: string;
          date: string;
          is_present?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          child_id?: string;
          date?: string;
          is_present?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      phrase_bank: {
        Row: {
          id: string;
          facility_id: string | null;
          category: string;
          text: string;
          domain_tags: string[];
          sort_order: number;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          facility_id?: string | null;
          category: string;
          text: string;
          domain_tags?: string[];
          sort_order?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string | null;
          category?: string;
          text?: string;
          domain_tags?: string[];
          sort_order?: number;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      activity_items: {
        Row: {
          id: string;
          facility_id: string;
          name: string;
          sort_order: number;
          has_detail_field: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          name: string;
          sort_order?: number;
          has_detail_field?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          name?: string;
          sort_order?: number;
          has_detail_field?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quick_templates: {
        Row: {
          id: string;
          user_id: string;
          field_type: "topics" | "notes";
          text: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          field_type: "topics" | "notes";
          text: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          field_type?: "topics" | "notes";
          text?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_record_activities: {
        Row: {
          id: string;
          daily_record_id: string;
          activity_item_id: string;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          daily_record_id: string;
          activity_item_id: string;
          detail?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          daily_record_id?: string;
          activity_item_id?: string;
          detail?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_records: {
        Row: {
          id: string;
          facility_id: string;
          child_id: string;
          date: string;
          mood: "good" | "neutral" | "bad" | null;
          activities: string[];
          phrases: string[];
          memo: string | null;
          topics: string | null;
          notes: string | null;
          ai_text: string | null;
          arrival_time: string | null;
          departure_time: string | null;
          pickup_method: string | null;
          recorded_by: string | null;
          paper_logged: boolean;
          submitted_at: string | null;
          transcribed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          child_id: string;
          date: string;
          mood?: "good" | "neutral" | "bad" | null;
          activities?: string[];
          phrases?: string[];
          memo?: string | null;
          topics?: string | null;
          notes?: string | null;
          ai_text?: string | null;
          arrival_time?: string | null;
          departure_time?: string | null;
          pickup_method?: string | null;
          recorded_by?: string | null;
          paper_logged?: boolean;
          submitted_at?: string | null;
          transcribed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          child_id?: string;
          date?: string;
          mood?: "good" | "neutral" | "bad" | null;
          activities?: string[];
          phrases?: string[];
          memo?: string | null;
          topics?: string | null;
          notes?: string | null;
          ai_text?: string | null;
          arrival_time?: string | null;
          departure_time?: string | null;
          pickup_method?: string | null;
          recorded_by?: string | null;
          paper_logged?: boolean;
          submitted_at?: string | null;
          transcribed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_admin_stats: {
        Args: Record<string, never>;
        Returns: {
          total_facilities: number;
          total_users: number;
          total_records: number;
          records_today: number;
          facilities_with_activity_today: number;
        };
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// 便利な型エイリアス
export type Child = Database["public"]["Tables"]["children"]["Row"];
export type ChildInsert = Database["public"]["Tables"]["children"]["Insert"];
export type ChildUpdate = Database["public"]["Tables"]["children"]["Update"];
export type DailyRecord = Database["public"]["Tables"]["daily_records"]["Row"];
export type DailyRecordInsert = Database["public"]["Tables"]["daily_records"]["Insert"];
export type DailyRecordUpdate = Database["public"]["Tables"]["daily_records"]["Update"];
export type Phrase = Database["public"]["Tables"]["phrase_bank"]["Row"];
export type Facility = Database["public"]["Tables"]["facilities"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendances"]["Row"];

export type AdminStats = Database["public"]["Functions"]["get_admin_stats"]["Returns"];

export type ActivityItem = Database["public"]["Tables"]["activity_items"]["Row"];
export type ActivityItemInsert = Database["public"]["Tables"]["activity_items"]["Insert"];
export type ActivityItemUpdate = Database["public"]["Tables"]["activity_items"]["Update"];
export type DailyRecordActivity = Database["public"]["Tables"]["daily_record_activities"]["Row"];
export type DailyRecordActivityInsert = Database["public"]["Tables"]["daily_record_activities"]["Insert"];
export type QuickTemplate = Database["public"]["Tables"]["quick_templates"]["Row"];
export type QuickTemplateInsert = Database["public"]["Tables"]["quick_templates"]["Insert"];
export type QuickTemplateUpdate = Database["public"]["Tables"]["quick_templates"]["Update"];
