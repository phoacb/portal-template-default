import type { AppExtension } from "@digiforce/portal-sdk/extensions";
import { defineAppRoutes } from "@digiforce/portal-sdk/routing";
import { Languages } from "lucide-react";
import { LanguageUserMenuItems } from "./components";
import "./locales";
import { DigiforceI18nBootstrap } from "./provider";

const digiforceI18nExtension: AppExtension = {
  id: "digiforce-i18n",
  Provider: DigiforceI18nBootstrap,
  UserMenuItems: LanguageUserMenuItems,
  dev: {
    resources: [
      {
        name: "i18n-demo",
        list: "i18n",
        meta: {
          label: "Internationalization",
          i18nKey: "navigation.demo",
          i18nOptions: { ns: "digiforce-i18n" },
          icon: <Languages />,
          description:
            "Optional frontend internationalization for the Starter.",
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.i18n",
        path: "i18n",
        lazy: () =>
          import("./demo").then((module) => ({
            default: module.I18nDemoPage,
          })),
      },
    ]),
  },
};

export default digiforceI18nExtension;
