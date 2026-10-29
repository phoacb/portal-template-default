import { useEffect, useState, type PropsWithChildren } from "react";

import { LoadingState } from "@/components/app-shell/loading-state";
import { digiforceClient } from "@digiforce/portal-sdk/client";
import { setLocalePersistence } from "@digiforce/portal-sdk/i18n";
import { useSystemSettings } from "@digiforce/portal-sdk/system-settings";
import { loadServerLocaleResources } from "./server-resources";

export function DigiforceI18nBootstrap({ children }: PropsWithChildren) {
  const { settings } = useSystemSettings();
  const [ready, setReady] = useState(false);

  useEffect(
    () =>
      setLocalePersistence(async (locale) => {
        if (!digiforceClient.getToken()) return;
        await digiforceClient.action("users", "updateLang", {
          method: "POST",
          body: { appLang: locale },
        });
      }),
    []
  );

  useEffect(() => {
    let active = true;
    void loadServerLocaleResources(settings)
      .catch((error) => {
        console.warn("Unable to load Digiforce locale resources", error);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [settings]);

  if (!ready) {
    return <LoadingState fullscreen />;
  }

  return children;
}
