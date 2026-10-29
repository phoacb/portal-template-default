import type { AppExtension } from "@digiforce/portal-sdk/extensions";
import { defineAppRoutes } from "@digiforce/portal-sdk/routing";
import { ShieldAlert } from "lucide-react";

const errorBoundaryExtension: AppExtension = {
  id: "digiforce-error-boundary",
  dev: {
    resources: [
      {
        name: "error-boundary",
        list: "error-boundary",
        meta: {
          label: "Error boundaries",
          icon: <ShieldAlert />,
          description: "Render boundaries and Digiforce runtime status patterns.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.error-boundary",
        path: "error-boundary",
        lazy: () => import("./demo"),
      },
    ]),
  },
};

export default errorBoundaryExtension;
