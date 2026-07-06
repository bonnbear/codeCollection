export interface ExtractResults {
  websearch?: WebsearchExtractResults
  knowledge?: KnowledgeExtractResults
}

export interface WebsearchExtractResults {
  question: string[]
  links?: string[]
}

export interface KnowledgeExtractResults {
  rewrite: string
  question: string[]
}
