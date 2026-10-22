export function deepMerge(...objects: any[]) {
  return objects.reduce(
    (acc, obj) => {
      const result: Record<string, unknown> = { ...acc }

      for (const key of Object.keys(obj)) {
        const aVal = (acc as Record<string, unknown>)[key]
        const sVal = (obj as Record<string, unknown>)[key]

        if (Array.isArray(aVal) && Array.isArray(sVal)) {
          result[key] = [...aVal, ...sVal]
        } else if (
          sVal !== null &&
          typeof sVal === 'object' &&
          !Array.isArray(sVal) &&
          aVal !== null &&
          typeof aVal === 'object' &&
          !Array.isArray(aVal)
        ) {
          result[key] = deepMerge(aVal, sVal)
        } else {
          result[key] = sVal
        }
      }

      return result
    },
    {} as Record<string, unknown>
  )
}
