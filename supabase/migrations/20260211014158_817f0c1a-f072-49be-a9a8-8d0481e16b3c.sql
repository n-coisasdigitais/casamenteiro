
-- Disable FK checks for this transaction
SET session_replication_role = 'replica';

INSERT INTO public.suppliers (user_id, company_name, description, category_id, city, state, status, rating, review_count, price_min, price_max, guest_min, guest_max, featured, promo_percentage) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Villa Bianca Eventos', 'Espaço sofisticado com jardins encantadores para cerimônias ao ar livre e recepções elegantes.', '875d4734-10b5-43f4-822e-aeb417801976', 'São Paulo', 'SP', 'approved', 4.9, 127, 25000, 85000, 100, 500, true, NULL),
  ('00000000-0000-0000-0000-000000000002', 'Doce Encanto Confeitaria', 'Bolos artísticos e mesas de doces personalizadas para casamentos inesquecíveis.', 'ac7620d0-2009-4a44-938a-f72df04249e4', 'Rio de Janeiro', 'RJ', 'approved', 4.8, 89, 3500, 15000, NULL, NULL, false, 15),
  ('00000000-0000-0000-0000-000000000003', 'Lucas Ferreira Fotografia', 'Fotógrafo premiado especializado em casamentos. Estilo fine art e documental.', 'cd32f8b9-99db-46ae-b16d-e25d8b203608', 'Belo Horizonte', 'MG', 'approved', 5.0, 203, 5000, 18000, NULL, NULL, true, NULL),
  ('00000000-0000-0000-0000-000000000004', 'DJ Ricardo Santos', 'DJ profissional com mais de 10 anos de experiência em casamentos.', '1b00a4cd-c438-4d38-8f43-9527f43ab011', 'São Paulo', 'SP', 'approved', 4.7, 156, 3000, 8000, NULL, NULL, false, NULL),
  ('00000000-0000-0000-0000-000000000005', 'Atelier Maria Helena', 'Vestidos de noiva sob medida com tecidos importados. Alta costura.', '39bc0917-c078-4590-9fda-651dada9a86f', 'Curitiba', 'PR', 'approved', 4.9, 67, 8000, 35000, NULL, NULL, true, 10),
  ('00000000-0000-0000-0000-000000000006', 'Celebrare Cerimonial', 'Assessoria completa para casamentos, do planejamento à execução.', 'b8045808-327c-4f6d-ac4c-f031fbd79c34', 'São Paulo', 'SP', 'approved', 4.6, 94, 6000, 25000, NULL, NULL, false, NULL),
  ('00000000-0000-0000-0000-000000000007', 'Flores & Cores Decoração', 'Decoração floral e cenográfica para casamentos. Ambientes mágicos.', '88191072-fae1-435f-b81f-422f205d8e37', 'Rio de Janeiro', 'RJ', 'approved', 4.8, 112, 10000, 50000, 50, 400, false, 20),
  ('00000000-0000-0000-0000-000000000008', 'Studio Glam Noivas', 'Maquiagem e penteado para noivas com produtos de alta qualidade.', '9fccc9a0-5d80-42ae-a065-5ce198fe6909', 'Salvador', 'BA', 'approved', 4.5, 78, 1500, 5000, NULL, NULL, false, NULL),
  ('00000000-0000-0000-0000-000000000009', 'Cine Wedding Films', 'Vídeos cinematográficos de casamento. Drone e same day edit em 4K.', 'fbe5dec3-5679-4440-bf29-678cac9e62a2', 'Brasília', 'DF', 'approved', 4.9, 145, 7000, 20000, NULL, NULL, true, NULL),
  ('00000000-0000-0000-0000-000000000010', 'Elegance Convites', 'Convites personalizados em papel especial com design exclusivo.', '319acb22-01f0-4a30-a371-fd0d314f9849', 'Porto Alegre', 'RS', 'approved', 4.4, 56, 800, 5000, NULL, NULL, false, NULL);

-- Re-enable FK checks
SET session_replication_role = 'origin';
