# Digiforce OIDC authentication

This Registry adds the default OIDC sign-in button to the Starter's dynamic
authentication page. It also exports `useOidcSignIn` so applications can keep
the Digiforce OIDC protocol while replacing the button UI.

Installing the Registry also adds an OIDC component Demo under Authentication.

The authenticator instance must be enabled in the connected Digiforce app. SSO
callbacks currently require the Portal and Digiforce public endpoints to share
an origin or use a compatible reverse proxy.
