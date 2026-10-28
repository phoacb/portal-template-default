import { useQuery } from '@tanstack/react-query';

import { digiforceClient } from '../client/index.ts';
import type { Authenticator } from './types.ts';

export const publicAuthenticatorsQueryKey = ['digiforce', 'public-authenticators'] as const;

export function usePublicAuthenticators() {
  return useQuery({
    queryKey: publicAuthenticatorsQueryKey,
    queryFn: ({ signal }) =>
      digiforceClient.action<Authenticator[]>('authenticators', 'publicList', {
        method: 'GET',
        signal,
        authenticator: null,
        includeRole: false,
        withAclMeta: false,
      }),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  });
}
