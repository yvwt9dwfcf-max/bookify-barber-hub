export interface BookingAppearance {
  themeStyle: 'editorial' | 'urbano';
  fontStyle: 'playfair' | 'luckiest_guy';
  accentColor: string;
  shopName?: string;
  logoUrl?: string | null;
}

export const DEFAULT_BOOKING_APPEARANCE: BookingAppearance = {
  themeStyle: 'editorial',
  fontStyle: 'playfair',
  accentColor: '#4da6ff',
};

export const isUrbanAppearance = (appearance: BookingAppearance) =>
  appearance.themeStyle === 'urbano';