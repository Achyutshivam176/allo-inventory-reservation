const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.reservation.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  await prisma.product.createMany({
    data: [
      { name: 'Wireless Headphones', sku: 'WH-100' },
      { name: 'Smart Watch', sku: 'SW-200' },
    ],
  });

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
  });

  const p1 = products[0];
  const p2 = products[1];

  const w1 = await prisma.warehouse.create({
    data: {
      name: 'Bangalore Warehouse',
      location: 'BLR',
    },
  });

  const w2 = await prisma.warehouse.create({
    data: {
      name: 'Chennai Warehouse',
      location: 'CHE',
    },
  });

  await prisma.inventory.createMany({
    data: [
      {
        productId: p1.id,
        warehouseId: w1.id,
        totalUnits: 10,
        reservedUnits: 0,
      },
      {
        productId: p1.id,
        warehouseId: w2.id,
        totalUnits: 6,
        reservedUnits: 0,
      },
      {
        productId: p2.id,
        warehouseId: w1.id,
        totalUnits: 7,
        reservedUnits: 0,
      },
      {
        productId: p2.id,
        warehouseId: w2.id,
        totalUnits: 12,
        reservedUnits: 0,
      },
    ],
  });

  console.log('Seeded data successfully');
}

main()
  .catch((e: any) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });