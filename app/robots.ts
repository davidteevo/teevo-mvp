import type { MetadataRoute } from "next";
import { isStaging } from "@/lib/app-env";

export default function robots(): MetadataRoute.Robots {
  if (isStaging()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  };
}
