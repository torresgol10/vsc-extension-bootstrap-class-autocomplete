import * as vscode from 'vscode';
import { getBootstrapClasses, getBootstrapVersion, setBootstrapVersion, removeCacheClasses } from './bootstrap';

/* Status Bar Item como global para poder cambiar los valores*/
export let statusBarItem: vscode.StatusBarItem;

const lenguageSupport = ['html', "php", "handlebars", "javascript", "javascriptreact", "typescript", "typescriptreact", "vue", "vue-html", "svelte", "astro"];

export function activate(context: vscode.ExtensionContext) {

	/* Codigo que registra el comando para activar la extension */
	const activateCommand = 'bootstrap-class-autocomplete.bootstrapClassAutocomplete';
	context.subscriptions.push(
		vscode.commands.registerCommand(activateCommand, () => {
			vscode.window.showInformationMessage('Activated Bootstrap Class Autocomplete');
		})
	);

	/* Cogido que salta cuando se cumple las condiciones */
	const disposable = vscode.languages.registerCompletionItemProvider(
		lenguageSupport,
		{
			async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
				const lineText = document.lineAt(position).text;

				if (lineText.lastIndexOf('class=', position.character) === -1 && lineText.lastIndexOf('className=', position.character) === -1) {
					return undefined;
				}

				const classes = await getBootstrapClasses();
				const completionItems: vscode.CompletionItem[] = [];
				for (const className of classes) {
					const completionItem = new vscode.CompletionItem(className, vscode.CompletionItemKind.Property);
					completionItems.push(completionItem);
				}
				return completionItems;
			}
		},
		' ',
		'"',
		"'"
	);
	context.subscriptions.push(disposable);


	/* Codigo para mostrar en la barra la opcion para cambiar de version */
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
	statusBarItem.text = getBootstrapVersion();
	statusBarItem.command = 'extension.selectBootstrapVersion';
	statusBarItem.show();

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.selectBootstrapVersion', () => {
			selectBootstrapVersion();
		})
	);
}

export function deactivate() {
	removeCacheClasses();
}


export function selectBootstrapVersion() {
	/* Versiones disponibles para seleccionar */
	const versionList5 = ["5.3.2", "5.3.1", "5.3.0", "5.2", "5.1", "5.0"];
	const versionList4 = ["4.6", "4.5", "4.4", "4.3", "4.2", "4.1", "4.0"];
	const versionList3 = ["3.4", "3.3"];

	const versionList = [...versionList5, ...versionList4, ...versionList3];

	const currentVersion = getBootstrapVersion();

	const version: vscode.QuickPick<vscode.QuickPickItem> = vscode.window.createQuickPick();

	version.items = versionList.map(version => {
		return {
			label: version,
			description: version === currentVersion ? "Version Selected" : ''
		};
	});

	version.onDidChangeSelection(selection => {
		if (selection[0]) {
			/* Cambiamos a la version que hemos seleccionado en el Status Bar */
			statusBarItem.text = selection[0].label;

			/* Cambiamos la version de Bootstrap seleccionada */
			setBootstrapVersion(selection[0].label);

			/* Mostramos un notificación con la version que se ha seleccionado */
			vscode.window.showInformationMessage(`Selected Bootstrap version: ${selection[0].label}`);

			/* Cerramos el cuadro de dialogo */
			version.dispose();
		}
	});

	version.show();
}
