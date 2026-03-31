import type { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const viewport = { once: true, amount: 0.2 }

type MotionDivProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>

export function FadeIn({
  className,
  delay = 0,
  y = 14,
  children,
  ...props
}: MotionDivProps & { delay?: number; y?: number }) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut', delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function RevealOnView({
  className,
  delay = 0,
  y = 18,
  children,
  ...props
}: MotionDivProps & { delay?: number; y?: number }) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: 0.32, ease: 'easeOut', delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
