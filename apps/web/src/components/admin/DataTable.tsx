import type { ReactNode } from 'react';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Classe opcional aplicada à célula — usada para alinhar colunas de ação à direita, por exemplo. */
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption: string;
}

/**
 * Tabela administrativa genérica (seção 7 do MVP2: `components/admin/DataTable`),
 * reaproveitável por qualquer listagem admin — hoje só `/admin/components`,
 * mas o CRUD de categorias (seção 5.4, tarefa futura) usa o mesmo formato de
 * `columns`/`rows` em vez de duplicar a marcação de tabela.
 */
export function DataTable<T>({ columns, rows, getRowKey, caption }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            {columns.map((column) => (
              <th key={column.header} scope="col" className={`px-4 py-3 font-medium ${column.className ?? ''}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="hover:bg-neutral-50">
              {columns.map((column) => (
                <td key={column.header} className={`px-4 py-3 ${column.className ?? ''}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
