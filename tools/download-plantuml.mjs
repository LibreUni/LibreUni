import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PINNED_VERSION = '1.2026.1';
const EXPECTED_SHA256 = '89c116168a2a0f7cf5292e11617ba22abd743f891914f1fec5bc9c7d257b3092';
const DOWNLOAD_URL = `https://github.com/plantuml/plantuml/releases/download/v${PINNED_VERSION}/plantuml-${PINNED_VERSION}.jar`;

export function verifyChecksum(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    return hash === EXPECTED_SHA256;
  } catch {
    return false;
  }
}

export async function ensurePlantUmlJar(targetPath = process.env.LIBREUNI_PLANTUML_JAR || path.resolve('./tools/plantuml.jar')) {
  if (verifyChecksum(targetPath)) {
    console.log(`[PlantUML] Verified plantuml.jar at ${targetPath}`);
    return targetPath;
  }

  console.log(`[PlantUML] Downloading PlantUML ${PINNED_VERSION} to ${targetPath}...`);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const res = await fetch(DOWNLOAD_URL);
  if (!res.ok) {
    throw new Error(`Failed to download PlantUML jar from ${DOWNLOAD_URL}: HTTP ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
  if (actualHash !== EXPECTED_SHA256) {
    throw new Error(`PlantUML checksum mismatch! Expected ${EXPECTED_SHA256}, got ${actualHash}`);
  }

  fs.writeFileSync(targetPath, buffer);
  console.log(`[PlantUML] Successfully installed and verified ${targetPath}`);
  return targetPath;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  ensurePlantUmlJar().catch((err) => {
    console.error(`[PlantUML] Error: ${err.message}`);
    process.exit(1);
  });
}
