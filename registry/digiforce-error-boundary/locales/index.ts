import { registerTranslationResources } from "@digiforce/portal-sdk/i18n";

import enUS from "./en-US";
import zhCN from "./zh-CN";

export const DIGIFORCE_ERROR_BOUNDARY_I18N_NAMESPACE =
  "digiforce-error-boundary";

registerTranslationResources(DIGIFORCE_ERROR_BOUNDARY_I18N_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
