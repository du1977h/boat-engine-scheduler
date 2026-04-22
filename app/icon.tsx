import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const size = {
  width: 512,
  height: 512
};
export const contentType = "image/png";

export default async function Icon() {
  const icon = await readFile(path.join(process.cwd(), "public", "boad.png"));
  return new Response(icon, {
    headers: {
      "Content-Type": contentType
    }
  });
}
