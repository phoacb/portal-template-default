import type { AppExtension } from "@digiforce/portal-sdk/extensions";
import { defineAppRoutes } from "@digiforce/portal-sdk/routing";
import { FolderOpen } from "lucide-react";

const digiforceFileUploadExtension: AppExtension = {
  id: "digiforce-file-upload",
  dev: {
    resources: [
      {
        name: "file-manager-demo",
        list: "files",
        meta: {
          label: "File manager",
          icon: <FolderOpen />,
          description: "Upload, browse, preview, and download files.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.files",
        path: "files",
        lazy: () =>
          import("./demo").then((module) => ({
            default: module.FileManagerDemoPage,
          })),
      },
    ]),
  },
};

export default digiforceFileUploadExtension;
