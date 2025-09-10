// Supabase Edge Function: documents-upload (v1.1)
// Handles multipart file uploads, stores in Storage, inserts DB metadata,
// extracts text from PDFs (pdf.js) and images (OCR via Tesseract), and
// saves extracted text into file_content linked by file_id.
//
// Requirements (Supabase dashboard):
// - Storage bucket: documents (private)
// - Tables: files(id, user_id, filename, file_type, size, upload_date default now(), storage_path)
//           file_content(id, file_id UNIQUE, indexed_text)
// - Function secrets set:
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase functions deploy documents-upload --no-verify-jwt   (if you prefer public)
// or
//   supabase functions deploy documents-upload                   (requires Authorization header)
//
// Invoke URL:
//   https://<project-ref>.functions.supabase.co/documents-upload
//   Accepts multipart/form-data with a single field named "file" and optional "user_id".

import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PDF text extraction
// Using pdfjs-dist ESM build via esm.sh
// Docs: https://github.com/mozilla/pdf.js/
// Note: In edge runtime, worker is not used.
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.3.136/legacy/build/pdf.mjs";

// Configure PDF.js for Deno environment
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.3.136/legacy/build/pdf.worker.mjs";

// Image OCR using Tesseract.js via esm.sh
// This can be heavy; for production consider external OCR providers.
import Tesseract from "https://esm.sh/tesseract.js@5.0.0";

const ALLOWED_ORIGINS = ["*"]; // Adjust for your domain for security

function corsHeaders(origin: string | null) {
  const allowOrigin = ALLOWED_ORIGINS.includes("*") ? "*" : (origin && ALLOWED_ORIGINS.includes(origin) ? origin : "");
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  } as Record<string, string>;
}

function extFromName(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function detectType(file: File) {
  const ext = extFromName(file.name);
  const t = (file.type || "").toLowerCase();
  if (t.includes("pdf") || ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "bmp", "tiff"].includes(ext) || t.startsWith("image/")) return "image";
  return "other";
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false });
    const pdf = await loadingTask.promise;
    const texts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it: any) => (typeof it.str === "string" ? it.str : ""))
        .join(" ");
      texts.push(pageText);
    }
    return texts.join("\n").trim();
  } catch (e) {
    console.error("PDF extraction failed", e);
    return "";
  }
}

async function extractImageText(bytes: Uint8Array): Promise<string> {
  try {
    // Tesseract accepts blobs or URLs; create a Blob from bytes
    const blob = new Blob([bytes]);
    const res = await Tesseract.recognize(blob, "eng", {
      // Hint: you can supply custom core/worker/lang paths if needed
      // corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/dist/tesseract-core.wasm.js",
      // workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
      // langPath: "https://tessdata.projectnaptha.com/4.0.0"
    });
    return (res?.data?.text || "").trim();
  } catch (e) {
    console.error("Image OCR failed", e);
    return "";
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }

  const headers = corsHeaders(req.headers.get("origin"));

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...headers, "Content-Type": "application/json" } });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase environment not configured" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? undefined;

    // Client with request's auth (RLS-aware)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { fetch },
      headers: authHeader ? { Authorization: authHeader } : undefined,
    });

    // Admin client (for storage + inserts if RLS blocks)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { fetch } });

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const userId = (formData.get("user_id") as string) || null;

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file field" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const fileType = detectType(file);

    // Ensure bucket exists
    try {
      await admin.storage.createBucket("documents", { public: false });
    } catch (_e) {
      // Ignore if already exists (409)
    }

    // Storage path: userId/yyyy-mm/<uuid>.<ext>
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const ext = extFromName(file.name) || (fileType === "pdf" ? "pdf" : "bin");
    const uuid = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${userId ?? "anon"}/${y}-${m}/${uuid}__${safeName}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("documents")
      .upload(key, fileBytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) {
      console.error("Upload error", uploadError);
      return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    }

    // Insert metadata row
    const { data: insertedFiles, error: insertFileErr } = await admin
      .from("files")
      .insert({
        user_id: userId,
        filename: file.name,
        file_type: fileType,
        size: file.size,
        storage_path: key,
      })
      .select("id")
      .limit(1);

    if (insertFileErr || !insertedFiles || insertedFiles.length === 0) {
      console.error("DB insert error", insertFileErr);
      return new Response(JSON.stringify({ error: "Failed to insert file metadata" }), { status: 500, headers: { ...headers, "Content-Type": "application/json" } });
    }

    const fileId = insertedFiles[0].id as number;

    // Extract text for PDF or image
    let extractedText = "";
    if (fileType === "pdf") {
      extractedText = await extractPdfText(fileBytes);
    } else if (fileType === "image") {
      extractedText = await extractImageText(fileBytes);
    }

    // Fallback to filename (without extension) when no text extracted
    const filenameNoExt = file.name.replace(/\.[^/.]+$/, "");
    const textForIndex = (extractedText && extractedText.trim().length > 0) ? extractedText : filenameNoExt;

    // Always insert into file_content so search works and tagging can run
    try {
      const { error: fcErr } = await admin
        .from("file_content")
        .insert({ file_id: fileId, indexed_text: textForIndex });
      if (fcErr) {
        console.error("file_content insert failed", fcErr);
      }
    } catch (e) {
      console.error("file_content insert exception", e);
    }

    // Auto-tag the file using whatever text we have
    try {
      console.log(`Starting auto-tagging for file ${fileId}`);
      const tagResponse = await fetch(`${SUPABASE_URL}/functions/v1/auto-tag-file`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_id: fileId,
          file_text: textForIndex
        }),
      });
      
      if (tagResponse.ok) {
        const tagResult = await tagResponse.json();
        console.log(`Auto-tagging completed for file ${fileId}:`, tagResult);
      } else {
        console.error(`Auto-tagging failed for file ${fileId}:`, tagResponse.status);
      }
    } catch (tagError) {
      console.error(`Auto-tagging error for file ${fileId}:`, tagError);
      // Don't fail the upload if tagging fails
    }


    return new Response(
      JSON.stringify({
        success: true,
        file_id: fileId,
        storage_path: key,
        extracted: extractedText ? true : false,
        bytes: file.size,
        file_type: fileType,
      }),
      { status: 200, headers: { ...headers, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Unexpected error", e);
    return new Response(JSON.stringify({ error: "Server error" }), { status: 500, headers: { ...corsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } });
  }
});
