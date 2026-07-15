import { useEffect, useState } from 'react';

export interface AgendaPalette {
  id: string;
  name: string;
  /** Main accent for confirmed/pending appointments (hex) */
  accent: string;
  /** Soft background tint (rgba) */
  tint: string;
  /** Text on tint */
  text: string;
}

export const AGENDA_PALETTES: AgendaPalette[] = [
  { id: 'emerald', name: 'Verde', accent: '#22C55E', tint: 'rgba(34,197,94,0.12)', text: '#22C55E' },
  { id: 'sky', name: 'Azul Céu', accent: '#38BDF8', tint: 'rgba(56,189,248,0.14)', text: '#38BDF8' },
  { id: 'indigo', name: 'Indigo', accent: '#818CF8', tint: 'rgba(129,140,248,0.14)', text: '#A5B4FC' },
  { id: 'violet', name: 'Violeta', accent: '#A78BFA', tint: 'rgba(167,139,250,0.14)', text: '#C4B5FD' },
  { id: 'fuchsia', name: 'Fúcsia', accent: '#E879F9', tint: 'rgba(232,121,249,0.14)', text: '#F0ABFC' },
  { id: 'rose', name: 'Rosa', accent: '#FB7185', tint: 'rgba(251,113,133,0.14)', text: '#FDA4AF' },
  { id: 'amber', name: 'Âmbar', accent: '#F59E0B', tint: 'rgba(245,158,11,0.14)', text: '#FBBF24' },
  { id: 'orange', name: 'Laranja', accent: '#FB923C', tint: 'rgba(251,146,60,0.14)', text: '#FDBA74' },
  { id: 'teal', name: 'Teal', accent: '#2DD4BF', tint: 'rgba(45,212,191,0.14)', text: '#5EEAD4' },
  { id: 'cyan', name: 'Ciano', accent: '#22D3EE', tint: 'rgba(34,211,238,0.14)', text: '#67E8F9' },
  { id: 'lime', name: 'Lima', accent: '#A3E635', tint: 'rgba(163,230,53,0.16)', text: '#BEF264' },
  { id: 'crimson', name: 'Carmim', accent: '#F43F5E', tint: 'rgba(244,63,94,0.14)', text: '#FB7185' },
];

const STORAGE_KEY = 'bookify-agenda-palette';
const EVENT = 'bookify:agenda-palette-change';

export const getStoredPalette = (): AgendaPalette => {
  if (typeof window === 'undefined') return AGENDA_PALETTES[0];
  const id = window.localStorage.getItem(STORAGE_KEY);
  return AGENDA_PALETTES.find(p => p.id === id) || AGENDA_PALETTES[0];
};

export const setStoredPalette = (id: string) => {
  window.localStorage.setItem(STORAGE_KEY, id);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
};

export function useAgendaPalette(): [AgendaPalette, (id: string) => void] {
  const [palette, setPalette] = useState<AgendaPalette>(getStoredPalette);

  useEffect(() => {
    const handler = () => setPalette(getStoredPalette());
    window.addEventListener(EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  return [palette, setStoredPalette];
}

/** Resolve appointment accent colors based on status + palette. */
export function getAppointmentAccent(
  status: string,
  palette: AgendaPalette
): { accent: string; tint: string; text: string } {
  if (status === 'completed') {
    return { accent: '#22C55E', tint: 'rgba(34,197,94,0.10)', text: '#4ADE80' };
  }
  if (status === 'cancelled') {
    return { accent: '#94A3B8', tint: 'rgba(148,163,184,0.10)', text: '#94A3B8' };
  }
  // confirmed + pending use the chosen palette
  return { accent: palette.accent, tint: palette.tint, text: palette.text };
}
