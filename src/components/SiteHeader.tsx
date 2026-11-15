import type { ReactNode } from "react";
import { siteHeaderCls } from "./ui";

/** The one header used on every page: left, optional centre, right, and a line underneath. */
export default function SiteHeader({ left, center, right }: { left: ReactNode; center?: ReactNode; right?: ReactNode }) {
  return (
    <header dir="ltr" className={siteHeaderCls}>
      <div className="flex items-center">{left}</div>
      {center && <div className="flex min-w-0 items-center">{center}</div>}
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}
