import imageCompression from "browser-image-compression";

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  imageUrl: string | null;
  ingredientCount: number;
};

export type RecipeLine = {
  ingredientId: string;
  ingredientName: string;
  unitType: string;
  quantity: number;
};

export type MenuItemDetail = {
  id: string;
  name: string;
  category: string;
  price: number | null;
  imageUrl: string | null;
  ingredients: RecipeLine[];
};

export type MenuItemInput = {
  name: string;
  category: string;
  price: number | null;
  imageUrl: string | null;
  ingredients: { ingredientId: string; quantity: number }[];
};

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const res = await fetch("/api/menu-items", { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat menu");
  return json.data as MenuItem[];
}

export async function fetchMenuItem(id: string): Promise<MenuItemDetail> {
  const res = await fetch(`/api/menu-items/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memuat detail menu");
  return json.data as MenuItemDetail;
}

export async function createMenuItem(input: MenuItemInput): Promise<MenuItem> {
  const res = await fetch("/api/menu-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal menyimpan menu");
  return json.data as MenuItem;
}

export async function updateMenuItem(
  id: string,
  input: MenuItemInput,
): Promise<MenuItem> {
  const res = await fetch(`/api/menu-items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal memperbarui menu");
  return json.data as MenuItem;
}

export async function deleteMenuItem(id: string): Promise<void> {
  const res = await fetch(`/api/menu-items/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Gagal menghapus menu");
  }
}

export async function uploadMenuPhoto(file: File): Promise<string> {
  // Compress the image before uploading to save storage and bandwidth
  const options = {
    maxSizeMB: 0.15, // Max 150KB
    maxWidthOrHeight: 1024,
    useWebWorker: true,
  };
  const compressedFile = await imageCompression(file, options);

  const form = new FormData();
  form.append("file", compressedFile);
  const res = await fetch("/api/menu-items/upload", {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Gagal mengunggah foto");
  return json.data.url as string;
}
