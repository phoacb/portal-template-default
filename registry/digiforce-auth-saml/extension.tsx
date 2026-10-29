import { lazy } from "react";
import { BadgeCheck } from "lucide-react";

import type { AppExtension } from "@digiforce/portal-sdk/extensions";
import { defineAppRoutes } from "@digiforce/portal-sdk/routing";

const SamlSignInButton = lazy(() => import("./saml-sign-in-button"));
const SamlAutoRedirectProvider = lazy(() => import("./auto-redirect-provider"));

const samlAuthExtension: AppExtension = {
  id: "digiforce-auth-saml",
  AuthRuntimeProvider: SamlAutoRedirectProvider,
  authRuntimePriority: 20,
  dev: {
    resources: [
      {
        name: "auth-saml-demo",
        list: "auth/saml",
        meta: {
          parent: "auth-components",
          label: "SAML",
          icon: <BadgeCheck />,
          acl: { type: "authenticated" },
        },
      },
    ],
    routes: defineAppRoutes([
      {
        name: "development.auth.saml",
        path: "auth/saml",
        lazy: () =>
          import("./demo").then((module) => ({
            default: module.SamlAuthDemoPage,
          })),
      },
    ]),
  },
  authAdapters: [
    {
      authType: "SAML",
      placement: "button",
      Component: SamlSignInButton,
    },
  ],
};

export default samlAuthExtension;
