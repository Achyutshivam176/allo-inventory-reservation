import { ReservationStatus } from '@prisma/client';
import { prisma } from './prisma';

export async function cleanupExpiredReservations() {
  const now = new Date();
  const expired = await prisma.reservation.findMany({
    where: { status: ReservationStatus.pending, expiresAt: { lt: now } },
  });

  for (const reservation of expired) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.updateMany({
        where: { id: reservation.id, status: ReservationStatus.pending, expiresAt: { lt: now } },
        data: { status: ReservationStatus.released },
      });
      if (updated.count === 0) return;

      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: reservation.productId,
            warehouseId: reservation.warehouseId,
          },
        },
        data: { reservedUnits: { decrement: reservation.quantity } },
      });
    });
  }

  return expired.length;
}

export function isExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now();
}
