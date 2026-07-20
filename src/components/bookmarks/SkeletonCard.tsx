export function SkeletonCard({ isLast }: { isLast?: boolean }) {
  return (
    <div className={`flex items-center gap-[11px] px-4 py-3 animate-pulse ${!isLast ? 'border-b border-[#241F19]' : ''}`}>
      <div className="w-6 h-6 rounded-md bg-[#2A241C] shrink-0"></div>
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1.5">
        <div className="h-3.5 bg-[#2A241C] rounded w-[40%]"></div>
        <div className="h-2.5 bg-[#2A241C] rounded w-[25%]"></div>
      </div>
    </div>
  );
}
