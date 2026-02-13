import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

interface UserAvatarProps {
  fullName: string | null | undefined;
  avatarUrl: string | null | undefined;
  className?: string;
  fallbackClassName?: string;
}

export default function UserAvatar({ fullName, avatarUrl, className, fallbackClassName }: UserAvatarProps) {
  return (
    <Avatar className={cn("h-9 w-9", className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || "Avatar"} />}
      <AvatarFallback className={cn("bg-primary text-primary-foreground text-sm font-semibold", fallbackClassName)}>
        {getInitials(fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
