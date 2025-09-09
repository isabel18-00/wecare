-- Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  minimum_quantity INTEGER DEFAULT 10,
  unit TEXT,
  category TEXT,
  last_restocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for admins" ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.role() = 'authenticated');

-- Add RLS policies for inventory
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.inventory
  FOR SELECT
  USING (true);

CREATE POLICY "Enable all for admins" ON public.inventory
  USING (auth.role() = 'authenticated');

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update updated_at on inventory updates
CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Get the current user ID
  SELECT auth.uid() INTO v_user_id;
  
  -- Determine the action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_data := to_jsonb(OLD);
    v_new_data := NULL;
  END IF;
  
  -- Insert the activity log
  INSERT INTO public.activity_logs (
    user_id, 
    action, 
    table_name, 
    record_id, 
    old_data, 
    new_data,
    ip_address,
    user_agent
  ) VALUES (
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    CASE WHEN v_action = 'DELETE' THEN v_old_data->'id'::TEXT::UUID ELSE v_new_data->'id'::TEXT::UUID END,
    v_old_data,
    v_new_data,
    NULL, -- You can set these from request headers if needed
    NULL
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
