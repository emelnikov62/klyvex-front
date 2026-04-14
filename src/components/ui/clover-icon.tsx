import { cn } from "@/lib/utils";

interface CloverIconProps {
  className?: string;
  fill?: string;
}

const CloverIcon = ({ className, fill }: CloverIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("h-4 w-4", className)}
  >
    {/* Four heart-shaped leaves */}
    <path
      d="M12 12C12 12 8.5 8 6.5 8C4.5 8 3 9.5 3 11.5C3 13.5 5 15 12 12"
      fill={fill || "none"}
    />
    <path
      d="M12 12C12 12 16 8.5 16 6.5C16 4.5 14.5 3 12.5 3C10.5 3 9 5 12 12"
      fill={fill || "none"}
    />
    <path
      d="M12 12C12 12 15.5 16 17.5 16C19.5 16 21 14.5 21 12.5C21 10.5 19 9 12 12"
      fill={fill || "none"}
    />
    <path
      d="M12 12C12 12 8 15.5 8 17.5C8 19.5 9.5 21 11.5 21C13.5 21 15 19 12 12"
      fill={fill || "none"}
    />
    {/* Stem */}
    <path d="M12 12L14.5 19.5" />
  </svg>
);

export default CloverIcon;