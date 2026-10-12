import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.cwd(), ".env");
let text = readFileSync(path, "utf8");

function encodePostgresUrl(url) {
  const match = url.match(/^(postgresql:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (!match) return url;
  const pass = decodeURIComponent(match[3]);
  let rest = match[4];
  if (!/[?&]sslmode=/.test(rest)) {
    rest += rest.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  return `${match[1]}${match[2]}:${encodeURIComponent(pass)}@${rest}`;
}

text = text.replace(
  /^(DATABASE_URL|DIRECT_URL)="([^"]+)"/gm,
  (_, key, value) => `${key}="${encodePostgresUrl(value)}"`,
);

writeFileSync(path, text);
console.log("updated DATABASE_URL and DIRECT_URL: encoded password, sslmode=require");
