import { App, BasesEntry, BasesPropertyId, Keymap, Menu, setIcon } from 'obsidian';
import { MapMarker } from './types';
import { coordinateFromValue } from './utils';
import { AMapPopupManager } from './popup';

export class AMapMarkerManager {
	private map: AMap.Map | null = null;
	private amapModule: typeof AMap | null = null;
	private app: App;
	private mapEl: HTMLElement;
	private markers: AMap.Marker[] = [];
	private markerData: MapMarker[] = [];
	private popupManager: AMapPopupManager;
	private onOpenFile: (path: string, newLeaf: boolean) => void;
	private getData: () => any;
	private getMapConfig: () => any;
	private getDisplayName: (prop: BasesPropertyId) => string;

	constructor(
		app: App,
		mapEl: HTMLElement,
		popupManager: AMapPopupManager,
		onOpenFile: (path: string, newLeaf: boolean) => void,
		getData: () => any,
		getMapConfig: () => any,
		getDisplayName: (prop: BasesPropertyId) => string
	) {
		this.app = app;
		this.mapEl = mapEl;
		this.popupManager = popupManager;
		this.onOpenFile = onOpenFile;
		this.getData = getData;
		this.getMapConfig = getMapConfig;
		this.getDisplayName = getDisplayName;
	}

	setMap(map: AMap.Map | null, amapModule: typeof AMap | null): void {
		this.map = map;
		this.amapModule = amapModule;
	}

	getMarkers(): MapMarker[] {
		return this.markerData;
	}

	getBounds(): AMap.Bounds | null {
		if (!this.map || this.markers.length === 0) return null;

		let southWest: AMap.LngLat | null = null;
		let northEast: AMap.LngLat | null = null;

		for (const marker of this.markers) {
			const pos = marker.getPosition();
			if (!pos) continue;

			if (!southWest) {
				southWest = new this.amapModule!.LngLat(pos.getLng(), pos.getLat());
				northEast = new this.amapModule!.LngLat(pos.getLng(), pos.getLat());
			} else if (southWest && northEast) {
				southWest = new this.amapModule!.LngLat(
					Math.min(southWest.getLng(), pos.getLng()),
					Math.min(southWest.getLat(), pos.getLat())
				);
				northEast = new this.amapModule!.LngLat(
					Math.max(northEast.getLng(), pos.getLng()),
					Math.max(northEast.getLat(), pos.getLat())
				);
			}
		}

		if (southWest && northEast) {
			return new this.amapModule!.Bounds(southWest, northEast);
		}
		return null;
	}

	clearMarkers(): void {
		if (!this.map) return;

		for (const marker of this.markers) {
			marker.setMap(null);
		}
		this.markers = [];
		this.markerData = [];
	}

	async updateMarkers(data: { data: BasesEntry[] }): Promise<void> {
		const mapConfig = this.getMapConfig();
		if (!this.map || !this.amapModule || !data || !mapConfig || !mapConfig.coordinatesProp) {
			return;
		}

		// Clear existing markers
		this.clearMarkers();

		// Collect valid marker data
		const validMarkers: MapMarker[] = [];
		for (const entry of data.data) {
			if (!entry) continue;

			let coordinates: [number, number] | null = null;
			try {
				const value = entry.getValue(mapConfig.coordinatesProp);
				coordinates = coordinateFromValue(value);
			} catch (error) {
				console.error(`Error extracting coordinates for ${entry.file.name}:`, error);
			}

			if (coordinates) {
				validMarkers.push({
					entry,
					coordinates,
				});
			}
		}

		this.markerData = validMarkers;

		// Create markers
		for (const markerData of validMarkers) {
			await this.createMarker(markerData);
		}
	}

	private async createMarker(markerData: MapMarker): Promise<void> {
		if (!this.map || !this.amapModule) return;

		const [lat, lng] = markerData.coordinates;
		// Convert WGS-84 to GCJ-02 for AMap
		const gcj02Coord = this.wgs84ToGcj02([lat, lng]);

		// Create icon
		const icon = await this.createIcon(markerData.entry);

		// Create marker
		const marker = new this.amapModule.Marker({
			position: gcj02Coord,
			icon: icon,
			title: markerData.entry.file.name,
			extData: { markerData }
		});

		// Set up event handlers
		marker.on('click', (e: any) => {
			const originalEvent = e?.originEvent?.originalEvent || e?.originalEvent;
			const newLeaf = originalEvent ? Boolean(Keymap.isModEvent(originalEvent)) : false;
			this.onOpenFile(markerData.entry.file.path, newLeaf);
		});

		marker.on('mouseover', () => {
			this.onMarkerHover(markerData);
		});

		marker.on('mouseout', () => {
			this.popupManager.hidePopup();
		});

		// Handle right-click context menu
		marker.on('rightclick', (e: any) => {
			this.onMarkerRightClick(markerData, e);
		});

		// Handle hover for link preview
		marker.on('mouseover', (e: any) => {
			this.app.workspace.trigger('hover-link', {
				event: e?.originEvent?.originalEvent || e?.originalEvent,
				source: 'bases',
				hoverParent: this.app.renderContext,
				targetEl: this.mapEl,
				linktext: markerData.entry.file.path,
			});
		});

		marker.setMap(this.map);
		this.markers.push(marker);
	}

	private async createIcon(entry: BasesEntry): Promise<AMap.Icon | string> {
		if (!this.amapModule) return '';

		const iconName = this.getCustomIcon(entry);
		const color = this.getCustomColor(entry) || 'var(--bases-map-marker-background)';

		// Generate icon image using canvas
		const iconUrl = await this.generateIconImage(iconName, color);

		return new this.amapModule.Icon({
			size: new this.amapModule.Size(24, 24),
			image: iconUrl,
			imageSize: new this.amapModule.Size(24, 24)
		});
	}

	private async generateIconImage(iconName: string | null, color: string): Promise<string> {
		// Resolve CSS variables to actual color values
		const resolvedColor = this.resolveColor(color);
		const resolvedIconColor = this.resolveColor('var(--bases-map-marker-icon-color)');

		// Create a high-resolution canvas for crisp rendering on retina displays
		const scale = 4;
		const size = 24 * scale;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			return '';
		}

		// Enable high-quality rendering
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';

		// Draw the circle background
		const centerX = size / 2;
		const centerY = size / 2;
		const radius = 8 * scale;

		ctx.fillStyle = resolvedColor;
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
		ctx.fill();

		// Add subtle border
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.lineWidth = 1 * scale;
		ctx.stroke();

		// Draw the icon or dot
		if (iconName) {
			// Load and draw custom icon
			const iconDiv = createDiv();
			setIcon(iconDiv, iconName);
			const svgEl = iconDiv.querySelector('svg');

			if (svgEl) {
				svgEl.setAttribute('stroke', 'currentColor');
				svgEl.setAttribute('fill', 'none');
				svgEl.setAttribute('stroke-width', '2');
				svgEl.style.color = resolvedIconColor;

				const svgString = new XMLSerializer().serializeToString(svgEl);
				const iconImg = new Image();
				iconImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

				await new Promise<void>((resolve, reject) => {
					iconImg.onload = () => {
						// Draw icon centered
						const iconSize = radius * 1.2;
						ctx.drawImage(
							iconImg,
							centerX - iconSize / 2,
							centerY - iconSize / 2,
							iconSize,
							iconSize
						);
						resolve();
					};
					iconImg.onerror = reject;
				});
			}
		} else {
			// Draw a dot
			const dotRadius = 3 * scale;
			ctx.fillStyle = resolvedIconColor;
			ctx.beginPath();
			ctx.arc(centerX, centerY, dotRadius, 0, 2 * Math.PI);
			ctx.fill();
		}

		// Convert canvas to data URL
		return canvas.toDataURL('image/png');
	}

	private resolveColor(color: string): string {
		// Create a temporary element to resolve CSS variables
		const tempEl = document.createElement('div');
		tempEl.style.color = color;
		tempEl.style.display = 'none';
		document.body.appendChild(tempEl);

		// Get the computed color value
		const computedColor = getComputedStyle(tempEl).color;

		// Clean up
		tempEl.remove();

		return computedColor;
	}

	private getCustomIcon(entry: BasesEntry): string | null {
		const mapConfig = this.getMapConfig();
		if (!mapConfig || !mapConfig.markerIconProp) return null;

		try {
			const value = entry.getValue(mapConfig.markerIconProp);
			if (!value || !value.isTruthy()) return null;

			const iconString = value.toString().trim();

			// Handle null/empty/invalid cases
			if (!iconString || iconString.length === 0 || iconString === 'null' || iconString === 'undefined') {
				return null;
			}

			return iconString;
		} catch (error) {
			console.warn(`Could not extract icon for ${entry.file.name}`);
			return null;
		}
	}

	private getCustomColor(entry: BasesEntry): string | null {
		const mapConfig = this.getMapConfig();
		if (!mapConfig || !mapConfig.markerColorProp) return null;

		try {
			const value = entry.getValue(mapConfig.markerColorProp);
			if (!value || !value.isTruthy()) return null;

			const colorString = value.toString().trim();
			return colorString;
		} catch (error) {
			console.warn(`Could not extract color for ${entry.file.name}`);
			return null;
		}
	}

	private onMarkerHover(markerData: MapMarker): void {
		const data = this.getData();
		const mapConfig = this.getMapConfig();
		if (data && data.properties && mapConfig) {
			this.popupManager.showPopup(
				markerData.entry,
				markerData.coordinates,
				data.properties,
				mapConfig.coordinatesProp,
				mapConfig.markerIconProp,
				mapConfig.markerColorProp,
				this.getDisplayName
			);
		}
	}

	private onMarkerRightClick(markerData: MapMarker, e: any): void {
		const [lat, lng] = markerData.coordinates;
		const file = markerData.entry.file;

		// Get the original DOM event
		const originalEvent = e?.originEvent?.originalEvent || e?.originalEvent || e;

		const menu = Menu.forEvent(originalEvent);
		this.app.workspace.handleLinkContextMenu(menu, file.path, '');

		// Add copy coordinates option
		menu.addItem(item => item
			.setSection('action')
			.setTitle('Copy coordinates')
			.setIcon('map-pin')
			.onClick(() => {
				const coordString = `${lat}, ${lng}`;
				void navigator.clipboard.writeText(coordString);
			}));

		menu.addItem(item => item
			.setSection('danger')
			.setTitle('Delete file')
			.setIcon('trash-2')
			.setWarning(true)
			.onClick(() => this.app.fileManager.promptForDeletion(file)));

		menu.showAtMouseEvent(originalEvent);
	}

	/**
	 * WGS-84 to GCJ-02 coordinate conversion (Mars Coordinate System)
	 */
	private wgs84ToGcj02([lat, lng]: [number, number]): [number, number] {
		// China's approximate bounds
		if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
			return [lat, lng];
		}

		let dlat = this.transformLat(lng - 105.0, lat - 35.0);
		let dlng = this.transformLng(lng - 105.0, lat - 35.0);
		const radlat = lat / 180.0 * Math.PI;
		let magic = Math.sin(radlat);
		magic = 1 - 0.00669342162296594323 * magic * magic;
		const sqrtmagic = Math.sqrt(magic);
		dlat = (dlat * 180.0) / ((6378245.0 * (1 - 0.00669342162296594323)) / (magic * sqrtmagic) * Math.PI);
		dlng = (dlng * 180.0) / (6378245.0 / sqrtmagic * Math.cos(radlat) * Math.PI);
		const mglat = lat + dlat;
		const mglng = lng + dlng;

		return [mglat, mglng];
	}

	private transformLat(lng: number, lat: number): number {
		let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
		ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
		ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
		ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
		return ret;
	}

	private transformLng(lng: number, lat: number): number {
		let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
		ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
		ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
		ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
		return ret;
	}
}
