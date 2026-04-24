"use client";

import { useEffect } from "react";

/** Pings the server every 60s so the doctor can see "connected now" presence. */
export function SecretaryHeartbeat() {
  useEffect(() => {
    function ping() {
      fetch("/api/secretary/heartbeat", { method: "POST", cache: "no-store" }).catch(
        () => {
          /* silent */
        }
      );
    }
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, []);
  return null;
}
