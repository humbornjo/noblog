// Query a database response
// https://developers.notion.com/reference/post-database-query
export interface QueryDatabaseResponse {
  object: string
  results: Page[]
  next_cursor: null | string
  has_more: boolean
  type: string
  page?: Record<string, never>
}

interface User {
  object: string
  id: string
}

interface External {
  url: string
}

interface File {
  type: string
  name?: string
  external?: External
  file?: File
}

export interface Emoji {
  type: string
  emoji: string
}

interface Parent {
  type: string
  database_id?: string
  page_id?: string
}

interface Annotations {
  bold: boolean
  italic: boolean
  strikethrough: boolean
  underline: boolean
  code: boolean
  color: string
}

interface Link {
  type: string
  url: string
}

interface Text {
  content: string
  link?: Link
}

interface Reference {
  id: string
}

interface DateProperty {
  start: string
  end?: null | string
  timezone?: null | string
}

interface LinkPreview {
  url: string
}

interface Mention {
  type: string

  user?: User
  page?: Reference
  database?: Reference
  date?: DateProperty
  link_preview?: LinkPreview
}

interface Equation {
  expression: string
}

export interface RichText {
  type: string
  plain_text: string
  annotations: Annotations
  href?: string

  text?: Text
  mention?: Mention
  equation?: Equation
}

export interface Page {
  object: string
  id: string
  created_time: string
  created_by: User
  last_edited_time: string
  last_edited_by: User
  archived: boolean
  icon: File | Emoji | null
  cover: File
  properties: PageProperties
  parent: Parent
  url: string
}

interface PageProperties {
  [key: string]: PageProperty
}


interface SelectProperty {
  id: string
  name: string
  color: string
}

interface StatusProperty {
  id: string
  name: string
  color: string
}

interface FormulaProperty {
  type: string

  number?: number
  string?: string
  boolean?: boolean
  date?: DateProperty
}

interface RelationProperty {
  id: string
}

interface RollupProperty {
  type: string
  function: string

  number?: number
  string?: string
  date?: DateProperty
  results?: string[]
}

interface PageProperty {
  id: string
  type: string

  title?: RichText[]
  rich_text?: RichText[]
  number?: number
  select?: SelectProperty
  status?: StatusProperty
  multi_select?: SelectProperty[]
  date?: DateProperty
  formula?: FormulaProperty
  relation?: RelationProperty[]
  rollup?: RollupProperty
  people?: User[]
  files?: File[]
  checkbox?: boolean
  url?: string
  email?: string
  phone_number?: string
  created_time?: string
  created_by?: User
  last_edited_time?: string
  last_edited_by?: User
}
