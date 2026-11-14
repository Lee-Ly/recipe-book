import Link from "next/link";
import SiteHeader from "./SiteHeader";
import { headerTitleCls } from "./ui";

/** Home header: the logo on the left, the add button on the right. */
export default function Header() {
  return (
    <SiteHeader
      left={
        <Link href="/" className={headerTitleCls}>
          Recipe Book<span className="text-accent">.</span>
        </Link>
      }
      right={
        <Link href="/add" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-bold text-accent-fg active:opacity-80">
          <span aria-hidden className="text-lg leading-none">
            +
          </span>
          New
        </Link>
      }
    />
  );
}
