import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Currency } from '@/data/readings';

// Like the website: rupees for phones set to India time, dollars elsewhere.
function guessCurrency(): Currency {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
    return tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta' ? 'inr' : 'usd';
  } catch {
    return 'usd';
  }
}

const Ctx = createContext<{ currency: Currency; setCurrency: (c: Currency) => void }>({
  currency: 'usd',
  setCurrency: () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(guessCurrency);
  return <Ctx.Provider value={{ currency, setCurrency }}>{children}</Ctx.Provider>;
}

export const useCurrency = () => useContext(Ctx);
