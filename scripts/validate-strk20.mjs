import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const strict = process.argv.includes("--strict");
const path = resolve(process.cwd(), "strk20.json");
const failures = [];
let submission;
try {
  submission = JSON.parse(readFileSync(path, "utf8"));
} catch (error) {
  console.error(`Cannot read strk20.json: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const hashes = Array.isArray(submission.transactions) ? submission.transactions : [];
const contracts = Array.isArray(submission.contracts) ? submission.contracts : [];
const hex = /^0x[0-9a-f]+$/u;
if (!Array.isArray(submission.transactions)) failures.push("transactions must be an array");
if (!Array.isArray(submission.contracts)) failures.push("contracts must be an array");
if (!hashes.every((value) => typeof value === "string" && hex.test(value))) failures.push("every transaction must be a lowercase 0x hash");
if (!contracts.every((value) => typeof value === "string" && hex.test(value))) failures.push("every contract must be a lowercase 0x address");
if (new Set(hashes).size !== hashes.length) failures.push("transactions must be unique");
if (typeof submission.demo_url !== "string" || !/^https:\/\//u.test(submission.demo_url)) failures.push("demo_url must be an HTTPS URL");
if (strict && hashes.length < 3) failures.push("strict submission requires at least three verified mainnet STRK20 transaction hashes");
if (strict && (typeof submission.demo_video !== "string" || !/^https:\/\//u.test(submission.demo_video))) failures.push("strict submission requires an HTTPS demo_video URL");

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`strk20.json is structurally valid (${hashes.length} transactions, ${contracts.length} contracts).${strict ? " Strict submission requirements pass." : ""}`);
