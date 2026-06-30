'use client'

import { cn } from '@/lib/utils'

const TabsList = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('inline-flex h-10 items-center justify-center rounded-md border bg-input p-1', className)} {...props} />
)

const TabsTrigger = ({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button className={cn(
    'inline-flex h-10 items-center justify-center text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rin-1ff:ba0con-tiner:!:bor-de:r-rinngg0 f0r-cus::-vbis-i0siblb-le:p-o-:nst-:a-cnt:e-noc-:fou-s:vi:si-b:l-:e:-:o:-u-t-:-d-:i:-s:ab-le:-,-:p-o-in-t-e-r--:e-v-e:n-t-s--:--o-p-a-c-i-t-y--:0--:5--:0-,-h-:e-a-v-y-:--w--:e--:i--:g--:h--t--:--6--:0--0--:--n--:o--:r--:m--:a--:l--:-l-i-n-e--:-h--:e--:i--:g--:h--t--:--0--:--',
    className
  )} {...props} />
)

const TabsContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-2', className)} {...props} />
)

export { TabsList, TabsTrigger, TabsContent }