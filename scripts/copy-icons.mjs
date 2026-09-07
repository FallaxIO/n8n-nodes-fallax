import { cp, readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * tsc emits JavaScript and nothing else, but n8n loads a node's icon from the
 * path in its description, relative to the built file. So the SVG has to sit
 * beside the .js in dist/ or every node in the package renders as a grey box.
 */
const roots = ["nodes", "credentials"];

for (const root of roots) {
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".svg")) continue;
    const from = join(entry.parentPath ?? entry.path, entry.name);
    await cp(from, join("dist", from));
  }
}
