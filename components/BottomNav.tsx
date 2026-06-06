"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",             label: "Today",  icon: "today"      },
  { href: "/command",      label: "Apex",   icon: "psychology" },
  { href: "/intelligence", label: "Me",     icon: "person"     },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(18, 19, 23, 0.9)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="flex items-center justify-around"
        style={{ height: 60, maxWidth: 480, margin: "0 auto", paddingLeft: 20, paddingRight: 20 }}
      >
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full active:scale-90 transition-transform"
              style={{ color: active ? "#ffc174" : "rgba(216,195,173,0.35)" }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 22,
                  fontVariationSettings: active
                    ? "'FILL' 1, 'wght' 400"
                    : "'FILL' 0, 'wght' 300",
                }}
              >
                {icon}
              </span>
              <span
                className="font-label"
                style={{ fontSize: 10, letterSpacing: "0.05em", fontWeight: active ? 600 : 400 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
