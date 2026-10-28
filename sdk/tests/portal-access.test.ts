import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearAcl, getAclState, loadAcl, switchRole } from '../src/acl/index.ts';
import { getPortalAccessDeniedData } from '../src/acl/portal-access.ts';
import { digiforceClient, DigiforceHttpError } from '../src/client/index.ts';

const deniedData = {
  portalName: 'sales',
  role: 'admin',
  roles: ['admin'],
  roleMode: 'allow-use-union' as const,
  allowAnonymous: false,
};

const portalDeniedError = (
  overrides: {
    status?: number;
    code?: string;
    data?: unknown;
  } = {},
) =>
  new DigiforceHttpError({
    status: overrides.status ?? 403,
    message: 'You do not have access to this Portal',
    payload: {
      errors: [
        {
          code: overrides.code ?? 'PORTAL_ACCESS_DENIED',
          message: 'You do not have access to this Portal',
        },
      ],
      data: overrides.data ?? deniedData,
    },
  });

afterEach(() => {
  clearAcl();
  digiforceClient.setRole(null);
  vi.restoreAllMocks();
});

describe('Portal access denial', () => {
  it('retains only a structured Portal access denial in ACL state', async () => {
    digiforceClient.setRole('admin');
    vi.spyOn(digiforceClient, 'request').mockRejectedValue(portalDeniedError());

    await loadAcl();

    expect(getAclState()).toEqual({
      status: 'error',
      error: getAclState().status === 'error' ? getAclState().error : undefined,
      portalAccessDenied: deniedData,
    });
  });

  it('does not treat an ordinary forbidden response as Portal denial', async () => {
    vi.spyOn(digiforceClient, 'request').mockRejectedValue(portalDeniedError({ code: 'OTHER_FORBIDDEN' }));

    await loadAcl();

    expect(getAclState()).toMatchObject({ status: 'error' });
    expect(getAclState().status === 'error' ? getAclState().portalAccessDenied : undefined).toBeUndefined();
  });

  it('validates the structured denial payload', () => {
    expect(getPortalAccessDeniedData(portalDeniedError())).toEqual(deniedData);
    expect(getPortalAccessDeniedData(portalDeniedError({ data: { ...deniedData, role: '' } }))).toEqual({
      ...deniedData,
      role: undefined,
    });
    expect(getPortalAccessDeniedData(portalDeniedError({ code: 'OTHER_FORBIDDEN' }))).toBeUndefined();
    expect(
      getPortalAccessDeniedData(portalDeniedError({ data: { ...deniedData, roles: ['admin', 1] } })),
    ).toBeUndefined();
    expect(getPortalAccessDeniedData(portalDeniedError({ status: 500 }))).toBeUndefined();
  });
});

describe('switchRole', () => {
  it('syncs the role and leaves ACL loading to the next page load', async () => {
    const actions: string[] = [];
    let aclRequestCount = 0;
    digiforceClient.setRole('admin');
    vi.spyOn(digiforceClient, 'action').mockImplementation(async (resource, action) => {
      actions.push(`${resource}:${action}`);
      return {};
    });
    vi.spyOn(digiforceClient, 'request').mockImplementation(async () => {
      aclRequestCount += 1;
      return {};
    });

    await switchRole('member');

    expect(actions).toEqual(['users:setDefaultRole', 'auth:syncCookies']);
    expect(aclRequestCount).toBe(0);
    expect(digiforceClient.getRole()).toBe('member');
    expect(getAclState()).toEqual({ status: 'idle' });
  });

  it.each(['users:setDefaultRole', 'auth:syncCookies'])(
    'restores the previous role when %s fails',
    async (failedAction) => {
      const actions: string[] = [];
      const expectedError = new Error(`${failedAction} failed`);
      digiforceClient.setRole('admin');
      vi.spyOn(digiforceClient, 'action').mockImplementation(async (resource, action) => {
        const actionName = `${resource}:${action}`;
        actions.push(actionName);
        if (actionName === failedAction) throw expectedError;
        return {};
      });

      await expect(switchRole('member')).rejects.toBe(expectedError);

      expect(digiforceClient.getRole()).toBe('admin');
      expect(actions[0]).toBe('users:setDefaultRole');
      if (failedAction === 'auth:syncCookies') {
        expect(actions.filter((action) => action === failedAction)).toHaveLength(2);
      }
    },
  );
});
