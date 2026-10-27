import { PurchaseManager } from "@/components/owner/purchase-manager";
import { SupplierManager } from "@/components/owner/supplier-manager";

export default function ProcurementPage() {
  return (
    <div className="flex flex-col gap-4">
      <SupplierManager />
      <PurchaseManager />
    </div>
  );
}
