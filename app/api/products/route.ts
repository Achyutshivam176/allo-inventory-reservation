import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cleanupExpiredReservations } from '@/lib/cleanup';

export async function GET() {
  await cleanupExpiredReservations();

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      inventories: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: 'asc' } },
      },
    },
  });

  const formatted = products.map((product) => ({
    ...product,
    inventories: product.inventories.map((inventory) => ({
      ...inventory,
      availableUnits: inventory.totalUnits - inventory.reservedUnits,
    })),
  }));

  return NextResponse.json({ products: formatted, warehouses: await prisma.warehouse.findMany({ orderBy: { name: 'asc' } }) });
}
