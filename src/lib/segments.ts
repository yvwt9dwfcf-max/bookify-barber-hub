export type BusinessSegment =
  | "barbershop" | "salon" | "nails" | "aesthetics" | "massage"
  | "tattoo" | "petshop" | "automotive" | "other";

export interface SegmentVocabulary {
  label: string;
  business: string;
  professional: string;
  professionals: string;
  service: string;
  suggestedServices: { name: string; duration: number; price: number }[];
}

export const SEGMENTS: Record<BusinessSegment, SegmentVocabulary> = {
  barbershop: { label: "Barbearia", business: "Barbearia", professional: "Barbeiro", professionals: "Barbeiros", service: "Serviço",
    suggestedServices: [{ name: "Corte", duration: 30, price: 45 }, { name: "Barba", duration: 30, price: 35 }, { name: "Corte + Barba", duration: 60, price: 75 }] },
  salon: { label: "Salão de beleza", business: "Salão", professional: "Profissional", professionals: "Profissionais", service: "Serviço",
    suggestedServices: [{ name: "Corte feminino", duration: 60, price: 80 }, { name: "Escova", duration: 45, price: 60 }, { name: "Coloração", duration: 120, price: 180 }] },
  nails: { label: "Manicure e pedicure", business: "Estúdio", professional: "Manicure", professionals: "Manicures", service: "Serviço",
    suggestedServices: [{ name: "Mão", duration: 45, price: 35 }, { name: "Pé", duration: 45, price: 40 }, { name: "Alongamento em gel", duration: 120, price: 150 }] },
  aesthetics: { label: "Estética, sobrancelha e cílios", business: "Clínica", professional: "Esteticista", professionals: "Esteticistas", service: "Procedimento",
    suggestedServices: [{ name: "Design de sobrancelha", duration: 30, price: 45 }, { name: "Extensão de cílios", duration: 120, price: 180 }, { name: "Limpeza de pele", duration: 60, price: 120 }] },
  massage: { label: "Massoterapia e clínicas", business: "Clínica", professional: "Terapeuta", professionals: "Terapeutas", service: "Sessão",
    suggestedServices: [{ name: "Massagem relaxante", duration: 60, price: 120 }, { name: "Drenagem linfática", duration: 60, price: 130 }] },
  tattoo: { label: "Tatuagem e piercing", business: "Estúdio", professional: "Tatuador", professionals: "Tatuadores", service: "Sessão",
    suggestedServices: [{ name: "Sessão de tatuagem", duration: 120, price: 300 }, { name: "Piercing", duration: 30, price: 80 }] },
  petshop: { label: "Pet shop (banho e tosa)", business: "Pet shop", professional: "Tosador", professionals: "Tosadores", service: "Serviço",
    suggestedServices: [{ name: "Banho", duration: 60, price: 60 }, { name: "Banho e tosa", duration: 90, price: 90 }] },
  automotive: { label: "Estética automotiva", business: "Estúdio", professional: "Detalhador", professionals: "Detalhadores", service: "Serviço",
    suggestedServices: [{ name: "Lavagem detalhada", duration: 120, price: 150 }, { name: "Polimento técnico", duration: 480, price: 800 }, { name: "Vitrificação", duration: 480, price: 1500 }] },
  other: { label: "Outro negócio", business: "Empresa", professional: "Profissional", professionals: "Profissionais", service: "Serviço",
    suggestedServices: [] },
};

export function getSegment(value?: string | null): SegmentVocabulary {
  return SEGMENTS[(value as BusinessSegment)] ?? SEGMENTS.barbershop;
}

/** Recepção e dono gestor não consomem vaga de profissional. */
export function consumesProfessionalSeat(opts: { role: "master" | "barber" | "receptionist"; ownerAttends?: boolean }): boolean {
  if (opts.role === "receptionist") return false;
  if (opts.role === "master") return opts.ownerAttends !== false;
  return true;
}

/** Assinatura válida: dentro da validade e com usos disponíveis (null = ilimitado). */
export function isSubscriptionUsable(sub: { expires_at: string; uses_count: number }, usesLimit: number | null, today = new Date()): boolean {
  const todayStr = today.toISOString().slice(0, 10);
  if (sub.expires_at < todayStr) return false;
  return usesLimit == null || sub.uses_count < usesLimit;
}

export interface Vocab {
  segment: SegmentVocabulary;
  business: string; businessLower: string;
  pro: string; proLower: string; pros: string; prosLower: string;
}

/** Vocabulário por segmento; sem segmento definido, usa termos neutros. */
export function getVocab(value?: string | null): Vocab {
  const s = value && SEGMENTS[value as BusinessSegment] ? SEGMENTS[value as BusinessSegment] : NEUTRAL;
  return {
    segment: s,
    business: s.business, businessLower: s.business.toLowerCase(),
    pro: s.professional, proLower: s.professional.toLowerCase(),
    pros: s.professionals, prosLower: s.professionals.toLowerCase(),
  };
}

const NEUTRAL: SegmentVocabulary = { label: "Negócio", business: "Negócio", professional: "Profissional", professionals: "Profissionais", service: "Serviço", suggestedServices: [] };

/** Caminho do link público: barbearias mantêm /barbearia, demais segmentos usam /p (ambos abrem a mesma página). */
export function publicBookingPath(segment: string | null | undefined, slug: string): string {
  return `${segment === "barbershop" ? "/barbearia" : "/p"}/${slug}`;
}

/** Exemplo de serviço para placeholders, conforme o segmento. */
export function exampleServiceName(segment: string | null | undefined): string {
  const s = segment && SEGMENTS[segment as BusinessSegment];
  return s?.suggestedServices[0]?.name ?? "Atendimento padrão";
}
