"use client";

import dynamic from "next/dynamic";

const Studio = dynamic(() => import("./Studio"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        backgroundColor: "#0b0b12",
        color: "#aaa9bd",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>
          Picksy Sanity Studio
        </p>
        <p style={{ fontSize: "0.875rem" }}>Loading authoring environment...</p>
      </div>
    </div>
  ),
});

export function StudioClient() {
  return <Studio />;
}
