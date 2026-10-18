// Mirrors supabase/migrations/20261018000000_init_padel_league.sql.
// Regenerate with: npx supabase gen types typescript --project-id aekbbpqyqzntymvpuown > src/types/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          level: Database['public']['Enums']['league_level']
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          level: Database['public']['Enums']['league_level']
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          level?: Database['public']['Enums']['league_level']
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          phone: string | null
          role: UserRole
          team_id: string | null
          level: Database['public']['Enums']['league_level'] | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          team_id?: string | null
          level?: Database['public']['Enums']['league_level'] | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone?: string | null
          role?: UserRole
          team_id?: string | null
          level?: Database['public']['Enums']['league_level'] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      practices: {
        Row: {
          id: string
          team_id: string | null
          level: Database['public']['Enums']['league_level']
          scheduled_at: string
          duration_minutes: number
          location: string | null
          max_players: number
          status: Database['public']['Enums']['practice_status']
          has_coach: boolean | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id?: string | null
          level: Database['public']['Enums']['league_level']
          scheduled_at: string
          duration_minutes?: number
          location?: string | null
          max_players?: number
          status?: Database['public']['Enums']['practice_status']
          has_coach?: boolean | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string | null
          level?: Database['public']['Enums']['league_level']
          scheduled_at?: string
          duration_minutes?: number
          location?: string | null
          max_players?: number
          status?: Database['public']['Enums']['practice_status']
          has_coach?: boolean | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'practices_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      participations: {
        Row: {
          id: string
          practice_id: string
          profile_id: string
          role_type: Database['public']['Enums']['participation_role']
          status: Database['public']['Enums']['participation_status']
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          practice_id: string
          profile_id: string
          role_type?: Database['public']['Enums']['participation_role']
          status?: Database['public']['Enums']['participation_status']
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          practice_id?: string
          profile_id?: string
          role_type?: Database['public']['Enums']['participation_role']
          status?: Database['public']['Enums']['participation_status']
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'participations_practice_id_fkey'
            columns: ['practice_id']
            isOneToOne: false
            referencedRelation: 'practices'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'participations_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          full_name: string
          phone: string | null
          role: UserRole
          team_id: string | null
          level: Database['public']['Enums']['league_level'] | null
          created_at: string
        }[]
      }
      attending_count: {
        Args: { p_practice_id: string }
        Returns: number
      }
      current_user_level: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['league_level']
      }
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      current_user_team: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      league_level: 'top' | 'bottom' | 'reserve'
      practice_status: 'scheduled' | 'at_risk' | 'cancelled' | 'completed'
      participation_role: 'regular' | 'substitute'
      participation_status: 'attending' | 'absent'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

/** profiles.role is a CHECK-constrained text column. */
export type UserRole = 'player' | 'captain' | 'admin'

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

export type Team = Tables<'teams'>
export type Profile = Tables<'profiles'>
export type Practice = Tables<'practices'>
export type Participation = Tables<'participations'>
export type LeagueLevel = Enums<'league_level'>
export type PracticeStatus = Enums<'practice_status'>
export type AdminUser = PublicSchema['Functions']['admin_list_users']['Returns'][number]

export type ParticipationWithProfile = Participation & {
  profiles: Pick<Profile, 'id' | 'full_name'> | null
}

export type PracticeWithDetails = Practice & {
  teams: Pick<Team, 'id' | 'name'> | null
  participations: ParticipationWithProfile[]
}
