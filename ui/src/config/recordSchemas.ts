/**
 * Schema config for flat record types.
 *
 * To add a new record type:
 * 1. Add a schema here (fields, paths)
 * 2. Add create API in recordsApi.ts + wire to CREATE_FNS in AddRecord.tsx
 * 3. Add backend: model, collection, CRUD in records_endpoints.py
 * 4. Add route in App.tsx: path="my-type/new" element={<AddRecord schemaId="my_type" />}
 * 5. Add sidebar link + list/detail pages
 */
export interface RecordFieldDef {
  key: string
  label: string
  type: 'text' | 'textarea'
  placeholder?: string
  required?: boolean
}

export interface RecordSchemaConfig {
  id: string
  title: string
  subtitle: string
  listPath: string
  addPath: string
  fields: RecordFieldDef[]
}

export const RECORD_SCHEMAS: RecordSchemaConfig[] = [
  {
    id: 'ubuntu_releases',
    title: 'Ubuntu Release',
    subtitle: 'Add a new Ubuntu release',
    listPath: '/app/ubuntu-releases',
    addPath: '/app/ubuntu-releases/new',
    fields: [
      { key: 'version', label: 'Version', type: 'text', placeholder: 'e.g. 24.04 LTS', required: true },
      { key: 'codename', label: 'Codename', type: 'text', placeholder: 'e.g. Noble Numbat', required: true },
      { key: 'release_date', label: 'Release Date', type: 'text', placeholder: 'YYYY-MM-DD', required: true },
      { key: 'support_type', label: 'Support Type', type: 'text', placeholder: 'LTS or Interim', required: true },
      { key: 'eol_date', label: 'EOL Date', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'summary', label: 'Summary', type: 'textarea', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'python_releases',
    title: 'Python Release',
    subtitle: 'Add a new Python version',
    listPath: '/app/python-releases',
    addPath: '/app/python-releases/new',
    fields: [
      { key: 'version', label: 'Version', type: 'text', placeholder: 'e.g. 3.12', required: true },
      { key: 'release_date', label: 'Release Date', type: 'text', placeholder: 'YYYY-MM-DD', required: true },
      { key: 'eol_date', label: 'EOL Date', type: 'text', placeholder: 'YYYY-MM-DD' },
      { key: 'status', label: 'Status', type: 'text', placeholder: 'bugfix, security, eol', required: true },
      { key: 'summary', label: 'Summary', type: 'textarea', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'roman_leaders',
    title: 'Roman Leader',
    subtitle: 'Add a new Roman or Byzantine leader',
    listPath: '/app/roman-leaders',
    addPath: '/app/roman-leaders/new',
    fields: [
      { key: 'name', label: 'Name', type: 'text', placeholder: 'e.g. Augustus', required: true },
      { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Emperor', required: true },
      { key: 'reign_start', label: 'Reign Start', type: 'text', placeholder: 'e.g. 27 BC', required: true },
      { key: 'reign_end', label: 'Reign End', type: 'text', placeholder: 'e.g. 14 AD', required: true },
      { key: 'dynasty', label: 'Dynasty', type: 'text', placeholder: 'e.g. Julio-Claudian' },
      { key: 'summary', label: 'Summary', type: 'textarea', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
]
