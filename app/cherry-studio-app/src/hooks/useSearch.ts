import { debounce } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface UseSearchOptions {
  delay?: number
}

export function useSearch<T>(
  items: T[] | null | undefined,
  searchFields: (item: T) => (string | null | undefined)[],
  options: UseSearchOptions = {}
) {
  const { delay = 300 } = options
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText, setDebouncedSearchText] = useState('')
  const resolvedItems = useMemo(() => (items ?? []) as T[], [items])

  const debouncedSetSearch = useMemo(
    () =>
      debounce((text: string) => {
        setDebouncedSearchText(text)
      }, delay),
    [delay]
  )

  useEffect(() => {
    debouncedSetSearch(searchText)

    return () => {
      debouncedSetSearch.cancel()
    }
  }, [searchText, debouncedSetSearch])

  const normalizedSearchText = useMemo(() => debouncedSearchText.trim().toLowerCase(), [debouncedSearchText])
  const hasSearchText = normalizedSearchText.length > 0

  const filteredItems = useMemo(() => {
    if (!hasSearchText) {
      return resolvedItems
    }

    return resolvedItems.filter(item => {
      const fields = searchFields(item)
      return fields.some(field => field && field.toLowerCase().includes(normalizedSearchText))
    })
  }, [hasSearchText, normalizedSearchText, resolvedItems, searchFields])

  const clearSearch = useCallback(() => {
    debouncedSetSearch.cancel()
    setSearchText('')
    setDebouncedSearchText('')
  }, [debouncedSetSearch])

  return {
    searchText,
    setSearchText,
    filteredItems,
    isSearching: searchText !== debouncedSearchText,
    hasSearchText,
    clearSearch
  }
}
