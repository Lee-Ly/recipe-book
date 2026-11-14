import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512];

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const requested = Number((await params).size);
  const size = SIZES.includes(requested) ? requested : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ff5722",
          color: "#ffffff",
          fontSize: size * 0.56,
          fontWeight: 700,
        }}
      >
        R
      </div>
    ),
    { width: size, height: size },
  );
}
