export function BoatBadge({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/boat.png"
      alt="ボートのアイコン"
      width={size}
      height={size}
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
