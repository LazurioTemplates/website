import { describe, expect, test } from "bun:test";
import { createServer } from "node:net";
import { delimiter, dirname, join, resolve } from "node:path";
import packageJson from "../package.json";

// The start contract of the Lazurio Module Standard (kap. 4): the Launchpad
// runs the `dev` script with only bun on PATH and the listener environment;
// without it the App refuses to start, with it the declared health path
// answers 200 directly (the probe does not follow redirects), a foreign Host is
// refused and SIGTERM ends the App with exit 0.
const app = resolve(import.meta.dir, "..");
const runtime = packageJson.lazurio.runtime;
const [entrypoint] = runtime.listeners;
if (!entrypoint) throw new Error("lazurio.runtime declares no listener");
const variable = `LAZURIO_RUNTIME_LISTENER_${entrypoint.id.toUpperCase().replaceAll("-", "_")}`;
// Lazurio starts an App on Linux and macOS with HOME and a PATH of the system
// directories; the test is stricter and gives PATH only Bun's directory. On
// Windows a process also needs the system directory, where native modules
// (sharp, which reads the images) load their libraries from, and its temporary
// directory.
const system = process.env.SystemRoot ?? process.env.SYSTEMROOT;
const windows = ["SystemRoot", "TEMP", "TMP", "USERPROFILE", "APPDATA", "LOCALAPPDATA"];
const baseEnv = {
  HOME: process.env.HOME ?? "",
  PATH: [
    dirname(process.execPath),
    ...(process.platform === "win32" && system ? [join(system, "System32"), system] : []),
  ].join(delimiter),
  ...(process.platform === "win32"
    ? Object.fromEntries(
        windows.flatMap((name) => (process.env[name] ? [[name, process.env[name]]] : [])),
      )
    : {}),
};
const startTimeoutMs = 60_000;

describe("start contract", () => {
  test("refuses to start without the listener environment", () => {
    const run = Bun.spawnSync([process.execPath, "run", runtime.dev_script], {
      cwd: app,
      env: baseEnv,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(run.exitCode).toBe(2);
    expect(run.stderr.toString()).toContain(`${variable}_HOST`);
  }, 30_000);

  test(
    "answers health with 200, refuses a foreign Host and exits 0 on SIGTERM",
    async () => {
      const port = await freePort();
      const server = Bun.spawn([process.execPath, "run", runtime.dev_script], {
        cwd: app,
        env: { ...baseEnv, [`${variable}_HOST`]: "127.0.0.1", [`${variable}_PORT`]: `${port}` },
        stdout: "ignore",
        stderr: "inherit",
      });
      try {
        const url = `http://127.0.0.1:${port}${entrypoint.health.path}`;
        const health = await firstResponse(url, startTimeoutMs);
        expect(health.status).toBe(200);
        const foreign = await fetch(url, {
          headers: { host: "foreign.invalid" },
          redirect: "manual",
        });
        expect(foreign.status).toBe(403);
      } finally {
        server.kill("SIGTERM");
      }
      // Lazurio starts and stops Apps on Linux and macOS, where SIGTERM ends
      // the App cleanly. Windows has no SIGTERM: the process is terminated.
      const exit = await server.exited;
      if (process.platform !== "win32") expect(exit).toBe(0);
    },
    startTimeoutMs + 30_000,
  );
});

async function firstResponse(url: string, timeoutMs: number): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(url, { redirect: "manual" }).catch(() => null);
    if (response) return response;
    await Bun.sleep(200);
  }
  throw new Error(`${url} did not answer within ${timeoutMs} ms`);
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() =>
        address && typeof address === "object"
          ? resolvePort(address.port)
          : reject(new Error("no free port")),
      );
    });
  });
}
