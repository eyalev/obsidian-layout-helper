import { Plugin, WorkspaceLeaf, Modal, App, PluginSettingTab, Setting } from 'obsidian';

interface PaneLayoutSettings {
	savedLayouts: { [key: string]: PaneLayout };
	showRibbonButtons: boolean;
	showEqualizeButton: boolean;
	showSaveButton: boolean;
	showRestoreButton: boolean;
	showSaveNamedButton: boolean;
	showLoadNamedButton: boolean;
}

interface PaneLayout {
	name: string;
	timestamp: number;
	panes: Array<{
		width: number;
		flexGrow: string;
		className: string;
	}>;
}

const DEFAULT_SETTINGS: PaneLayoutSettings = {
	savedLayouts: {},
	showRibbonButtons: false,
	showEqualizeButton: true,
	showSaveButton: true,
	showRestoreButton: true,
	showSaveNamedButton: true,
	showLoadNamedButton: true
};

export default class LayoutHelperPlugin extends Plugin {
	settings: PaneLayoutSettings;
	async onload() {
		await this.loadSettings();

		this.addSettingTab(new PaneLayoutSettingTab(this.app, this));

		this.addCommand({
			id: 'equalize-pane-widths',
			name: 'Equalize Pane Widths',
			callback: () => {
				this.equalizePaneWidths();
			}
		});

		this.addCommand({
			id: 'save-default-pane-layout',
			name: 'Save Default Pane Layout',
			callback: () => {
				this.savePaneLayout();
			}
		});

		this.addCommand({
			id: 'load-default-pane-layout',
			name: 'Load Default Pane Layout',
			callback: () => {
				this.restorePaneLayout();
			}
		});

		this.addCommand({
			id: 'save-named-layout',
			name: 'Save Named Layout',
			callback: () => {
				this.openSaveLayoutModal();
			}
		});

		this.addCommand({
			id: 'load-named-layout',
			name: 'Load Named Layout',
			callback: () => {
				this.openLoadLayoutModal();
			}
		});

		this.addCommand({
			id: 'manage-layouts',
			name: 'Manage Layouts',
			callback: () => {
				this.openManageLayoutsModal();
			}
		});

		this.addRibbonButtons();
	}

	addRibbonButtons() {
		if (!this.settings.showRibbonButtons) return;

		if (this.settings.showEqualizeButton) {
			this.addRibbonIcon('layout-dashboard', 'Equalize Pane Widths', () => {
				this.equalizePaneWidths();
			});
		}

		if (this.settings.showSaveButton) {
			this.addRibbonIcon('save', 'Save Pane Layout', () => {
				this.savePaneLayout();
			});
		}

		if (this.settings.showRestoreButton) {
			this.addRibbonIcon('rotate-ccw', 'Restore Pane Layout', () => {
				this.restorePaneLayout();
			});
		}

		if (this.settings.showSaveNamedButton) {
			this.addRibbonIcon('bookmark', 'Save Named Layout', () => {
				this.openSaveLayoutModal();
			});
		}

		if (this.settings.showLoadNamedButton) {
			this.addRibbonIcon('folder-open', 'Load Named Layout', () => {
				this.openLoadLayoutModal();
			});
		}
	}

	equalizePaneWidths() {
		console.log('Layout Helper: Starting pane width equalization');
		
		// Add a small delay to ensure DOM is ready
		setTimeout(() => {
			this.performPaneEqualization();
		}, 100);
	}

	performPaneEqualization() {
		console.log('Layout Helper: Starting pane equalization');
		
		// Find the main workspace split container (vertical split, not horizontal!)
		const mainSplit = document.querySelector('.workspace-split.mod-vertical.mod-root');
		if (!mainSplit) {
			console.log('Layout Helper: No main vertical split found');
			return;
		}
		
		console.log('Layout Helper: Found main split:', mainSplit);
		
		// Find all child panes (workspace-tabs elements, excluding resize handles)
		const panes = mainSplit.querySelectorAll(':scope > .workspace-tabs');
		console.log(`Layout Helper: Found ${panes.length} panes`);
		
		if (panes.length <= 1) {
			console.log('Layout Helper: Not enough panes to equalize');
			return;
		}
		
		// Set the main container to flex (horizontal direction for side-by-side panes)
		(mainSplit as HTMLElement).style.setProperty('display', 'flex', 'important');
		(mainSplit as HTMLElement).style.setProperty('flex-direction', 'row', 'important');
		
		// Apply equal flex properties to each pane
		panes.forEach((pane: HTMLElement, index: number) => {
			const beforeWidth = pane.getBoundingClientRect().width;
			
			console.log(`Layout Helper: Processing pane ${index + 1} with classes: ${pane.className}`);
			
			// Set equal flex properties for equal width distribution
			pane.style.setProperty('flex-grow', '1', 'important');
			pane.style.setProperty('flex-shrink', '1', 'important');
			pane.style.setProperty('flex-basis', '0', 'important');
			pane.style.setProperty('width', 'auto', 'important');
			
			// Force reflow
			pane.offsetWidth;
			
			const afterWidth = pane.getBoundingClientRect().width;
			
			console.log(`Layout Helper: Pane ${index + 1}: ${beforeWidth}px → ${afterWidth}px`);
		});
		
		console.log('Layout Helper: All panes processed');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	savePaneLayout() {
		console.log('Layout Helper: Saving current pane layout');
		
		const mainSplit = document.querySelector('.workspace-split.mod-vertical.mod-root');
		if (!mainSplit) {
			console.log('Layout Helper: No main vertical split found');
			return;
		}
		
		const panes = mainSplit.querySelectorAll(':scope > .workspace-tabs');
		if (panes.length <= 1) {
			console.log('Layout Helper: Not enough panes to save');
			return;
		}
		
		const layout: PaneLayout = {
			name: 'default',
			timestamp: Date.now(),
			panes: []
		};
		
		panes.forEach((pane: HTMLElement) => {
			const rect = pane.getBoundingClientRect();
			const computed = window.getComputedStyle(pane);
			
			layout.panes.push({
				width: rect.width,
				flexGrow: computed.flexGrow || '1',
				className: pane.className
			});
		});
		
		this.settings.savedLayouts['default'] = layout;
		this.saveSettings();
		
		console.log('Layout Helper: Layout saved:', layout);
		
		// Show notification
		const notification = document.body.createDiv('notice');
		notification.setText('Pane layout saved!');
		setTimeout(() => notification.remove(), 2000);
	}

	restorePaneLayout() {
		console.log('Layout Helper: Restoring pane layout');
		
		const layout = this.settings.savedLayouts['default'];
		if (!layout) {
			console.log('Layout Helper: No saved layout found');
			
			// Show notification
			const notification = document.body.createDiv('notice');
			notification.setText('No saved layout found!');
			setTimeout(() => notification.remove(), 2000);
			return;
		}
		
		const mainSplit = document.querySelector('.workspace-split.mod-vertical.mod-root');
		if (!mainSplit) {
			console.log('Layout Helper: No main vertical split found');
			return;
		}
		
		const panes = mainSplit.querySelectorAll(':scope > .workspace-tabs');
		if (panes.length !== layout.panes.length) {
			console.log(`Layout Helper: Pane count mismatch - current: ${panes.length}, saved: ${layout.panes.length}`);
			return;
		}
		
		// Calculate total saved width
		const totalSavedWidth = layout.panes.reduce((sum, p) => sum + p.width, 0);
		const currentContainerWidth = mainSplit.getBoundingClientRect().width;
		
		// Apply proportional widths
		panes.forEach((pane: HTMLElement, index: number) => {
			const savedPaneData = layout.panes[index];
			const proportion = savedPaneData.width / totalSavedWidth;
			const targetWidth = currentContainerWidth * proportion;
			
			// Calculate flex-grow based on proportion
			const flexGrow = (proportion * layout.panes.length).toString();
			
			pane.style.setProperty('flex-grow', flexGrow, 'important');
			pane.style.setProperty('flex-shrink', '1', 'important');
			pane.style.setProperty('flex-basis', '0', 'important');
			
			console.log(`Layout Helper: Restored pane ${index + 1} - flex-grow: ${flexGrow}, target width: ${targetWidth}px`);
		});
		
		console.log('Layout Helper: Layout restored');
		
		// Show notification
		const notification = document.body.createDiv('notice');
		notification.setText('Pane layout restored!');
		setTimeout(() => notification.remove(), 2000);
	}

	saveNamedLayout(name: string) {
		console.log(`Layout Helper: Saving layout '${name}'`);
		
		const mainSplit = document.querySelector('.workspace-split.mod-vertical.mod-root');
		if (!mainSplit) {
			console.log('Layout Helper: No main vertical split found');
			return;
		}
		
		const panes = mainSplit.querySelectorAll(':scope > .workspace-tabs');
		if (panes.length <= 1) {
			console.log('Layout Helper: Not enough panes to save');
			return;
		}
		
		const layout: PaneLayout = {
			name: name,
			timestamp: Date.now(),
			panes: []
		};
		
		panes.forEach((pane: HTMLElement) => {
			const rect = pane.getBoundingClientRect();
			const computed = window.getComputedStyle(pane);
			
			layout.panes.push({
				width: rect.width,
				flexGrow: computed.flexGrow || '1',
				className: pane.className
			});
		});
		
		this.settings.savedLayouts[name] = layout;
		this.saveSettings();
		
		console.log(`Layout Helper: Layout '${name}' saved:`, layout);
		
		// Show notification
		const notification = document.body.createDiv('notice');
		notification.setText(`Layout '${name}' saved!`);
		setTimeout(() => notification.remove(), 2000);
	}

	restoreNamedLayout(name: string) {
		console.log(`Layout Helper: Restoring layout '${name}'`);
		
		const layout = this.settings.savedLayouts[name];
		if (!layout) {
			console.log(`Layout Helper: No layout '${name}' found`);
			
			// Show notification
			const notification = document.body.createDiv('notice');
			notification.setText(`Layout '${name}' not found!`);
			setTimeout(() => notification.remove(), 2000);
			return;
		}
		
		const mainSplit = document.querySelector('.workspace-split.mod-vertical.mod-root');
		if (!mainSplit) {
			console.log('Layout Helper: No main vertical split found');
			return;
		}
		
		const panes = mainSplit.querySelectorAll(':scope > .workspace-tabs');
		if (panes.length !== layout.panes.length) {
			console.log(`Layout Helper: Pane count mismatch - current: ${panes.length}, saved: ${layout.panes.length}`);
			return;
		}
		
		// Calculate total saved width
		const totalSavedWidth = layout.panes.reduce((sum, p) => sum + p.width, 0);
		const currentContainerWidth = mainSplit.getBoundingClientRect().width;
		
		// Apply proportional widths
		panes.forEach((pane: HTMLElement, index: number) => {
			const savedPaneData = layout.panes[index];
			const proportion = savedPaneData.width / totalSavedWidth;
			const targetWidth = currentContainerWidth * proportion;
			
			// Calculate flex-grow based on proportion
			const flexGrow = (proportion * layout.panes.length).toString();
			
			pane.style.setProperty('flex-grow', flexGrow, 'important');
			pane.style.setProperty('flex-shrink', '1', 'important');
			pane.style.setProperty('flex-basis', '0', 'important');
			
			console.log(`Layout Helper: Restored pane ${index + 1} - flex-grow: ${flexGrow}, target width: ${targetWidth}px`);
		});
		
		console.log(`Layout Helper: Layout '${name}' restored`);
		
		// Show notification
		const notification = document.body.createDiv('notice');
		notification.setText(`Layout '${name}' restored!`);
		setTimeout(() => notification.remove(), 2000);
	}

	deleteNamedLayout(name: string) {
		if (this.settings.savedLayouts[name]) {
			delete this.settings.savedLayouts[name];
			this.saveSettings();
			
			// Show notification
			const notification = document.body.createDiv('notice');
			notification.setText(`Layout '${name}' deleted!`);
			setTimeout(() => notification.remove(), 2000);
		}
	}

	getLayoutNames(): string[] {
		return Object.keys(this.settings.savedLayouts);
	}

	openSaveLayoutModal() {
		new SaveLayoutModal(this.app, (name: string) => {
			this.saveNamedLayout(name);
		}).open();
	}

	openLoadLayoutModal() {
		new LoadLayoutModal(this.app, this.getLayoutNames(), (name: string) => {
			this.restoreNamedLayout(name);
		}).open();
	}

	openManageLayoutsModal() {
		new ManageLayoutsModal(this.app, this.getLayoutNames(), 
			(name: string) => this.restoreNamedLayout(name),
			(name: string) => this.deleteNamedLayout(name)
		).open();
	}

	onunload() {
		// Reset pane styles when plugin is disabled
		const mainSplit = document.querySelector('.workspace-split.mod-vertical.mod-root');
		if (mainSplit) {
			const panes = mainSplit.querySelectorAll(':scope > .workspace-tabs');
			panes.forEach((pane: HTMLElement) => {
				pane.style.removeProperty('flex-grow');
				pane.style.removeProperty('flex-shrink');
				pane.style.removeProperty('flex-basis');
				pane.style.removeProperty('width');
			});
			(mainSplit as HTMLElement).style.removeProperty('display');
			(mainSplit as HTMLElement).style.removeProperty('flex-direction');
		}
	}
}

class SaveLayoutModal extends Modal {
	private onSave: (name: string) => void;

	constructor(app: App, onSave: (name: string) => void) {
		super(app);
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Save Layout' });

		const inputContainer = contentEl.createDiv();
		const nameInput = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter layout name...'
		});
		nameInput.style.width = '100%';
		nameInput.style.marginBottom = '10px';

		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '10px';
		buttonContainer.style.justifyContent = 'flex-end';

		const saveButton = buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' });
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });

		const handleSave = () => {
			const name = nameInput.value.trim();
			if (name) {
				this.onSave(name);
				this.close();
			}
		};

		saveButton.onclick = handleSave;
		cancelButton.onclick = () => this.close();
		nameInput.onkeydown = (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				handleSave();
			} else if (e.key === 'Escape') {
				this.close();
			}
		};

		// Focus the input
		setTimeout(() => nameInput.focus(), 100);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class LoadLayoutModal extends Modal {
	private layouts: string[];
	private onLoad: (name: string) => void;

	constructor(app: App, layouts: string[], onLoad: (name: string) => void) {
		super(app);
		this.layouts = layouts;
		this.onLoad = onLoad;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Load Layout' });

		if (this.layouts.length === 0) {
			contentEl.createEl('p', { text: 'No saved layouts found.' });
			const closeButton = contentEl.createEl('button', { text: 'Close' });
			closeButton.onclick = () => this.close();
			return;
		}

		const listContainer = contentEl.createDiv();
		this.layouts.forEach((layoutName) => {
			const item = listContainer.createDiv({ cls: 'layout-item' });
			item.style.display = 'flex';
			item.style.justifyContent = 'space-between';
			item.style.alignItems = 'center';
			item.style.padding = '8px';
			item.style.border = '1px solid var(--background-modifier-border)';
			item.style.borderRadius = '4px';
			item.style.marginBottom = '5px';
			item.style.cursor = 'pointer';

			const nameSpan = item.createEl('span', { text: layoutName });
			const loadButton = item.createEl('button', { text: 'Load', cls: 'mod-cta' });
			loadButton.style.marginLeft = '10px';

			const handleLoad = () => {
				this.onLoad(layoutName);
				this.close();
			};

			loadButton.onclick = handleLoad;
			item.onclick = (e: MouseEvent) => {
				if (e.target === loadButton) return;
				handleLoad();
			};
		});

		const closeButton = contentEl.createEl('button', { text: 'Close' });
		closeButton.style.marginTop = '10px';
		closeButton.onclick = () => this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class ManageLayoutsModal extends Modal {
	private layouts: string[];
	private onLoad: (name: string) => void;
	private onDelete: (name: string) => void;

	constructor(app: App, layouts: string[], onLoad: (name: string) => void, onDelete: (name: string) => void) {
		super(app);
		this.layouts = layouts;
		this.onLoad = onLoad;
		this.onDelete = onDelete;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Manage Layouts' });

		if (this.layouts.length === 0) {
			contentEl.createEl('p', { text: 'No saved layouts found.' });
			const closeButton = contentEl.createEl('button', { text: 'Close' });
			closeButton.onclick = () => this.close();
			return;
		}

		const listContainer = contentEl.createDiv();
		this.layouts.forEach((layoutName) => {
			const item = listContainer.createDiv({ cls: 'layout-item' });
			item.style.display = 'flex';
			item.style.justifyContent = 'space-between';
			item.style.alignItems = 'center';
			item.style.padding = '8px';
			item.style.border = '1px solid var(--background-modifier-border)';
			item.style.borderRadius = '4px';
			item.style.marginBottom = '5px';

			const nameSpan = item.createEl('span', { text: layoutName });
			const buttonContainer = item.createDiv();
			buttonContainer.style.display = 'flex';
			buttonContainer.style.gap = '5px';

			const loadButton = buttonContainer.createEl('button', { text: 'Load', cls: 'mod-cta' });
			const deleteButton = buttonContainer.createEl('button', { text: 'Delete', cls: 'mod-warning' });

			loadButton.onclick = () => {
				this.onLoad(layoutName);
				this.close();
			};

			deleteButton.onclick = () => {
				if (confirm(`Are you sure you want to delete layout '${layoutName}'?`)) {
					this.onDelete(layoutName);
					this.close();
					// Reopen modal to show updated list
					setTimeout(() => {
						new ManageLayoutsModal(this.app, this.layouts.filter(l => l !== layoutName), this.onLoad, this.onDelete).open();
					}, 100);
				}
			};
		});

		const closeButton = contentEl.createEl('button', { text: 'Close' });
		closeButton.style.marginTop = '10px';
		closeButton.onclick = () => this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class PaneLayoutSettingTab extends PluginSettingTab {
	plugin: LayoutHelperPlugin;

	constructor(app: App, plugin: LayoutHelperPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Layout Helper Settings' });

		new Setting(containerEl)
			.setName('Show ribbon buttons')
			.setDesc('Enable or disable all ribbon buttons')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showRibbonButtons)
				.onChange(async (value) => {
					this.plugin.settings.showRibbonButtons = value;
					await this.plugin.saveSettings();
					this.display();
				}));

		if (this.plugin.settings.showRibbonButtons) {
			containerEl.createEl('h3', { text: 'Individual Button Controls' });

			new Setting(containerEl)
				.setName('Equalize pane widths button')
				.setDesc('Show button to equalize all pane widths')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showEqualizeButton)
					.onChange(async (value) => {
						this.plugin.settings.showEqualizeButton = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Save current layout button')
				.setDesc('Show button to save current pane layout')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showSaveButton)
					.onChange(async (value) => {
						this.plugin.settings.showSaveButton = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Restore layout button')
				.setDesc('Show button to restore saved pane layout')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showRestoreButton)
					.onChange(async (value) => {
						this.plugin.settings.showRestoreButton = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Save named layout button')
				.setDesc('Show button to save named pane layout')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showSaveNamedButton)
					.onChange(async (value) => {
						this.plugin.settings.showSaveNamedButton = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Load named layout button')
				.setDesc('Show button to load named pane layout')
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.showLoadNamedButton)
					.onChange(async (value) => {
						this.plugin.settings.showLoadNamedButton = value;
						await this.plugin.saveSettings();
					}));

			containerEl.createEl('p', { 
				text: 'Note: Changes to ribbon buttons require reloading the plugin to take effect.',
				cls: 'setting-item-description'
			});
		}
	}
}