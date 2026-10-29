import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import type { Authenticator } from "@digiforce/portal-sdk/auth";
import { digiforceClient } from "@digiforce/portal-sdk/client";
import { resolvePortalUrl } from "@digiforce/portal-sdk/runtime";

type DingtalkAuthUrlResponse = {
  url?: string;
};

export function isDingtalkBrowser() {
  return (
    typeof navigator !== "undefined" &&
    navigator.userAgent.toLowerCase().includes("dingtalk")
  );
}

export function useDingtalkSignIn(authenticator: Authenticator) {
  const [searchParams] = useSearchParams();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error>();
  const callbackError = useMemo(() => {
    if (searchParams.get("authenticator") !== authenticator.name) {
      return undefined;
    }
    const message = searchParams.get("error");
    return message ? new Error(message) : undefined;
  }, [authenticator.name, searchParams]);

  const signIn = useCallback(async () => {
    setError(undefined);
    setIsPending(true);
    try {
      const redirect = resolvePortalUrl(
        searchParams.get("to") || searchParams.get("redirect") || "/"
      );
      const result = await digiforceClient.action<DingtalkAuthUrlResponse>(
        "dingtalk",
        "getAuthUrl",
        {
          method: "POST",
          authenticator: authenticator.name,
          includeRole: false,
          withAclMeta: false,
          body: { redirect },
        }
      );
      if (!result?.url) {
        throw new Error(
          "Digiforce did not return a DingTalk authorization URL."
        );
      }
      window.location.replace(digiforceClient.resolveUrl(result.url));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause
          : new Error("Unable to start DingTalk sign-in.")
      );
      setIsPending(false);
    }
  }, [authenticator.name, searchParams]);

  return { signIn, isPending, error: error ?? callbackError };
}
