import { NextRequest, NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cleanupExpiredReservations, isExpired } from '@/lib/cleanup';
import { getIdempotentResponse, storeIdempotentResponse } from '@/lib/idempotency';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const idempotencyKey = req.headers.get('Idempotency-Key');
  const cached = await getIdempotentResponse(`/api/reservations/${params.id}/confirm`, idempotencyKey);
  if (cached) return NextResponse.json(cached.body, { status: cached.statusCode });

  await cleanupExpiredReservations();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id: params.id } });
      if (!reservation) return { status: 404 as const, body: { error: 'Reservation not found' } };
      if (reservation.status !== ReservationStatus.pending) {
        return { status: 400 as const, body: { error: 'Reservation is not pending' } };
      }
      if (isExpired(reservation.expiresAt)) {
        await tx.reservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.released } });
        await tx.inventory.update({
          where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
          data: { reservedUnits: { decrement: reservation.quantity } },
        });
        return { status: 410 as const, body: { error: 'Reservation expired' } };
      }

      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: ReservationStatus.confirmed },
      });
      await tx.inventory.update({
        where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
        data: { reservedUnits: { decrement: reservation.quantity }, totalUnits: { decrement: reservation.quantity } },
      });

      const updated = await tx.reservation.findUnique({ where: { id: params.id }, include: { product: true, warehouse: true } });
      return { status: 200 as const, body: { reservation: updated } };
    });

    if (idempotencyKey) {
      await storeIdempotentResponse(`/api/reservations/${params.id}/confirm`, idempotencyKey, result.status, result.body);
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'Confirm failed' }, { status: 500 });
  }
}
