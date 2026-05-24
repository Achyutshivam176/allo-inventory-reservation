'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Reservation = {
  id: string;
  status: 'pending' | 'confirmed' | 'released';
  quantity: number;
  expiresAt: string;
  product: { id: string; name: string; sku: string };
  warehouse: { id: string; name: string; location?: string | null };
};

export default function ReservationView({ reservationId }: { reservationId: string }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reservations/${reservationId}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load reservation');
      setReservation(json.reservation);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [reservationId]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsLeft = useMemo(() => {
    if (!reservation) return 0;
    return Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - now) / 1000));
  }, [reservation, now]);

  const confirm = async () => {
    setActionBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reservations/${reservationId}/confirm`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  const cancel = async () => {
    setActionBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/reservations/${reservationId}/release`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      await load();
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <div className="rounded-xl bg-white p-6 shadow-sm">Loading reservation…</div>;
  if (error && !reservation) return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  if (!reservation) return null;

  return (
    <main className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reservation Details</h1>
            <p className="mt-2 text-slate-600">Reservation ID: {reservation.id}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium">Status: {reservation.status}</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Product</p>
            <p className="font-semibold">{reservation.product.name}</p>
            <p className="text-sm text-slate-500">SKU: {reservation.product.sku}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Warehouse</p>
            <p className="font-semibold">{reservation.warehouse.name}</p>
            <p className="text-sm text-slate-500">{reservation.warehouse.location || 'No location'}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Quantity</p>
            <p className="font-semibold">{reservation.quantity}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Expires In</p>
            <p className="font-semibold">{secondsLeft}s</p>
          </div>
        </div>

        {reservation.status === 'pending' ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={confirm}
              disabled={actionBusy || secondsLeft <= 0}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {actionBusy ? 'Working…' : 'Confirm purchase'}
            </button>
            <button
              onClick={cancel}
              disabled={actionBusy}
              className="rounded-xl bg-rose-600 px-4 py-2 text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}
      </div>

      <button onClick={() => router.push('/')} className="text-sm text-slate-600 underline">Back to products</button>
    </main>
  );
}
