process.env.BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "fake-token";
import { put } from "@vercel/blob";

try {
  const result = await put("cms/test.json", '{"ok":true}\n', {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
  console.log("success", result);
} catch (e) {
  console.log("Error type:", e?.constructor?.name);
  console.log("Message:", e?.message);
}
