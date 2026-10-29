import { Outlet } from "react-router";

import {
  DigiforcePluginPrerequisiteGate,
  type DigiforcePluginRequirement,
} from "@/components/prerequisites";
import { useT } from "../locales";

const knowledgeBasePluginRequirements: DigiforcePluginRequirement[] = [
  {
    name: "ai-knowledge-base",
    packageName: "@digiforce/plugin-ai-knowledge-base",
    label: "AI Knowledge Base",
    probe: {
      resource: "aiKnowledgeBase",
      action: "list",
      query: { page: 1, pageSize: 1 },
    },
  },
];

export default function KnowledgeBasePluginPrerequisiteRoute() {
  const t = useT();

  return (
    <DigiforcePluginPrerequisiteGate
      requirements={knowledgeBasePluginRequirements}
      messages={{
        unavailableTitle: t("Knowledge base plugin is not enabled"),
        unavailableDescription: t(
          "Enable the AI Knowledge Base plugin to use the Knowledge base workspace. Contact your system administrator, then try again.",
        ),
        errorTitle: t("Unable to check the knowledge base plugin"),
        errorDescription: t(
          "The plugin status could not be loaded. Check the connection and try again.",
        ),
        retryLabel: t("Try again"),
      }}
    >
      <Outlet />
    </DigiforcePluginPrerequisiteGate>
  );
}
