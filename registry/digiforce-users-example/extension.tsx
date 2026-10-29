import type { AppExtension } from "@digiforce/portal-sdk/extensions";
import { usersExampleRoutes } from "./app-routes";
import "./locales";

const usersExampleExtension: AppExtension = {
  id: "digiforce-users-example",
  priority: 0,
  routes: usersExampleRoutes,
};

export default usersExampleExtension;
