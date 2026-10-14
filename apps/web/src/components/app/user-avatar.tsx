import { useMemo } from "react";
import { type AvatarUser, userAvatarDataUri, userAvatarSeed } from "@/lib/avatar";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  user: AvatarUser;
  className?: string;
};

/**
 * DiceBear « Clay » avatar of a user (decorative: the name is always shown next to it).
 * A plain <img> with a data URI renders during SSR, without a loading flash.
 */
export function UserAvatar({ user, className }: UserAvatarProps) {
  const seed = userAvatarSeed(user);
  const src = useMemo(() => userAvatarDataUri(seed), [seed]);
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
