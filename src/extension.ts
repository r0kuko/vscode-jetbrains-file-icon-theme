import * as vscode from 'vscode';
import { GoTestIconsPlugin } from './plugins/go-test-icons';
import { KotlinContentIconPlugin } from './plugins/kotlin-content-icons';
import { BaseContentIconPlugin } from './plugins/base-content-icon-plugin';

const outputChannel = vscode.window.createOutputChannel('JetBrains File Icon Theme');
const plugins: BaseContentIconPlugin[] = [];

export function activate(context: vscode.ExtensionContext): void {
    outputChannel.appendLine('Extension activated');

    const pluginClasses = [
        GoTestIconsPlugin,
        KotlinContentIconPlugin,
    ];

    for (const PluginClass of pluginClasses) {
        try {
            const plugin = new PluginClass();
            plugin.activate(context, outputChannel);
            plugins.push(plugin);
            outputChannel.appendLine(`${plugin.id} initialized`);
        } catch (error) {
            const err = error as Error;
            outputChannel.appendLine(`Error initializing plugin: ${err.message}`);
            if (err.stack) outputChannel.appendLine(err.stack);
        }
    }
}

export function deactivate(): void {
    for (const plugin of plugins) {
        plugin.deactivate();
    }
    plugins.length = 0;
    outputChannel.dispose();
}
