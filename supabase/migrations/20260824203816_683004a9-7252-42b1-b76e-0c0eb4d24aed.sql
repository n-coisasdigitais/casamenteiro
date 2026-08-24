GRANT SELECT (
  id, user_id, company_name, description, category_id, city, state, status,
  created_at, updated_at, rating, review_count, price_min, price_max,
  guest_min, guest_max, featured, promo_percentage, instagram, website,
  profile_photo_url, accepts_idle_dates, idle_discount_pct, is_demo,
  onboarding_completed, onboarding_step, aparece_na_home, cover_photo_url,
  cidades_atendidas, raio_atendimento_km, lat, lng, pricing_model,
  mp_account_id, mp_connected_at, mp_token_expires_at, featured_until,
  reserva_antecedencia_min_dias, trial_ends_at
) ON public.suppliers TO anon, authenticated;
GRANT ALL ON public.suppliers TO service_role;