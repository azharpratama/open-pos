import { formatDateTime, formatRupiah } from "@/lib/format";
import type { Receipt } from "@/lib/receipt";
import { STORE_CONFIG } from "@/config/store";

type ReceiptViewProps = {
  receipt: Receipt;
};

export function ReceiptView({ receipt }: ReceiptViewProps) {
  return (
    <div className="print-area mx-auto w-full max-w-[320px] bg-white p-6 font-mono text-sm text-black shadow-sm ring-1 ring-black/10">
      <div className="text-center">
        <p className="text-base font-bold tracking-wide">{STORE_CONFIG.name.toUpperCase()}</p>
        <p className="text-xs text-neutral-600">
          {STORE_CONFIG.address}
        </p>
        <p className="text-xs text-neutral-600">Contact: {STORE_CONFIG.phone}</p>
      </div>

      <Divider />

      <div className="flex flex-col gap-0.5 text-xs">
        <Row label="No. Order" value={receipt.orderRef} />
        <Row label="Waktu" value={formatDateTime(receipt.createdAt)} />
        <Row label="Kasir" value={receipt.cashier} />
        <Row label="Pemesan" value={receipt.customerName} />
        <Row
          label="Tipe Pesanan"
          value={
            receipt.orderType === "DINE_IN"
              ? `Lantai ${receipt.tableNumber ?? "-"}`
              : "Bawa Pulang"
          }
        />
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        {receipt.items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex flex-col">
            <span>{item.name}</span>
            <div className="flex justify-between text-neutral-700">
              <span>
                {item.qty} x {formatRupiah(item.price)}
              </span>
              <span>{formatRupiah(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {receipt.note && (
        <>
          <Divider />
          <div className="text-xs">
            <p className="text-neutral-600">Catatan:</p>
            <p className="italic">&ldquo;{receipt.note}&rdquo;</p>
          </div>
        </>
      )}

      <Divider />

      <div className="flex flex-col gap-0.5">
        {receipt.discount > 0 && (
          <>
            <Row label="Subtotal" value={formatRupiah(receipt.subtotal)} />
            <Row label="Diskon" value={`- ${formatRupiah(receipt.discount)}`} />
          </>
        )}
        <div className="flex justify-between text-base font-bold">
          <span>TOTAL</span>
          <span>{formatRupiah(receipt.total)}</span>
        </div>
        <Row
          label={
            receipt.paymentMethod === "TUNAI"
              ? "Tunai"
              : receipt.paymentMethod === "QRIS"
                ? "QRIS"
                : "Transfer"
          }
          value={formatRupiah(receipt.amountPaid)}
        />
        {receipt.paymentMethod === "TUNAI" && (
          <Row label="Kembalian" value={formatRupiah(receipt.change)} />
        )}
      </div>

      <Divider />

      <div className="text-center text-xs text-neutral-600">
        <b>Password WiFi: {STORE_CONFIG.wifiPassword}</b>
        <p>{STORE_CONFIG.receiptFooter}</p>
        <p>Sampai jumpa lagi di {STORE_CONFIG.shortName}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="my-3 border-t border-dashed border-neutral-400" />;
}
