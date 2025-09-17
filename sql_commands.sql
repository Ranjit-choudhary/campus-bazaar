-- In your Supabase dashboard, go to the Table Editor and select the 'auth' schema to find the 'users' table.

-- Add a 'role' column to the 'users' table in the 'auth' schema.
-- This will be used to differentiate between 'admin' and 'user' roles.
ALTER TABLE auth.users ADD COLUMN role TEXT DEFAULT 'user';

-- Create a policy to allow users to read their own role.
CREATE POLICY "Allow users to read their own role" ON auth.users
FOR SELECT USING (auth.uid() = id);