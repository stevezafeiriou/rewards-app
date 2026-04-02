import { toast, type ToastOptions } from 'react-toastify'

type ToastMessages<T> = {
  loading: string
  success: string | ((value: T) => string)
  error: string | ((error: unknown) => string)
}

function extractErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return null
}

export function getToastErrorMessage(error: unknown, fallback: string) {
  return extractErrorMessage(error) ?? fallback
}

export function toastPromise<T>(
  promise: Promise<T>,
  messages: ToastMessages<T>,
  options?: ToastOptions,
) {
  return toast.promise(
    promise,
    {
      pending: messages.loading,
      success: {
        render({ data }) {
          return typeof messages.success === 'function' ? messages.success(data as T) : messages.success
        },
      },
      error: {
        render({ data }) {
          return typeof messages.error === 'function' ? messages.error(data) : messages.error
        },
      },
    },
    options,
  )
}
