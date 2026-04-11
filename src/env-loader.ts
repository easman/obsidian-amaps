import { TFile } from 'obsidian';

export interface EnvConfig {
	AMAP_API_KEY?: string;
	AMAP_SECURITY_JS_CODE?: string;
}

/**
 * Load environment variables from .env file in vault root
 * File format:
 *   AMAP_API_KEY=your_api_key_here
 *   AMAP_SECURITY_JS_CODE=your_security_code_here
 */
export async function loadEnvFromVault(vault: any): Promise<EnvConfig> {
	const config: EnvConfig = {};

	try {
		// Try to read .env file from vault root
		const envFile = vault.getAbstractFileByPath('.env');
		if (envFile instanceof TFile) {
			const content = await vault.read(envFile);
			const lines = content.split('\n');

			for (const line of lines) {
				const trimmed = line.trim();
				// Skip comments and empty lines
				if (!trimmed || trimmed.startsWith('#')) continue;

				const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
				if (match) {
					const [, key, value] = match;
					const cleanValue = value.replace(/^["']|["']$/g, '').trim();

					if (key === 'AMAP_API_KEY') {
						config.AMAP_API_KEY = cleanValue;
					} else if (key === 'AMAP_SECURITY_JS_CODE') {
						config.AMAP_SECURITY_JS_CODE = cleanValue;
					}
				}
			}
		}
	} catch (error) {
		// .env file doesn't exist or can't be read
		console.log('[AMaps] .env file not found or not readable');
	}

	return config;
}

/**
 * Check if .env file exists in vault root
 */
export function hasEnvFile(vault: any): boolean {
	try {
		const envFile = vault.getAbstractFileByPath('.env');
		return envFile instanceof TFile;
	} catch {
		return false;
	}
}
