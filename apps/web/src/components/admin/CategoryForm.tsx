'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createCategorySchema, slugify, type CategoryDto, type CreateCategoryInput } from '@uilib/shared';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { isAuthError } from '@/app/admin/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { ApiError } from '@/lib/api-client';

import { applyApiErrorToForm } from './apply-api-error-to-form';
import { useCreateCategory, useUpdateCategory } from './use-category-mutations';

export interface CategoryFormProps {
  mode: 'create' | 'edit';
  /** Obrigatório em `mode: 'edit'` — id usado por `PUT`. */
  categoryId?: string;
  defaultValues: CreateCategoryInput;
  onSuccess: (category: CategoryDto) => void;
  onCancel: () => void;
}

/**
 * Formulário de criação/edição de categoria (seção 5.4 do MVP2), reaberto
 * dentro do `<Dialog>` de `CategoriesListView` — ao contrário de
 * `ComponentForm`, não existe rota dedicada `/admin/categories/new`
 * (seção 7: só `categories/page.tsx` na estrutura), então quem controla
 * abrir/fechar é o chamador via `onSuccess`/`onCancel`. Mesmo critério de
 * `ComponentForm` para o resolver único: um objeto completo e válido por
 * `createCategorySchema` também satisfaz `updateCategorySchema`
 * estruturalmente, então não há dois schemas para manter sincronizados.
 */
export function CategoryForm({ mode, categoryId, defaultValues, onSuccess, onCancel }: CategoryFormProps) {
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Em edição, o slug já existe e nunca deve ser reescrito sozinho pelo nome.
  const slugEditedByUserRef = useRef(mode === 'edit');

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createCategorySchema),
    defaultValues,
  });

  function handleNameChange(value: string): void {
    setValue('name', value, { shouldValidate: true });
    if (!slugEditedByUserRef.current) {
      setValue('slug', slugify(value), { shouldValidate: true });
    }
  }

  function handleSlugChange(value: string): void {
    slugEditedByUserRef.current = true;
    setValue('slug', value, { shouldValidate: true });
  }

  async function onSubmit(values: CreateCategoryInput): Promise<void> {
    setSubmitError(null);

    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(values);
        toast({ title: 'Category created' });
        onSuccess(created);
        return;
      }

      if (categoryId) {
        const updated = await updateMutation.mutateAsync({ id: categoryId, input: values });
        toast({ title: 'Category updated' });
        onSuccess(updated);
      }
    } catch (error) {
      // 401/403 já viram toast + redirect globais em `AdminProviders`.
      if (isAuthError(error)) {
        return;
      }
      setSubmitError(applyApiErrorToForm(error as ApiError, setError));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {submitError && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-name" className="text-sm font-medium text-neutral-700">
          Name
        </label>
        <Input
          id="category-name"
          value={watch('name')}
          onChange={(event) => handleNameChange(event.target.value)}
        />
        {errors.name && (
          <p role="alert" className="text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-slug" className="text-sm font-medium text-neutral-700">
          Slug
        </label>
        <Input
          id="category-slug"
          value={watch('slug')}
          onChange={(event) => handleSlugChange(event.target.value)}
        />
        {errors.slug && (
          <p role="alert" className="text-xs text-red-600">
            {errors.slug.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-description" className="text-sm font-medium text-neutral-700">
          Description <span className="font-normal text-neutral-400">(optional)</span>
        </label>
        <Textarea id="category-description" rows={3} {...register('description')} />
        {errors.description && (
          <p role="alert" className="text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category-position" className="text-sm font-medium text-neutral-700">
          Position
        </label>
        <Input
          id="category-position"
          type="number"
          className="max-w-[8rem]"
          {...register('position', { valueAsNumber: true })}
        />
        <p className="text-xs text-neutral-500">Lower numbers appear first in the category nav.</p>
        {errors.position && (
          <p role="alert" className="text-xs text-red-600">
            {errors.position.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? 'Saving…' : mode === 'create' ? 'Create category' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
