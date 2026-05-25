import net from "node:net";

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

if (process.env.I18NEXUS_DEMO_ALLOW_ACTIVE_SERVER === "1") {
  console.log(
    "Skipping active dev-server guard because I18NEXUS_DEMO_ALLOW_ACTIVE_SERVER=1.",
  );
  process.exit(0);
}

const socket = net.createConnection({ host, port });
let settled = false;

function pass() {
  if (!settled) {
    settled = true;
    socket.destroy();
    process.exit(0);
  }
}

function fail() {
  if (!settled) {
    settled = true;
    socket.destroy();
    console.error(
      `[i18nexus-demo] Port ${port} is already accepting connections. Stop \`next dev\` before running a production build, or set I18NEXUS_DEMO_ALLOW_ACTIVE_SERVER=1 if this is intentional.`,
    );
    process.exit(1);
  }
}

socket.setTimeout(250, pass);
socket.once("connect", fail);
socket.once("error", pass);
