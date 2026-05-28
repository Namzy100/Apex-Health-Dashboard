"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MessageSquare, User, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",         label: "Today",    Icon: Sparkles     },
  { href: "/ask",      label: "Ask",      Icon: MessageSquare },
  { href: "/me",       label: "Me",       Icon: User          },
  { href: "/settings", label: "Settings", Icon: Settings      },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30"
      style={{
        background: "rgba(9, 8, 10, 0.92)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all"
              style={{ color: active ? "var(--amber)" : "var(--text-muted)" }}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: "0.01em" }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
