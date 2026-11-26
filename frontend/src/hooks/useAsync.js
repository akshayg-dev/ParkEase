import { useState, useCallback } from 'react'

/**
 * Manage simple async request state: loading, error, data.
 *
 * @template T
 * @param {() => Promise<T>} asyncFn  The async function to execute.
 * @returns {{ execute: () => Promise<T>, loading: boolean, error: string|null, data: T|null }}
 */
export function useAsync(asyncFn) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const execute = useCallback(
    async (...args) => {
      setLoading(true)
      setError(null)
      try {
        const result = await asyncFn(...args)
        setData(result)
        return result
      } catch (err) {
        const message = err?.message ?? 'Something went wrong.'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [asyncFn],
  )

  return { execute, loading, error, data }
}
