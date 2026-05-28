"use client";

import { useRouter } from "next/navigation";

interface SuggestionChipsProps {
  chips: string[];
  onChipClick?: (chip: string) => void;
}

export default function SuggestionChips({ chips, onChipClick }: SuggestionChipsProps) {
  const router = useRouter();

  const handleClick = (chip: string) => {
    if (onChipClick) {
      onChipClick(chip);
    } else {
      // Navigate to Ask with pre-filled query
      router.push(`/ask?q=${encodeURIComponent(chip)}`);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => handleClick(chip)}
          className="chip flex-shrink-0"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
