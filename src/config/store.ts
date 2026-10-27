export interface StoreConfig {
  name: string;
  shortName: string;
  tagline: string;
  address: string;
  phone: string;
  wifiSsid: string;
  wifiPassword: string;
  receiptFooter: string;
  currency: string;
  logoUrl?: string;
}

export const STORE_CONFIG: StoreConfig = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "OpenPOS Cafe",
  shortName: process.env.NEXT_PUBLIC_STORE_SHORT_NAME || "OpenPOS",
  tagline: process.env.NEXT_PUBLIC_STORE_TAGLINE || "Offline-First Point of Sale",
  address: process.env.NEXT_PUBLIC_STORE_ADDRESS || "123 Example Street, City",
  phone: process.env.NEXT_PUBLIC_STORE_PHONE || "+62 812-0000-0000",
  wifiSsid: process.env.NEXT_PUBLIC_WIFI_SSID || "OpenPOS-Guest",
  wifiPassword: process.env.NEXT_PUBLIC_WIFI_PASSWORD || "password123",
  receiptFooter: process.env.NEXT_PUBLIC_RECEIPT_FOOTER || "Terima kasih atas kunjungan Anda!",
  currency: "IDR",
  logoUrl: process.env.NEXT_PUBLIC_STORE_LOGO || "/logo.svg",
};
