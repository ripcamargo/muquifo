import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeRequests } from '../../services/bookings';
import { subscribeLeads } from '../../services/leads';
import type { BookingRequest, Lead } from '../../types';

interface AdminData {
  requests: BookingRequest[] | null;
  leads: Lead[] | null;
  error: unknown;
  /** Pedido aberto na gaveta de detalhes. */
  openRequestId: string | null;
  openRequest: (id: string | null) => void;
}

const Ctx = createContext<AdminData | null>(null);

/** Pedidos e leads em tempo real enquanto o painel estiver aberto (listeners encerrados ao sair). */
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<BookingRequest[] | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [openRequestId, openRequest] = useState<string | null>(null);

  useEffect(() => {
    const offRequests = subscribeRequests(setRequests, setError);
    const offLeads = subscribeLeads(setLeads, setError);
    return () => {
      offRequests();
      offLeads();
    };
  }, []);

  const value = useMemo(
    () => ({ requests, leads, error, openRequestId, openRequest }),
    [requests, leads, error, openRequestId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminData(): AdminData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminData fora do AdminDataProvider');
  return ctx;
}
