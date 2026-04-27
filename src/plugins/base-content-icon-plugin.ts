import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { constants as fsConstants } from 'fs';

const REFRESH_DEBOUNCE_MS = 150;

export interface FileIcons {
    dark: string;
    light: string;
}

interface ThemeObject {
    iconDefinitions?: Record<string, unknown>;
    fileNames?: Record<string, string>;
    light?: ThemeObject;
    [key: string]: unknown;
}

/**
 * Base class for content-aware file icon plugins.
 *
 * Subclasses implement:
 *   - classifyFile()      — read a file URI and return icon ids (or null)
 *   - isGeneratedEntry()  — decide whether a fileNames entry belongs to this plugin
 */
export abstract class BaseContentIconPlugin {
    readonly id: string;
    protected configKey: string;
    protected fileGlob: string;
    private outputChannel: vscode.OutputChannel | null = null;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private refreshInFlight: Promise<void> = Promise.resolve();
    private context: vscode.ExtensionContext | null = null;
    private themePaths: Record<string, string> | null = null;
    private hasShownWriteWarning = false;

    constructor(options: { id: string; configKey: string; fileGlob: string }) {
        this.id = options.id;
        this.configKey = options.configKey;
        this.fileGlob = options.fileGlob;
    }

    activate(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel): void {
        this.context = context;
        this.outputChannel = outputChannel;
        this.themePaths = this.getThemePaths(context.extensionPath);

        this.log('activated');

        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration(this.configKey)) {
                    this.log('configuration changed');
                    this.scheduleRefresh();
                }
            }),
            vscode.workspace.onDidCreateFiles(() => this.scheduleRefresh()),
            vscode.workspace.onDidDeleteFiles(() => this.scheduleRefresh()),
            vscode.workspace.onDidRenameFiles(() => this.scheduleRefresh()),
            vscode.workspace.onDidSaveTextDocument((doc) => {
                if (this.isRelevantFile(doc.uri)) {
                    this.scheduleRefresh();
                }
            })
        );

        this.scheduleRefresh();
    }

    /** Override to filter which saved files trigger a refresh. */
    protected isRelevantFile(uri: vscode.Uri): boolean {
        return vscode.languages.match({ pattern: this.fileGlob }, { uri } as vscode.TextDocument) > 0;
    }

    private getThemePaths(extensionPath: string): Record<string, string> {
        const themePath = path.join(extensionPath, 'themes');
        return {
            dark: path.join(themePath, 'dark-jetbrains-icon-theme.json'),
            light: path.join(themePath, 'light-jetbrains-icon-theme.json'),
            auto: path.join(themePath, 'auto-jetbrains-icon-theme.json'),
        };
    }

    private scheduleRefresh(): void {
        if (this.refreshTimer) clearTimeout(this.refreshTimer);

        this.refreshTimer = setTimeout(() => {
            this.refreshTimer = null;
            this.refreshInFlight = this.refreshInFlight
                .then(() => this.refresh())
                .catch((error: Error) => {
                    this.log(`refresh failed: ${error.message}`);
                    if (error.stack) this.log(error.stack);
                });
        }, REFRESH_DEBOUNCE_MS);
    }

    private async refresh(): Promise<void> {
        const dotIndex = this.configKey.lastIndexOf('.');
        const section = this.configKey.substring(0, dotIndex);
        const key = this.configKey.substring(dotIndex + 1);
        const enabled = vscode.workspace.getConfiguration(section).get<boolean>(key, false);

        this.log(`enabled: ${enabled}`);

        const fileIconMap = enabled ? await this.buildFileIconMap() : new Map<string, FileIcons>();
        this.log(`resolved ${fileIconMap.size} file(s)`);

        await this.syncAllThemes(fileIconMap);
    }

    protected async buildFileIconMap(): Promise<Map<string, FileIcons>> {
        const uris = await vscode.workspace.findFiles(this.fileGlob);
        const map = new Map<string, FileIcons>();

        for (const uri of uris) {
            const result = await this.classifyFile(uri);
            if (result) {
                map.set(path.basename(uri.fsPath), result);
            }
        }
        return map;
    }

    /** Given a file URI, return icon ids or null to skip. */
    protected abstract classifyFile(uri: vscode.Uri): Promise<FileIcons | null>;

    /** Return true if the given fileNames key was injected by this plugin. */
    protected abstract isGeneratedEntry(fileName: string): boolean;

    // ── Theme I/O ──────────────────────────────────────────────

    private async syncAllThemes(fileIconMap: Map<string, FileIcons>): Promise<void> {
        if (!this.themePaths) return;
        const writable = await this.ensureThemesAreWritable();
        if (!writable) return;

        await this.syncThemeFile(this.themePaths.dark, fileIconMap, 'dark');
        await this.syncThemeFile(this.themePaths.light, fileIconMap, 'light');
        await this.syncThemeFile(this.themePaths.auto, fileIconMap, 'auto');
    }

    private async ensureThemesAreWritable(): Promise<boolean> {
        if (!this.themePaths) return false;
        try {
            await Promise.all(
                Object.values(this.themePaths).map((p) => fs.access(p, fsConstants.W_OK))
            );
            return true;
        } catch (error) {
            const msg = `[${this.id}] Cannot write theme files (read-only environment?).`;
            this.log(msg);
            this.log((error as Error).message);
            if (!this.hasShownWriteWarning) {
                this.hasShownWriteWarning = true;
                void vscode.window.showWarningMessage(msg);
            }
            return false;
        }
    }

    private async syncThemeFile(
        themePath: string,
        fileIconMap: Map<string, FileIcons>,
        variant: 'dark' | 'light' | 'auto'
    ): Promise<void> {
        const theme = await this.readJson(themePath);
        if (!theme) return;

        let changed = false;

        const pickSide = variant === 'light' ? 'light' : 'dark';
        changed = this.patchFileNames(theme, fileIconMap, (entry) => entry[pickSide]) || changed;

        if (variant === 'auto') {
            if (!theme.light || typeof theme.light !== 'object') {
                theme.light = {};
                changed = true;
            }
            changed = this.patchFileNames(
                theme.light!,
                fileIconMap,
                (entry) => entry.light
            ) || changed;
        }

        if (!changed) {
            this.log(`${path.basename(themePath)} already up to date`);
            return;
        }

        await fs.writeFile(themePath, `${JSON.stringify(theme, null, 4)}\n`, 'utf8');
        this.log(`${path.basename(themePath)} updated`);
    }

    private patchFileNames(
        target: ThemeObject,
        fileIconMap: Map<string, FileIcons>,
        pickIcon: (entry: FileIcons) => string
    ): boolean {
        const current: Record<string, string> =
            target.fileNames && typeof target.fileNames === 'object' ? target.fileNames : {};

        const next: Record<string, string> = {};

        for (const [fileName, value] of Object.entries(current)) {
            if (!this.isGeneratedEntry(fileName)) {
                next[fileName] = value;
            }
        }

        for (const [fileName, icons] of [...fileIconMap.entries()].sort()) {
            const iconId = pickIcon(icons);
            if (iconId) {
                next[fileName] = iconId;
            }
        }

        const changed = !shallowEqual(current, next);
        if (changed || !target.fileNames) {
            target.fileNames = next;
        }
        return changed;
    }

    private async readJson(filePath: string): Promise<ThemeObject | null> {
        try {
            const raw = await fs.readFile(filePath, 'utf8');
            return JSON.parse(raw) as ThemeObject;
        } catch (error) {
            this.log(`failed to read ${filePath}: ${(error as Error).message}`);
            return null;
        }
    }

    protected log(message: string): void {
        this.outputChannel?.appendLine(`[${this.id}] ${message}`);
    }

    deactivate(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}

function shallowEqual(left: Record<string, string>, right: Record<string, string>): boolean {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
        if (left[key] !== right[key]) return false;
    }
    return true;
}
