import http from "http";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number(process.env.VISEME_MAPPING_PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../data/viseme-mapping.js");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function loadRestState() {
  const { FACE_CAP_REST_STATE } = await import(`${DATA_FILE}?update=${Date.now()}`);
  return FACE_CAP_REST_STATE || {};
}

function buildFilePayload(restState, mapping) {
  const restSrc = JSON.stringify(restState, null, 2);
  const mappingSrc = JSON.stringify(mapping, null, 2);
  return `export const FACE_CAP_REST_STATE = ${restSrc};

const faceCapVisemeMapping = ${mappingSrc};

export default faceCapVisemeMapping;
`;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/viseme-mapping") {
    res.writeHead(404, { ...corsHeaders, "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  try {
    const body = await readBody(req);
    const mapping = JSON.parse(body);

    const restState = await loadRestState();
    const fileContents = buildFilePayload(restState, mapping);
    await fs.writeFile(DATA_FILE, fileContents, "utf8");

    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, message: "Mapping saved" }));
  } catch (error) {
    console.error("Failed to save viseme mapping", error);
    res.writeHead(500, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Viseme-mapping server listening on http://localhost:${PORT}`);
});
