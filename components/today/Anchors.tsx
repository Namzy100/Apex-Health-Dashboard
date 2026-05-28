"use client";

import { motion } from "framer-motion";

interface AnchorsProps {
  anchors: [string, string, string];
}

export default function Anchors({ anchors }: AnchorsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {anchors.map((anchor, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 + i * 0.05, duration: 0.35 }}
          style={{ display: "flex", alignItems: "baseline", gap: 12 }}
        >
          <div
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--text-muted)",
              flexShrink: 0,
              marginTop: 8,
              opacity: 0.5,
            }}
          />
          <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-secondary)", letterSpacing: "-0.005em" }}>
            {anchor}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
