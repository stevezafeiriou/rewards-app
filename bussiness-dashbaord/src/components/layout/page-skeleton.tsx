import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function FullscreenPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-screen items-center justify-center px-4 py-6', className)}>
      <div className="w-full max-w-6xl space-y-6">
        <PageSkeleton />
      </div>
    </div>
  )
}

export function RouteSkeleton() {
  return (
    <div className="px-4 py-4 sm:px-6 lg:px-6 lg:py-5 xl:px-8">
      <div className="grid min-h-screen grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <Card className="hidden h-[calc(100vh-2.5rem)] bg-sidebar lg:block">
          <CardContent className="flex h-full flex-col justify-between p-5">
            <div className="space-y-4">
              <Skeleton className="h-4 w-24 bg-white/10" />
              <Skeleton className="h-8 w-40 bg-white/14" />
              <div className="space-y-3 pt-4">
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 rounded-full bg-white/8" />
                ))}
              </div>
            </div>
            <div className="space-y-3 border-t border-white/8 pt-4">
              <Skeleton className="h-11 rounded-full bg-white/8" />
              <Skeleton className="h-11 rounded-full bg-white/8" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-12 flex-1 rounded-full" />
            <Skeleton className="h-12 w-24 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-48 rounded-full" />
            <Skeleton className="h-12 w-28 rounded-full" />
          </div>
          <PageSkeleton />
        </div>
      </div>
    </div>
  )
}

export function PageSkeleton({
  cards = 3,
  rows = 2,
  className,
}: {
  cards?: number
  rows?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <div className={cn('grid gap-4', cards > 1 && 'md:grid-cols-2 xl:grid-cols-4')}>
        {Array.from({ length: cards }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-12 w-12 rounded-[1rem]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: rows }).map((__, rowIndex) => (
                <Skeleton key={rowIndex} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
