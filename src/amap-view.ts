// Build number injected by esbuild
declare const BUILD_NUMBER: string;

import {
	BasesView,
	BasesPropertyId,
	debounce,
	Menu,
	QueryController,
	Value,
	StringValue,
	NullValue,
	ViewOption,
} from 'obsidian';
import type ObsidianAMapsPlugin from './main';
import { DEFAULT_MAP_HEIGHT, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './map/constants';
import { AMapPopupManager } from './map/popup';
import { AMapMarkerManager } from './map/markers';
import { hasOwnProperty, coordinateFromValue } from './map/utils';
import { loadAMap } from './amap-loader';
import type { MapType } from './settings';

interface MapConfig {
	coordinatesProp: BasesPropertyId | null;
	markerIconProp: BasesPropertyId | null;
	markerColorProp: BasesPropertyId | null;
	mapHeight: number;
	defaultZoom: number;
	center: [number, number];
	maxZoom: number;
	minZoom: number;
	mapType: MapType;
}

export const AMapViewType = 'map';

export class AMapView extends BasesView {
	type = AMapViewType;
	scrollEl: HTMLElement;
	containerEl: HTMLElement;
	mapEl: HTMLElement;
	plugin: ObsidianAMapsPlugin;

	// Internal rendering data
	private map: AMap.Map | null = null;
	private amapModule: typeof AMap | null = null;
	private mapConfig: MapConfig | null = null;
	private pendingMapState: { center?: [number, number], zoom?: number } | null = null;
	private isFirstLoad = true;
	private lastConfigSnapshot: string | null = null;
	private lastEvaluatedCenter: [number, number] = DEFAULT_MAP_CENTER;

	// Managers
	private popupManager: AMapPopupManager;
	private markerManager: AMapMarkerManager;
	private apiError: string | null = null;


	constructor(controller: QueryController, scrollEl: HTMLElement, plugin: ObsidianAMapsPlugin) {
		super(controller);
		this.scrollEl = scrollEl;
		this.plugin = plugin;
		this.containerEl = scrollEl.createDiv({ cls: 'bases-map-container is-loading', attr: { tabIndex: 0 } });
		this.mapEl = this.containerEl.createDiv('bases-map');

		// Initialize managers
		this.popupManager = new AMapPopupManager(this.containerEl, this.app);
		this.markerManager = new AMapMarkerManager(
			this.app,
			this.mapEl,
			this.popupManager,
			(path, newLeaf) => void this.app.workspace.openLinkText(path, '', newLeaf),
			() => this.data,
			() => this.mapConfig,
			(prop) => this.config.getDisplayName(prop)
		);
	}

	onload(): void {
		// No theme change listener needed - AMap handles its own style
	}

	onunload() {
		this.destroyMap();
	}

	/** Reduce flashing due to map re-rendering by debouncing while resizes are still occurring. */
	private onResizeDebounce = debounce(
		() => { if (this.map) this.map.getContainer().style.height = this.mapEl.clientHeight + 'px'; },
		100,
		true);

	onResize(): void {
		this.onResizeDebounce();
	}

	public focus(): void {
		this.containerEl.focus({ preventScroll: true });
	}

	private async initializeMap(): Promise<void> {
		if (this.map) return;

		// Check if API key is configured
		if (!this.plugin.settings.apiKey || !this.plugin.settings.securityJsCode) {
			this.apiError = 'Please configure AMap API Key and Security Config in plugin settings.';
			this.showError();
			return;
		}

		// Load config first
		this.mapConfig = this.loadConfig();

		// Set initial map height based on context
		const isEmbedded = this.isEmbedded();
		if (isEmbedded) {
			this.mapEl.style.height = this.mapConfig.mapHeight + 'px';
		} else {
			// Let CSS handle the height for direct base file views
			this.mapEl.style.height = '';
		}

		try {
			// Load AMap module
			this.amapModule = await loadAMap({
				apiKey: this.plugin.settings.apiKey,
				securityJsCode: this.plugin.settings.securityJsCode,
			});

			// Use GCJ-02 coordinates directly (AMap format: [lng, lat])
			const centerGcj02 = this.mapConfig.center;

			// Determine initial position: prefer ephemeral state if available, otherwise use config
			let initialCenter: [number, number] = centerGcj02;
			let initialZoom = this.mapConfig.defaultZoom;

			if (this.pendingMapState) {
				if (this.pendingMapState.center) {
					initialCenter = this.pendingMapState.center;
				}
				if (this.pendingMapState.zoom !== undefined && this.pendingMapState.zoom !== null) {
					initialZoom = this.pendingMapState.zoom;
				}
			}

			// Determine layers based on map type
			const layers = this.getMapLayers(this.mapConfig.mapType);

			// Create AMap instance
			this.map = new this.amapModule.Map(this.mapEl, {
				center: initialCenter,
				zoom: initialZoom,
				zooms: [this.mapConfig.minZoom, this.mapConfig.maxZoom],
				viewMode: '3D',
				layers: layers,
			});

			// Set map reference in managers
			this.popupManager.setMap(this.map, this.amapModule);
			this.markerManager.setMap(this.map, this.amapModule);

			// Add built-in controls
			this.map.addControl(new this.amapModule.ToolBar({
				position: 'RB',
			}));
			this.map.addControl(new this.amapModule.MapType({
				defaultType: this.getDefaultMapTypeIndex(this.mapConfig.mapType),
			}));
			this.map.addControl(new this.amapModule.Scale({
				position: 'LB',
			}));

			// Add build info label
			const buildLabel = document.createElement('div');
			buildLabel.className = 'amaps-build-label';
			buildLabel.textContent = 'AMaps v' + this.plugin.manifest.version + ' (Build: ' + BUILD_NUMBER + ')';
			buildLabel.style.cssText = 'position: absolute; bottom: 5px; left: 5px; background: rgba(0,0,0,0.5); color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; z-index: 1000; pointer-events: none;';
			this.mapEl.appendChild(buildLabel);

			// Prevent the native context menu on iOS long-press so AMap can handle
			// the touch gesture itself ( Obsidian workspace gestures won’t interfere ).
			this.mapEl.addEventListener('contextmenu', (evt) => {
				evt.preventDefault();
			}, { capture: true });

			// Add context menu to map
			this.map.on('rightclick', (e: any) => {
				this.showMapContextMenu(e);
			});

			// Handle map load complete
			this.map.on('complete', () => {
				this.containerEl.removeClass('is-loading');
			});

			// Ensure the center and zoom are set after map loads
			this.map.on('complete', () => {
				if (!this.map || !this.mapConfig) return;

				const hasConfiguredCenter = this.mapConfig.center[0] !== 0 || this.mapConfig.center[1] !== 0;
				const hasConfiguredZoom = this.config.get('defaultZoom') && typeof this.config.get('defaultZoom') === 'number';

				if (!this.pendingMapState) {
					if (hasConfiguredCenter) {
						// Use GCJ-02 coordinates directly
						this.map.setCenter(this.mapConfig.center);
					} else {
						const bounds = this.markerManager.getBounds();
						if (bounds) {
							this.map.setCenter(bounds.getCenter());
						}
					}

					if (hasConfiguredZoom) {
						this.map.setZoom(this.mapConfig.defaultZoom);
					} else {
						const bounds = this.markerManager.getBounds();
						if (bounds) {
							this.map.setFitView();
						}
					}
				}
			});

			// Hide tooltip on the map element
			this.mapEl.querySelector('canvas')?.style.setProperty('--no-tooltip', 'true');

			// Prevent Obsidian iOS swipe gestures from interfering with map panning.
			this.setupGestureInterception();

		} catch (error) {
			console.error('Failed to initialize map:', error);
			this.apiError = error instanceof Error ? error.message : 'Failed to load map';
			this.showError();
		}
	}

	private getMapLayers(mapType: MapType): AMap.TileLayer[] {
		if (!this.amapModule) return [];

		switch (mapType) {
			case 'satellite':
				return [new this.amapModule.TileLayer.Satellite()];
			case 'hybrid':
				return [
					new this.amapModule.TileLayer.Satellite(),
					new this.amapModule.TileLayer.RoadNet(),
				];
			case 'standard':
			default:
				return [];
		}
	}

	private getDefaultMapTypeIndex(mapType: MapType): number {
		switch (mapType) {
			case 'satellite':
				return 1;
			case 'hybrid':
				return 1; // Satellite with road net overlay
			case 'standard':
			default:
				return 0;
		}
	}

	private showError(): void {
		this.containerEl.removeClass('is-loading');
		this.containerEl.addClass('has-error');
		this.mapEl.empty();
		const errorEl = this.mapEl.createDiv('bases-map-error');
		errorEl.createEl('p', { text: 'Map Error' });
		errorEl.createEl('p', { text: this.apiError || 'Unknown error', cls: 'error-message' });
	}

	private destroyMap(): void {
		this.popupManager.destroy();
		if (this.map) {
			this.map.destroy();
			this.map = null;
		}
		this.markerManager.setMap(null, null);
		this.amapModule = null;
	}

	/**
	 * Prevent Obsidian iOS swipe gestures from interfering with map panning.
	 * Test version: CSS + mapEl touch stopPropagation only (no pointer capture).
	 */
	private setupGestureInterception(): void {
		this.mapEl.style.setProperty('touch-action', 'none', 'important');
		this.mapEl.style.setProperty('overscroll-behavior', 'none', 'important');

		this.mapEl.addEventListener('touchstart', (e) => {
			// Only stop propagation so Obsidian workspace gestures don’t fire.
			// Do NOT call preventDefault() here – it would block clicks on
			// map controls (e.g. the map-type checkbox) on iOS.
			e.stopPropagation();
		}, { passive: true });
		this.mapEl.addEventListener('touchmove', (e) => {
			e.stopPropagation();
			e.preventDefault();
		}, { passive: false });
	}

	public onDataUpdated(): void {
		this.containerEl.removeClass('is-loading');

		const configSnapshot = this.getConfigSnapshot();
		const configChanged = this.lastConfigSnapshot !== configSnapshot;

		this.mapConfig = this.loadConfig();

		// Check if the evaluated center coordinates have changed
		const centerChanged = this.mapConfig.center[0] !== this.lastEvaluatedCenter[0] ||
			this.mapConfig.center[1] !== this.lastEvaluatedCenter[1];

		void this.initializeMap().then(async () => {
			// Apply config to map on first load or when config changes
			if (configChanged) {
				await this.applyConfigToMap(this.lastConfigSnapshot, configSnapshot);
				this.lastConfigSnapshot = configSnapshot;
				this.isFirstLoad = false;
			}
			// Update center when the evaluated center coordinates change
			else if (this.map && !this.isFirstLoad && centerChanged && this.pendingMapState === null) {
				this.updateCenter();
			}

			if (this.map && this.data) {
				await this.markerManager.updateMarkers(this.data);

				// Apply pending map state if available (for restoring ephemeral state)
				if (this.pendingMapState && this.map) {
					const { center, zoom } = this.pendingMapState;
					if (center) {
						// Use GCJ-02 coordinates directly
						this.map.setCenter(center);
					}
					if (zoom !== null && zoom !== undefined) {
						this.map.setZoom(zoom);
					}
					this.pendingMapState = null;
				}
			}

			// Track state for next comparison
			if (this.mapConfig) {
				this.lastEvaluatedCenter = [this.mapConfig.center[0], this.mapConfig.center[1]];
			}
		});
	}

	private updateZoom(): void {
		if (!this.map || !this.mapConfig) return;

		const hasConfiguredZoom = this.config.get('defaultZoom') != null;
		if (hasConfiguredZoom) {
			this.map.setZoom(this.mapConfig.defaultZoom);
		}
	}

	private updateCenter(): void {
		if (!this.map || !this.mapConfig) return;

		const hasConfiguredCenter = this.mapConfig.center[0] !== 0 || this.mapConfig.center[1] !== 0;
		if (hasConfiguredCenter) {
			// Use GCJ-02 coordinates directly
			this.map.setCenter(this.mapConfig.center);
		}
	}

	private async applyConfigToMap(oldSnapshot: string | null, newSnapshot: string): Promise<void> {
		if (!this.map || !this.mapConfig) return;

		// Parse snapshots to detect specific changes
		const oldConfig = oldSnapshot ? JSON.parse(oldSnapshot) : null;
		const newConfig = JSON.parse(newSnapshot);

		// Detect what changed
		const centerConfigChanged = oldConfig?.center !== newConfig.center;
		const zoomConfigChanged = oldConfig?.defaultZoom !== newConfig.defaultZoom;
		const heightChanged = oldConfig?.mapHeight !== newConfig.mapHeight;

		// Note: AMap doesn't have setZooms method, zooms are set at initialization

		// Clamp current zoom to new min/max bounds
		const currentZoom = this.map.getZoom();
		if (currentZoom < this.mapConfig.minZoom) {
			this.map.setZoom(this.mapConfig.minZoom);
		} else if (currentZoom > this.mapConfig.maxZoom) {
			this.map.setZoom(this.mapConfig.maxZoom);
		}

		// Skip updating zoom/center if we have pending ephemeral state to restore
		const hasEphemeralState = this.pendingMapState !== null;

		// Only update zoom on first load or when zoom config explicitly changed
		if (!hasEphemeralState && (this.isFirstLoad || zoomConfigChanged)) {
			this.updateZoom();
		}

		// Update center on first load or when center config changed
		if (!hasEphemeralState && (this.isFirstLoad || centerConfigChanged)) {
			this.updateCenter();
		}

		// Update map height for embedded views if height changed
		if (this.isFirstLoad || heightChanged) {
			if (this.isEmbedded()) {
				this.mapEl.style.height = this.mapConfig.mapHeight + 'px';
			} else {
				this.mapEl.style.height = '';
			}
		}
	}

	isEmbedded(): boolean {
		// Check if this map view is embedded in a markdown file rather than opened directly
		let element = this.scrollEl.parentElement;
		while (element) {
			if (element.hasClass('bases-embed') || element.hasClass('block-language-base')) {
				return true;
			}
			element = element.parentElement;
		}
		return false;
	}

	private loadConfig(): MapConfig {
		// Load property configurations
		const coordinatesProp = this.config.getAsPropertyId('coordinates');
		const markerIconProp = this.config.getAsPropertyId('markerIcon');
		const markerColorProp = this.config.getAsPropertyId('markerColor');

		// Load numeric configurations with validation
		const minZoom = this.getNumericConfig('minZoom', 0, 0, 24);
		const maxZoom = this.getNumericConfig('maxZoom', 18, 0, 24);
		const defaultZoom = this.getNumericConfig('defaultZoom', DEFAULT_MAP_ZOOM, minZoom, maxZoom);

		// Load center coordinates
		const center = this.getCenterFromConfig();

		// Load map height for embedded views
		const mapHeight = this.isEmbedded()
			? this.getNumericConfig('mapHeight', DEFAULT_MAP_HEIGHT, 100, 2000)
			: DEFAULT_MAP_HEIGHT;

		// Load map type
		const mapType = this.config.get('mapType') as MapType || this.plugin.settings.defaultMapType;

		return {
			coordinatesProp,
			markerIconProp,
			markerColorProp,
			mapHeight,
			defaultZoom,
			center,
			maxZoom,
			minZoom,
			mapType,
		};
	}

	private getNumericConfig(key: string, defaultValue: number, min?: number, max?: number): number {
		const value = this.config.get(key);
		if (value == null || typeof value !== 'number') return defaultValue;

		let result = value;
		if (min !== undefined) result = Math.max(min, result);
		if (max !== undefined) result = Math.min(max, result);
		return result;
	}

	private getCenterFromConfig(): [number, number] {
		let centerConfig: Value;

		try {
			centerConfig = this.config.getEvaluatedFormula(this, 'center');
		} catch (error) {
			// Formula evaluation failed (e.g., this.file is null when no active file)
			// Fall back to raw config value
			const centerConfigStr = this.config.get('center');
			if (String.isString(centerConfigStr)) {
				centerConfig = new StringValue(centerConfigStr);
			} else {
				return DEFAULT_MAP_CENTER;
			}
		}

		// Support for legacy string format
		if (Value.equals(centerConfig, NullValue.value)) {
			const centerConfigStr = this.config.get('center');
			if (String.isString(centerConfigStr)) {
				centerConfig = new StringValue(centerConfigStr);
			} else {
				return DEFAULT_MAP_CENTER;
			}
		}
		return coordinateFromValue(centerConfig) || DEFAULT_MAP_CENTER;
	}

	private getConfigSnapshot(): string {
		// Create a snapshot of config values that affect map display
		return JSON.stringify({
			center: this.config.get('center'),
			defaultZoom: this.config.get('defaultZoom'),
			minZoom: this.config.get('minZoom'),
			maxZoom: this.config.get('maxZoom'),
			mapHeight: this.config.get('mapHeight'),
			mapType: this.config.get('mapType'),
		});
	}

	private showMapContextMenu(e: any): void {
		if (!this.map || !this.mapConfig) return;

		const currentZoom = Math.round(this.map.getZoom() * 10) / 10;

		// Get coordinates from the click event
		const clickLngLat = e.lnglat;
		if (!clickLngLat) return;

		// Use GCJ-02 coordinates directly (format: [lng, lat])
		const currentLng = Math.round(clickLngLat.getLng() * 100000) / 100000;
		const currentLat = Math.round(clickLngLat.getLat() * 100000) / 100000;

		// Get the original DOM event
		const originalEvent = e.originEvent?.originalEvent || e.originEvent || e;

		const menu = Menu.forEvent(originalEvent);
		menu.addItem(item => item
			.setTitle('New note')
			.setSection('action')
			.setIcon('square-pen')
			.onClick(() => {
				void this.createFileForView('', (frontmatter) => {
					// Pre-fill coordinates if a coordinates property is configured
					if (this.mapConfig?.coordinatesProp) {
						// Remove 'note.' prefix if present
						const propertyKey = this.mapConfig.coordinatesProp.startsWith('note.')
							? this.mapConfig.coordinatesProp.slice(5)
							: this.mapConfig.coordinatesProp;
						frontmatter[propertyKey] = [currentLng.toString(), currentLat.toString()];
					}
				});
			})
		);

		menu.addItem(item => item
			.setTitle('Copy coordinates')
			.setSection('action')
			.setIcon('copy')
			.onClick(() => {
				const coordString = `${currentLng}, ${currentLat}`;
				void navigator.clipboard.writeText(coordString);
			})
		);

		menu.addItem(item => item
			.setTitle('Set default center point')
			.setSection('action')
			.setIcon('map-pin')
			.onClick(() => {
				// Set the current center as the default coordinates
				const coordListStr = `[${currentLng}, ${currentLat}]`;

				// 1. Update the component's internal state immediately
				if (this.mapConfig) {
					this.mapConfig.center = [currentLng, currentLat];
				}

				// 2. Set the config value, which will be saved
				this.config.set('center', coordListStr);

				// 3. Immediately move the map for instant user feedback
				if (this.map) {
					this.map.setCenter(clickLngLat);
				}
			})
		);

		menu.addItem(item => item
			.setTitle(`Set default zoom (${currentZoom})`)
			.setSection('action')
			.setIcon('crosshair')
			.onClick(() => {
				this.config.set('defaultZoom', currentZoom);
			})
		);

		menu.showAtMouseEvent(originalEvent);
	}

	public setEphemeralState(state: unknown): void {
		if (!state) {
			this.pendingMapState = null;
			return;
		}

		this.pendingMapState = {};
		if (hasOwnProperty(state, 'center') && hasOwnProperty(state.center, 'lng') && hasOwnProperty(state.center, 'lat')) {
			const lng = state.center.lng;
			const lat = state.center.lat;

			if (typeof lng === 'number' && typeof lat === 'number') {
				// Store GCJ-02 coordinates directly (format: [lng, lat])
				this.pendingMapState.center = [lng, lat];
			}
		}
		if (hasOwnProperty(state, 'zoom') && typeof state.zoom === 'number') {
			this.pendingMapState.zoom = state.zoom;
		}
	}

	public getEphemeralState(): unknown {
		if (!this.map) return {};

		const center = this.map.getCenter();
		return {
			center: { lng: center.getLng(), lat: center.getLat() },
			zoom: this.map.getZoom(),
		};
	}

	static getViewOptions(): ViewOption[] {
		return [
			{
				displayName: 'Embedded height',
				type: 'slider',
				key: 'mapHeight',
				min: 200,
				max: 800,
				step: 20,
				default: DEFAULT_MAP_HEIGHT,
			},
			{
				displayName: 'Display',
				type: 'group',
				items: [
					{
						displayName: 'Center coordinates',
						type: 'formula',
						key: 'center',
						placeholder: '[longitude, latitude] (GCJ-02)',
					},
					{
						displayName: 'Default zoom',
						type: 'slider',
						key: 'defaultZoom',
						min: 1,
						max: 18,
						step: 1,
						default: DEFAULT_MAP_ZOOM,
					},
					{
						displayName: 'Minimum zoom',
						type: 'slider',
						key: 'minZoom',
						min: 0,
						max: 24,
						step: 1,
						default: 0,
					},
					{
						displayName: 'Maximum zoom',
						type: 'slider',
						key: 'maxZoom',
						min: 0,
						max: 24,
						step: 1,
						default: 18,
					},
				]
			},
			{
				displayName: 'Markers',
				type: 'group',
				items: [
					{
						displayName: 'Marker coordinates',
						type: 'property',
						key: 'coordinates',
						filter: prop => !prop.startsWith('file.'),
						placeholder: 'Property',
					},
					{
						displayName: 'Marker icon',
						type: 'property',
						key: 'markerIcon',
						filter: prop => !prop.startsWith('file.'),
						placeholder: 'Property',
					},
					{
						displayName: 'Marker color',
						type: 'property',
						key: 'markerColor',
						filter: prop => !prop.startsWith('file.'),
						placeholder: 'Property',
					},
				]
			},
			{
				displayName: 'Map Type',
				type: 'group',
				items: [
					{
						displayName: 'Default map type',
						type: 'text',
						key: 'mapType',
						placeholder: 'standard, satellite, or hybrid',
						default: 'standard',
					},
				]
			},
		];
	}
}
