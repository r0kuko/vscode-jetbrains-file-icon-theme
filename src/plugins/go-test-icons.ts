import { BaseContentIconPlugin, FileIcons } from './base-content-icon-plugin';

const CONFIG_SECTION = 'jetbrains-file-icon-theme';

/**
 * Go test file icon plugin.
 * Assigns the go-test icon to any *_test.go file.
 */
export class GoTestIconsPlugin extends BaseContentIconPlugin {
    constructor() {
        super({
            id: 'go-test-icons',
            configKey: `${CONFIG_SECTION}.enableGoTestIcons`,
            fileGlob: '**/*_test.go',
        });
    }

    protected isRelevantFile(uri: import('vscode').Uri): boolean {
        return uri.fsPath.endsWith('_test.go');
    }

    protected isGeneratedEntry(fileName: string): boolean {
        return fileName.endsWith('_test.go');
    }

    protected async classifyFile(): Promise<FileIcons> {
        return {
            dark: 'file_go_test',
            light: 'file_go_test_light',
        };
    }
}
