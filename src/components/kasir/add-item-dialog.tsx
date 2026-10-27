"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Minus, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { ProductThumb } from "@/components/kasir/product-thumb";
import { fetchMenu, type MenuProduct } from "@/lib/menu";
import { addItemsToOrder } from "@/lib/orders";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRODUCT_CATEGORIES } from "@/lib/menu";

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderRef: string;
  onSuccess: () => void;
};

export function AddItemDialog({
  open,
  onOpenChange,
  orderRef,
  onSuccess,
}: AddItemDialogProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Semua");
  const [cart, setCart] = useState<Map<string, { product: MenuProduct; qty: number }>>(new Map());
  const [submitting, setSubmitting] = useState(false);

  const { data: products = [], isLoading } = useSWR(open ? "menu-products" : null, fetchMenu);

  const visibleProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "Semua") {
      list = list.filter((p: MenuProduct) => p.category === activeCategory);
    }
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((p: MenuProduct) => p.name.toLowerCase().includes(query));
  }, [search, activeCategory, products]);

  const totalAdded = useMemo(() => {
    let sum = 0;
    for (const item of cart.values()) {
      sum += item.product.price * item.qty;
    }
    return sum;
  }, [cart]);

  function changeQty(product: MenuProduct, delta: number) {
    if (!product.available && delta > 0) {
      toast.error(`${product.name} sedang habis`);
      return;
    }
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(product.id) || { product, qty: 0 };
      const newQty = existing.qty + delta;
      
      if (newQty <= 0) {
        next.delete(product.id);
      } else {
        next.set(product.id, { ...existing, qty: newQty });
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (cart.size === 0) return;
    setSubmitting(true);
    
    const items = Array.from(cart.values()).map(c => ({
      productId: c.product.id,
      qty: c.qty,
    }));

    try {
      await addItemsToOrder(orderRef, items);
      toast.success("Item berhasil ditambahkan ke tagihan");
      setCart(new Map());
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah item");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) setCart(new Map());
      onOpenChange(val);
    }}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-4 sm:p-5 sm:max-w-2xl">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle>Tambah Item: #{orderRef}</DialogTitle>
          <DialogDescription>
            Pilih menu untuk ditambahkan ke tagihan terbuka.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              className="h-10 w-full pl-9"
            />
          </div>
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="h-10 w-full justify-start overflow-x-auto overflow-y-hidden rounded-xl bg-muted/50 p-1">
              <TabsTrigger
                value="Semua"
                className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Semua
              </TabsTrigger>
              {PRODUCT_CATEGORIES.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="rounded-lg px-4 font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4 sm:-mx-5 sm:px-5 @container">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 pt-3 pb-6 px-3 @[340px]:grid-cols-3 @[480px]:grid-cols-4">
              {visibleProducts.map((product) => {
                const qtyInCart = cart.get(product.id)?.qty ?? 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => changeQty(product, 1)}
                    disabled={!product.available}
                    className="flex flex-col text-left disabled:cursor-not-allowed"
                  >
                    <Card
                      className={cn(
                        "relative flex flex-col justify-between h-[180px] w-full gap-2 overflow-visible p-2.5 transition-all",
                        product.available
                          ? "hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                          : "opacity-60",
                        qtyInCart > 0 && "border-primary ring-1 ring-primary"
                      )}
                    >
                      <ProductThumb
                        category={product.category}
                        imageUrl={product.imageUrl}
                        alt={product.name}
                        className="h-20 w-full shrink-0"
                      />
                      <div className="flex flex-col justify-between flex-1 min-w-0 pt-1">
                        <p className="font-medium text-xs leading-snug line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-xs font-semibold text-muted-foreground mt-auto">
                          {formatRupiah(product.price)}
                        </p>
                      </div>
                      {!product.available && (
                        <Badge className="absolute left-1.5 top-1.5 border-transparent bg-destructive text-[10px] text-white">
                          Habis
                        </Badge>
                      )}
                      {qtyInCart > 0 && (
                        <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-background shadow border rounded-full p-0.5">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="size-6 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              changeQty(product, -1);
                            }}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="text-xs font-bold w-4 text-center">{qtyInCart}</span>
                          <Button
                            variant="default"
                            size="icon"
                            className="size-6 rounded-full bg-primary text-primary-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              changeQty(product, 1);
                            }}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-4 flex-row items-center justify-between border-t mt-2">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total Tambahan</span>
            <span className="text-base font-bold">{formatRupiah(totalAdded)}</span>
          </div>
          <Button
            type="button"
            className="h-11 rounded-xl px-6"
            disabled={cart.size === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Tambahkan Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
