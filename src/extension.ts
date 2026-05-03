import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/* =========================
   CONFIGURATION
========================= */

const DEBOUNCE_TIME = 400;

// Prevent multiple executions per file
const activeTimers = new Map<string, NodeJS.Timeout>();
const processingFiles = new Set<string>();

/* =========================
   IMPORT MAP
========================= */

const importMap: Record<string, string> = {

    /* =========================
       FACADES
    ========================= */

    Auth: 'use Illuminate\\Support\\Facades\\Auth;',
    DB: 'use Illuminate\\Support\\Facades\\DB;',
    Cache: 'use Illuminate\\Support\\Facades\\Cache;',
    Route: 'use Illuminate\\Support\\Facades\\Route;',
    Gate: 'use Illuminate\\Support\\Facades\\Gate;',
    Hash: 'use Illuminate\\Support\\Facades\\Hash;',
    Http: 'use Illuminate\\Support\\Facades\\Http;',
    Log: 'use Illuminate\\Support\\Facades\\Log;',
    Mail: 'use Illuminate\\Support\\Facades\\Mail;',
    Storage: 'use Illuminate\\Support\\Facades\\Storage;',
    Validator: 'use Illuminate\\Support\\Facades\\Validator;',
    Notification: 'use Illuminate\\Support\\Facades\\Notification;',
    Password: 'use Illuminate\\Support\\Facades\\Password;',
    Session: 'use Illuminate\\Support\\Facades\\Session;',

    /* =========================
       SUPPORT / HELPERS
    ========================= */

    Str: 'use Illuminate\\Support\\Str;',
    Arr: 'use Illuminate\\Support\\Arr;',
    Carbon: 'use Carbon\\Carbon;',
    Collection: 'use Illuminate\\Support\\Collection;',

    /* =========================
       HTTP
    ========================= */

    Request: 'use Illuminate\\Http\\Request;',
    JsonResponse: 'use Illuminate\\Http\\JsonResponse;',
    Response: 'use Illuminate\\Http\\Response;',

    /* =========================
       RELATIONS
    ========================= */

    HasMany: 'use Illuminate\\Database\\Eloquent\\Relations\\HasMany;',
    BelongsTo: 'use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;',
    HasOne: 'use Illuminate\\Database\\Eloquent\\Relations\\HasOne;',
    BelongsToMany: 'use Illuminate\\Database\\Eloquent\\Relations\\BelongsToMany;',
    MorphMany: 'use Illuminate\\Database\\Eloquent\\Relations\\MorphMany;',
    MorphTo: 'use Illuminate\\Database\\Eloquent\\Relations\\MorphTo;',
    MorphOne: 'use Illuminate\\Database\\Eloquent\\Relations\\MorphOne;',

    /* =========================
       ELOQUENT
    ========================= */

    Model: 'use Illuminate\\Database\\Eloquent\\Model;',
    Builder: 'use Illuminate\\Database\\Eloquent\\Builder;',
    SoftDeletes: 'use Illuminate\\Database\\Eloquent\\SoftDeletes;',
    HasFactory: 'use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;',

    /* =========================
       QUEUES / JOBS
    ========================= */

    Dispatchable: 'use Illuminate\\Foundation\\Bus\\Dispatchable;',
    Queueable: 'use Illuminate\\Bus\\Queueable;',
    ShouldQueue: 'use Illuminate\\Contracts\\Queue\\ShouldQueue;',

    /* =========================
       EVENTS
    ========================= */

    DispatchesEvents: 'use Illuminate\\Foundation\\Events\\Dispatchable;',
};

/* =========================
   ACTIVATION
========================= */

export function activate(context: vscode.ExtensionContext) {

    const disposable = vscode.workspace.onDidChangeTextDocument((event) => {

        const document = event.document;

        if (document.languageId !== 'php') return;

        const fileKey = document.uri.toString();

        // debounce
        if (activeTimers.has(fileKey)) {
            clearTimeout(activeTimers.get(fileKey)!);
        }

        const timer = setTimeout(() => {
            runSmartEngine(document);
        }, DEBOUNCE_TIME);

        activeTimers.set(fileKey, timer);
    });

    context.subscriptions.push(disposable);
}

/* =========================
   SMART ENGINE
========================= */

async function runSmartEngine(document: vscode.TextDocument) {

    const fileKey = document.uri.toString();

    if (processingFiles.has(fileKey)) return;

    processingFiles.add(fileKey);

    try {

        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const text = document.getText();

        /* =========================
           DETECTION
        ========================= */

        const staticClasses =
            text.match(/\b([A-Z][A-Za-z0-9_]*)::/g) || [];

        const relationTypes =
            text.match(
                /\b(HasMany|BelongsTo|HasOne|BelongsToMany|MorphMany|MorphTo|MorphOne)\b/g
            ) || [];

        const traits =
            text.match(
                /\b(SoftDeletes|HasFactory|Dispatchable|Queueable)\b/g
            ) || [];

        const all = new Set<string>();

        staticClasses.forEach(match => {
            all.add(match.replace('::', ''));
        });

        relationTypes.forEach(match => {
            all.add(match);
        });

        traits.forEach(match => {
            all.add(match);
        });

        /* =========================
           IMPORT INSERTION
        ========================= */

        for (const name of all) {

            const importLine = await resolveImport(name);

            if (importLine) {
                await safeAddImport(editor, importLine);
            }
        }

    } catch (error) {

        console.error('Laravel Smart Import Error:', error);

    } finally {

        processingFiles.delete(fileKey);
    }
}

/* =========================
   IMPORT RESOLVER
========================= */

async function resolveImport(name: string): Promise<string | null> {

    // predefined imports
    if (importMap[name]) {
        return importMap[name];
    }

    // model auto detection
    return await resolveModel(name);
}

/* =========================
   MODEL RESOLUTION
========================= */

async function resolveModel(className: string): Promise<string | null> {

    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) return null;

    const root = workspaceFolders[0].uri.fsPath;

    const possiblePaths = [

        path.join(root, 'app', 'Models', `${className}.php`),

        path.join(root, 'app', `${className}.php`),

    ];

    for (const modelPath of possiblePaths) {

        if (fs.existsSync(modelPath)) {

            if (modelPath.includes('app\\Models') || modelPath.includes('app/Models')) {
                return `use App\\Models\\${className};`;
            }

            return `use App\\${className};`;
        }
    }

    return null;
}

/* =========================
   SAFE IMPORT INSERTION
========================= */

async function safeAddImport(
    editor: vscode.TextEditor,
    importLine: string
) {

    const document = editor.document;

    const text = document.getText();

    // already imported
    if (text.includes(importLine)) return;

    const lines = text.split('\n');

    let insertLine = 0;

    /* =========================
       FIND NAMESPACE
    ========================== */

    for (let i = 0; i < lines.length; i++) {

        if (lines[i].startsWith('namespace')) {

            insertLine = i + 1;
            break;
        }
    }

    /* =========================
       SKIP EXISTING IMPORTS
    ========================== */

    for (let i = insertLine; i < lines.length; i++) {

        const trimmed = lines[i].trim();

        if (
            trimmed.startsWith('use ') ||
            trimmed === ''
        ) {
            insertLine = i + 1;
        } else {
            break;
        }
    }

    /* =========================
       INSERT IMPORT
    ========================== */

    const edit = new vscode.WorkspaceEdit();

    edit.insert(
        document.uri,
        new vscode.Position(insertLine, 0),
        importLine + '\n'
    );

    await vscode.workspace.applyEdit(edit);
}

/* =========================
   DEACTIVATE
========================= */

export function deactivate() {

    activeTimers.forEach(timer => clearTimeout(timer));

    activeTimers.clear();

    processingFiles.clear();
}