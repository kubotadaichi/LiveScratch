export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          workspace: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          workspace: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          workspace?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      custom_blocks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          category: string;
          colour: number;
          definition: Record<string, unknown>;
          generator_code: string;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string;
          category?: string;
          colour?: number;
          definition: Record<string, unknown>;
          generator_code: string;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          category?: string;
          colour?: number;
          definition?: Record<string, unknown>;
          generator_code?: string;
          is_public?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}
