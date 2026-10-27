import { redirect } from "next/navigation";

// The Kasir section now lives at /kasir/pesan; /kasir just forwards there.
export default function KasirIndex() {
  redirect("/kasir/pesan");
}
