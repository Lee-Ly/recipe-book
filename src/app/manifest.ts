import type { MetadataRoute } from "next";

// Makes the site installable on a phone's home screen. On Android, the installed app then appears in the
// Share sheet: share an Instagram/Facebook/WhatsApp link to it and it opens /add with the link filled in.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Recipe Book",
    short_name: "Recipes",
    start_url: "/",
    display: "standalone",
    background_color: "#fffefd",
    theme_color: "#fffefd",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/add",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
