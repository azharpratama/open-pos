"use client";

import { SWRConfig } from "swr";
import { ReactNode, useEffect } from "react";
import { setupOnlineSync } from "@/lib/offline-queue";
import { setupDemoInterceptor } from "@/lib/demo-sandbox";

export function localStorageProvider() {
  if (typeof window === 'undefined') return new Map();
  
  // Initialize from localStorage
  const map = new Map<string, any>(JSON.parse(localStorage.getItem('openpos-swr-cache') || '[]'));
  
  // Create a proxy map to intercept set/delete operations and sync to localStorage
  const proxy = new Map<string, any>();
  
  const sync = () => {
    localStorage.setItem('openpos-swr-cache', JSON.stringify(Array.from(map.entries())));
  };
  
  proxy.get = (k) => map.get(k);
  proxy.has = (k) => map.has(k);
  proxy.keys = () => map.keys();
  
  proxy.set = (k, v) => {
    map.set(k, v);
    sync();
    return proxy;
  };
  
  proxy.delete = (k) => {
    const res = map.delete(k);
    sync();
    return res;
  };
  
  proxy.clear = () => {
    map.clear();
    sync();
  };
  
  return proxy as Map<string, any>;
}

export function SWRProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    setupDemoInterceptor();
    return setupOnlineSync();
  }, []);

  return (
    <SWRConfig 
      value={{ 
        provider: localStorageProvider,
        fetcher: (url: string) => fetch(url).then(res => res.json()),
        revalidateOnFocus: false, // Don't spam API when switching tabs or focusing window
      }}
    >
      {children}
    </SWRConfig>
  );
}
