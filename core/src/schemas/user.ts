import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .or(z.literal("")),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
