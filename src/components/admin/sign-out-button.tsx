"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      className="w-full sm:w-auto"
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <LogOut size={16} />
      Keluar
    </Button>
  );
}
