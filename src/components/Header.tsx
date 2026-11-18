import Link from "next/link";
import { PlusIcon } from "./icons";
import SiteHeader from "./SiteHeader";
import { btnPrimary, headerTitleCls } from "./ui";

/** Home header: logo mark and name on the left, the add button on the right. */
export default function Header({ canAdd = true }: { canAdd?: boolean }) {
  return (
    <SiteHeader
      left={
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">R.</span>
          <span className={headerTitleCls}>
            Recipe Book<span className="text-accent">.</span>
          </span>
        </Link>
      }
      right={
        canAdd ? (
          <Link href="/add" className={btnPrimary}>
            <PlusIcon />
            <span>New</span>
          </Link>
        ) : undefined
      }
    />
  );
}
