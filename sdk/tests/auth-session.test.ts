import { afterEach, describe, expect, it } from 'vitest';

import { AuthSession, DigiforceClient } from '../src/client/index.ts';
import {
  resolveDigiforceAppName,
  resolveDigiforcePortalName,
  resolveDigiforceSettingsUrl,
  resolvePortalUrl,
} from '../src/runtime/index.ts';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow,
    });
  }
});

describe('Portal authentication session', () => {
  it('resolves main applications, sub-applications, and Portal names', () => {
    expect(resolveDigiforceAppName('/digiforce/x/apps/crm/customer/', '/digiforce/api/__app/crm')).toBe('crm');
    expect(resolveDigiforceAppName('/x/customer/', '/api/__app/analytics')).toBe('analytics');
    expect(resolveDigiforceAppName('/x/customer/', '/api')).toBe('main');
    expect(resolveDigiforcePortalName('/x/hub/')).toBe('hub');
    expect(resolveDigiforcePortalName('/digiforce/x/apps/demo6/hub/')).toBe('hub');
    expect(resolveDigiforcePortalName('/')).toBeUndefined();
  });

  it('builds runtime URLs and request headers from the active Portal', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { origin: 'http://localhost:14000' },
        DIGIFORCE_API_URL: '/api',
        DIGIFORCE_PORTAL_BASE: '/x/demo/',
      },
    });

    expect(resolvePortalUrl('/users?tab=active#list')).toBe('/x/demo/users?tab=active#list');
    expect(resolveDigiforceSettingsUrl()).toBe('http://localhost:14000/settings');
    expect(new DigiforceClient('/api').getHeaders()['X-Portal']).toBe('demo');

    window.DIGIFORCE_API_URL = '/api/__app/crm';
    window.DIGIFORCE_PORTAL_BASE = '/x/apps/crm/customer/';
    expect(resolveDigiforceSettingsUrl()).toBe('http://localhost:14000/settings/apps/crm');
    expect(new DigiforceClient('/api').getHeaders()['X-Portal']).toBe('customer');
  });

  it('uses the SDK storage convention for main and sub-app sessions', () => {
    const main = new AuthSession({ appName: 'main', storage: createStorage() });
    expect(main.getStorageKey('token')).toBe('DIGIFORCE_TOKEN');
    expect(main.getStorageKey('auth')).toBe('DIGIFORCE_AUTH');
    expect(main.getStorageKey('role')).toBe('DIGIFORCE_ROLE');

    const subApp = new AuthSession({
      appName: 'crm',
      storage: createStorage(),
    });
    expect(subApp.getStorageKey('token')).toBe('DIGIFORCE_CRM_TOKEN');
    expect(subApp.getStorageKey('auth')).toBe('DIGIFORCE_CRM_AUTH');
    expect(subApp.getStorageKey('role')).toBe('DIGIFORCE_CRM_ROLE');

    const sharedToken = new AuthSession({
      appName: 'crm',
      shareToken: true,
      storage: createStorage(),
    });
    expect(sharedToken.getStorageKey('token')).toBe('DIGIFORCE_TOKEN');
    expect(sharedToken.getStorageKey('auth')).toBe('DIGIFORCE_CRM_AUTH');
  });
});
