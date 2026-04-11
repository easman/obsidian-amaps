import { Plugin, Notice } from 'obsidian';
import { AMapView, AMapViewType } from './amap-view';
import { AMapSettings, DEFAULT_SETTINGS, AMapSettingTab } from './settings';
import { clearAMapCache } from './amap-loader';
import { loadEnvFromVault, hasEnvFile } from './env-loader';

// Build info - update this when building
const BUILD_NUMBER = '20260411-150515';
const PLUGIN_VERSION = '1.0.0';

export default class ObsidianAMapsPlugin extends Plugin {
	settings: AMapSettings;
	envConfigLoaded: boolean = false;

	async onload() {
		// Log build info prominently
		console.log('%c[AMaps Plugin]', 'font-size: 20px; font-weight: bold; color: #c41e3a;');
		console.log('%cVersion: ' + PLUGIN_VERSION + ' | Build: ' + BUILD_NUMBER, 'font-size: 14px; color: #2e5c8a;');
		console.log('%cIf you do not see this message, the plugin is not loaded!', 'font-size: 12px; color: #ff8c00; font-style: italic;');

		await this.loadSettings();

		// Try to load from .env file
		const envConfig = await loadEnvFromVault(this.app.vault);
		if (envConfig.AMAP_API_KEY || envConfig.AMAP_SECURITY_JS_CODE) {
			this.settings.apiKey = envConfig.AMAP_API_KEY || this.settings.apiKey;
			this.settings.securityJsCode = envConfig.AMAP_SECURITY_JS_CODE || this.settings.securityJsCode;
			this.envConfigLoaded = true;
			console.log('[AMaps] Loaded config from .env file');
		}

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
