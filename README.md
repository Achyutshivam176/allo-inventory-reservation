
# Allo Inventory Reservation System

A concurrency-safe inventory reservation system built using Next.js, Prisma, and PostgreSQL for multi-warehouse e-commerce and D2C inventory management.

## Project Overview

This project solves the classic inventory race-condition problem faced during checkout flows in modern e-commerce systems.

When users proceed to checkout, inventory units are temporarily reserved instead of being permanently deducted immediately. This prevents overselling while also avoiding unnecessary stock depletion caused by abandoned carts.

The implementation focuses heavily on:
- Correctness under concurrency
- Transactional consistency
- Reservation lifecycle management
- Reliable inventory tracking

---

# Features

- Multi-warehouse inventory management
- Product-wise stock tracking
- Temporary inventory reservations
- Reservation confirmation flow
- Reservation release/cancellation flow
- Reservation expiry handling
- Concurrency-safe reservation logic
- Idempotent reservation and confirmation APIs
- Prisma + PostgreSQL integration
- Next.js App Router architecture
- Seeded demo data for quick testing

---

# Tech Stack

- Next.js (App Router)
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Tailwind CSS
- Zod Validation

---

# Architecture Overview

## Core Models

### Product
Represents a purchasable product.

### Warehouse
Represents inventory storage locations.

### Inventory
Tracks:
- total available units
- currently reserved units
- stock per warehouse

### Reservation
Tracks:
- reservation status
- reserved quantity
- reservation expiry
- confirmation lifecycle

### IdempotencyKey
Stores request keys and cached responses for safe request retries.

---

# Concurrency Strategy

The primary focus of this implementation is correctness under concurrency.

Reservation creation uses:
- database transactions
- row-level inventory locking
- atomic inventory updates

This ensures that if multiple users attempt to reserve the last available unit simultaneously:
- only one reservation succeeds
- all others receive a `409 Conflict`

This prevents overselling and inventory inconsistency.

---

# API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List products with inventory |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Create reservation |
| GET | `/api/reservations/:id` | Fetch reservation details |
| POST | `/api/reservations/:id/confirm` | Confirm reservation |
| POST | `/api/reservations/:id/release` | Release reservation |
| POST | `/api/cleanup-expired` | Cleanup expired reservations |

---

# Reservation Expiry Strategy

Expired reservations are automatically released using lazy cleanup logic before inventory reads and reservation operations.

This approach keeps the implementation lightweight while maintaining consistency.

In production, this could be extended using:
- Vercel Cron Jobs
- Background Workers
- Queue-based cleanup systems

---

# Idempotency

The following endpoints support idempotency:
- `POST /api/reservations`
- `POST /api/reservations/:id/confirm`

Clients can provide an `Idempotency-Key` header.

If the same request is retried:
- the server returns the original response
- duplicate side effects are prevented

---

# Local Development Setup

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

Create a `.env` file:

```env
DATABASE_URL="your_postgres_connection_string"
```

---

## 3. Run database migrations

```bash
npx prisma migrate dev --name init
```

---

## 4. Seed the database

```bash
npx prisma db seed
```

---

## 5. Start the development server

```bash
npm run dev
```

---

# Seed Data

The database includes:
- sample products
- warehouses
- inventory records

This allows the application to work immediately after deployment.

---

# Trade-offs & Design Decisions

- Lazy cleanup was used instead of a dedicated worker system to reduce infrastructure complexity.
- The frontend UI is intentionally minimal to prioritize backend correctness and concurrency handling.
- Redis-based distributed locking was intentionally avoided to keep the implementation focused and maintainable.
- Idempotency was implemented only for the two most important write operations.

---

# Future Improvements

Given more time, the following enhancements could be added:
- Real-time inventory updates
- Background worker-based expiry processing
- Distributed locking with Redis
- Reservation analytics dashboard
- Authentication and user-specific reservations
- Better frontend UX and optimistic UI updates

---

# Deployment

Recommended deployment stack:
- Vercel (Frontend + API)
- Supabase PostgreSQL (Database)

---

# Key Focus Areas

This implementation prioritizes:
- correctness
- reliability
- transactional consistency
- sensible backend structure

over advanced frontend complexity.
````
