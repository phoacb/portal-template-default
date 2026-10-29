import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const action = vi.hoisted(() => vi.fn());

vi.mock("@digiforce/portal-sdk/client", () => ({
  digiforceClient: {
    action,
    getApiUrl: () => "http://localhost:14001/api",
    getAppName: () => "main",
  },
}));

import {
  clearDigiforcePluginPrerequisiteCache,
  evaluateDigiforcePluginRequirements,
  normalizeEnabledDigiforcePlugins,
  type DigiforcePluginRequirement,
} from "@/components/prerequisites/digiforce-plugin-prerequisite";
import { DigiforcePluginPrerequisiteGate } from "@/components/prerequisites/digiforce-plugin-prerequisite-gate";

const knowledgeBaseRequirement: DigiforcePluginRequirement = {
  name: "ai-knowledge-base",
  packageName: "@digiforce/plugin-ai-knowledge-base",
  label: "AI Knowledge Base",
};

const messages = {
  unavailableTitle: "Plugin unavailable",
  unavailableDescription: (missing: DigiforcePluginRequirement[]) =>
    `Missing: ${missing.map((plugin) => plugin.label).join(", ")}`,
  errorTitle: "Plugin check failed",
  errorDescription: "Try the plugin check again.",
  retryLabel: "Try again",
};

function renderGate(
  requirements: DigiforcePluginRequirement[] = [knowledgeBaseRequirement],
) {
  return render(
    <DigiforcePluginPrerequisiteGate
      requirements={requirements}
      messages={messages}
    >
      <div>Protected workspace</div>
    </DigiforcePluginPrerequisiteGate>,
  );
}

describe("Digiforce plugin prerequisite helpers", () => {
  it("normalizes supported enabled-plugin response envelopes", () => {
    expect(
      normalizeEnabledDigiforcePlugins({
        data: {
          data: [
            {
              name: "ai-knowledge-base",
              packageName: "@digiforce/plugin-ai-knowledge-base",
              url: "/static/plugin.js",
            },
            { ignored: true },
          ],
        },
      }),
    ).toEqual([
      {
        name: "ai-knowledge-base",
        packageName: "@digiforce/plugin-ai-knowledge-base",
      },
    ]);
  });

  it("supports all and any requirement modes", () => {
    const enabled = [
      {
        name: "ai-knowledge-base",
        packageName: "@digiforce/plugin-ai-knowledge-base",
      },
    ];
    const mail: DigiforcePluginRequirement = {
      name: "mail",
      packageName: "@digiforce/plugin-mail",
      label: "Mail",
    };

    expect(
      evaluateDigiforcePluginRequirements(
        enabled,
        [knowledgeBaseRequirement, mail],
        "all",
      ),
    ).toEqual({ available: false, missingPlugins: [mail] });
    expect(
      evaluateDigiforcePluginRequirements(
        enabled,
        [knowledgeBaseRequirement, mail],
        "any",
      ),
    ).toEqual({ available: true, missingPlugins: [] });
  });
});

describe("DigiforcePluginPrerequisiteGate", () => {
  beforeEach(() => {
    action.mockReset();
    clearDigiforcePluginPrerequisiteCache();
  });

  it("renders children when every required plugin is enabled", async () => {
    action.mockResolvedValue([
      {
        name: "ai-knowledge-base",
        packageName: "@digiforce/plugin-ai-knowledge-base",
      },
    ]);

    renderGate();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByText("Protected workspace")).toBeInTheDocument();
    expect(action).toHaveBeenCalledWith("pm", "listEnabledV2", { method: "GET" });
  });

  it("uses a read-only probe when an enabled source plugin is absent from the client manifest", async () => {
    action.mockResolvedValueOnce([]).mockResolvedValueOnce({ rows: [] });

    renderGate([
      {
        ...knowledgeBaseRequirement,
        probe: {
          resource: "aiKnowledgeBase",
          action: "list",
          query: { page: 1, pageSize: 1 },
        },
      },
    ]);

    expect(await screen.findByText("Protected workspace")).toBeInTheDocument();
    expect(action).toHaveBeenNthCalledWith(1, "pm", "listEnabledV2", { method: "GET" });
    expect(action).toHaveBeenNthCalledWith(2, "aiKnowledgeBase", "list", {
      method: "GET",
      query: { page: 1, pageSize: 1 },
    });
  });

  it("keeps a probed plugin unavailable when its resource action is missing", async () => {
    action.mockResolvedValueOnce([]).mockRejectedValueOnce({ status: 404 });

    renderGate([
      {
        ...knowledgeBaseRequirement,
        probe: { resource: "aiKnowledgeBase", action: "list" },
      },
    ]);

    expect(
      await screen.findByRole("heading", { name: "Plugin unavailable" }),
    ).toBeInTheDocument();
  });

  it("shows the missing-plugin state after a successful check", async () => {
    action.mockResolvedValue([]);

    renderGate();

    expect(
      await screen.findByRole("heading", { name: "Plugin unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Missing: AI Knowledge Base")).toBeInTheDocument();
    expect(screen.queryByText("Protected workspace")).not.toBeInTheDocument();
  });

  it("distinguishes request errors from a disabled plugin", async () => {
    action.mockRejectedValue(new Error("Network unavailable"));

    renderGate();

    expect(
      await screen.findByRole("heading", { name: "Plugin check failed" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Plugin unavailable")).not.toBeInTheDocument();
  });

  it("bypasses the cached unavailable result when the user retries", async () => {
    const user = userEvent.setup();
    action
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          name: "ai-knowledge-base",
          packageName: "@digiforce/plugin-ai-knowledge-base",
        },
      ]);

    renderGate();
    await screen.findByRole("heading", { name: "Plugin unavailable" });
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(screen.getByText("Protected workspace")).toBeInTheDocument();
    });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("shares an in-flight enabled-plugin request across gates", async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    action.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(
      <>
        <DigiforcePluginPrerequisiteGate
          requirements={[knowledgeBaseRequirement]}
          messages={messages}
        >
          <div>First workspace</div>
        </DigiforcePluginPrerequisiteGate>
        <DigiforcePluginPrerequisiteGate
          requirements={[knowledgeBaseRequirement]}
          messages={messages}
        >
          <div>Second workspace</div>
        </DigiforcePluginPrerequisiteGate>
      </>,
    );

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    resolveRequest?.([
      {
        name: "ai-knowledge-base",
        packageName: "@digiforce/plugin-ai-knowledge-base",
      },
    ]);

    expect(await screen.findByText("First workspace")).toBeInTheDocument();
    expect(await screen.findByText("Second workspace")).toBeInTheDocument();
  });
});
