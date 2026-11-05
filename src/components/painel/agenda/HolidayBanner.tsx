import { getHolidayName } from '@/lib/holidays';
import { Star } from 'lucide-react';

/** Thin one-line notice: just signals the selected day is a holiday. */
const HolidayBanner = ({ date }: { date: Date }) => {
  const name = getHolidayName(date);
  if (!name) return null;
  return (
    <div className="agenda-holiday" role="note">
      <Star className="h-3 w-3 fill-current" /> <span className="truncate">Feriado · {name}</span>
    </div>
  );
};

export default HolidayBanner;
