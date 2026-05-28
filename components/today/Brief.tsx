"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface BriefProps {
  text: string;
  isLoading?: boolean;
  isStreaming?: boolean;
  onRefresh?: () => void;
}

export default function Brief({ text, isLoading, isStreaming, onRefresh }: BriefProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <p style={{ fontSize: 16, lineHeight: 1.85, color: "var(--text-muted)", letterSpacing: "-0.012em" }}>
          Thinking...
        </p>
      </motion.div>
    );
  }

  return (
    <div className="group relative">
      <motion.p
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={`brief-prose${isStreaming ? " streaming-cursor" : ""}`}
      >
        {text}
      </motion.p>

      {onRefresh && !isStreaming && (
        <motion.button
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          onClick={onRefresh}
          className="absolute -right-1 top-0 p-1.5 rounded-md transition-opacity"
          style={{ color: "var(--text-muted)", opacity: 0 }}
          title="Refresh brief"
        >
          <RefreshCw size={11} />
        </motion.button>
      )}
    </div>
  );
}
