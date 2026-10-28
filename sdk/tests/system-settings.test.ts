import { expect, it } from 'vitest';

import { digiforceClient } from '../src/client/index.ts';
import { clearSystemSettingsCache, loadSystemSettings } from '../src/system-settings/index.ts';

const deferred = () => {
  let resolvePromise: ((value: unknown) => void) | undefined;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise! };
};

it('a stale System Settings request cannot overwrite a forced refresh', async () => {
  const originalAction = digiforceClient.action;
  const first = deferred();
  const second = deferred();
  const requests = [first, second];
  let requestCount = 0;

  digiforceClient.action = () => requests[requestCount++].promise;
  clearSystemSettingsCache();

  try {
    const staleRequest = loadSystemSettings();
    const refreshRequest = loadSystemSettings(true);

    second.resolve({ appLang: 'zh-CN' });
    await expect(refreshRequest).resolves.toEqual({ appLang: 'zh-CN' });

    first.resolve({ appLang: 'en-US' });
    await expect(staleRequest).resolves.toEqual({ appLang: 'en-US' });

    await expect(loadSystemSettings()).resolves.toEqual({ appLang: 'zh-CN' });
    expect(requestCount).toBe(2);
  } finally {
    clearSystemSettingsCache();
    digiforceClient.action = originalAction;
  }
});

it('clearing System Settings ignores an in-flight response', async () => {
  const originalAction = digiforceClient.action;
  const first = deferred();
  const second = deferred();
  const requests = [first, second];
  let requestCount = 0;

  digiforceClient.action = () => requests[requestCount++].promise;
  clearSystemSettingsCache();

  try {
    const staleRequest = loadSystemSettings();
    clearSystemSettingsCache();
    first.resolve({ appLang: 'en-US' });
    await staleRequest;

    const nextRequest = loadSystemSettings();
    second.resolve({ appLang: 'zh-CN' });
    await expect(nextRequest).resolves.toEqual({ appLang: 'zh-CN' });
    expect(requestCount).toBe(2);
  } finally {
    clearSystemSettingsCache();
    digiforceClient.action = originalAction;
  }
});
