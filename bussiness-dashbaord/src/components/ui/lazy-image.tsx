import { useState, type ImgHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type LazyImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string
  skeletonClassName?: string
}

export function LazyImage({
  alt,
  className,
  wrapperClassName,
  skeletonClassName,
  onLoad,
  src,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      {!isLoaded ? <Skeleton className={cn('absolute inset-0', skeletonClassName)} /> : null}
      <motion.div
        animate={{ opacity: isLoaded ? 1 : 0, scale: isLoaded ? 1 : 1.02 }}
        className="h-full w-full"
        initial={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <img
          alt={alt}
          className={cn('h-full w-full object-cover', className)}
          decoding={decoding}
          loading={loading}
          onLoad={(event) => {
            setIsLoaded(true)
            onLoad?.(event)
          }}
          src={src}
          {...props}
        />
      </motion.div>
    </div>
  )
}
