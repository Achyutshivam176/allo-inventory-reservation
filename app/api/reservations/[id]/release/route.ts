import { NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { cleanupExpiredReservations } from '@/lib/cleanup';

export async function POST(_: Request, { params }: { params: { id: string } }) {
  await cleanupExpiredReservations();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({ where: { id: params.id } });
      if (!reservation) return { status: 404 as const, body: { error: 'Reservation not found' } };
      if (reservation.status !== ReservationStatus.pending) {
        return { status: 200 as const, body: { reservation } };
      }

      await tx.reservation.update({ where: { id: reservation.id }, data: { status: ReservationStatus.released } });
      await tx.inventory.update({
        where: { productId_warehouseId: { productId: reservation.productId, warehouseId: reservation.warehouseId } },
        data: { reservedUnits: { decrement: reservation.quantity } },
      });

      const updated = await tx.reservation.findUnique({ where: { id: params.id }, include: { product: true, warehouse: true } });
      return { status: 200 as const, body: { reservation: updated } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: 'Release failed' }, { status: 500 });
  }
}
