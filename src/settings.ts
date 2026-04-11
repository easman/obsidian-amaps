import { App, Modal, Notice, PluginSettingTab, Setting, setIcon, setTooltip } from 'obsidian';
import ObsidianAMapsPlugin from './main';
import { hasEnvFile } from './env-loader';

export type MapType = 'standard' | 'satellite' | 'hybrid';

export interface AMapSettings {
	apiKey: string;
	securityJsCode: string;
	defaultMapType: MapType;
}

export const DEFAULT_SETTINGS: AMapSettings = {
	apiKey: '',
	securityJsCode: '',
	defaultMapType: 'standard',
};

export class AMapSettingTab extends PluginSettingTab {
	plugin: ObsidianAMapsPlugin;

	constructor(app: App, plugin: ObsidianAMapsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

async display(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'AMap Configuration' });

		// Show .env status if using it
		if (this.plugin.envConfigLoaded) {
			const envNotice = containerEl.createDiv('amaps-env-notice');
			envNotice.style.cssText = 'background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; margin-bottom: 20px; border-radius: 4px;';
			envNotice.innerHTML = `
				<strong>✓ Using .env file</strong><br>
				API configuration loaded from vault root <code>.env</code> file.
				Settings below are read-only. Edit <code>.env</code> to change values.
			`;
		}

		// Check if .env file exists but wasn't loaded
		const envFileExists = await hasEnvFile(this.plugin.app.vault);
		if (envFileExists && !this.plugin.envConfigLoaded) {
			const envNotice = containerEl.createDiv('amaps-env-notice');
			envNotice.style.cssText = 'background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin-bottom: 20px; border-radius: 4px;';
			envNotice.innerHTML = `
				<strong>⚠ .env file found but empty</strong><br>
				Found <code>.env</code> file in vault root, but it doesn't contain AMap configuration.<br>
				Add <code>AMAP_API_KEY=your_key</code> and <code>AMAP_SECURITY_JS_CODE=your_code</code> to use it.
			`;
		}

		const isReadOnly = this.plugin.envConfigLoaded;

		// API Key setting
		new Setting(containerEl)
			.setName('API Key')
			.setDesc(isReadOnly
				? 'Loaded from .env file'
				: 'Your AMap (Gaode Maps) API Key. Get one at https://lbs.amap.com/dev/key')
			.addText(text => {
				text.setPlaceholder('Enter your API Key')
					.setValue(this.plugin.settings.apiKey);
				if (!isReadOnly) {
					text.onChange(async (value) => {
						this.plugin.settings.apiKey = value.trim();
						await this.plugin.saveSettings();
					});
				} else {
					text.inputEl.setAttribute('readonly', 'true');
				}
			});

		// Security Config setting
		new Setting(containerEl)
			.setName('Security Config')
			.setDesc(isReadOnly
				? 'Loaded from .env file'
				: 'Your AMap Security Config (安全密钥). Required for API keys created after Dec 2, 2021.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your Security Config')
					.setValue(this.plugin.settings.securityJsCode);
				if (!isReadOnly) {
					text.onChange(async (value) => {
						this.plugin.settings.securityJsCode = value.trim();
						await this.plugin.saveSettings();
					});
				} else {
					text.inputEl.setAttribute('readonly', 'true');
				}
			});

		// Default Map Type setting
		new Setting(containerEl)
			.setName('Default Map Type')
			.setDesc('The default map type to display.')
			.addDropdown(dropdown => dropdown
				.addOption('standard', 'Standard')
				.addOption('satellite', 'Satellite')
				.addOption('hybrid', 'Hybrid (Satellite + Labels)')
				.setValue(this.plugin.settings.defaultMapType)
				.onChange(async (value) => {
					this.plugin.settings.defaultMapType = value as MapType;
					await this.plugin.saveSettings();
				}));

		// Help section
		containerEl.createEl('h3', { text: 'Help', cls: 'setting-item-heading' });

		const helpEl = containerEl.createDiv('setting-item-description');
		helpEl.innerHTML = `
			<p><strong>How to get AMap API Key:</strong></p>
			<ol>
				<li>Go to <a href="https://lbs.amap.com/dev/key">AMap Developer Console</a></li>
				<li>Register or log in to your account</li>
				<li>Create a new application with "Web Platform (JS API)"</li>
				<li>Copy the Key and Security Config to the fields above</li>
			</ol>
			<p><strong>Note:</strong> Both API Key and Security Config are required for the plugin to work.</p>
		`;
	}
}
