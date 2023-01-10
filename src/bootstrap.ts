import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import * as vscode from 'vscode';
import { statusBarItem } from "./extension";

const URL = "https://cdn.jsdelivr.net/npm/bootstrap@latest/dist/css/bootstrap.css";

export async function getBootstrapClasses(): Promise<string[]> {
    const classesCache = getCacheClasses();

    if (classesCache.length === 0) {
        // Primero buscamos el archivo CSS en el proyecto
        const rootPath = vscode.workspace.workspaceFolders;

        if (rootPath !== undefined) {
            const bootstrapPath = path.join(rootPath[0].uri.fsPath, 'node_modules', 'bootstrap', 'dist', 'css', 'bootstrap.css');
            if (fs.existsSync(bootstrapPath)) {
                const packageJson = JSON.parse(fs.readFileSync(path.join(rootPath[0].uri.fsPath, 'node_modules', 'bootstrap', 'package.json'), 'utf8'));
                if (packageJson!.config!.version_short) {
                    setBootstrapVersion(packageJson.config.version_short);
                    statusBarItem.text = packageJson.config.version_short;
                } else {
                    setBootstrapVersion(packageJson.version);
                    statusBarItem.text = packageJson.version;
                }

                // Si el archivo existe, leemos el contenido y extraemos las clases
                const css = fs.readFileSync(bootstrapPath, 'utf8');
                return extractClassesFromCss(css);
            }
        }

        // Si no hemos encontrado el archivo en el proyecto, descargamos el archivo desde Internet
        const version = getBootstrapVersion();
        let url = URL;

        if (version !== 'latest') {
            url = url.replace('latest', version);
        }

        const response = await fetch(url);
        const responseText = await response.text();
        const classes = extractClassesFromCss(responseText);

        writeCacheClasses(classes);

        return classes;
    }

    return classesCache;
}

function extractClassesFromCss(css: string): string[] {
    const classRegex = /(\W)\.(?!\d)([\w-]+)/g;
    const classes: Set<string> = new Set();
    let match;
    while ((match = classRegex.exec(css))) {
        classes.add(match[1]);
    }

    return Array.from(classes);
}

export function getBootstrapVersion(): string {
    const config = vscode.workspace.getConfiguration('bootstrapAutocomplete');
    return config.get<string>('version') || '5.3';
}

export function setBootstrapVersion(version: string) {
    const config = vscode.workspace.getConfiguration('bootstrapAutocomplete');
    config.update("version", version, true);
}

function writeCacheClasses(classes: string[]): void {
    const cachePath = getCachePath();
    fs.writeFileSync(cachePath, JSON.stringify(classes));
}

function getCacheClasses(): string[] {
    const cachePath = getCachePath();

    if (fs.existsSync(cachePath)) {
        return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    }

    return [];
}

export function removeCacheClasses(): void {
    const cachePathDir = getCacheDir();

    fs.readdir(cachePathDir, (err, files) => {
        if (err) {
            throw err;
        }

        for (const file of files) {
            fs.unlinkSync(cachePathDir + file);
        }
    });
}

function getCachePath(): string {
    const cacheDir = getCacheDir();
    const version = getBootstrapVersion();

    return path.join(cacheDir, `bootstrap-classes-${version}.json`);
}

function getCacheDir(): string {
    let cachePath: string;

    if (process.platform === 'win32') {
        cachePath = path.join(os.homedir(), 'AppData', 'Local', 'bootstrap-class-autocomplete', 'cache');
    } else if (process.platform === 'darwin') {
        cachePath = path.join(os.homedir(), 'Library', 'Caches', 'bootstrap-class-autocomplete');
    } else {
        cachePath = path.join(os.homedir(), '.cache', 'bootstrap-class-autocomplete');
    }

    try {
        fs.mkdirSync(cachePath, { recursive: true });
    } catch (err: any) {
        if (err.code !== 'EEXIST') {
            console.error(`Failed to create cache directory: ${err.message}`);
        }
    }

    return cachePath;
}
