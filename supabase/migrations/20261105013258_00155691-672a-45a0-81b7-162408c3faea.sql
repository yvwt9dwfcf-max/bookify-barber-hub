INSERT INTO public.opening_hours (barber_id, barbershop_id, day_of_week, is_open, start_time, end_time)
SELECT b.id, b.barbershop_id, d, d <> 0, '09:00', CASE WHEN d = 6 THEN '14:00'::time ELSE '18:00'::time END
FROM public.barbers b CROSS JOIN generate_series(0,6) d
WHERE NOT EXISTS (SELECT 1 FROM public.opening_hours oh WHERE oh.barber_id = b.id);