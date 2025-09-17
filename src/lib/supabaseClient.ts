
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nggvqjtvuwtcpvjvvwvz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZ3ZxanR2dXd0Y3B2anZ2d3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyODk5OTYsImV4cCI6MjA3MDg2NTk5Nn0.fRtkLfGlHdhm59VEjNndljQ8ZL9-jlmgdfIsd08sdgg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
