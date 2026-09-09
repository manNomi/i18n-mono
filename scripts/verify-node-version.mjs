import { execFileSync } from "node:child_process";

const commands = [
  ["run", "typecheck"],
  ["test", "--workspace", "i18nexus", "--", "--runInBand"],
  ["test", "--workspace", "i18nexus-tools", "--", "--runInBand"],
];

for (const args of commands) {
  try {
    execFileSync("npm", args, { encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    if (error && typeof error === "object") {
      if ("stdout" in error && error.stdout) process.stdout.write(error.stdout);
      if ("stderr" in error && error.stderr) process.stderr.write(error.stderr);
    }
    throw error;
  }
}

console.log(
  `${process.version}: typecheck, core tests, and tools tests passed`
);
