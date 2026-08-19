'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  componentStatusSchema,
  createComponentSchema,
  slugify,
  type AdminComponentDto,
  type CreateComponentInput,
} from '@uilib/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { isAuthError } from '@/app/admin/providers';
import { ComponentPreviewPanel } from '@/components/preview/ComponentPreviewPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import type { ApiError } from '@/lib/api-client';
import { useDebouncedValue } from '@/lib/use-debounced-value';

import { applyApiErrorToForm } from './apply-api-error-to-form';
import { DeleteComponentDialog } from './DeleteComponentDialog';
import { useCategories } from './use-categories';
import { useCreateComponent, useUpdateComponent } from './use-component-mutations';

const PREVIEW_DEBOUNCE_MS = 400;

export interface ComponentFormProps {
  mode: 'create' | 'edit';
  /** Obrigatório em `mode: 'edit'` — id usado por `PUT`/`DELETE`. */
  componentId?: string;
  defaultValues: CreateComponentInput;
}

/** `''` vira `null` na saída — schema aceita ambos para `js`/`promptTemplate`, mas o banco usa `null` para "sem conteúdo" (seção 5.2: "aba JS só aparece se houver conteúdo"). */
function emptyToNull(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value : null;
}

/**
 * Formulário de criação/edição de componente (seção 5.4 do MVP2),
 * compartilhado por `/admin/components/new` e `/admin/components/[id]/edit`.
 * Um único `zodResolver(createComponentSchema)` valida os dois modos — o
 * schema de update (`updateComponentSchema`) é o mesmo shape com tudo
 * opcional, então um objeto completo e válido por `createComponentSchema`
 * também satisfaz `updateComponentSchema` estruturalmente; não há dois
 * schemas para manter sincronizados.
 */
export function ComponentForm({ mode, componentId, defaultValues }: ComponentFormProps) {
  const router = useRouter();
  const categoriesQuery = useCategories();
  const createMutation = useCreateComponent();
  const updateMutation = useUpdateComponent();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedComponent, setSavedComponent] = useState<AdminComponentDto | null>(null);
  // Em edição, o slug já existe e nunca deve ser reescrito sozinho pelo nome.
  const slugEditedByUserRef = useRef(mode === 'edit');

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createComponentSchema),
    defaultValues,
  });

  const html = watch('html');
  const css = watch('css');
  const js = watch('js');
  const debouncedHtml = useDebouncedValue(html, PREVIEW_DEBOUNCE_MS);
  const debouncedCss = useDebouncedValue(css, PREVIEW_DEBOUNCE_MS);
  const debouncedJs = useDebouncedValue(js, PREVIEW_DEBOUNCE_MS);

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

  async function onSubmit(values: CreateComponentInput): Promise<void> {
    setSubmitError(null);
    const input: CreateComponentInput = {
      ...values,
      js: emptyToNull(values.js),
      promptTemplate: emptyToNull(values.promptTemplate),
    };

    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(input);
        setSavedComponent(created);
        toast({ title: 'Component created' });
        router.push(`/admin/components/${created.id}/edit`);
        return;
      }

      if (componentId) {
        const updated = await updateMutation.mutateAsync({ id: componentId, input });
        setSavedComponent(updated);
        toast({ title: 'Component updated' });
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="flex flex-1 flex-col gap-5">
        {savedComponent && (
          <div
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 data-[status=PUBLISHED]:border-emerald-200 data-[status=PUBLISHED]:bg-emerald-50 data-[status=PUBLISHED]:text-emerald-800"
            data-status={savedComponent.status}
          >
            {savedComponent.status === 'DRAFT' ? (
              <>
                Saved as draft.{' '}
                <Link
                  href={`/component/${savedComponent.slug}?preview=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  Review it
                </Link>{' '}
                before publishing — drafts are never visible on the public site.
              </>
            ) : (
              <>
                Published.{' '}
                <Link
                  href={`/component/${savedComponent.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                >
                  View it live
                </Link>
                .
              </>
            )}
          </div>
        )}

        {submitError && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-neutral-700">
              Name
            </label>
            <Input
              id="name"
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
            <label htmlFor="slug" className="text-sm font-medium text-neutral-700">
              Slug
            </label>
            <Input
              id="slug"
              value={watch('slug')}
              onChange={(event) => handleSlugChange(event.target.value)}
            />
            {errors.slug && (
              <p role="alert" className="text-xs text-red-600">
                {errors.slug.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-neutral-700">
            Description
          </label>
          <Textarea id="description" rows={3} {...register('description')} />
          {errors.description && (
            <p role="alert" className="text-xs text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoryId" className="text-sm font-medium text-neutral-700">
              Category
            </label>
            <Select
              id="categoryId"
              disabled={categoriesQuery.isPending}
              {...register('categoryId')}
            >
              <option value="" disabled>
                {categoriesQuery.isPending ? 'Loading categories…' : 'Select a category'}
              </option>
              {categoriesQuery.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {errors.categoryId && (
              <p role="alert" className="text-xs text-red-600">
                {errors.categoryId.message}
              </p>
            )}
            {categoriesQuery.isError && (
              <p role="alert" className="text-xs text-red-600">
                Couldn&apos;t load categories — try reloading the page.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-sm font-medium text-neutral-700">
              Status
            </label>
            <Select id="status" {...register('status')}>
              {componentStatusSchema.options.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="technologies" className="text-sm font-medium text-neutral-700">
            Technologies
          </label>
          <Controller
            control={control}
            name="technologies"
            render={({ field }) => (
              <Input
                id="technologies"
                placeholder="HTML, CSS, JS"
                value={(field.value ?? []).join(', ')}
                onChange={(event) =>
                  field.onChange(
                    event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter((item) => item.length > 0),
                  )
                }
              />
            )}
          />
          <p className="text-xs text-neutral-500">Comma-separated (max 10).</p>
          {errors.technologies && (
            <p role="alert" className="text-xs text-red-600">
              {errors.technologies.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="html" className="text-sm font-medium text-neutral-700">
            HTML
          </label>
          <Textarea id="html" rows={8} className="font-mono text-xs" {...register('html')} />
          {errors.html && (
            <p role="alert" className="text-xs text-red-600">
              {errors.html.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="css" className="text-sm font-medium text-neutral-700">
            CSS
          </label>
          <Textarea id="css" rows={8} className="font-mono text-xs" {...register('css')} />
          {errors.css && (
            <p role="alert" className="text-xs text-red-600">
              {errors.css.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="js" className="text-sm font-medium text-neutral-700">
            JS <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <Textarea id="js" rows={6} className="font-mono text-xs" {...register('js')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="promptTemplate" className="text-sm font-medium text-neutral-700">
            Prompt template <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <Textarea id="promptTemplate" rows={4} {...register('promptTemplate')} />
          <p className="text-xs text-neutral-500">Leave empty to use the default global template.</p>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : mode === 'create' ? 'Create component' : 'Save changes'}
          </Button>
          {mode === 'edit' && componentId && (
            <DeleteComponentDialog componentId={componentId} componentName={watch('name') || 'this component'} />
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-8 lg:w-[420px] lg:shrink-0">
        <ComponentPreviewPanel html={debouncedHtml} css={debouncedCss} js={debouncedJs ?? null} />
      </div>
    </form>
  );
}
