"use client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function LoadingButton({
  loading,
  children,
  ...props
}: { loading: boolean; children: React.ReactNode } & React.ComponentProps<typeof Button>) {
  return (
    <Button disabled={loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {children}
    </Button>
  );
}
