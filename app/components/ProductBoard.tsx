'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Product = {
  id: string;
  name: string;
  sku: string;
  inventories: { id: string; warehouse: { id: string; name: string; location?: string | null }; totalUnits: number; reservedUnits: number; availableUnits: number }[];
};

type Warehouse = { id: string; name: string; location?: string | null };

type ApiResponse = { products: Product[]; warehouses: Warehouse[] };

export default function ProductBoard() {
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/products', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load products');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const totalAvailable = useMemo(() => {
    if (!data) return 0;
    return data.products.reduce((sum, p) => sum + p.inventories.reduce((s, i) => s + i.availableUnits, 0), 0);
  }, [data]);

  const reserve = async (productId: string, warehouseId: string) => {
    setBusyId(`${productId}-${warehouseId}`);
    setError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`);
      }
      router.push(`/reservations/${json.reservation.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-3xl font-bold">Allo Inventory Reservation</h1>
        <p className="mt-2 text-slate-600">Concurrency-safe inventory holds with confirmation, release, expiry, and idempotency.</p>
        <div className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
          Total available units across all products: <span className="ml-2 font-semibold">{totalAvailable}</span>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
      {loading ? <div className="rounded-xl bg-white p-6 shadow-sm">Loading products…</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        {data?.products.map((product) => (
          <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{product.name}</h2>
                <p className="text-sm text-slate-500">SKU: {product.sku}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {product.inventories.map((inv) => (
                <div key={inv.id} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{inv.warehouse.name}</p>
                      <p className="text-sm text-slate-500">{inv.warehouse.location || 'No location'}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Total: <span className="font-semibold">{inv.totalUnits}</span></p>
                      <p>Reserved: <span className="font-semibold">{inv.reservedUnits}</span></p>
                      <p>Available: <span className="font-semibold">{inv.availableUnits}</span></p>
                    </div>
                  </div>
                  <button
                    className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                    disabled={busyId === `${product.id}-${inv.warehouse.id}` || inv.availableUnits <= 0}
                    onClick={() => reserve(product.id, inv.warehouse.id)}
                  >
                    {busyId === `${product.id}-${inv.warehouse.id}` ? 'Reserving…' : 'Reserve 1 unit'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
