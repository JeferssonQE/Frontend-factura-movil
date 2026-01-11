import { z } from 'zod';

export const emailSchema = z
  .string()
  .email('Email inválido')
  .min(1, 'Email es requerido');

export const passwordSchema = z
  .string()
  .min(4, 'Mínimo 4 caracteres')
  .max(128, 'Máximo 128 caracteres');

export const nameSchema = z
  .string()
  .min(2, 'Mínimo 2 caracteres')
  .max(100, 'Máximo 100 caracteres')
  .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo letras permitidas');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
