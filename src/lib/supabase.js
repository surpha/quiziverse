import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only create client if credentials are configured
export const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your-project-url-here'
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export const isSupabaseConfigured = () => supabase !== null
