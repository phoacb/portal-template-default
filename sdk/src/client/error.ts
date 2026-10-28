export class DigiforceHttpError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly code?: string;
  readonly requestId?: string;

  constructor({
    message,
    status,
    payload,
    requestId,
  }: {
    message: string;
    status: number;
    payload?: unknown;
    requestId?: string;
  }) {
    super(message);
    this.name = 'DigiforceHttpError';
    this.status = status;
    this.payload = payload;
    this.code = getDigiforceErrorDetail(payload)?.code;
    this.requestId = requestId;
  }
}

export type DigiforceErrorDetail = {
  code?: string;
  command?: {
    name?: string;
    [key: string]: unknown;
  };
  maintaining?: boolean;
  message?: string;
  refresh?: boolean;
  requestId?: string;
  status?: number;
  [key: string]: unknown;
};

export type DigiforceRuntimeErrorSource = 'http' | 'network' | 'websocket';

export type DigiforceRuntimeError = DigiforceErrorDetail & {
  payload?: unknown;
  source: DigiforceRuntimeErrorSource;
};

export const isDigiforceLifecycleError = (error: DigiforceErrorDetail) =>
  error.maintaining === true || error.code?.startsWith('APP_') === true || error.code?.startsWith('COMMAND_') === true;

export const isDigiforceServiceError = (error: DigiforceErrorDetail) =>
  isDigiforceLifecycleError(error) || (error.status !== undefined && [502, 503, 504].includes(error.status));

const asRecord = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const asErrorDetail = (value: unknown): DigiforceErrorDetail | undefined => {
  const record = asRecord(value);
  if (!record) return undefined;
  return record as DigiforceErrorDetail;
};

export function getDigiforceErrorDetail(payload: unknown): DigiforceErrorDetail | undefined {
  const value = asRecord(payload);
  if (!value) return undefined;

  const directError = asErrorDetail(value.error);
  if (directError) return directError;

  const errors = Array.isArray(value.errors) ? value.errors : undefined;
  const firstError = asErrorDetail(errors?.[0]);
  if (firstError) return firstError;

  const messages = Array.isArray(value.messages) ? value.messages : undefined;
  const firstMessage = asErrorDetail(messages?.[0]);
  if (firstMessage) return firstMessage;

  if (typeof value.code === 'string' || typeof value.message === 'string' || typeof value.maintaining === 'boolean') {
    return value as DigiforceErrorDetail;
  }

  return undefined;
}

export function normalizeDigiforceRuntimeError(
  error: unknown,
  source: DigiforceRuntimeErrorSource = 'http',
): DigiforceRuntimeError {
  if (error instanceof DigiforceHttpError) {
    const detail = getDigiforceErrorDetail(error.payload);
    return {
      ...detail,
      code: detail?.code ?? error.code,
      message: detail?.message ?? error.message,
      payload: error.payload,
      requestId: detail?.requestId ?? error.requestId,
      source,
      status: detail?.status ?? error.status,
    };
  }

  const detail = getDigiforceErrorDetail(error);
  if (detail) {
    return {
      ...detail,
      message: detail.message ?? 'Digiforce request failed',
      payload: error,
      source,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      payload: error,
      source,
    };
  }

  return {
    message: typeof error === 'string' && error ? error : 'Digiforce request failed',
    payload: error,
    source,
  };
}

export const getDigiforceErrorCode = (error: unknown) => normalizeDigiforceRuntimeError(error).code;

export const getDigiforceErrorMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string') return payload || fallback;
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as {
    message?: string;
    error?: { message?: string };
    errors?: Array<{ message?: string } | string>;
    messages?: Array<{ message?: string } | string>;
  };
  const first = value.errors?.[0] ?? value.messages?.[0];
  if (typeof first === 'string') return first;
  return first?.message ?? value.error?.message ?? value.message ?? fallback;
};
