UPDATE public.couple_public_profiles
SET slug='ana-e-bruno-teste',
    foto_perfil_url=COALESCE(foto_perfil_url,'https://images.unsplash.com/photo-1519741497674-611481863552?w=600'),
    foto_capa_url=COALESCE(foto_capa_url,'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1600'),
    bio=COALESCE(NULLIF(bio,''),'Ana e Bruno vão casar em um lindo cerimonial rústico chique em São Paulo. Acompanhe nossos preparativos!')
WHERE couple_id='39f7ccef-f825-4511-993e-c7d07a6c02c1';