import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Ticket } from "lucide-react";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center gradient-mesh-bg">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(data: LoginFormData) {
    setServerError("");

    const { error } = await signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setServerError(error.message || "Invalid email or password");
    } else {
      navigate("/");
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center gradient-mesh-bg noise-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary glow-blue">
            <Ticket className="size-6" />
          </div>
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              HelpDesk
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>
        </div>

        {/* Login card */}
        <div className="glass-card-strong rounded-2xl p-6 glow-blue-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            {(Object.keys(errors).length > 0 || serverError) && (
              <Alert variant="destructive">
                <AlertDescription>
                  <ul className="space-y-1">
                    {errors.email && <li>{errors.email.message}</li>}
                    {errors.password && <li>{errors.password.message}</li>}
                    {serverError && <li>{serverError}</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                className="bg-background/50 border-border/50 focus:border-primary/50"
                {...register("email")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                aria-invalid={!!errors.password}
                className="bg-background/50 border-border/50 focus:border-primary/50"
                {...register("password")}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 glow-blue-sm"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
