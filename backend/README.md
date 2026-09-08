# Controlled Backend runtime

The runtime entry point composes the existing Fastify app, Firebase Admin
identity verifier, Firestore repositories, Clock and opaque-ID adapters. It is
only the private raw HTTP listener from the approved controlled-demo topology;
it must remain on loopback behind a separately approved and configured HTTPS
edge. Do not put credentials, certificates, or Firebase configuration files in
this repository.

With the approved Node.js 24.19.0 and pnpm 11.19.0 toolchain, set these values in
the controlled host environment and run `pnpm backend:start`:

- `ENMORI_ENVIRONMENT=controlled-demo`
- `ENMORI_FIREBASE_PROJECT_ID=<approved non-Emulator project ID>`
- `ENMORI_BACKEND_HOST=127.0.0.1` (or `::1`)
- `ENMORI_BACKEND_PORT=<private listener port selected for that host>`

Firebase Admin uses the controlled host's application-default identity. The
entry point rejects Emulator variables, non-loopback binding, missing values,
and invalid ports before initializing Firebase. `SIGINT` and `SIGTERM` close
Fastify and the Firebase app. Reverse proxy, DNS, certificates, process
supervision, host hardening, and deployment remain outside this repository
change and require their existing approvals.
