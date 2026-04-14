import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, type UpdateUserFormData } from "core/schemas/user";
import { Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import api from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditUserDialogProps {
  user: { id: string; name: string; email: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserDialog({
  user,
  open,
  onOpenChange,
}: EditUserDialogProps) {
  const [serverError, setServerError] = useState("");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    if (user && open) {
      reset({ name: user.name, email: user.email, password: "" });
    }
  }, [user, open, reset]);

  const mutation = useMutation({
    mutationFn: async (data: UpdateUserFormData) => {
      const res = await api.put(`/api/users/${user!.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      let message = "Failed to update user";
      if (error instanceof AxiosError && error.response?.data?.error) {
        message = error.response.data.error;
      }
      setServerError(message);
    },
  });

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    setServerError("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="grid gap-4"
        >
          {(Object.keys(errors).length > 0 || serverError) && (
            <Alert variant="destructive">
              <AlertDescription>
                <ul className="space-y-1">
                  {errors.name && <li>{errors.name.message}</li>}
                  {errors.email && <li>{errors.email.message}</li>}
                  {errors.password && <li>{errors.password.message}</li>}
                  {serverError && <li>{serverError}</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              placeholder="Full name"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              placeholder="user@example.com"
              autoComplete="off"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-password">Password</Label>
            <Input
              id="edit-password"
              type="password"
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
