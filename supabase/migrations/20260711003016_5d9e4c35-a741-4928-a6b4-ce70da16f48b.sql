
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email IN ('casal.teste@meugrandedia.com','fornecedor.teste@meugrandedia.com');

INSERT INTO public.profiles (user_id, full_name, account_type)
SELECT u.id, 'Ana e Bruno (Teste)', 'couple'
FROM auth.users u
WHERE u.email = 'casal.teste@meugrandedia.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.couples (user_id)
SELECT u.id FROM auth.users u
WHERE u.email = 'casal.teste@meugrandedia.com'
  AND NOT EXISTS (SELECT 1 FROM public.couples c WHERE c.user_id = u.id);

UPDATE public.couples SET
  couple_role = 'noiva',
  partner_name = 'Bruno',
  wedding_date = (CURRENT_DATE + INTERVAL '8 months')::date,
  estimated_guests = 150,
  estimated_budget = 90000,
  target_budget = 90000,
  wedding_city = 'São Paulo',
  wedding_style = 'Rústico chique',
  ceremony_time = '16:30',
  ceremony_address = 'Rua Harmonia, 500 - Vila Madalena, São Paulo/SP',
  reception_address = 'Espaço Villa Bisutti, São Paulo/SP',
  contact_phone = '+55 11 98888-0001',
  dress_code = 'Traje esporte fino',
  invite_message = 'Com muito amor, convidamos você para celebrar o nosso "sim"!',
  needed_services = ARRAY(
    SELECT id FROM public.categories
    WHERE slug IN ('espacos-buffet','fotografia','decoracao','musica-dj','bolos-doces')
  ),
  onboarding_completed = true,
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'casal.teste@meugrandedia.com');

UPDATE public.suppliers SET
  category_id = (SELECT id FROM public.categories WHERE slug = 'decoracao'),
  description = 'Studio de decoração autoral especializado em casamentos rústico-chique. Projetos personalizados com flores frescas, iluminação afetiva e mobiliário exclusivo.',
  city = 'São Paulo',
  state = 'SP',
  phone = '+55 11 97777-0002',
  whatsapp = '+55 11 97777-0002',
  email = 'fornecedor.teste@meugrandedia.com',
  instagram = '@studioflordeliz',
  price_min = 8000,
  price_max = 45000,
  guest_min = 50,
  guest_max = 400,
  onboarding_completed = true,
  onboarding_step = 5,
  status = 'pending',
  updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'fornecedor.teste@meugrandedia.com');

INSERT INTO public.couple_public_profiles (couple_id, slug, nome_casal, bio, estilo, foto_perfil_url, foto_capa_url, publico)
SELECT
  c.id,
  'ana-e-bruno-teste',
  'Ana & Bruno',
  'Uma noiva apaixonada por flores do campo e um noivo fã de vinil. Estamos organizando nosso casamento com muito carinho — acompanhe nossa jornada por aqui!',
  'Rústico chique',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600',
  true
FROM public.couples c
JOIN auth.users u ON u.id = c.user_id
WHERE u.email = 'casal.teste@meugrandedia.com'
ON CONFLICT (couple_id) DO UPDATE SET
  nome_casal = EXCLUDED.nome_casal,
  bio = EXCLUDED.bio,
  estilo = EXCLUDED.estilo,
  foto_perfil_url = EXCLUDED.foto_perfil_url,
  foto_capa_url = EXCLUDED.foto_capa_url,
  publico = true,
  updated_at = now();
