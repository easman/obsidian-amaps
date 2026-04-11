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
		// Method 1: Try using adapter API (works with iCloud and special paths)
		const adapter = vault.adapter;
		const envPath = vault.configDir + '/../.env';

		if (await adapter.exists(envPath)) {
			const content = await adapter.read(envPath);
			return parseEnvContent(content);
		}

		// Method 2: Fallback to getAbstractFileByPath
		const envFile = vault.getAbstractFileByPath('.env');
		if (envFile instanceof TFile) {
			const content = await vault.read(envFile);
			return parseEnvContent(content);
		}
	} catch (error) {
		// .env file doesn't exist or can't be read
		console.log('[AMaps] .env file not found or not readable:', error);
	}

	return config;
}

/**
 * Parse .env file content
 */
function parseEnvContent(content: string): EnvConfig {
	const config: EnvConfig = {};
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

	return config;
}

/**
 * Check if .env file exists in vault root
 */
export async function hasEnvFile(vault: any): Promise<boolean> {
	try {
		// Method 1: Check using adapter
		const envPath = vault.configDir + '/../.env';
		if (await vault.adapter.exists(envPath)) {
			return true;
		}

		// Method 2: Check using getAbstractFileByPath
		const envFile = vault.getAbstractFileByPath('.env');
		return envFile instanceof TFile;
	} catch {
		return false;
	}
}
