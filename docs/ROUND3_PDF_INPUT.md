# BrandLens Document Text Extraction Pipeline (.docx & .pdf)

BrandLens Round 3 introduces native support for extracting draft text directly from Word documents (`.docx`) and PDF files (`.pdf`) with **zero document storage** and **strict security guardrails**.

---

## 1. Architectural Overview & Data Lifecycle

```
[User Browser]
       │
       │ (multipart/form-data: .docx or .pdf <= 5MB)
       ▼
[Next.js Route Handler: POST /api/content/import-file]
       │
       ├─► 1. Authenticate caller role (requireRole)
       ├─► 2. Validate MIME type & file extension (.docx / .pdf)
       ├─► 3. Enforce maximum file size (5 MB limit check)
       ├─► 4. Read file into volatile memory Buffer (Buffer.from(arrayBuffer))
       │
       ▼
[In-Memory Text Extractor: src/lib/content/file-extract.ts]
       │
       ├─── If .docx ──► mammoth.extractRawText({ buffer })
       │
       └─── If .pdf  ──► pdf-parse (PDFParse.getText({ pageJoiner: '' }))
       │
       ▼
[Sanitization & Limits Guard]
       │
       ├─► Normalize whitespace (\r\n -> \n, strip 3+ newlines)
       ├─► Validate non-empty extractable text
       ├─► Enforce 10,000 character limit (truncate if exceeded)
       │
       ▼
[Buffer Destruction & Response]
       │
       ├─► Memory Buffer discarded immediately (eligible for V8 GC)
       ├─► ZERO bytes saved to disk, Supabase Storage, or database
       ├─► Log audit event: content.import_file (filename, charCount, truncated)
       │
       ▼
[Client Response JSON]
{
  "success": true,
  "text": "Extracted copy...",
  "charCount": 3520,
  "originalLength": 3520,
  "truncated": false,
  "fileType": "pdf",
  "fileName": "Summer_Botanical_Campaign.pdf"
}
```

---

## 2. Core Security & Privacy Guarantees

1. **Zero Document Storage (Stateless Extraction)**:
   - Uploaded files are streamed directly into server memory as an `ArrayBuffer`.
   - The file is **never** written to local disk, `/tmp`, cloud storage buckets, or database blobs.
   - Once text extraction completes, the binary buffer reference is dropped immediately for Node.js garbage collection.

2. **File Size & Denial of Service Protection**:
   - Files strictly capped at **5 MB**. Any file exceeding this limit is rejected with HTTP `413 Payload Too Large` before buffer processing.
   - Memory allocation per request is bounded.

3. **Text Limit & Downstream Protection**:
   - Input limit of **10,000 characters** is strictly enforced.
   - If a document exceeds 10,000 characters, it is truncated to 10,000 characters with `truncated: true` and a user-facing warning returned to the creator.
   - Text fed into the review engine downstream is enclosed in `<content>DATA</content>` delimiters and passed through PII redaction (email, phone, API keys masked) before any external AI call.

4. **Scanned Documents & OCR Boundary**:
   - Files containing only rasterized images (e.g. scanned paper documents without an OCR text layer) will yield empty text.
   - The extractor catches this and returns a helpful error message:
     *"No extractable text was found in the uploaded file. Please verify that the document contains selectable text and is not an image scan."*

---

## 3. Technology Choices

- **`mammoth` (v1.9+)**:
  - Chosen for `.docx` extraction because it targets semantic text and ignores dangerous embedded macros, VBScript, and styling artifacts.
  - Zero native binary dependencies; runs purely in JavaScript/Node.js runtime.
- **`pdf-parse` (v2.4+)**:
  - Pure JavaScript PDF parser that extracts raw text streams without relying on external system binaries (e.g. `pdftotext` or `poppler`).
  - Supports configurable page joining and clean character stream normalization.

---

## 4. Audit Log Integration

Every successful document import creates an append-only audit trail in `audit_log`:
```json
{
  "org_id": "893c5240-...",
  "actor": "user-uuid",
  "action": "content.import_file",
  "detail": {
    "fileName": "Botanical_Launch_Brief.docx",
    "fileType": "docx",
    "charCount": 4210,
    "truncated": false
  }
}
```
No document body or binary data is stored in the audit log—only operational metadata for governance compliance.

