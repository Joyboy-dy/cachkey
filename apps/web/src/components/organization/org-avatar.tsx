import { useMemo } from "react";
import { organizationAvatarDataUri } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** DiceBear « Shape Grid » avatar of an organisation, seeded with its id (decorative). */
export function OrgAvatar({ id, className }: { id: string; className?: string }) {
  const src = useMemo(() => organizationAvatarDataUri(id), [id]);
  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      draggable={false}
      className={cn("size-8 shrink-0 rounded-lg bg-secondary select-none", className)}
    />
  );
}
