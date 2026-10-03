# AddisFix Image/AI Testing Notes

Image upload: POST /api/uploads (multipart, field "file"), auth required. Allowed: jpeg/png/webp/gif, max 10MB.
Returns {id}. Serve via GET /api/uploads/{id}/raw (public).

AI analysis: POST /api/ai/analyze/{file_id} (auth) -> {available, category, severity, description, confidence, needs_review, model}.
If EMERGENT_LLM_KEY missing/errors -> {available:false, message:"AI analysis is currently unavailable."} (never fabricated).

Report create reuses the latest preview analysis for the same file_id to avoid double model calls.

Testing images: use real JPEG/PNG with real visual content (e.g. a pothole photo). Do NOT use blank/solid-color images.
