export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      album_chapters: {
        Row: {
          created_at: string
          created_by: string | null
          emoji: string | null
          id: string
          position: number
          slug: string
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          emoji?: string | null
          id?: string
          position: number
          slug: string
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          emoji?: string | null
          id?: string
          position?: number
          slug?: string
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      album_slots: {
        Row: {
          chapter_id: string
          created_at: string
          created_by: string | null
          gate_end_doy: number | null
          gate_label: string | null
          gate_start_doy: number | null
          hint: string | null
          id: string
          is_duo: boolean
          position: number
          source: string
          tier: string
          title: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          created_by?: string | null
          gate_end_doy?: number | null
          gate_label?: string | null
          gate_start_doy?: number | null
          hint?: string | null
          id?: string
          is_duo?: boolean
          position: number
          source?: string
          tier?: string
          title: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          created_by?: string | null
          gate_end_doy?: number | null
          gate_label?: string | null
          gate_start_doy?: number | null
          hint?: string | null
          id?: string
          is_duo?: boolean
          position?: number
          source?: string
          tier?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_slots_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "album_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      album_stickers: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          half: string
          id: string
          image_path: string
          location: string | null
          slot_id: string
          taken_on: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string
          half?: string
          id?: string
          image_path: string
          location?: string | null
          slot_id: string
          taken_on?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          half?: string
          id?: string
          image_path?: string
          location?: string | null
          slot_id?: string
          taken_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_stickers_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "album_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      app_opens: {
        Row: {
          id: string
          opened_at: string
          user_id: string
        }
        Insert: {
          id?: string
          opened_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          opened_at?: string
          user_id?: string
        }
        Relationships: []
      }
      baby_name_votes: {
        Row: {
          name_id: string
          user_id: string
          vote: number
        }
        Insert: {
          name_id: string
          user_id?: string
          vote: number
        }
        Update: {
          name_id?: string
          user_id?: string
          vote?: number
        }
        Relationships: [
          {
            foreignKeyName: "baby_name_votes_name_id_fkey"
            columns: ["name_id"]
            isOneToOne: false
            referencedRelation: "baby_names"
            referencedColumns: ["id"]
          },
        ]
      }
      baby_names: {
        Row: {
          created_at: string
          gender: string | null
          id: string
          meaning: string | null
          name: string
          notes: string | null
          origin: string | null
          proposed_by: string
        }
        Insert: {
          created_at?: string
          gender?: string | null
          id?: string
          meaning?: string | null
          name: string
          notes?: string | null
          origin?: string | null
          proposed_by?: string
        }
        Update: {
          created_at?: string
          gender?: string | null
          id?: string
          meaning?: string | null
          name?: string
          notes?: string | null
          origin?: string | null
          proposed_by?: string
        }
        Relationships: []
      }
      chalkboard_notes: {
        Row: {
          author: string
          body: string
          color: string
          created_at: string
          id: string
          rotation: number
          x: number
          y: number
        }
        Insert: {
          author?: string
          body: string
          color?: string
          created_at?: string
          id?: string
          rotation?: number
          x?: number
          y?: number
        }
        Update: {
          author?: string
          body?: string
          color?: string
          created_at?: string
          id?: string
          rotation?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      countdowns: {
        Row: {
          created_at: string
          created_by: string
          emoji: string | null
          id: string
          notes: string | null
          target_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          emoji?: string | null
          id?: string
          notes?: string | null
          target_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          emoji?: string | null
          id?: string
          notes?: string | null
          target_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      couple: {
        Row: {
          anniversary_day: number
          created_at: string
          id: boolean
          relationship_start_date: string | null
          updated_at: string
        }
        Insert: {
          anniversary_day?: number
          created_at?: string
          id?: boolean
          relationship_start_date?: string | null
          updated_at?: string
        }
        Update: {
          anniversary_day?: number
          created_at?: string
          id?: boolean
          relationship_start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      couple_members: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          display_name: string
          emoji: string | null
          last_seen_at: string | null
          lat: number | null
          learning_language: string | null
          lng: number | null
          native_language: string | null
          role: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          display_name: string
          emoji?: string | null
          last_seen_at?: string | null
          lat?: number | null
          learning_language?: string | null
          lng?: number | null
          native_language?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          emoji?: string | null
          last_seen_at?: string | null
          lat?: number | null
          learning_language?: string | null
          lng?: number | null
          native_language?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      currency_rates: {
        Row: {
          base: string
          fetched_at: string
          quote: string
          rate: number
        }
        Insert: {
          base: string
          fetched_at?: string
          quote: string
          rate: number
        }
        Update: {
          base?: string
          fetched_at?: string
          quote?: string
          rate?: number
        }
        Relationships: []
      }
      cute_words: {
        Row: {
          audio_path: string | null
          coined_by: string | null
          created_at: string
          example: string | null
          id: string
          meaning: string | null
          term: string
        }
        Insert: {
          audio_path?: string | null
          coined_by?: string | null
          created_at?: string
          example?: string | null
          id?: string
          meaning?: string | null
          term: string
        }
        Update: {
          audio_path?: string | null
          coined_by?: string | null
          created_at?: string
          example?: string | null
          id?: string
          meaning?: string | null
          term?: string
        }
        Relationships: []
      }
      date_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          date_id: string
          id: string
          image_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string
          date_id: string
          id?: string
          image_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          date_id?: string
          id?: string
          image_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_photos_date_id_fkey"
            columns: ["date_id"]
            isOneToOne: false
            referencedRelation: "dates"
            referencedColumns: ["id"]
          },
        ]
      }
      date_ratings: {
        Row: {
          date_id: string
          review: string | null
          stars: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          date_id: string
          review?: string | null
          stars?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          date_id?: string
          review?: string | null
          stars?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "date_ratings_date_id_fkey"
            columns: ["date_id"]
            isOneToOne: false
            referencedRelation: "dates"
            referencedColumns: ["id"]
          },
        ]
      }
      dates: {
        Row: {
          budget_amount: number | null
          budget_currency: string | null
          category: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          place: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          what_we_ate: string | null
        }
        Insert: {
          budget_amount?: number | null
          budget_currency?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          place?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          what_we_ate?: string | null
        }
        Update: {
          budget_amount?: number | null
          budget_currency?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          place?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          what_we_ate?: string | null
        }
        Relationships: []
      }
      decision_positions: {
        Row: {
          decision_id: string
          note: string | null
          position: string
          updated_at: string
          user_id: string
        }
        Insert: {
          decision_id: string
          note?: string | null
          position: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          decision_id?: string
          note?: string | null
          position?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_positions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          agreed_value: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          agreed_value?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          agreed_value?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      deck_cards: {
        Row: {
          correct: Json | null
          created_at: string
          deck_id: string
          id: string
          position: number
          prompt: Json
        }
        Insert: {
          correct?: Json | null
          created_at?: string
          deck_id: string
          id?: string
          position?: number
          prompt?: Json
        }
        Update: {
          correct?: Json | null
          created_at?: string
          deck_id?: string
          id?: string
          position?: number
          prompt?: Json
        }
        Relationships: [
          {
            foreignKeyName: "deck_cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_responses: {
        Row: {
          answer: Json
          answered_at: string
          card_id: string
          correct: boolean | null
          deck_id: string
          id: string
          user_id: string
        }
        Insert: {
          answer: Json
          answered_at?: string
          card_id: string
          correct?: boolean | null
          deck_id: string
          id?: string
          user_id?: string
        }
        Update: {
          answer?: Json
          answered_at?: string
          card_id?: string
          correct?: boolean | null
          deck_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_responses_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "deck_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_responses_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          kind: string
          mode: string
          reveal_when_both: boolean
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          kind: string
          mode: string
          reveal_when_both?: boolean
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          kind?: string
          mode?: string
          reveal_when_both?: boolean
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fights: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          reason: string | null
          resolution: string | null
          started_at: string
          started_by: string | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          resolution?: string | null
          started_at?: string
          started_by?: string | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          reason?: string | null
          resolution?: string | null
          started_at?: string
          started_by?: string | null
        }
        Relationships: []
      }
      finance_contributions: {
        Row: {
          amount: number
          contributed_at: string
          goal_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contributed_at?: string
          goal_id: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          contributed_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "finance_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_goals: {
        Row: {
          archived: boolean
          created_at: string
          created_by: string
          currency: string
          id: string
          notes: string | null
          target_amount: number
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          notes?: string | null
          target_amount: number
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          notes?: string | null
          target_amount?: number
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      flowers: {
        Row: {
          created_at: string
          given_by: string | null
          id: string
          image_path: string | null
          note: string | null
          occasion_date: string
        }
        Insert: {
          created_at?: string
          given_by?: string | null
          id?: string
          image_path?: string | null
          note?: string | null
          occasion_date: string
        }
        Update: {
          created_at?: string
          given_by?: string | null
          id?: string
          image_path?: string | null
          note?: string | null
          occasion_date?: string
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          created_at: string
          game_id: string
          id: string
          meta: Json
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          meta?: Json
          score: number
          user_id?: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          meta?: Json
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      ideas: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      know_me_answers: {
        Row: {
          day_id: string
          guess_choice: string
          id: string
          own_choice: string
          reaction_path: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          day_id: string
          guess_choice: string
          id?: string
          own_choice: string
          reaction_path?: string | null
          submitted_at?: string
          user_id?: string
        }
        Update: {
          day_id?: string
          guess_choice?: string
          id?: string
          own_choice?: string
          reaction_path?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "know_me_answers_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "know_me_days"
            referencedColumns: ["id"]
          },
        ]
      }
      know_me_days: {
        Row: {
          couple_day: string
          created_at: string
          id: string
          question_id: string
          slot: number
        }
        Insert: {
          couple_day: string
          created_at?: string
          id?: string
          question_id: string
          slot?: number
        }
        Update: {
          couple_day?: string
          created_at?: string
          id?: string
          question_id?: string
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "know_me_days_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "know_me_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      know_me_presence: {
        Row: {
          day_id: string
          id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          day_id: string
          id?: string
          submitted_at?: string
          user_id?: string
        }
        Update: {
          day_id?: string
          id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "know_me_presence_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "know_me_days"
            referencedColumns: ["id"]
          },
        ]
      }
      know_me_questions: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string | null
          id: string
          is_custom: boolean
          options: Json
          prompt: string
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          options: Json
          prompt: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          options?: Json
          prompt?: string
        }
        Relationships: []
      }
      language_decks: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          emoji: string | null
          id: string
          language: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          emoji?: string | null
          id?: string
          language: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          emoji?: string | null
          id?: string
          language?: string
          title?: string
        }
        Relationships: []
      }
      phrases: {
        Row: {
          added_by: string
          audio_path: string | null
          category: string | null
          created_at: string
          deck_id: string | null
          example: string | null
          id: string
          language: string
          text: string
          translation: string | null
          transliteration: string | null
        }
        Insert: {
          added_by?: string
          audio_path?: string | null
          category?: string | null
          created_at?: string
          deck_id?: string | null
          example?: string | null
          id?: string
          language: string
          text: string
          translation?: string | null
          transliteration?: string | null
        }
        Update: {
          added_by?: string
          audio_path?: string | null
          category?: string | null
          created_at?: string
          deck_id?: string | null
          example?: string | null
          id?: string
          language?: string
          text?: string
          translation?: string | null
          transliteration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrases_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "language_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      polaroids: {
        Row: {
          caption: string | null
          created_at: string
          day: string
          id: string
          image_path: string
          taken_by: string
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          day: string
          id?: string
          image_path: string
          taken_by?: string
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          day?: string
          id?: string
          image_path?: string
          taken_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      punitos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: string
          proposed_by: string
          sealed_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          proposed_by?: string
          sealed_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: string
          proposed_by?: string
          sealed_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scavenger_arguments: {
        Row: {
          body: string
          card_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          body: string
          card_id: string
          created_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          card_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scavenger_arguments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "scavenger_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      scavenger_cards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          points: number
          position: number
          title: string
          trip_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          points?: number
          position?: number
          title: string
          trip_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          points?: number
          position?: number
          title?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scavenger_cards_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      scavenger_claims: {
        Row: {
          card_id: string
          claimed_at: string
          claimed_by: string
          image_path: string | null
          note: string | null
        }
        Insert: {
          card_id: string
          claimed_at?: string
          claimed_by?: string
          image_path?: string | null
          note?: string | null
        }
        Update: {
          card_id?: string
          claimed_at?: string
          claimed_by?: string
          image_path?: string | null
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scavenger_claims_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "scavenger_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_milestones: {
        Row: {
          achieved_at: string
          couple_day: string
          created_at: string
          created_by: string
          emoji: string | null
          id: string
          kind: string
          note: string | null
          slot: number
          threshold: number | null
          title: string
        }
        Insert: {
          achieved_at?: string
          couple_day: string
          created_at?: string
          created_by?: string
          emoji?: string | null
          id?: string
          kind: string
          note?: string | null
          slot: number
          threshold?: number | null
          title: string
        }
        Update: {
          achieved_at?: string
          couple_day?: string
          created_at?: string
          created_by?: string
          emoji?: string | null
          id?: string
          kind?: string
          note?: string | null
          slot?: number
          threshold?: number | null
          title?: string
        }
        Relationships: []
      }
      tree_state: {
        Row: {
          created_at: string
          current_streak: number
          growth_points: number
          id: boolean
          last_streak_day: string | null
          last_watered_at: string | null
          last_watered_by: string | null
          longest_streak: number
          planted_at: string
          seed: number
          updated_at: string
          water_count: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          growth_points?: number
          id?: boolean
          last_streak_day?: string | null
          last_watered_at?: string | null
          last_watered_by?: string | null
          longest_streak?: number
          planted_at?: string
          seed: number
          updated_at?: string
          water_count?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          growth_points?: number
          id?: boolean
          last_streak_day?: string | null
          last_watered_at?: string | null
          last_watered_by?: string | null
          longest_streak?: number
          planted_at?: string
          seed?: number
          updated_at?: string
          water_count?: number
        }
        Relationships: []
      }
      tree_waterings: {
        Row: {
          couple_day: string
          created_at: string
          growth_added: number
          health_before: number | null
          id: string
          watered_at: string
          watered_by: string
        }
        Insert: {
          couple_day: string
          created_at?: string
          growth_added?: number
          health_before?: number | null
          id?: string
          watered_at?: string
          watered_by?: string
        }
        Update: {
          couple_day?: string
          created_at?: string
          growth_added?: number
          health_before?: number | null
          id?: string
          watered_at?: string
          watered_by?: string
        }
        Relationships: []
      }
      trip_items: {
        Row: {
          created_at: string
          created_by: string
          day: string | null
          description: string | null
          id: string
          kind: string
          lat: number | null
          link: string | null
          lng: number | null
          position: number
          status: string
          title: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          day?: string | null
          description?: string | null
          id?: string
          kind?: string
          lat?: number | null
          link?: string | null
          lng?: number | null
          position?: number
          status?: string
          title: string
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          day?: string | null
          description?: string | null
          id?: string
          kind?: string
          lat?: number | null
          link?: string | null
          lng?: number | null
          position?: number
          status?: string
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string
          id: string
          image_path: string
          trip_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_path: string
          trip_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_photos_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_amount: number | null
          budget_currency: string | null
          cover_path: string | null
          created_at: string
          created_by: string
          destination: string | null
          end_date: string | null
          id: string
          is_special: boolean
          name: string
          notes: string | null
          slug: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          budget_amount?: number | null
          budget_currency?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string
          destination?: string | null
          end_date?: string | null
          id?: string
          is_special?: boolean
          name: string
          notes?: string | null
          slug?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          budget_amount?: number | null
          budget_currency?: string | null
          cover_path?: string | null
          created_at?: string
          created_by?: string
          destination?: string | null
          end_date?: string | null
          id?: string
          is_special?: boolean
          name?: string
          notes?: string | null
          slug?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_by: string
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          link: string | null
          list_id: string
          title: string
        }
        Insert: {
          added_by?: string
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          link?: string | null
          list_id: string
          title: string
        }
        Update: {
          added_by?: string
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          link?: string | null
          list_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_votes: {
        Row: {
          item_id: string
          user_id: string
          vote: number
          voted_at: string
        }
        Insert: {
          item_id: string
          user_id?: string
          vote: number
          voted_at?: string
        }
        Update: {
          item_id?: string
          user_id?: string
          vote?: number
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_votes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
    }
    Views: {
      know_me_revealed: {
        Row: {
          day_id: string | null
          guess_choice: string | null
          id: string | null
          own_choice: string | null
          reaction_path: string | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          day_id?: string | null
          guess_choice?: string | null
          id?: string | null
          own_choice?: string | null
          reaction_path?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          day_id?: string | null
          guess_choice?: string | null
          id?: string | null
          own_choice?: string | null
          reaction_path?: string | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "know_me_answers_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "know_me_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_member: { Args: never; Returns: boolean }
      know_me_ensure_today: {
        Args: never
        Returns: {
          couple_day: string
          created_at: string
          id: string
          question_id: string
          slot: number
        }[]
        SetofOptions: {
          from: "*"
          to: "know_me_days"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      know_me_reveal: {
        Args: { p_day_id: string }
        Returns: {
          guess_choice: string
          is_self: boolean
          own_choice: string
          reaction_path: string
          user_id: string
        }[]
      }
      know_me_submit: {
        Args: { p_guess: string; p_own: string }
        Returns: undefined
      }
      know_me_submit_day: {
        Args: { p_day_id: string; p_guess: string; p_own: string }
        Returns: undefined
      }
      partner_id: { Args: never; Returns: string }
      water_tree: {
        Args: never
        Returns: {
          created_at: string
          current_streak: number
          growth_points: number
          id: boolean
          last_streak_day: string | null
          last_watered_at: string | null
          last_watered_by: string | null
          longest_streak: number
          planted_at: string
          seed: number
          updated_at: string
          water_count: number
        }
        SetofOptions: {
          from: "*"
          to: "tree_state"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

