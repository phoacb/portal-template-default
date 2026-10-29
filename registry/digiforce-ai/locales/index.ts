import { registerTranslationResources } from "@digiforce/portal-sdk/i18n";
import enUS from "./en-US";
import zhCN from "./zh-CN";

export const DIGIFORCE_AI_I18N_NAMESPACE = "digiforce-ai";

registerTranslationResources(DIGIFORCE_AI_I18N_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});
