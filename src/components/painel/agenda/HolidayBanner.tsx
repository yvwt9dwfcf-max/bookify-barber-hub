import { getHolidayName } from '@/lib/holidays';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Star } from 'lucide-react';

interface HolidayBannerProps {
  date: Date;
}

const HolidayBanner = ({ date }: HolidayBannerProps) => {
  const holidayName = getHolidayName(date);

  if (!holidayName) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in">
      <Star className="h-3.5 w-3.5 text-amber-500 shrink-0 fill-amber-500" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 truncate">
          Feriado — {holidayName}
        </p>
        <p className="text-[10px] text-amber-600/70 dark:text-amber-400/60 capitalize">
          {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>
    </div>
  );
};

export default HolidayBanner;
