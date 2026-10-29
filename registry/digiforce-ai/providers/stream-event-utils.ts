import type { DigiforceStreamEvent } from "./stream-parser";

export type DigiforceToolCall = {
  id?: string;
  index?: number;
  name?: string;
  args?: unknown;
  input?: unknown;
  output?: unknown;
  content?: unknown;
  status?: string;
  invokeStatus?: string;
  invokeStartTime?: unknown;
  invokeEndTime?: unknown;
  messageId?: string;
  willInterrupt?: boolean;
  auto?: boolean;
  selectedSuggestion?: string;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const toolCallsFromEvent = (event: DigiforceStreamEvent) => {
  if (Array.isArray(event.body)) return event.body as DigiforceToolCall[];
  if (!isRecord(event.body) || !Array.isArray(event.body.toolCalls)) return [];
  return event.body.toolCalls as DigiforceToolCall[];
};

export const parseToolInput = (input: unknown) => {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return input;
  }
};

const completedToolStatus = new Set(["success", "done", "confirmed"]);
const failedToolStatus = new Set(["error", "failed", "rejected"]);
const pendingInvokeStatus = new Set([
  "interrupted",
  "waiting",
  "pending",
  "running",
]);

export const getToolCallState = (toolCall: DigiforceToolCall) => {
  const invokeStatus = String(toolCall.invokeStatus ?? "").toLowerCase();
  const resultStatus = String(toolCall.status ?? "").toLowerCase();
  const failed =
    failedToolStatus.has(invokeStatus) || failedToolStatus.has(resultStatus);
  const completed =
    !failed &&
    (completedToolStatus.has(invokeStatus) ||
      (!invokeStatus && completedToolStatus.has(resultStatus)));
  return {
    invokeStatus,
    resultStatus,
    failed,
    completed,
    pending: !failed && !completed && pendingInvokeStatus.has(invokeStatus),
  };
};

export const getToolProviderMetadata = (toolCall: DigiforceToolCall) => {
  const { invokeStatus, resultStatus } = getToolCallState(toolCall);
  return {
    digiforce: {
      requiresApproval:
        (invokeStatus === "interrupted" ||
          (!invokeStatus && toolCall.willInterrupt === true)) &&
        toolCall.auto !== true,
      autoApprove: invokeStatus === "interrupted" && toolCall.auto === true,
      invokeStatus,
      ...(typeof toolCall.selectedSuggestion === "string"
        ? { selectedSuggestion: toolCall.selectedSuggestion }
        : {}),
      status: resultStatus,
    },
  };
};
