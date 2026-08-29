import type { MetadataRoute } from "next";

const baseUrl = "https://shadowledger-six.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/dashboard", "/payroll/new", "/recipient/activate", "/verify", "/registry", "/privacy"]
    .map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 }));
}
