'use client';

import type { AdminComponentDto, CreateComponentInput } from '@uilib/shared';
import { useParams } from 'next/navigation';

import { AdminErrorState, AdminLoadingState } from '@/components/admin/AdminStateMessages';
import { ComponentForm } from '@/components/admin/ComponentForm';
import { useAdminComponent } from '@/components/admin/use-admin-components';

function toFormValues(component: AdminComponentDto): CreateComponentInput {
  return {
    name: component.name,
    slug: component.slug,
    description: component.description,
    categoryId: component.categoryId,
    html: component.html,
    css: component.css,
    js: component.js,
    technologies: component.technologies,
    promptTemplate: component.promptTemplate,
    status: component.status,
  };
}

/** `/admin/components/[id]/edit` (seção 5.4/7 do MVP2). */
export default function EditComponentPage() {
  const params = useParams<{ id: string }>();
  const query = useAdminComponent(params.id);

  if (query.isPending) {
    return <AdminLoadingState label="Loading component…" />;
  }

  if (query.isError) {
    return <AdminErrorState message="Couldn't load this component." onRetry={() => query.refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-neutral-900">Edit component</h1>
      <ComponentForm mode="edit" componentId={params.id} defaultValues={toFormValues(query.data)} />
    </div>
  );
}
