import { useId, type ReactNode } from "react";
import { CircleAlert, PlugZap, RefreshCw } from "lucide-react";

import { LoadingState } from "@/components/app-shell/loading-state";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import {
  useDigiforcePluginPrerequisite,
  type DigiforcePluginLane,
  type DigiforcePluginRequirement,
  type DigiforcePluginRequirementMode,
} from "./digiforce-plugin-prerequisite";

export type DigiforcePluginPrerequisiteMessages = {
  unavailableTitle: ReactNode;
  unavailableDescription:
    | ReactNode
    | ((missingPlugins: DigiforcePluginRequirement[]) => ReactNode);
  errorTitle: ReactNode;
  errorDescription: ReactNode;
  retryLabel: ReactNode;
};

export function DigiforcePluginPrerequisiteGate({
  requirements,
  mode = "all",
  lane = "client-v2",
  messages,
  children,
  className,
}: {
  requirements: DigiforcePluginRequirement[];
  mode?: DigiforcePluginRequirementMode;
  lane?: DigiforcePluginLane;
  messages: DigiforcePluginPrerequisiteMessages;
  children: ReactNode;
  className?: string;
}) {
  const state = useDigiforcePluginPrerequisite({ requirements, mode, lane });
  const titleId = useId();

  if (state.status === "checking") {
    return <LoadingState className={cn("min-h-[60vh]", className)} />;
  }
  if (state.status === "available") {
    return children;
  }

  const unavailable = state.status === "unavailable";
  const description = unavailable
    ? typeof messages.unavailableDescription === "function"
      ? messages.unavailableDescription(state.missingPlugins)
      : messages.unavailableDescription
    : messages.errorDescription;

  return (
    <section
      role={unavailable ? undefined : "alert"}
      aria-labelledby={titleId}
      className={cn(
        "flex min-h-[60vh] items-center justify-center px-4 py-10",
        className,
      )}
    >
      <Empty className="min-h-72 max-w-2xl border bg-card/50">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            {unavailable ? (
              <PlugZap aria-hidden="true" />
            ) : (
              <CircleAlert aria-hidden="true" />
            )}
          </EmptyMedia>
          <EmptyTitle id={titleId} role="heading" aria-level={1}>
            {unavailable ? messages.unavailableTitle : messages.errorTitle}
          </EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={state.retry}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {messages.retryLabel}
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  );
}
