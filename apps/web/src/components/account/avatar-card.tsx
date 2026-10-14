import { Loading03Icon, RefreshIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useMemo, useState } from "react";
import { type Feedback, FeedbackAlert } from "@/components/app/feedback";
import { SectionCard } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { authClient } from "@/lib/auth/auth-client";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { type AuthSession, useRefreshSession } from "@/lib/auth/session";
import { randomAvatarSeeds, userAvatarDataUri, userAvatarSeed } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const PROPOSALS = 7;

/** Profile picture (DiceBear « Clay »): pick one of the proposals, shuffle, save. */
export function AvatarCard({ user }: { user: AuthSession["user"] }) {
  const savedSeed = userAvatarSeed(user);
  const [seeds, setSeeds] = useState<string[]>(() => [savedSeed]);
  const [selected, setSelected] = useState(savedSeed);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const refreshSession = useRefreshSession();

  // Random proposals are generated on demand (never during render: SSR must stay stable).
  const options = useMemo(
    () => seeds.map((seed) => ({ seed, src: userAvatarDataUri(seed) })),
    [seeds],
  );
  const preview = useMemo(() => userAvatarDataUri(selected), [selected]);
  const dirty = selected !== savedSeed;

  function shuffle() {
    setSeeds([savedSeed, ...randomAvatarSeeds(PROPOSALS)]);
  }

  async function save() {
    setPending(true);
    setFeedback(null);
    const { error } = await authClient.updateUser({ avatarSeed: selected });
    if (error) {
      setFeedback({ tone: "error", message: getAuthErrorMessage(error) });
    } else {
      await refreshSession();
      setFeedback({ tone: "success", message: "Votre avatar a été mis à jour." });
    }
    setPending(false);
  }

  return (
    <SectionCard title="Avatar" description="Choisissez l’avatar qui vous ressemble le plus.">
      <div className="grid gap-6 px-5 py-5 sm:grid-cols-[auto_1fr] sm:items-start sm:px-6">
        <img
          src={preview}
          alt="Aperçu de votre avatar"
          width={88}
          height={88}
          className="size-22 rounded-2xl bg-secondary"
        />

        <div className="grid gap-4">
          {options.length > 1 ? (
            <div
              role="radiogroup"
              aria-label="Propositions d’avatar"
              className="flex flex-wrap gap-2"
            >
              {options.map((option, index) => (
                <button
                  key={option.seed}
                  type="button"
                  role="radio"
                  aria-checked={selected === option.seed}
                  aria-label={index === 0 ? "Avatar actuel" : `Proposition ${index}`}
                  onClick={() => setSelected(option.seed)}
                  className={cn(
                    "relative rounded-xl border-2 border-transparent p-0.5 transition-colors hover:border-foreground/25",
                    selected === option.seed && "border-primary hover:border-primary",
                  )}
                >
                  <img src={option.src} alt="" className="size-12 rounded-lg bg-secondary" />
                  {selected === option.seed ? (
                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Icon icon={Tick02Icon} className="size-3" strokeWidth={2.5} />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={shuffle} disabled={pending}>
              <Icon icon={RefreshIcon} />
              {options.length > 1 ? "Autres propositions" : "Changer d’avatar"}
            </Button>
            {dirty ? (
              <>
                <Button type="button" size="sm" onClick={save} disabled={pending}>
                  {pending ? <Icon icon={Loading03Icon} className="animate-spin" /> : null}
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected(savedSeed)}
                  disabled={pending}
                >
                  Annuler
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {feedback ? <FeedbackAlert feedback={feedback} className="mx-5 mb-5 w-auto sm:mx-6" /> : null}
    </SectionCard>
  );
}
