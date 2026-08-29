import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/claim/", "/auditor"] }],
    sitemap: "https://shadowledger-six.vercel.app/sitemap.xml",
  };
}
