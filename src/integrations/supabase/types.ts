export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      class_students: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string | null
          id: string
          name: string
          school_id: string
          stream: string
          term: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          id?: string
          name: string
          school_id: string
          stream: string
          term: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
          stream?: string
          term?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_comments: {
        Row: {
          class_teacher_comment: string
          created_at: string | null
          grade: string
          headteacher_comment: string
          id: string
          updated_at: string | null
        }
        Insert: {
          class_teacher_comment: string
          created_at?: string | null
          grade: string
          headteacher_comment: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          class_teacher_comment?: string
          created_at?: string | null
          grade?: string
          headteacher_comment?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          initials: string | null
          role: Database["public"]["Enums"]["user_role"]
          subject: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          initials?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          subject?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          initials?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          subject?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          class_id: string
          class_teacher_comment: string | null
          created_at: string | null
          fees_balance: number | null
          fees_next_term: number | null
          generated_at: string | null
          generated_by: string | null
          headteacher_comment: string | null
          id: string
          identifier: number | null
          next_term_begins: string | null
          other_requirements: string | null
          overall_achievement: string | null
          overall_average: number | null
          overall_grade: string | null
          pdf_url: string | null
          status: string | null
          student_id: string
          template_id: number | null
          term_ended_on: string | null
          updated_at: string | null
        }
        Insert: {
          class_id: string
          class_teacher_comment?: string | null
          created_at?: string | null
          fees_balance?: number | null
          fees_next_term?: number | null
          generated_at?: string | null
          generated_by?: string | null
          headteacher_comment?: string | null
          id?: string
          identifier?: number | null
          next_term_begins?: string | null
          other_requirements?: string | null
          overall_achievement?: string | null
          overall_average?: number | null
          overall_grade?: string | null
          pdf_url?: string | null
          status?: string | null
          student_id: string
          template_id?: number | null
          term_ended_on?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          class_teacher_comment?: string | null
          created_at?: string | null
          fees_balance?: number | null
          fees_next_term?: number | null
          generated_at?: string | null
          generated_by?: string | null
          headteacher_comment?: string | null
          id?: string
          identifier?: number | null
          next_term_begins?: string | null
          other_requirements?: string | null
          overall_achievement?: string | null
          overall_average?: number | null
          overall_grade?: string | null
          pdf_url?: string | null
          status?: string | null
          student_id?: string
          template_id?: number | null
          term_ended_on?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          location: string | null
          logo_url: string | null
          motto: string | null
          name: string
          po_box: string | null
          telephone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          motto?: string | null
          name: string
          po_box?: string | null
          telephone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          po_box?: string | null
          telephone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          age: number | null
          created_at: string | null
          full_name: string
          gender: string
          house: string | null
          id: string
          photo_url: string | null
          school_id: string
          student_number: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          full_name: string
          gender: string
          house?: string | null
          id?: string
          photo_url?: string | null
          school_id: string
          student_number: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          full_name?: string
          gender?: string
          house?: string | null
          id?: string
          photo_url?: string | null
          school_id?: string
          student_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_submissions: {
        Row: {
          a1_score: number | null
          a2_score: number | null
          a3_score: number | null
          average_score: number | null
          class_id: string
          created_at: string | null
          grade: string | null
          id: string
          percentage_100: number | null
          percentage_20: number | null
          percentage_80: number | null
          remarks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          student_id: string
          subject_id: string
          submitted_at: string | null
          teacher_comment: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          a1_score?: number | null
          a2_score?: number | null
          a3_score?: number | null
          average_score?: number | null
          class_id: string
          created_at?: string | null
          grade?: string | null
          id?: string
          percentage_100?: number | null
          percentage_20?: number | null
          percentage_80?: number | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id: string
          subject_id: string
          submitted_at?: string | null
          teacher_comment?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          a1_score?: number | null
          a2_score?: number | null
          a3_score?: number | null
          average_score?: number | null
          class_id?: string
          created_at?: string | null
          grade?: string | null
          id?: string
          percentage_100?: number | null
          percentage_20?: number | null
          percentage_80?: number | null
          remarks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_id?: string
          subject_id?: string
          submitted_at?: string | null
          teacher_comment?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_submissions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_submissions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_submissions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          assignment_type: string
          class_name: string | null
          created_at: string
          id: string
          stream: string | null
          subject_id: string | null
          teacher_id: string
          updated_at: string
        }
        Insert: {
          assignment_type: string
          class_name?: string | null
          created_at?: string
          id?: string
          stream?: string | null
          subject_id?: string | null
          teacher_id: string
          updated_at?: string
        }
        Update: {
          assignment_type?: string
          class_name?: string | null
          created_at?: string
          id?: string
          stream?: string | null
          subject_id?: string | null
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_teacher_assignments_subject"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teacher_assignments_teacher"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "teacher" | "headteacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "teacher", "headteacher"],
    },
  },
} as const
