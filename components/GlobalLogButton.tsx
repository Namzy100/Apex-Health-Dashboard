"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useApex } from "@/lib/store";

// Shown on Brief / Intelligence / Command only.
// Position adjusts on Command to sit above the fixed input bar.
const SHOW_ON = ["/", "/intelligence", "/command"]; // Today / Memory / Ask

export default function GlobalLogButton() {
  const { dispatch } = useApex();
  const pathname = usePathname();

  if (!SHOW_ON.includes(pathname)) return null;

  // Command has a fixed input bar (~70px tall) sitting above the 60px bottom nav
  const isCommand = pathname === "/command";
  const bottom = isCommand
    ? "calc(144px + env(safe-area-inset-bottom, 0px))"
    : "calc(76px + env(safe-area-inset-bottom, 0px) + 16px)";

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 28 }}
      whileTap={{ scale: 0.88 }}
      onClick={() => dispatch({ type: "OPEN_LOG_SHEET", tab: "meal" })}
      style={{
        position: "fixed",
        bottom,
        right: 20,
        zIndex: 45,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #f59e0b, #f97316)",
        boxShadow: "0 8px 28px rgba(245,158,11,0.28)",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label="Log meal, weight, or workout"
    >
      <Plus size={20} color="#1a0e00" strokeWidth={2.5} />
    </motion.button>
  );
}
