import type { Role } from "@digiforce/portal-sdk/acl";

import { UNION_ROLE } from "@/extensions/digiforce-acl";

export function hasMultipleUserRoles(roles: Role[]) {
  return roles.filter((role) => role.name !== UNION_ROLE).length > 1;
}
