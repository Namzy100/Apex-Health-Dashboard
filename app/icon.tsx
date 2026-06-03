import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Used by Next.js App Router as the default favicon and referenced by manifest
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#060606",
          borderRadius: 40,
        }}
      >
        <div
          style={{
            fontSize: 112,
            fontWeight: 800,
            color: "#f59e0b",
            lineHeight: 1,
            fontFamily: "serif",
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
