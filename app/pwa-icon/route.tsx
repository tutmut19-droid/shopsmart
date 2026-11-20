import { ImageResponse } from "next/og";

export function GET(request: Request) {
  const size = Number(new URL(request.url).searchParams.get("size")) === 192 ? 192 : 512;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontSize: size * 0.55,
          fontWeight: 700,
        }}
      >
        M
      </div>
    ),
    { width: size, height: size }
  );
}