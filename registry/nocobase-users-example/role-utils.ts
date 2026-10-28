import type { Role } from "@digiforce/portal-sdk/acl";
import { resolveTranslatableText } from "@digiforce/portal-sdk/i18n";

export function resolveRoleLabel(role: Role) {
  return resolveTranslatableText(role.title || role.name, { ns: "starter" });
}
