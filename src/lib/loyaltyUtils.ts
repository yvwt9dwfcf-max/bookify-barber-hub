import { supabase } from '@/integrations/supabase/client';

/**
 * Awards loyalty points to a customer after an appointment is completed.
 * Creates the loyalty card if it doesn't exist yet.
 */
export async function awardLoyaltyPoints(appointment: {
  id: string;
  customer_name: string;
  customer_phone: string;
  barbershop_id: string | null;
}) {
  if (!appointment.barbershop_id) return;

  // Check if loyalty is active for this barbershop
  const { data: config } = await supabase
    .from('loyalty_config')
    .select('*')
    .eq('barbershop_id', appointment.barbershop_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!config) return;

  const pointsPerVisit = (config as any).points_per_visit ?? 1;

  // Find or create loyalty card
  let { data: card } = await supabase
    .from('loyalty_cards')
    .select('*')
    .eq('barbershop_id', appointment.barbershop_id)
    .eq('customer_phone', appointment.customer_phone)
    .maybeSingle();

  if (!card) {
    const { data: newCard, error: insertError } = await supabase
      .from('loyalty_cards')
      .insert({
        barbershop_id: appointment.barbershop_id,
        customer_name: appointment.customer_name,
        customer_phone: appointment.customer_phone,
        total_points: 0,
        total_visits: 0,
      })
      .select()
      .single();

    if (insertError || !newCard) return;
    card = newCard;
  }

  // Check if points were already awarded for this appointment
  const { data: existingTx } = await supabase
    .from('loyalty_transactions')
    .select('id')
    .eq('appointment_id', appointment.id)
    .eq('type', 'earn')
    .maybeSingle();

  if (existingTx) return; // Already awarded

  // Award points
  const newPoints = card.total_points + pointsPerVisit;
  const newVisits = card.total_visits + 1;

  await supabase
    .from('loyalty_cards')
    .update({ total_points: newPoints, total_visits: newVisits })
    .eq('id', card.id);

  await supabase
    .from('loyalty_transactions')
    .insert({
      loyalty_card_id: card.id,
      barbershop_id: appointment.barbershop_id,
      points: pointsPerVisit,
      type: 'earn',
      description: `Pontos por atendimento concluído`,
      appointment_id: appointment.id,
    });
}
