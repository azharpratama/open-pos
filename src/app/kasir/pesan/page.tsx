"use client";

import {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Loader2,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { STORE_CONFIG } from "@/config/store";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header-bar";
import { PaymentDialog } from "@/components/kasir/payment-dialog";
import { ProductThumb } from "@/components/kasir/product-thumb";
import { WibClock } from "@/components/kasir/wib-clock";
import { formatRupiah } from "@/lib/format";
import {
  addOrderToQueue,
  type OfflineOrder,
} from "@/lib/offline-queue";
import {
  PRODUCT_CATEGORIES,
  fetchMenu,
  type MenuProduct,
  type ProductCategory,
} from "@/lib/menu";
import {
  generateOrderRef,
  saveReceipt,
  type OrderType,
  type PaymentMethod,
  type Receipt,
} from "@/lib/receipt";
import { fetchRoster } from "@/lib/cashiers";
import {
  getShiftOpenServerSnapshot,
  getShiftOpenSnapshot,
  setShiftOpen,
  subscribeShiftOpen,
} from "@/lib/session";
import { TODAY_REVENUE_KEY } from "@/lib/shifts";
import { cn } from "@/lib/utils";

type CartLine = {
  product: MenuProduct;
  qty: number;
};

const ALL_CATEGORIES = "Semua";

// The cafe has 3 floors; dine-in orders pick which one they're seated on. The
// value still travels as `tableNumber` on the wire/DB (an integer column).
const FLOORS = [1, 2, 3] as const;

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  DINE_IN: "Makan di Tempat",
  TAKEAWAY: "Bawa Pulang",
};

export default function KasirPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [activeCategory, setActiveCategory] = useState<
    ProductCategory | typeof ALL_CATEGORIES
  >(ALL_CATEGORIES);
  const [search, setSearch] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("DINE_IN");
  const [floor, setFloor] = useState<(typeof FLOORS)[number]>(1);
  const [note, setNote] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentKey, setPaymentKey] = useState(0);
  const [orderRef, setOrderRef] = useState(() => generateOrderRef());
  const [submitting, setSubmitting] = useState(false);

  const { data: products = [], error: swrError, isLoading: menuLoading, mutate: mutateMenu } = useSWR("menu-products", fetchMenu);
  const menuError = swrError instanceof Error ? swrError.message : swrError ? "Gagal memuat menu" : null;

  const { data: cashiersData = { entries: [] }, mutate: mutateCashiers } = useSWR("/api/cashiers", fetchRoster);
  // Bound to the custom SWR cache provider — the global `mutate` export writes
  // to the default cache instead and would never reach the sidebar.
  const { mutate } = useSWRConfig();
  const cashiers = cashiersData.entries.map((entry) => entry.name);

  const shiftOpen = useSyncExternalStore(
    subscribeShiftOpen,
    getShiftOpenSnapshot,
    getShiftOpenServerSnapshot,
  );

  const loadMenu = useCallback(() => {
    mutateMenu();
    mutateCashiers();
  }, [mutateMenu, mutateCashiers]);

  const visibleProducts = useMemo(() => {
    const byCategory =
      activeCategory === ALL_CATEGORIES
        ? products
        : products.filter((p) => p.category === activeCategory);
    const query = search.trim().toLowerCase();
    if (!query) return byCategory;
    return byCategory.filter((p) => p.name.toLowerCase().includes(query));
  }, [activeCategory, search, products]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.qty, 0),
    [cart],
  );
  const itemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.qty, 0),
    [cart],
  );
  const qtyByProductId = useMemo(
    () => new Map(cart.map((line) => [line.product.id, line.qty])),
    [cart],
  );

  // Ingredient stock (from the latest menu fetch), keyed by ingredient id.
  const ingredientStock = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      for (const r of p.recipe) m.set(r.ingredientId, r.stock);
    }
    return m;
  }, [products]);

  // Total ingredient usage implied by the current cart (across all menus).
  function cartDemand(lines: CartLine[]): Map<string, number> {
    const d = new Map<string, number>();
    for (const line of lines) {
      for (const r of line.product.recipe) {
        d.set(
          r.ingredientId,
          (d.get(r.ingredientId) ?? 0) + r.perUnit * line.qty,
        );
      }
    }
    return d;
  }

  // Whether one more of `product` can still be made given what the cart already
  // consumes. Menus without a recipe are unlimited.
  function canAddOne(product: MenuProduct, lines: CartLine[]): boolean {
    if (product.recipe.length === 0) return true;
    const demand = cartDemand(lines);
    return product.recipe.every(
      (r) =>
        (demand.get(r.ingredientId) ?? 0) + r.perUnit <=
        (ingredientStock.get(r.ingredientId) ?? 0),
    );
  }

  function addToCart(product: MenuProduct) {
    if (!shiftOpen) {
      toast.error("Buka shift dulu untuk mulai menerima pesanan");
      return;
    }
    if (!product.available) {
      toast.error(`${product.name} sedang habis (stok bahan tidak cukup)`);
      return;
    }
    if (!canAddOne(product, cart)) {
      toast.error(`Stok bahan tidak cukup untuk menambah ${product.name}`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, qty: line.qty + 1 }
            : line,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    toast.success(`${product.name} ditambahkan`, {
      description: formatRupiah(product.price),
    });
  }

  function changeQty(productId: string, delta: number) {
    if (delta > 0) {
      const line = cart.find((l) => l.product.id === productId);
      if (line && !canAddOne(line.product, cart)) {
        toast.error(
          `Stok bahan tidak cukup untuk menambah ${line.product.name}`,
        );
        return;
      }
    }
    setCart((prev) =>
      prev
        .map((line) =>
          line.product.id === productId
            ? { ...line, qty: line.qty + delta }
            : line,
        )
        .filter((line) => line.qty > 0),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((line) => line.product.id !== productId));
  }

  function clearCart() {
    if (cart.length === 0) return;
    setCart([]);
    setNote("");
    toast("Keranjang dikosongkan");
  }

  function buildReceipt(
    paymentMethod: PaymentMethod | "OPEN_BILL",
    amountPaid: number,
    change: number,
    customerName: string,
    cashierName: string,
    discount: number,
  ): Receipt {
    return {
      orderRef,
      createdAt: new Date().toISOString(),
      cashier: cashierName,
      customerName,
      items: cart.map((line) => ({
        name: line.product.name,
        qty: line.qty,
        price: line.product.price,
        subtotal: line.product.price * line.qty,
      })),
      subtotal: total,
      discount,
      total: total - discount,
      orderType,
      tableNumber: orderType === "DINE_IN" ? floor : undefined,
      note: note.trim() || undefined,
      paymentMethod: paymentMethod === "OPEN_BILL" ? "TUNAI" : paymentMethod,
      amountPaid,
      change,
    };
  }

  // Persists the order to the backend (which decrements stock atomically), then
  // stores the receipt. Returns false on failure so the caller keeps the payment
  // dialog open instead of navigating to a receipt for an order that never saved.
  //
  // When the network is down, the order is saved to an IndexedDB offline queue
  // and will be synced automatically when the connection is restored.
  async function submitOrder(
    paymentMethod: PaymentMethod | "OPEN_BILL",
    amountPaid: number,
    change: number,
    customerName: string,
    cashierName: string,
    discount: number,
  ): Promise<boolean> {
    setSubmitting(true);

    const orderPayload = {
      orderRef,
      cashierName,
      customerName,
      orderType,
      tableNumber: orderType === "DINE_IN" ? floor : undefined,
      note: note.trim() || undefined,
      paymentMethod: paymentMethod === "OPEN_BILL" ? "TUNAI" : paymentMethod,
      isOpenBill: paymentMethod === "OPEN_BILL",
      amountPaid,
      changeAmount: change,
      discount,
      items: cart.map((line) => ({
        productId: line.product.id,
        qty: line.qty,
      })),
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Gagal menyimpan transaksi");
        return false;
      }
      saveReceipt(
        buildReceipt(
          paymentMethod,
          amountPaid,
          change,
          customerName,
          cashierName,
          discount,
        ),
      );
      // The order is in the database now; pull the day's total forward so the
      // sidebar reflects it immediately instead of waiting for the next poll.
      void mutate(TODAY_REVENUE_KEY);
      return true;
    } catch {
      // ── Network failure → save to offline queue ──
      const offlineOrder: OfflineOrder = {
        id: Date.now().toString(),
        payload: orderPayload as OfflineOrder["payload"],
        timestamp: Date.now(),
        // Carried along so the sidebar can count this sale while it waits.
        total: total - discount,
      };
      const queued = await addOrderToQueue(offlineOrder);
      if (queued) {
        toast.warning("Koneksi terputus — pesanan disimpan offline", {
          description: "Akan otomatis dikirim saat internet kembali.",
        });
        // Still save the receipt locally so the cashier can print it
        saveReceipt(
          buildReceipt(
            paymentMethod,
            amountPaid,
            change,
            customerName,
            cashierName,
            discount,
          ),
        );
        return true;
      } else {
        toast.error("Gagal menyimpan pesanan offline");
        return false;
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCashConfirmed(
    amountPaid: number,
    change: number,
    customerName: string,
    cashierName: string,
    discount: number,
  ) {
    if (
      !(await submitOrder(
        "TUNAI",
        amountPaid,
        change,
        customerName,
        cashierName,
        discount,
      ))
    )
      return;
    toast.success("Pembayaran tunai dicatat", {
      description: `Kembalian ${formatRupiah(change)}`,
    });
    router.push("/kasir/struk");
  }

  async function handleManualPaid(
    method: "QRIS" | "TRANSFER" | "OPEN_BILL",
    customerName: string,
    cashierName: string,
    discount: number,
  ) {
    if (
      !(await submitOrder(
        method,
        total - discount,
        0,
        customerName,
        cashierName,
        discount,
      ))
    )
      return;
    toast.success(
      method === "QRIS"
        ? "Pembayaran QRIS dicatat"
        : method === "TRANSFER"
          ? "Pembayaran transfer dicatat"
          : "Open Bill berhasil dibuat",
    );
    if (method === "OPEN_BILL") {
      router.push("/kasir/antrian");
    } else {
      router.push("/kasir/struk");
    }
  }

  return (
    <div className="flex h-dvh bg-background">
      <Sidebar active="kasir" />

      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderBar
          title="Pesan Menu"
          subtitle={`Point of Sale ${STORE_CONFIG.shortName}`}
          onRefresh={() => loadMenu()}
        />

        <div className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="@container flex flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex flex-col gap-3 w-full">
              <Tabs
                value={activeCategory}
                onValueChange={(value) =>
                  setActiveCategory(value as ProductCategory)
                }
                className="w-full"
              >
                <TabsList className="flex h-11 w-full items-center justify-start sm:justify-center p-1">
                  <TabsTrigger
                    value={ALL_CATEGORIES}
                    className="px-3.5 text-xs sm:text-sm font-medium"
                  >
                    {ALL_CATEGORIES}
                  </TabsTrigger>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <TabsTrigger
                      key={category}
                      value={category}
                      className="px-3.5 text-xs sm:text-sm font-medium"
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari menu..."
                  className="h-10 w-full pl-9 text-xs"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {!shiftOpen ? (
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-accent/60">
                    <Lock className="size-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">Shift belum dibuka</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                      Buka shift dulu untuk mulai menerima pesanan pelanggan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="lg"
                    className="h-12 px-7 text-base font-semibold shadow-md gap-2.5 rounded-xl mt-1"
                    onClick={() => setShiftOpen(true)}
                  >
                    <Store className="size-5" />
                    Buka Shift
                  </Button>
                </div>
              ) : menuLoading ? (
                <div className="flex items-center justify-center gap-2 px-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Memuat menu...
                </div>
              ) : menuError ? (
                <div className="flex flex-col items-center gap-3 px-2 py-16 text-center">
                  <p className="text-sm text-destructive">{menuError}</p>
                  <Button variant="outline" size="sm" onClick={loadMenu}>
                    Coba lagi
                  </Button>
                </div>
              ) : visibleProducts.length === 0 ? (
                <p className="px-2 py-16 text-center text-sm text-muted-foreground">
                  {products.length === 0
                    ? "Belum ada menu tersedia."
                    : `Menu tidak ditemukan untuk “${search}”.`}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 p-2 pb-4 pr-3 @[340px]:grid-cols-3 @[480px]:grid-cols-4 @[640px]:grid-cols-5 @[820px]:grid-cols-6">
                  {visibleProducts.map((product) => {
                    const qtyInCart = qtyByProductId.get(product.id) ?? 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={!product.available}
                        className="flex flex-col h-full w-full text-left disabled:cursor-not-allowed"
                      >
                        <Card
                          className={cn(
                            "relative flex flex-col justify-between h-[190px] w-full gap-2 overflow-visible p-2.5 transition-all",
                            product.available
                              ? "hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                              : "opacity-60",
                          )}
                        >
                          <ProductThumb
                            category={product.category}
                            imageUrl={product.imageUrl}
                            alt={product.name}
                            className="h-24 w-full shrink-0"
                          />
                          <div className="flex flex-col justify-between flex-1 min-w-0 px-0.5 pb-0.5 pt-0.5">
                            <p className="font-medium text-xs sm:text-sm leading-snug line-clamp-2">
                              {product.name}
                            </p>
                            <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-auto pt-1">
                              {formatRupiah(product.price)}
                            </p>
                          </div>
                          {!product.available && (
                            <Badge className="absolute left-1.5 top-1.5 border-transparent bg-destructive text-[11px] text-white">
                              Habis
                            </Badge>
                          )}
                          {qtyInCart > 0 && (
                            <Badge
                              aria-label={`${qtyInCart} di keranjang`}
                              className="absolute -right-2 -top-2 min-w-6 justify-center rounded-full px-1.5"
                            >
                              {qtyInCart}
                            </Badge>
                          )}
                        </Card>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <Card className="flex w-[320px] shrink-0 flex-col gap-0 overflow-hidden p-0">
            <div className="flex items-center gap-1.5 border-b px-3.5 py-2.5">
              <ShoppingCart className="size-4 shrink-0" />
              <h2 className="text-sm font-semibold truncate">Pesanan Saat Ini</h2>
              {itemCount > 0 && (
                <Badge variant="secondary" className="px-1.5 text-xs">
                  {itemCount}
                </Badge>
              )}
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="ml-auto text-xs font-medium text-destructive hover:underline disabled:pointer-events-none disabled:opacity-40"
              >
                Hapus
              </button>
            </div>

            <div className="flex flex-col gap-2 border-b px-3.5 py-2.5">
              <div className="grid grid-cols-2 gap-2">
                {(["DINE_IN", "TAKEAWAY"] as OrderType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors text-center truncate",
                      orderType === type
                        ? "border-primary bg-accent text-accent-foreground font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {ORDER_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>
              {orderType === "DINE_IN" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Lantai</span>
                  <div className="grid grid-cols-3 gap-2">
                    {FLOORS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFloor(f)}
                        className={cn(
                          "flex h-9 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors text-center",
                          floor === f
                            ? "border-primary bg-accent text-accent-foreground font-semibold"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        Lantai {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3 p-4">
                {cart.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Keranjang masih kosong. Ketuk menu untuk menambahkan.
                  </p>
                )}
                {cart.map((line) => (
                  <div key={line.product.id} className="flex gap-3">
                    <ProductThumb
                      category={line.product.category}
                      imageUrl={line.product.imageUrl}
                      alt={line.product.name}
                      className="size-11 shrink-0 object-cover"
                    />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">
                          {line.product.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeLine(line.product.id)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Hapus ${line.product.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            aria-label="Kurang"
                            onClick={() => changeQty(line.product.id, -1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-5 text-center text-sm">
                            {line.qty}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            aria-label="Tambah"
                            onClick={() => changeQty(line.product.id, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-medium">
                          {formatRupiah(line.product.price * line.qty)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {cart.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label
                      htmlFor="order-note"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Catatan (opsional)
                    </label>
                    <textarea
                      id="order-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Mis. tanpa gula, es sedikit..."
                      rows={2}
                      className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border-t bg-background p-4">
              <div className="mb-2 flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatRupiah(total)}</span>
              </div>
              <Button
                className="h-12 w-full rounded-xl text-base font-semibold"
                disabled={cart.length === 0 || !shiftOpen}
                onClick={() => {
                  setOrderRef(generateOrderRef());
                  setPaymentKey((key) => key + 1);
                  setPaymentOpen(true);
                }}
              >
                Lanjut ke Pembayaran
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <PaymentDialog
        key={paymentKey}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        submitting={submitting}
        cashiers={cashiers}
        onCashConfirmed={handleCashConfirmed}
        onManualPaid={handleManualPaid}
      />
    </div>
  );
}
