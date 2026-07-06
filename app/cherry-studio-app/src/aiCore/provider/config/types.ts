import type { Model, Provider } from '@/types/assistant'

export interface RuleSet {
  rules: {
    match: (model: Model) => boolean
    provider: (provider: Provider) => Provider
  }[]
  fallbackRule: (provider: Provider) => Provider
}
