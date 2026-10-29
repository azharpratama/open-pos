// Runs on the client before any application code (Next.js instrumentation hook),
// so the sandbox interceptor is in place before the first SWR/fetch call fires.
// Installing it from a component module left a window where page chunks could
// fetch /api/* before the provider chunk had evaluated.
import { setupDemoInterceptor } from "@/lib/demo-sandbox";

setupDemoInterceptor();
