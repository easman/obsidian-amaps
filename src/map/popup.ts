import { App, BasesEntry, BasesPropertyId, ListValue, Value } from 'obsidian';

export class AMapPopupManager {
	private map: AMap.Map | null = null;
	private amapModule: typeof AMap | null = null;
	private infoWindow: AMap.InfoWindow | null = null;
	private popupHideTimeout: number | null = null;
	private popupHideTimeoutWin: Window | null = null;
	private containerEl: HTMLElement;
	private app: App;

	constructor(containerEl: HTMLElement, app: App) {
		this.containerEl = containerEl;
		this.app = app;
	}

	setMap(map: AMap.Map | null, amapModule: typeof AMap | null): void {
		this.map = map;
		this.amapModule = amapModule;
		if (this.infoWindow) {
			this.infoWindow.close();
			this.infoWindow = null;
		}
	}

	showPopup(
		entry: BasesEntry,
		coordinates: [number, number],
		properties: BasesPropertyId[],
		coordinatesProp: BasesPropertyId | null,
		markerIconProp: BasesPropertyId | null,
		markerColorProp: BasesPropertyId | null,
		getDisplayName: (prop: BasesPropertyId) => string
	): void {
		if (!this.map || !this.amapModule) return;

		// Only show popup if there are properties to display
		if (!properties || properties.length === 0 || !this.hasAnyPropertyValues(entry, properties, coordinatesProp, markerIconProp, markerColorProp)) {
			return;
		}

		this.clearPopupHideTimeout();

		// Create or update info window
		const popupContent = this.createPopupContent(entry, properties, coordinatesProp, markerIconProp, markerColorProp, getDisplayName);

		if (!this.infoWindow) {
			this.infoWindow = new this.amapModule.InfoWindow({
				content: popupContent,
				offset: new this.amapModule.Pixel(0, -30),
				closeWhenClickMap: false
			});

			// Add hover handlers to prevent closing when hovering over popup
			this.infoWindow.on('open', () => {
				const popupEl = this.infoWindow?.getContent() as HTMLElement | null;
				if (popupEl && popupEl.parentElement) {
					popupEl.parentElement.addEventListener('mouseenter', () => {
						this.clearPopupHideTimeout();
					});
					popupEl.parentElement.addEventListener('mouseleave', () => {
						this.hidePopup();
					});
				}
			});
		} else {
			this.infoWindow.setContent(popupContent);
		}

		// Convert coordinates from WGS-84 to GCJ-02 for AMap
		const [lat, lng] = coordinates;
		const gcj02Coord = wgs84ToGcj02Internal([lat, lng]);

		this.infoWindow.open(this.map, gcj02Coord);
	}

	hidePopup(): void {
		this.clearPopupHideTimeout();

		const win = this.popupHideTimeoutWin = this.containerEl.win;
		this.popupHideTimeout = win.setTimeout(() => {
			if (this.infoWindow) {
				this.infoWindow.close();
			}
			this.popupHideTimeout = null;
			this.popupHideTimeoutWin = null;
		}, 150); // Small delay to allow moving to popup
	}

	clearPopupHideTimeout(): void {
		if (this.popupHideTimeout) {
			const win = this.popupHideTimeoutWin || this.containerEl.win;
			win.clearTimeout(this.popupHideTimeout);
		}

		this.popupHideTimeoutWin = null;
		this.popupHideTimeout = null;
	}

	destroy(): void {
		this.clearPopupHideTimeout();
		if (this.infoWindow) {
			this.infoWindow.close();
			this.infoWindow = null;
		}
	}

	private createPopupContent(
		entry: BasesEntry,
		properties: BasesPropertyId[],
		coordinatesProp: BasesPropertyId | null,
		markerIconProp: BasesPropertyId | null,
		markerColorProp: BasesPropertyId | null,
		getDisplayName: (prop: BasesPropertyId) => string
	): HTMLElement {
		const containerEl = createDiv('bases-map-popup');

		// Get properties that have values
		const propertiesSlice = properties.slice(0, 20); // Max 20 properties
		const propertiesWithValues: { prop: BasesPropertyId; value: Value }[] = [];

		for (const prop of propertiesSlice) {
			if (prop === coordinatesProp || prop === markerIconProp || prop === markerColorProp) continue;

			try {
				const value = entry.getValue(prop);
				if (value && this.hasNonEmptyValue(value)) {
					propertiesWithValues.push({ prop, value });
				}
			} catch {
				// Skip properties that can't be rendered
			}
		}

		// Use first property as title (still acts as a link to the file)
		if (propertiesWithValues.length > 0) {
			const firstProperty = propertiesWithValues[0];
			const titleEl = containerEl.createDiv('bases-map-popup-title');

			// Create a clickable link that opens the file
			const titleLinkEl = titleEl.createEl('a', {
				href: entry.file.path,
				cls: 'internal-link'
			});

			// Render the first property value inside the link
			firstProperty.value.renderTo(titleLinkEl, this.app.renderContext);

			// Show remaining properties (excluding the first one used as title)
			const remainingProperties = propertiesWithValues.slice(1);
			if (remainingProperties.length > 0) {
				const propContainerEl = containerEl.createDiv('bases-map-popup-properties');
				for (const { prop, value } of remainingProperties) {
					const propEl = propContainerEl.createDiv('bases-map-popup-property');
					const labelEl = propEl.createDiv('bases-map-popup-property-label');
					labelEl.textContent = getDisplayName(prop);
					const valueEl = propEl.createDiv('bases-map-popup-property-value');
					value.renderTo(valueEl, this.app.renderContext);
				}
			}
		}

		return containerEl;
	}

	private hasNonEmptyValue(value: Value): boolean {
		if (!value || !value.isTruthy()) return false;

		// Handle ListValue - check if it has any non-empty items
		if (value instanceof ListValue) {
			for (let i = 0; i < value.length(); i++) {
				const item = value.get(i);
				if (item && this.hasNonEmptyValue(item)) {
					return true;
				}
			}
			return false;
		}

		return true;
	}

	private hasAnyPropertyValues(
		entry: BasesEntry,
		properties: BasesPropertyId[],
		coordinatesProp: BasesPropertyId | null,
		markerIconProp: BasesPropertyId | null,
		markerColorProp: BasesPropertyId | null
	): boolean {
		const propertiesSlice = properties.slice(0, 20); // Max 20 properties

		for (const prop of propertiesSlice) {
			if (prop === coordinatesProp || prop === markerIconProp || prop === markerColorProp) continue;

			try {
				const value = entry.getValue(prop);
				if (value && this.hasNonEmptyValue(value)) {
					return true;
				}
			} catch {
				// Skip properties that can't be rendered
			}
		}

		return false;
	}
}

/**
 * Internal WGS-84 to GCJ-02 conversion for popup positioning
 * Simplified version for use within this module
 */
function wgs84ToGcj02Internal([lat, lng]: [number, number]): [number, number] {
	// China's approximate bounds
	if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
		return [lat, lng];
	}

	let dlat = transformLat(lng - 105.0, lat - 35.0);
	let dlng = transformLng(lng - 105.0, lat - 35.0);
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

function transformLat(lng: number, lat: number): number {
	let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
	ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
	ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0;
	ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0;
	return ret;
}

function transformLng(lng: number, lat: number): number {
	let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
	ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0;
	ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0;
	ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0;
	return ret;
}
