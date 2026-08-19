import type { CreateComponentInput } from '@uilib/shared';

import { ComponentForm } from '@/components/admin/ComponentForm';

const EMPTY_DEFAULTS: CreateComponentInput = {
  name: '',
  slug: '',
  description: '',
  categoryId: '',
  html: '',
  css: '',
  js: null,
  technologies: [],
  promptTemplate: null,
  status: 'DRAFT',
};

/** `/admin/components/new` (seção 5.4/7 do MVP2). */
export default function NewComponentPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-neutral-900">New component</h1>
      <ComponentForm mode="create" defaultValues={EMPTY_DEFAULTS} />
    </div>
  );
}
