import { Plugin, Notice } from 'obsidian';
import { AMapView, AMapViewType } from './amap-view';
import { AMapSettings, DEFAULT_SETTINGS, AMapSettingTab } from './settings';
import { clearAMapCache } from './amap-loader';

export default class ObsidianAMapsPlugin extends Plugin {
	settings: AMapSettings;

	async onload() {
		await this.loadSettings();

		this.registerBasesView(AMapViewType, {
			name: 'Map',
			icon: 'lucide-map',
			factory: (controller, containerEl) => new AMapView(controller, containerEl, this),
			options: AMapView.getViewOptions,
		});

		this.addSettingTab(new AMapSettingTab(this.app, this));

		// Show notice if API key is not configured
		if (!this.settings.apiKey || !this.settings.securityJsCode) {
			this.app.workspace.onLayoutReady(() => {
				new Notice('AMaps: Please configure API Key and Security Config in settings', 10000);
			});
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Clear AMap cache to force reload with new settings
		clearAMapCache();
	}

	onunload() {
		clearAMapCache();
	}
}
