import type { ReactNode } from "react";
import { siteHeaderCls } from "./ui";

/** The one header used on every page: content on the left, content on the right, a line underneath. */
export default function SiteHeader({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <header dir="ltr" className={siteHeaderCls}>
      <div className="flex min-h-11 items-center">{left}</div>
      {right && <div className="flex min-h-11 items-center gap-2">{right}</div>}
    </header>
  );
}
