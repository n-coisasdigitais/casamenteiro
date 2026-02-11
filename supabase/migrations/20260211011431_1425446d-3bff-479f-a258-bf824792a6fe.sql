
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create enum for supplier status
CREATE TYPE public.supplier_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for couple role
CREATE TYPE public.couple_role AS ENUM ('noivo', 'noiva');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('couple', 'supplier')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Couples table (wedding data)
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_name TEXT,
  couple_role couple_role,
  wedding_date DATE,
  estimated_guests INTEGER,
  estimated_budget NUMERIC,
  needed_services UUID[] DEFAULT '{}',
  invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Couple links (linking two accounts)
CREATE TABLE public.couple_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (couple_id, linked_user_id)
);

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  status supplier_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Supplier photos
CREATE TABLE public.supplier_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Couple favorites
CREATE TABLE public.couple_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (couple_id, supplier_id)
);

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to get couple_id for a user (including linked accounts)
CREATE OR REPLACE FUNCTION public.get_couple_id_for_user(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.couples WHERE user_id = _user_id LIMIT 1),
    (SELECT couple_id FROM public.couple_links WHERE linked_user_id = _user_id LIMIT 1)
  )
$$;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_couples_updated_at BEFORE UPDATE ON public.couples FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'couple')
  );
  
  -- If couple, auto-create couples record
  IF COALESCE(NEW.raw_user_meta_data->>'account_type', 'couple') = 'couple' THEN
    INSERT INTO public.couples (user_id) VALUES (NEW.id);
  END IF;
  
  -- If supplier, auto-create suppliers record
  IF NEW.raw_user_meta_data->>'account_type' = 'supplier' THEN
    INSERT INTO public.suppliers (user_id, company_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'));
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== RLS POLICIES ====================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_favorites ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles: only readable, managed by admin
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Categories: public read
CREATE POLICY "Categories are public" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Categories public anon" ON public.categories FOR SELECT TO anon USING (true);

-- Couples: owner or linked user can read/update
CREATE POLICY "Couple owner can read" ON public.couples FOR SELECT USING (
  auth.uid() = user_id OR auth.uid() IN (SELECT linked_user_id FROM public.couple_links WHERE couple_id = id)
);
CREATE POLICY "Couple owner can update" ON public.couples FOR UPDATE USING (
  auth.uid() = user_id OR auth.uid() IN (SELECT linked_user_id FROM public.couple_links WHERE couple_id = id)
);

-- Couple links: couple owner or linked user can read
CREATE POLICY "Couple links readable by members" ON public.couple_links FOR SELECT USING (
  auth.uid() = linked_user_id OR auth.uid() IN (SELECT user_id FROM public.couples WHERE id = couple_id)
);
CREATE POLICY "Couple owner can insert link" ON public.couple_links FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.couples WHERE id = couple_id)
  OR auth.uid() = linked_user_id
);

-- Suppliers: approved ones are public, owners can manage their own
CREATE POLICY "Approved suppliers are public" ON public.suppliers FOR SELECT USING (
  status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Supplier owner can update" ON public.suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin can update suppliers" ON public.suppliers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Supplier photos: public for approved suppliers, owner can manage
CREATE POLICY "Photos of approved suppliers are public" ON public.supplier_photos FOR SELECT USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE status = 'approved')
  OR supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Supplier owner can insert photos" ON public.supplier_photos FOR INSERT WITH CHECK (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
);
CREATE POLICY "Supplier owner can delete photos" ON public.supplier_photos FOR DELETE USING (
  supplier_id IN (SELECT id FROM public.suppliers WHERE user_id = auth.uid())
);

-- Couple favorites
CREATE POLICY "Couple can manage favorites" ON public.couple_favorites FOR ALL USING (
  couple_id = public.get_couple_id_for_user(auth.uid())
);

-- Storage bucket for supplier photos
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-photos', 'supplier-photos', true);

CREATE POLICY "Anyone can view supplier photos" ON storage.objects FOR SELECT USING (bucket_id = 'supplier-photos');
CREATE POLICY "Authenticated users can upload supplier photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'supplier-photos');
CREATE POLICY "Users can delete own supplier photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'supplier-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed categories
INSERT INTO public.categories (name, slug, icon) VALUES
  ('Espaços e Buffet', 'espacos-buffet', 'building'),
  ('Fotografia', 'fotografia', 'camera'),
  ('Vídeo', 'video', 'video'),
  ('Música e DJ', 'musica-dj', 'music'),
  ('Decoração', 'decoracao', 'flower'),
  ('Convites', 'convites', 'mail'),
  ('Vestido de Noiva', 'vestido-noiva', 'shirt'),
  ('Traje do Noivo', 'traje-noivo', 'shirt'),
  ('Beleza e Maquiagem', 'beleza-maquiagem', 'sparkles'),
  ('Bolos e Doces', 'bolos-doces', 'cake'),
  ('Cerimonialista', 'cerimonialista', 'clipboard'),
  ('Transporte', 'transporte', 'car');
