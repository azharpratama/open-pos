# OpenPOS — Offline-First F&B Point-of-Sale & Micro-ERP

<div align="center">

**Offline-First Tablet Point-of-Sale (POS) & Micro-ERP for F&B Businesses**  
*Engineered for high-throughput cafe & eatery environments with zero internet disruption.*

[![Next.js 16](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Turbopack](https://img.shields.io/badge/Turbopack-blueviolet?style=for-the-badge&logo=turbopack)](https://nextjs.org/docs/architecture/turbopack)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-293_Tests_Passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-28_E2E_Tests-45BA4B?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

[Live Demo](#live-demo) • [Screenshots](#screenshots) • [Features](#key-features) • [Case Study](#case-study-production-deployment) • [Architecture](#system-architecture) • [Security & Database](#security--database-architecture) • [Quickstart](#quickstart--local-development) • [Operational Guide](#panduan-operasional)

</div>

---

## Live Demo

A public demonstration deployment on Vercel is being prepared:

- **Demo URL:** Coming Soon (Vercel deployment in progress)
- **Owner Demo:** `owner@openpos.dev` (Password: `password123`)
- **Cashier Demo:** `kasir@openpos.dev` (Password: `password123`)

---

## Screenshots

<div align="center">

### Cashier POS Terminal (`/kasir`)
*Tablet-optimized product matrix, instant category filtering, real-time cart mutations, and split-bill settlement.*

![Cashier POS Terminal](docs/screenshots/cashier-pos.png)

<br/>

### Owner & Back-Office ERP (`/owner`)
*Executive revenue analytics, net margins, sales velocity charts, and top-selling menu items.*

![Owner ERP Dashboard](docs/screenshots/owner-dashboard.png)

<br/>

### Order Queue & Floor Management (`/kasir/antrian`)
*Live floor table tracking, open-bill status tags, and direct Web Bluetooth 58mm/80mm ESC/POS thermal printing.*

![Order Queue & Floor Management](docs/screenshots/order-queue.png)

<br/>

### Financial Bookkeeping & Cash Book (`/owner/pembukuan`)
*Integrated income statement, running cash-book ledger, and automated Excel (.xlsx) export.*

![Financial Bookkeeping & Cash Book](docs/screenshots/owner-pembukuan.png)

</div>

---

## Executive Summary

**OpenPOS** is an open-source, tablet-optimized Point-of-Sale (POS) and micro-ERP engineered for high-concurrency food and beverage operations. 

In traditional cloud POS systems, a momentary loss of internet connectivity freezes checkout lines, drops table orders, and stops kitchen receipts. OpenPOS eliminates this vulnerability using an **offline-first local mutation queue (IndexedDB + Service Worker)** combined with **direct browser-to-hardware thermal receipt printing via Web Bluetooth Low Energy (BLE)**.

---

## Case Study: Production Deployment

OpenPOS was designed, developed, and battle-tested in live production for high-volume coffee shops and multi-level eateries with peak weekend order volumes.

### Operational Challenges Solved:
1. **Unstable WiFi / Network Drops:** During peak hours or router reboots, orders are instantly written to local IndexedDB and printed to the thermal receipt printer without delay. Mutations automatically sync idempotently to PostgreSQL once network re-establishes.
2. **Hardware Friction:** Standard web POS systems require bulky native print servers or desktop drivers. OpenPOS speaks raw ESC/POS byte streams directly over **Web Bluetooth Low Energy (BLE)** to standard 58mm/80mm thermal printers (e.g., CBT-58ii).
3. **Kitchen & Bill Management:** Built-in split-bill calculator, open-bill tabs for dine-in guests, floor reservations, and automatic Bill of Materials (BOM) inventory depletion on order confirmation.

---

## Key Features

### Cashier Operations (`/kasir`)
- **Tablet-Optimized Menu Matrix:** Fast category filtering, real-time stock availability badges, and instant cart updates.
- **Offline Order Queue:** Cashiers can continue taking orders completely offline. Queued orders are tagged and reconciled automatically.
- **Split Bill & Table Tabs:** Supports partial payments, split bills, and table switching.
- **Web Bluetooth Thermal Printing:** Direct ESC/POS byte generation with paper cutter commands, bold headers, and custom store WiFi credentials.
- **Shift Reconciliation:** Cash drawer declaration, expected cash vs actual cash auditing, and cashier handover reporting.

### Owner & Back-Office ERP (`/owner`)
- **Revenue Analytics & Trends:** Daily gross revenue, net profit margin, and sales velocity charts.
- **Recipe & Inventory Engine (BOM):** Deducts raw ingredients (e.g., espresso beans in grams, milk in ml) per sold menu item.
- **Cash Book & Excel Export:** Real-time cash journal with multi-category ledger entries and automated `.xlsx` export.
- **Employee & Shift Scheduling:** Role-based access control (Admin/Owner vs Cashier PIN authentication).

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend Client (Next.js 16 Tablet PWA)"]
        UI["Cashier Terminal / Owner Dashboard"]
        IDB[("IndexedDB Queue (idb-keyval)")]
        SW["Service Worker (sw.js)"]
        BLE["Web Bluetooth ESC/POS Driver"]
    end

    subgraph Hardware["On-Site Peripherals"]
        Printer["58mm / 80mm ESC/POS Thermal Printer"]
    end

    subgraph Backend["Backend & Database (PostgreSQL)"]
        API["Next.js Server API Routes"]
        RLS["Row-Level Security Policies"]
        DB[("PostgreSQL 15")]
    end

    UI -->|"1. Instant Order Placement"| IDB
    UI -->|"2. Raw Byte Stream (GATT)"| BLE
    BLE -->|"3. Print Receipt / KOT"| Printer
    IDB -->|"4. Background Sync"| SW
    SW -->|"5. Idempotent Upsert"| API
    API --> RLS --> DB
```

---

## Security & Database Architecture

OpenPOS implements zero-trust authorization powered by PostgreSQL **Row-Level Security (RLS)**:

- **Server-Authoritative Pricing:** Menu item prices are validated server-side; cashiers cannot alter prices via browser inspection.
- **Role Isolation:** Cashiers operate strictly under cashier-scoped permissions (creating orders, recording payments, closing their own shifts). Owner endpoints (financial reports, inventory cost price, employee salaries) are locked behind owner JWT and service roles.
- **Audit Logging:** Every price adjustment, cancellation, and cash discrepancy is logged with timestamp and user metadata.

---

## Tech Stack

| Layer | Technology | Details |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | App Router, Client Components, Turbopack |
| Styling | Tailwind CSS v4 | tw-animate-css, class-variance-authority |
| UI Components | shadcn/ui (v4) | Modular Radix / Base UI primitives |
| Backend & DB | Drizzle ORM & PostgreSQL | 17 tables, 18 TypeScript ACID procedures |
| Authentication | Native Session / Better Auth | HTTP-Only cookies, Web Crypto API HMAC-SHA256 & PBKDF2 |
| Data Fetching | SWR | Stale-While-Revalidate with localStorage persistence |
| Charts | Recharts v3 | Owner dashboard revenue and expense analytics |
| Notifications | Sonner | Minimalist toast notifications |
| Offline Storage | idb-keyval | IndexedDB queue wrapper for offline orders |
| Hardware Print | Web Bluetooth + ESC/POS | Raw ESC/POS generation directly over Bluetooth GATT |
| Unit Testing | Vitest | 272 passing unit & integration tests |
| E2E Testing | Playwright | 28 automated browser scenarios |

---

## Testing & Verification

```bash
# Run unit & integration test suite (272 tests)
npm test

# Run Playwright end-to-end browser tests (28 scenarios)
npm run test:e2e

# Run Playwright tests with interactive UI
npm run test:e2e:ui
```

### Test Coverage Summary

| Suite | Scope | Status |
|---|---|---|
| Unit & Integration (Vitest) | 272 tests | 100% passing |
| End-to-End (Playwright) | 28 scenarios | 100% passing |

---

## Quickstart & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/azharpratama/open-pos.git
cd open-pos
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
```

Configure your environment variables:
```env
DATABASE_URL=postgres://postgres:password@localhost:5432/openpos
AUTH_SECRET=your-secret-key-at-least-32-characters-long

# Store Customization & Receipts
NEXT_PUBLIC_STORE_NAME="OpenPOS Cafe"
NEXT_PUBLIC_STORE_SHORT_NAME="OpenPOS"
NEXT_PUBLIC_STORE_TAGLINE="Offline-First Point of Sale & Micro-ERP"
NEXT_PUBLIC_STORE_ADDRESS="123 Example Street, City"
NEXT_PUBLIC_STORE_PHONE="+62 812-0000-0000"
NEXT_PUBLIC_WIFI_SSID="OpenPOS-Guest"
NEXT_PUBLIC_WIFI_PASSWORD="password123"
NEXT_PUBLIC_RECEIPT_FOOTER="Terima kasih atas kunjungan Anda!"
```

### 3. Database Setup (Drizzle ORM)
```bash
# Apply migrations (creates all 17 schema tables)
npm run db:migrate

# Seed development data
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser or tablet.

---

## Panduan Operasional

### Terminal Kasir
- **Pemesanan Penuh:** Browse menu, tambah ke keranjang, pilih Dine-In (lantai 1/2/3) atau Takeaway.
- **Reservasi & Open Bill:** Manajemen reservasi dengan DP dan penambahan menu ke tagihan yang belum lunas.
- **Pembatalan Pesanan:** Sistem refund dan pembatalan dengan validasi stok dan buku kas terintegrasi.
- **Metode Pembayaran:** Tunai (kalkulasi kembalian otomatis), QRIS, Transfer.
- **Diskon & Pelanggan:** Diskon per-transaksi dan pencatatan nama pelanggan/kasir di struk.
- **Antrian Pesanan:** Real-time queue management di `/kasir/antrian`.
- **Struk Termal:** Cetak via Web Bluetooth ke printer ESC/POS tanpa driver pihak ketiga.
- **Manajemen Stok Cepat:** Update ketersediaan stok langsung dari terminal kasir.
- **Offline-First:** Pesanan tersimpan di IndexedDB saat offline, auto-sync saat koneksi kembali.

### Dashboard Owner
- **Ringkasan Pendapatan:** Hari ini, minggu ini, bulan ini dengan delta persentase.
- **Grafik Tren:** Visualisasi data pendapatan dan pengeluaran 7 hari dan 30 hari.
- **Analisis Menu:** Top item terlaris dan breakdown metode pembayaran.
- **Manajemen Menu:** CRUD produk, kategori, upload foto (kompresi otomatis di bawah 150KB).
- **Inventaris & Resep:** Tracking stok bahan baku dan Bill of Materials (BOM).
- **Manajemen Karyawan:** CRUD data karyawan, status aktif, info rekening bank, dan absensi.
- **Penggajian:** Perhitungan gaji harian, kehadiran shift, dan komisi/bonus.
- **Pengadaan & Supplier:** Direktori supplier dan pencatatan pembelian bahan baku.
- **Pembukuan:** Laporan Laba Rugi dan Buku Kas dengan ekspor Excel (.xlsx) 2 sheet.
- **Pengeluaran Operasional:** Pencatatan beban biaya harian per kategori.
- **Jadwal & Riwayat Shift:** Rekam buka/tutup shift dengan audit kas dan pendapatan per kasir.

---

## Database

Semua tabel menggunakan RLS enabled dengan zero anon policies. Semua operasi baca/tulis dilakukan via API routes server-side menggunakan admin client.

### Tabel Utama

| Tabel | Deskripsi |
|---|---|
| `users` | Akun staf (`role`: `owner` \| `karyawan`) |
| `products` | Item menu dan bahan baku (`category_type`: `Menu Jual` \| `Bahan Baku`) |
| `orders` | Transaksi (`order_ref`, `payment_status`, `order_status`, diskon) |
| `order_items` | Item per transaksi |
| `shifts` | Rekam buka/tutup shift dengan pendapatan |
| `shift_schedules` | Slot jadwal shift tetap |
| `employees` | Data HR (nama, rekening bank, gaji harian) |
| `employee_bonuses` | Tracking bonus/komisi karyawan |
| `inventory_logs` | Log pergerakan stok |
| `purchases` + `purchase_items` | Sistem pengadaan barang |
| `suppliers` | Direktori supplier (`location`, `contact`) |
| `reservations` | Manajemen meja, jadwal reservasi, dan DP |
| `cancellations` | Riwayat pembatalan pesanan dan refund |
| `operational_expenses` | Pencatatan pengeluaran operasional |
| `menu_ingredients` | Relasi resep: menu item -> bahan baku |
| `attendance` | Catatan absensi karyawan |

### Fungsi Stored Procedures

| Fungsi | Keterangan |
|---|---|
| `create_order_transaction()` | Pembuatan order atomik, deduction stok, resep bahan baku, dan stock guard |
| `merge_order_items()` | Penggabungan order items yang sama |
| `add_items_to_order()` | Menambahkan item baru ke tagihan berjalan (Open Bill) |
| `dashboard_summary()` | Data ringkasan dashboard owner |
| `revenue_trend()` / `expense_trend()` | Data grafik tren |
| `bookkeeping_report()` + `cash_book()` | Laporan Laba Rugi dan Buku Kas |
| `consume_bonus()` | Konsumsi bonus atomik dan dekremen stok |
| `admin_clear_datasets()` | Hapus data test (SECURITY DEFINER) |
| `revoke_user_sessions()` | Force-logout pengguna (SECURITY DEFINER) |

---

## Struktur Repository

```
open-pos/
├── docs/
│   └── screenshots/            # High-resolution UI showcase images
├── src/
│   ├── app/                    # Next.js App Router (pages & API routes)
│   │   ├── kasir/              # Terminal kasir (pesan, antrian, stok, bonus, struk)
│   │   ├── owner/              # Dashboard owner (inventory, karyawan, menu, pembukuan, settings, shift)
│   │   ├── login/              # Login interface (Kasir & Owner)
│   │   └── api/                # REST endpoints
│   ├── components/
│   │   ├── kasir/              # Payment dialog, printer status, receipt view
│   │   ├── owner/              # Shift history, trend charts, purchase manager
│   │   ├── layout/             # Responsive sidebar & navigation
│   │   └── ui/                 # Reusable UI primitives
│   ├── lib/
│   │   ├── api.ts              # Unified fetch client
│   │   ├── db-client.ts        # Database client query builder
│   │   ├── offline-queue.ts    # IndexedDB offline order cache
│   │   ├── escpos.ts           # ESC/POS thermal receipt builder
│   │   ├── procedures/         # 18 Pure TypeScript ACID business transactions
│   │   ├── printer.ts          # Bluetooth printer connection manager
│   │   └── ...                 # orders.ts, employees.ts, menu.ts, shifts.ts
│   ├── db/
│   │   ├── schema.ts           # Drizzle ORM schema definition
│   │   ├── index.ts            # PostgreSQL pool configuration
│   │   ├── migrate.ts          # Automatic migration runner
│   │   └── migrations/         # Drizzle migrations
│   └── middleware.ts           # Route protection guard
├── scripts/
│   ├── seed.ts                 # Development seed data
│   ├── seed-e2e.ts             # E2E test seed data
│   └── backup.sh               # pg_dump backup script
├── tests/
│   ├── unit/                   # Vitest unit & integration tests
│   └── e2e/                    # Playwright end-to-end tests
├── public/
│   ├── logo.svg                # Store brand logo (customizable)
│   ├── favicon.svg             # Store favicon
│   ├── sw.js                   # Service Worker (PWA offline caching)
│   └── manifest.json           # Web App Manifest
└── .github/
    └── workflows/
        └── ci.yml              # GitHub Actions CI (Typecheck & Vitest)
```

---

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Run production build locally
npm run lint         # ESLint
npm test             # Vitest unit & integration tests
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright tests with UI
npm run db:generate  # Generate migration file from schema.ts
npm run db:migrate   # Run Drizzle migrations on PostgreSQL
npm run db:push      # Push Drizzle schema directly to database
npm run db:studio    # Open Drizzle Studio inspector
npm run seed         # Seed development data
npm run seed:e2e     # Seed minimal data for E2E testing
```

---

## Deployment

Aplikasi dapat di-deploy ke Vercel, Node.js VPS, atau containerized Docker. Variabel environment dikonfigurasi melalui platform hosting masing-masing.

> **Penting:** Jalankan `npm run db:migrate` terhadap database target sebelum deployment pertama kali atau setelah pembaruan skema.

---

## License & Credits

- **Author:** [Azhar Aditya Pratama](https://github.com/azharpratama)
- **Origin:** Battle-tested in live commercial production (Surabaya, Indonesia).
- **License:** MIT License. Feel free to use and adapt for your own F&B establishment.
