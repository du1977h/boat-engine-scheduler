import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "運搬担当スケジューラー",
    short_name: "運搬担当",
    description: "ボートとエンジンの担当管理をスマホで行えるPWAです。",
    start_url: "/calendar",
    display: "standalone",
    background_color: "#f3f6ef",
    theme_color: "#2f6b3f",
    lang: "ja",
    icons: [
      {
        src: "/boad.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/boad.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/boad.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
