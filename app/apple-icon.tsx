import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS homescreen icon — auto-linked by Next.js App Router
export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            fontSize: 108,
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
