import * as vscode from 'vscode';
import { BaseContentIconPlugin, FileIcons } from './base-content-icon-plugin';
import { detectKotlinKind } from '../kotlin-detection';

const CONFIG_SECTION = 'jetbrains-file-icon-theme';

/**
 * Kotlin content-aware file icon plugin.
 *
 * Scans .kt files and assigns icons based on the primary declaration:
 *   abstract class   → kotlinAbstractClass
 *   annotation class → kotlinAnnotation
 *   enum class       → kotlinEnum
 *   data class / sealed class / class → kotlinClass
 *   object           → kotlinObject
 *   interface        → kotlinInterface
 *   typealias        → kotlinTypeAlias
 *   (default)        → null (keep the standard .kt icon)
 */
export class KotlinContentIconPlugin extends BaseContentIconPlugin {
    constructor() {
        super({
            id: 'kotlin-content-icons',
            configKey: `${CONFIG_SECTION}.enableKotlinContentIcons`,
            fileGlob: '**/*.kt',
        });
    }

    protected isRelevantFile(uri: vscode.Uri): boolean {
        return uri.fsPath.endsWith('.kt');
    }

    protected isGeneratedEntry(fileName: string): boolean {
        return fileName.endsWith('.kt');
    }

    protected async classifyFile(uri: vscode.Uri): Promise<FileIcons | null> {
        const doc = await vscode.workspace.openTextDocument(uri);
        const text = doc.getText();
        const kind = detectKotlinKind(text);

        if (!kind) return null;

        return {
            dark: `file_kotlin_${kind}`,
            light: `file_kotlin_${kind}_light`,
        };
    }
}
