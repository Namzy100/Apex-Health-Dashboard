"use client";

import { motion } from "framer-motion";
import type { EnergyLevel } from "@/lib/store";

const LEVELS: { value: EnergyLevel; label: string }[] = [
  { value: "low",    label: "Low"    },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High"   },
];

interface EnergySelectorProps {
  value: EnergyLevel | null;
  onChange: (level: EnergyLevel) => void;
}

export default function EnergySelector({ value, onChange }: EnergySelectorProps) {
  return (
    <div className="flex items-center gap-2.5">
      {LEVELS.map(({ value: level, label }) => {
        const active = value === level;
        return (
          <motion.button
            key={level}
            whileTap={{ scale: 0.93 }}
            onClick={() => onChange(level)}
            className={`energy-pill ${active ? `active-${level}` : ""}`}
          >
            {label}
          </motion.button>
        );
      })}
      {!value && (
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>
          How are you feeling?
        </span>
      )}
    </div>
  );
}
