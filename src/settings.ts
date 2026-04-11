import { App, Modal, Notice, PluginSettingTab, Setting, setIcon, setTooltip } from 'obsidian';
import ObsidianAMapsPlugin from './main';

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

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'AMap Configuration' });

		// API Key setting
		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your AMap (Gaode Maps) API Key. Get one at https://lbs.amap.com/dev/key')
			.addText(text => text
				.setPlaceholder('Enter your API Key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value.trim();
					await this.plugin.saveSettings();
				}));

		// Security Config setting
		new Setting(containerEl)
			.setName('Security Config')
			.setDesc('Your AMap Security Config (安全密钥). Required for API keys created after Dec 2, 2021.')
			.addText(text => {
				text.inputEl.type = 'password';
				text.setPlaceholder('Enter your Security Config')
					.setValue(this.plugin.settings.securityJsCode)
					.onChange(async (value) => {
						this.plugin.settings.securityJsCode = value.trim();
						await this.plugin.saveSettings();
					});
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
