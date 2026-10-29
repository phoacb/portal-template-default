import { useTranslate } from "@refinedev/core";
import { useCallback } from "react";
import { registerTranslationResources } from "@digiforce/portal-sdk/i18n";
import enUS from "./en-US";
import zhCN from "./zh-CN";

export const DIGIFORCE_AI_KNOWLEDGE_BASE_I18N_NAMESPACE = "digiforce-ai-knowledge-base";

registerTranslationResources(DIGIFORCE_AI_KNOWLEDGE_BASE_I18N_NAMESPACE, {
  "en-US": enUS,
  "zh-CN": zhCN,
});

export function useT() {
  const translate = useTranslate();

  return useCallback(
    (key: string, options: Record<string, unknown> = {}) =>
      translate(key, { ...options, ns: DIGIFORCE_AI_KNOWLEDGE_BASE_I18N_NAMESPACE }, key),
    [translate],
  );
}
