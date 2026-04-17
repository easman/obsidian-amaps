import { load as AMapLoaderLoad } from '@amap/amap-jsapi-loader';
import { Notice } from 'obsidian';

export interface AMapConfig {
	apiKey: string;
	securityJsCode: string;
}

declare global {
	interface Window {
		_AMapSecurityConfig?: {
			securityJsCode: string;
		};
	}
}

let amapModulePromise: Promise<typeof AMap> | null = null;

/**
 * Load AMap JavaScript API with the given configuration.
 * This function caches the loaded module to avoid multiple loads.
 */
export async function loadAMap(config: AMapConfig): Promise<typeof AMap> {
	if (amapModulePromise) {
		return amapModulePromise;
	}

	if (!config.apiKey || config.apiKey.trim() === '') {
		throw new Error('AMap API Key is not configured. Please configure it in plugin settings.');
	}

	if (!config.securityJsCode || config.securityJsCode.trim() === '') {
		throw new Error('AMap Security Config is not configured. Please configure it in plugin settings.');
	}

	amapModulePromise = AMapLoaderLoad({
		key: config.apiKey,
		version: '2.0',
		plugins: ['AMap.ToolBar', 'AMap.Scale', 'AMap.InfoWindow']
	});

	// Set security config before loading
	window._AMapSecurityConfig = {
		securityJsCode: config.securityJsCode,
	};

	try {
		const AMap = await amapModulePromise;
		return AMap;
	} catch (error) {
		amapModulePromise = null;
		console.error('Failed to load AMap:', error);
		throw new Error(
			'Failed to load AMap API. Please check your API Key and Security Config. ' +
			'Error: ' + (error instanceof Error ? error.message : String(error))
		);
	}
}

/**
 * Clear the cached AMap module to force a reload on next use.
 */
export function clearAMapCache(): void {
	amapModulePromise = null;
}

/**
 * Check if AMap is already loaded.
 */
export function isAMapLoaded(): boolean {
	return amapModulePromise !== null;
}
