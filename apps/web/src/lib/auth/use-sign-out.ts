import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "./auth-client";
import { sessionQueryKey } from "./session";

export function useSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    try {
      await authClient.signOut();
    } finally {
      queryClient.removeQueries({ queryKey: sessionQueryKey });
      await router.invalidate();
      await navigate({ to: "/sign-in" });
      setIsPending(false);
    }
  }

  return { signOut, isPending };
}
