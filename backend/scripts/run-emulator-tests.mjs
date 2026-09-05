import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["--test", "backend/dist/emulator-test/**/*.test.js"],
  {
    env: {
      ...process.env,
      ENMORI_ENVIRONMENT: "test",
      METADATA_SERVER_DETECTION: "none",
    },
    stdio: "inherit",
  },
);

if (result.error !== undefined) throw result.error;
process.exitCode = result.status ?? 1;
