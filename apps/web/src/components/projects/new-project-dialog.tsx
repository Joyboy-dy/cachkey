import { Add01Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { projectsApi } from "@/lib/workspace";
import { ProjectForm } from "./project-form";

/** « Nouveau projet » button + dialog; opens the project once created. */
export function NewProjectDialog({ size = "default" }: { size?: "default" | "lg" }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={size}>
          <Icon icon={Add01Icon} />
          Nouveau projet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau projet</DialogTitle>
          <DialogDescription>
            Un projet regroupe les environnements et les secrets d’une application.
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          autoFocus
          submitLabel="Créer le projet"
          onSubmit={async (input) => {
            const { data, error } = await projectsApi.create(input);
            if (error) return error;
            await queryClient.invalidateQueries({ queryKey: ["projects"] });
            setOpen(false);
            await navigate({ to: "/projects/$slug", params: { slug: data.slug } });
            return null;
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
