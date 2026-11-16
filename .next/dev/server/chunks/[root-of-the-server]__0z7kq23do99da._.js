module.exports = [
(()=>{"use strict";return[
"[project]/src/app/api/documents/upload/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/index.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/file-extractor.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/workspace.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
const runtime = "nodejs";
async function POST(request) {
    try {
        const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getWorkspace"])();
        const contentType = request.headers.get("content-type") ?? "";
        let filename = "Raw agreement text";
        let fileType = "raw";
        let size = 0;
        let text = "";
        let pageCount = 1;
        let extractionMethod = "Raw agreement text";
        let ocrUsed = false;
        let aiUsed = false;
        if (contentType.includes("application/json")) {
            const body = await request.json();
            if (typeof body.text !== "string") return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Provide agreement text to analyse.", 400);
            text = body.text.slice(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TEXT_CHARS"]);
            size = new TextEncoder().encode(text).length;
            if (size > __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_FILE_BYTES"]) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Agreement text exceeds the 8 MB limit.", 413);
            if (text.trim().length < 40) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Paste at least 40 characters of agreement text for analysis.", 422);
            filename = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveAgreementTitle"])(text, body.title);
        } else {
            const form = await request.formData();
            const fileValue = form.get("file");
            const pasted = form.get("text");
            if (fileValue instanceof File && fileValue.size > 0) {
                filename = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cleanFilename"])(fileValue.name);
                size = fileValue.size;
                const extracted = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractTextFromUploadedFile"])(fileValue);
                text = extracted.text;
                fileType = extracted.fileType;
                pageCount = extracted.pageCount;
                extractionMethod = extracted.extractionMethod;
                ocrUsed = extracted.ocrUsed;
                aiUsed = extracted.aiUsed;
            } else if (typeof pasted === "string") {
                text = pasted.slice(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TEXT_CHARS"]);
                size = new TextEncoder().encode(text).length;
                if (size > __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_FILE_BYTES"]) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Agreement text exceeds the 8 MB limit.", 413);
                if (text.trim().length < 40) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Paste at least 40 characters of agreement text for analysis.", 422);
                const rawTitle = typeof form.get("filename") === "string" ? String(form.get("filename")).trim() : "";
                filename = rawTitle ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cleanFilename"])(rawTitle) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveAgreementTitle"])(text);
                fileType = "raw";
                extractionMethod = "Raw agreement text";
            } else {
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("Upload a supported file or provide agreement text.", 400);
            }
        }
        const [document] = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["documents"]).values({
            userId: user.id,
            filename,
            fileType,
            fileSize: size,
            processingStatus: "uploaded",
            pageCount,
            extractionMethod,
            pendingText: text
        }).returning();
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        return Response.json({
            workspaceId: user.id,
            document: {
                ...document,
                pendingText: undefined,
                uploadTimestamp: document.uploadTimestamp.toISOString()
            },
            preview: text.slice(0, 12000),
            extractedText: text,
            pageCount,
            extractionMethod,
            ocrUsed,
            aiUsed,
            wordCount,
            charCount: text.length,
            textTruncated: text.length >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MAX_TEXT_CHARS"]
        }, {
            status: 201
        });
    } catch (error) {
        if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$file$2d$extractor$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FileExtractionError"]) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])(error.message, error.status);
        console.error("Upload failed:", error instanceof Error ? error.message : "unknown error");
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$workspace$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonError"])("The file could not be processed. Please try again or paste the agreement text directly.", 500);
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/db/index.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "db",
    ()=>db,
    "pool",
    ()=>pool
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/node-postgres/driver.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
}
const globalForDb = globalThis;
const pool = globalForDb.__arenaNextJsPostgresqlPool ?? new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["Pool"]({
    connectionString: databaseUrl
});
if ("TURBOPACK compile-time truthy", 1) {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
}
const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["drizzle"])(pool);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/src/db/schema.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyses",
    ()=>analyses,
    "comparisons",
    ()=>comparisons,
    "documents",
    ()=>documents,
    "users",
    ()=>users
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/boolean.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/integer.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/jsonb.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/table.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/text.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/timestamp.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/uuid.js [app-route] (ecmascript)");
;
const users = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("users", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("email").notNull().unique(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).notNull().defaultNow(),
    retentionDays: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("retention_days").notNull().default(90),
    storeEvidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["boolean"])("store_evidence").notNull().default(true)
});
const documents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("documents", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("user_id").notNull().references(()=>users.id, {
        onDelete: "cascade"
    }),
    filename: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("filename").notNull(),
    fileType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("file_type").notNull(),
    fileSize: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("file_size").notNull().default(0),
    uploadTimestamp: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("upload_timestamp", {
        withTimezone: true
    }).notNull().defaultNow(),
    processingStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("processing_status").notNull().default("uploaded"),
    pageCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["integer"])("page_count"),
    extractionMethod: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("extraction_method"),
    pendingText: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("pending_text"),
    errorMessage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("error_message")
});
const analyses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("analyses", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    documentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("document_id").notNull().references(()=>documents.id, {
        onDelete: "cascade"
    }),
    contractType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("contract_type").notNull(),
    extractedTerms: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("extracted_terms").notNull(),
    analysisSummary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["text"])("analysis_summary").notNull(),
    riskResults: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("risk_results").notNull(),
    calculationResults: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("calculation_results").notNull(),
    fullResult: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("full_result").$type().notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).notNull().defaultNow()
});
const comparisons = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["pgTable"])("comparisons", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("id").primaryKey().defaultRandom(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("user_id").notNull().references(()=>users.id, {
        onDelete: "cascade"
    }),
    documentAId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("document_a_id").notNull().references(()=>documents.id, {
        onDelete: "cascade"
    }),
    documentBId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$uuid$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["uuid"])("document_b_id").notNull().references(()=>documents.id, {
        onDelete: "cascade"
    }),
    comparisonResults: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["jsonb"])("comparison_results").$type().notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["timestamp"])("created_at", {
        withTimezone: true
    }).notNull().defaultNow()
});
}),
"[project]/src/lib/file-extractor.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "FileExtractionError",
    ()=>FileExtractionError,
    "MAX_FILE_BYTES",
    ()=>MAX_FILE_BYTES,
    "MAX_PDF_PAGES",
    ()=>MAX_PDF_PAGES,
    "MAX_TEXT_CHARS",
    ()=>MAX_TEXT_CHARS,
    "SUPPORTED_EXTENSIONS",
    ()=>SUPPORTED_EXTENSIONS,
    "cleanFilename",
    ()=>cleanFilename,
    "deriveAgreementTitle",
    ()=>deriveAgreementTitle,
    "extractTextFromUploadedFile",
    ()=>extractTextFromUploadedFile
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$zlib__$5b$external$5d$__$28$node$3a$zlib$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:zlib [external] (node:zlib, cjs)");
;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_CHARS = 180_000;
const MAX_PDF_PAGES = 80;
const MAX_OCR_PDF_PAGES = 12;
const SUPPORTED_EXTENSIONS = new Set([
    "pdf",
    "docx",
    "txt",
    "md",
    "rtf",
    "csv",
    "png",
    "jpg",
    "jpeg",
    "webp"
]);
const IMAGE_MIME = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp"
};
class FileExtractionError extends Error {
    status;
    constructor(message, status = 422){
        super(message);
        this.status = status;
    }
}
function cleanFilename(value) {
    return value.replace(/\\/g, "/").split("/").pop()?.replace(/[^a-zA-Z0-9._() -]/g, "_").slice(0, 160) || "document";
}
function deriveAgreementTitle(text, provided) {
    const manual = provided?.trim();
    if (manual) return manual.slice(0, 140);
    const lines = text.split(/\r?\n/).map((line)=>line.replace(/\s+/g, " ").trim()).filter((line)=>line.length >= 4 && !/^synthetic demonstration document/i.test(line));
    const heading = lines.find((line)=>line.length <= 90 && !/^this\b/i.test(line)) ?? lines[0];
    if (heading) return heading.replace(/[:\-–—\s]+$/, "").slice(0, 90);
    return "Raw agreement text";
}
function decodeTextBuffer(bytes) {
    if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder("utf-16le", {
            fatal: false
        }).decode(bytes.subarray(2));
    }
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder("utf-16be", {
            fatal: false
        }).decode(bytes.subarray(2));
    }
    return new TextDecoder("utf-8", {
        fatal: false
    }).decode(bytes).replace(/^\uFEFF/, "");
}
function stripRtf(source) {
    return source.replace(/\{\\\*[^{}]*\}/g, " ").replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict|header|footer)[^{}]*\}/gi, " ").replace(/\\par[d]?/gi, "\n").replace(/\\line\b/gi, "\n").replace(/\\tab\b/gi, " ").replace(/\\'([0-9a-f]{2})/gi, (_, hex)=>String.fromCharCode(parseInt(hex, 16))).replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function validateImageSignature(bytes, extension) {
    if (bytes.length < 12) return false;
    if (extension === "png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (extension === "jpg" || extension === "jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (extension === "webp") {
        return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    }
    return false;
}
/* ---- Minimal pure-Node PNG encoder for raw pixel buffers from scanned PDFs ---- */ const CRC_TABLE = (()=>{
    const table = new Uint32Array(256);
    for(let i = 0; i < 256; i++){
        let c = i;
        for(let k = 0; k < 8; k++)c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1;
        table[i] = c >>> 0;
    }
    return table;
})();
function crc32(buffer) {
    let crc = 0xffffffff;
    for(let i = 0; i < buffer.length; i++)crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ crc >>> 8;
    return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([
        typeBuf,
        data
    ])), 0);
    return Buffer.concat([
        length,
        typeBuf,
        data,
        crcBuf
    ]);
}
function rawPixelsToPng(data, width, height, channels) {
    const colorType = channels === 1 ? 0 : channels === 3 ? 2 : 6;
    const rowBytes = width * channels;
    const scanlines = Buffer.alloc((rowBytes + 1) * height);
    for(let y = 0; y < height; y++){
        const outOffset = y * (rowBytes + 1);
        scanlines[outOffset] = 0; // filter: None
        const inOffset = y * rowBytes;
        for(let x = 0; x < rowBytes; x++)scanlines[outOffset + 1 + x] = data[inOffset + x] ?? 0;
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = colorType;
    return Buffer.concat([
        Buffer.from([
            137,
            80,
            78,
            71,
            13,
            10,
            26,
            10
        ]),
        pngChunk("IHDR", ihdr),
        pngChunk("IDAT", (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$zlib__$5b$external$5d$__$28$node$3a$zlib$2c$__cjs$29$__["deflateSync"])(scanlines, {
            level: 3
        })),
        pngChunk("IEND", Buffer.alloc(0))
    ]);
}
async function extractTextWithAiVision(imageBuffers) {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey || imageBuffers.length === 0) return null;
    const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.AI_VISION_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
    const timeoutMs = Number(process.env.AI_TIMEOUT_SECONDS || "25") * 1000;
    try {
        const content = [
            {
                type: "text",
                text: "Transcribe every word, number, percentage, currency symbol, and financial clause visible in these financial agreement image(s) verbatim. Preserve paragraph breaks. Do not summarize, interpret, or invent missing text."
            },
            ...imageBuffers.slice(0, 4).map((item)=>({
                    type: "image_url",
                    image_url: {
                        url: `data:${item.mime};base64,${item.buffer.toString("base64")}`
                    }
                }))
        ];
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            signal: AbortSignal.timeout(timeoutMs),
            body: JSON.stringify({
                model,
                temperature: 0,
                messages: [
                    {
                        role: "user",
                        content
                    }
                ]
            })
        });
        if (!response.ok) return null;
        const payload = await response.json();
        const text = payload.choices?.[0]?.message?.content?.trim();
        return text && text.length >= 20 ? text : null;
    } catch  {
        return null;
    }
}
async function runLocalOcr(buffers) {
    const { createWorker } = await __turbopack_context__.A("[externals]/tesseract.js [external] (tesseract.js, cjs, [project]/node_modules/tesseract.js, async loader)");
    const worker = await createWorker("eng", 1, {
        cachePath: "/tmp/tessdata"
    });
    try {
        const pages = [];
        for (const buffer of buffers){
            const { data } = await worker.recognize(buffer);
            if (data.text?.trim()) pages.push(data.text.trim());
        }
        return pages.join("\f");
    } finally{
        await worker.terminate();
    }
}
async function extractPdfText(bytes) {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
        throw new FileExtractionError("The PDF header is invalid or the file is corrupted.", 422);
    }
    const { extractImages, extractText, extractTextItems, getDocumentProxy } = await __turbopack_context__.A("[externals]/unpdf [external] (unpdf, esm_import, [project]/node_modules/unpdf, async loader)");
    let pdf;
    try {
        pdf = await getDocumentProxy(bytes, {
            maxImageSize: 16_777_216
        });
    } catch  {
        throw new FileExtractionError("The PDF could not be opened. It may be corrupted or password protected.", 422);
    }
    if (pdf.numPages > MAX_PDF_PAGES) {
        throw new FileExtractionError(`PDFs are limited to ${MAX_PDF_PAGES} pages in this workspace.`, 413);
    }
    const pageCount = pdf.numPages;
    // Pass 1: standard digital text extraction preserving pages.
    let text = "";
    try {
        const extracted = await extractText(pdf, {
            mergePages: false
        });
        text = Array.isArray(extracted.text) ? extracted.text.join("\f") : String(extracted.text ?? "");
    } catch  {
        text = "";
    }
    // Pass 2: positioned text item recovery if pass 1 came up short.
    if (text.trim().length < 40) {
        try {
            const positioned = await extractTextItems(pdf);
            const recoveredPages = positioned.items.map((items)=>items.map((item)=>item.str + (item.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+\n/g, "\n").trim());
            const recovered = recoveredPages.join("\f");
            if (recovered.trim().length > text.trim().length) text = recovered;
        } catch  {
        // Fall through to scanned-PDF OCR pass.
        }
    }
    if (text.trim().length >= 40) {
        return {
            text: text.slice(0, MAX_TEXT_CHARS),
            fileType: "pdf",
            pageCount,
            extractionMethod: "PDF digital text",
            ocrUsed: false,
            aiUsed: false
        };
    }
    // Pass 3: scanned PDF — extract embedded page images and run AI vision (if configured) or Tesseract OCR.
    const pagePngs = [];
    const scanLimit = Math.min(pageCount, MAX_OCR_PDF_PAGES);
    for(let page = 1; page <= scanLimit; page++){
        try {
            const images = await extractImages(pdf, page);
            // Pick the largest readable embedded image per scanned page.
            const sorted = images.filter((img)=>img.width >= 32 && img.height >= 32 && img.data?.length).sort((a, b)=>b.width * b.height - a.width * a.height);
            if (sorted[0]) {
                const img = sorted[0];
                const channels = img.channels === 1 ? 1 : img.channels === 3 ? 3 : 4;
                pagePngs.push(rawPixelsToPng(img.data, img.width, img.height, channels));
            }
        } catch  {
        // Skip unreadable page image and continue scanning remaining pages.
        }
    }
    if (pagePngs.length > 0) {
        const aiText = await extractTextWithAiVision(pagePngs.map((buffer)=>({
                buffer,
                mime: "image/png"
            })));
        if (aiText && aiText.trim().length >= 40) {
            return {
                text: aiText.slice(0, MAX_TEXT_CHARS),
                fileType: "pdf",
                pageCount,
                extractionMethod: "Scanned PDF · AI Vision",
                ocrUsed: true,
                aiUsed: true
            };
        }
        try {
            const ocrText = await runLocalOcr(pagePngs);
            if (ocrText.trim().length >= 40) {
                return {
                    text: ocrText.slice(0, MAX_TEXT_CHARS),
                    fileType: "pdf",
                    pageCount,
                    extractionMethod: "Scanned PDF · OCR",
                    ocrUsed: true,
                    aiUsed: false
                };
            }
        } catch  {
        // Handled below with clear message.
        }
    }
    throw new FileExtractionError("No sufficient readable text could be extracted from this PDF. If it is a low-resolution scan, try a clearer file or switch to Raw agreement text.", 422);
}
async function extractTextFromUploadedFile(file) {
    if (file.size <= 0) throw new FileExtractionError("The uploaded file is empty.", 422);
    if (file.size > MAX_FILE_BYTES) throw new FileExtractionError("This file is larger than the 8 MB limit.", 413);
    const safeName = cleanFilename(file.name);
    const extension = safeName.toLowerCase().includes(".") ? safeName.toLowerCase().split(".").pop() ?? "" : "";
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
        throw new FileExtractionError("Unsupported file type. Upload a PDF, Word (.docx), TXT, MD, RTF, or contract image (PNG/JPG/WEBP).", 415);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (extension === "pdf") {
        return extractPdfText(bytes);
    }
    if (extension === "docx") {
        if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
            throw new FileExtractionError("The Word (.docx) file appears corrupted or is not a valid .docx archive.", 422);
        }
        try {
            const mammoth = await __turbopack_context__.A("[externals]/mammoth [external] (mammoth, cjs, [project]/node_modules/mammoth, async loader)");
            const { value } = await mammoth.extractRawText({
                buffer: Buffer.from(bytes)
            });
            const text = value.trim().slice(0, MAX_TEXT_CHARS);
            if (text.length < 40) throw new FileExtractionError("The Word document does not contain enough readable text to analyse.", 422);
            return {
                text,
                fileType: "docx",
                pageCount: 1,
                extractionMethod: "Word (.docx) text",
                ocrUsed: false,
                aiUsed: false
            };
        } catch (err) {
            if (err instanceof FileExtractionError) throw err;
            throw new FileExtractionError("The Word (.docx) document could not be read. Try re-saving it or pasting the agreement text.", 422);
        }
    }
    if (extension in IMAGE_MIME) {
        if (!validateImageSignature(bytes, extension)) {
            throw new FileExtractionError("The image header is invalid or the file is corrupted.", 422);
        }
        const buffer = Buffer.from(bytes);
        const aiText = await extractTextWithAiVision([
            {
                buffer,
                mime: IMAGE_MIME[extension]
            }
        ]);
        if (aiText && aiText.trim().length >= 40) {
            return {
                text: aiText.slice(0, MAX_TEXT_CHARS),
                fileType: extension,
                pageCount: 1,
                extractionMethod: "Image · AI Vision",
                ocrUsed: true,
                aiUsed: true
            };
        }
        try {
            const ocrText = await runLocalOcr([
                buffer
            ]);
            if (ocrText.trim().length >= 40) {
                return {
                    text: ocrText.slice(0, MAX_TEXT_CHARS),
                    fileType: extension,
                    pageCount: 1,
                    extractionMethod: "Image · OCR",
                    ocrUsed: true,
                    aiUsed: false
                };
            }
        } catch  {
        // Handled below.
        }
        throw new FileExtractionError("Not enough readable agreement text was detected in this image. Try a sharper crop or paste the agreement text.", 422);
    }
    // Plain text formats: txt, md, csv, rtf
    let text = decodeTextBuffer(bytes);
    let method = "Plain text";
    if (extension === "rtf") {
        text = stripRtf(text);
        method = "RTF text";
    } else if (extension === "md") {
        method = "Markdown text";
    }
    text = text.slice(0, MAX_TEXT_CHARS);
    if (text.trim().length < 40) {
        throw new FileExtractionError("The file has insufficient readable text for analysis (at least 40 characters required).", 422);
    }
    return {
        text,
        fileType: extension,
        pageCount: 1,
        extractionMethod: method,
        ocrUsed: false,
        aiUsed: false
    };
}
}),
"[project]/src/lib/workspace.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "getWorkspace",
    ()=>getWorkspace,
    "getWorkspaceById",
    ()=>getWorkspaceById,
    "jsonError",
    ()=>jsonError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/index.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/db/schema.ts [app-route] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
const UUID_RE = /^[0-9a-f-]{36}$/i;
/** Loads (or lazily creates) the workspace row for a known id and applies retention. */ async function resolveWorkspace(id) {
    const existing = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["users"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["users"].id, id)).limit(1);
    if (existing[0]) {
        const cutoff = new Date(Date.now() - existing[0].retentionDays * 86400000);
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["documents"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["documents"].userId, id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["lt"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["documents"].uploadTimestamp, cutoff)));
        return existing[0];
    }
    const inserted = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["users"]).values({
        id,
        email: `private-${id.slice(0, 8)}@workspace.local`
    }).onConflictDoNothing().returning();
    if (inserted[0]) return inserted[0];
    const retry = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$index$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["users"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$db$2f$schema$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["users"].id, id)).limit(1);
    if (!retry[0]) throw new Error("Could not initialise workspace.");
    return retry[0];
}
async function getWorkspace(fallbackId) {
    const headerStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    const headerId = headerStore.get("x-feeshield-workspace");
    const cookieId = cookieStore.get("feeshield_workspace")?.value;
    const id = UUID_RE.test(headerId ?? "") ? headerId : UUID_RE.test(cookieId ?? "") ? cookieId : UUID_RE.test(fallbackId ?? "") ? fallbackId : null;
    if (!id) throw new Error("A valid private workspace session is required.");
    return resolveWorkspace(id);
}
async function getWorkspaceById(id) {
    if (!UUID_RE.test(id)) throw new Error("A valid private workspace session is required.");
    return resolveWorkspace(id);
}
function jsonError(message, status = 400) {
    return Response.json({
        error: message
    }, {
        status
    });
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
]})(),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[externals]/node:zlib [external] (node:zlib, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:zlib", () => require("node:zlib"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0z7kq23do99da._.js.map