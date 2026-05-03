import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/* =========================
   CONFIGURATION
========================= */

const DEBOUNCE_TIME = 400;

// Prevent multiple executions per file (VERY IMPORTANT)
const activeTimers = new Map<string, NodeJS.Timeout>();
const processingFiles = new Set<string>();

const importMap: Record<string, string> = {

    // Facades
    Auth: 'use Illuminate\\Support\\Facades\\Auth;',
    DB: 'use Illuminate\\Support\\Facades\\DB;',
    Cache: 'use Illuminate\\Support\\Facades\\Cache;',
    Route: 'use Illuminate\\Support\\Facades\\Route;',
    Gate: 'use Illuminate\\Support\\Facades\\Gate;',

    // Helpers
    Str: 'use Illuminate\\Support\\Str;',
    Carbon: 'use Carbon\\Carbon;',

    // Relations
    HasMany: 'use Illuminate\\Database\\Eloquent\\Relations\\HasMany;',
    BelongsTo: 'use Illuminate\\Database\\Eloquent\\Relations\\BelongsTo;',
    HasOne: 'use Illuminate\\Database\\Eloquent\\Relations\\HasOne;',
    BelongsToMany: 'use Illuminate\\Database\\Eloquent\\Relations\\BelongsToMany;',
};

/* =========================
   ACTIVATION
========================= */

export function activate(context: vscode.ExtensionContext) {

    /* =========================
       AUTO IMPORT ENGINE
    ========================= */

    const disposable = vscode.workspace.onDidChangeTextDocument((event) => {

        const document = event.document;

        if (document.languageId !== 'php') return;

        const fileKey = document.uri.toString();

        // Cancel previous timer (debounce per file)
        if (activeTimers.has(fileKey)) {
            clearTimeout(activeTimers.get(fileKey)!);
        }

        const timer = setTimeout(() => {
            runSmartEngine(document);
        }, DEBOUNCE_TIME);

        activeTimers.set(fileKey, timer);
    });

    /* =========================
       CLEANUP ENGINE (on save)
    ========================= */

    vscode.workspace.onDidSaveTextDocument((document) => {

        if (document.languageId !== 'php') return;

        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        runCleanupEngine(editor, document);
    });

    context.subscriptions.push(disposable);
}

/* =========================
   SMART ENGINE (PIPELINE)
========================= */

async function runSmartEngine(document: vscode.TextDocument) {

    const fileKey = document.uri.toString();

    if (processingFiles.has(fileKey)) return;
    processingFiles.add(fileKey);

    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const text = document.getText();

        if (!text.includes('::') && !text.includes('HasMany')) return;

        const classes = text.match(/\b([A-Z][A-Za-z0-9_]*)::/g) || [];
        const types = text.match(/\b(HasMany|BelongsTo|HasOne|BelongsToMany)\b/g) || [];

        const all = new Set<string>();

        classes.forEach(m => all.add(m.replace('::', '')));
        types.forEach(m => all.add(m));

        for (const name of all) {

            const importLine = await resolveImport(name, document);

            if (importLine) {
                await safeAddImport(editor, importLine);
            }
        }

    } finally {
        processingFiles.delete(fileKey);
    }
}

/* =========================
   CLEANUP ENGINE (PHPSTORM STYLE)
========================= */

async function runCleanupEngine(
    editor: vscode.TextEditor,
    document: vscode.TextDocument
) {
    const text = document.getText();
    const lines = text.split('\n');

    const edits: vscode.TextEdit[] = [];

    for (let index = 0; index < lines.length; index++) {

        const line = lines[index].trim();

        // Only target imports
        if (!line.startsWith('use ')) continue;

        const match = line.match(/use\s+([^;]+);/);
        if (!match) continue;

        const fullPath = match[1];
        const className = fullPath.split('\\').pop();

        if (!className) continue;

        /* =========================
           PHPSTORM-LEVEL DETECTION
        ========================= */

        // Escape class name for regex safety
        const safeClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // 1. Static usage: Auth::user()
        const staticUsage = new RegExp(`\\b${safeClass}::`, 'm');

        // 2. Object usage: new ClassName()
        const newUsage = new RegExp(`new\\s+${safeClass}\\b`, 'm');

        // 3. Inheritance / interface
        const extendsUsage = new RegExp(`extends\\s+${safeClass}\\b`, 'm');
        const implementsUsage = new RegExp(`implements\\s+${safeClass}\\b`, 'm');

        // 4. Function type-hint usage (🔥 FIX for Request $request issue)
        const typeHintUsage = new RegExp(
            `\\(.*\\b${safeClass}\\s+\\$|,\\s*${safeClass}\\s+\\$`,
            'm'
        );

        // 5. Constructor injection safety (extra coverage)
        const constructorUsage = new RegExp(
            `__construct\\s*\\(.*\\b${safeClass}\\s+\\$`,
            'm'
        );

        const isUsed =
            staticUsage.test(text) ||
            newUsage.test(text) ||
            extendsUsage.test(text) ||
            implementsUsage.test(text) ||
            typeHintUsage.test(text) ||
            constructorUsage.test(text);

        /* =========================
           REMOVE UNUSED IMPORT
        ========================= */

        if (!isUsed) {
            const range = new vscode.Range(
                new vscode.Position(index, 0),
                new vscode.Position(index, lines[index].length)
            );

            edits.push(vscode.TextEdit.delete(range));
        }
    }

    if (edits.length === 0) return;

    const edit = new vscode.WorkspaceEdit();
    edit.set(document.uri, edits);

    await vscode.workspace.applyEdit(edit);
}

/* =========================
   IMPORT RESOLVER
========================= */

async function resolveImport(name: string, document: vscode.TextDocument): Promise<string | null> {

    if (importMap[name]) return importMap[name];

    return await resolveModel(name);
}

/* =========================
   MODEL RESOLUTION
========================= */

async function resolveModel(className: string): Promise<string | null> {

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;

    const root = workspaceFolders[0].uri.fsPath;
    const modelPath = path.join(root, 'app', 'Models', `${className}.php`);

    if (fs.existsSync(modelPath)) {
        return `use App\\Models\\${className};`;
    }

    return null;
}

/* =========================
   SAFE IMPORT INSERTION (SMART POSITIONING)
========================= */

async function safeAddImport(editor: vscode.TextEditor, importLine: string) {

    const document = editor.document;
    const text = document.getText();

    if (text.includes(importLine)) return;

    const lines = text.split('\n');

    let insertLine = 0;

    // namespace detection
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('namespace')) {
            insertLine = i + 1;
            break;
        }
    }

    // skip existing imports
    for (let i = insertLine; i < lines.length; i++) {
        if (lines[i].startsWith('use ')) {
            insertLine = i + 1;
        } else {
            break;
        }
    }

    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, new vscode.Position(insertLine, 0), importLine + '\n');

    await vscode.workspace.applyEdit(edit);
}

/* =========================
   CLEANUP
========================= */

export function deactivate() {

    activeTimers.forEach(t => clearTimeout(t));
    activeTimers.clear();
    processingFiles.clear();
}