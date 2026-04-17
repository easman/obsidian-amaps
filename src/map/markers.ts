import { App, BasesEntry, BasesPropertyId, Keymap, Menu, setIcon } from 'obsidian';
import { MapMarker } from './types';
import { coordinateFromValue } from './utils';
import { AMapPopupManager } from './popup';

export class AMapMarkerManager {
	private map: AMap.Map | null = null;
	private amapModule: typeof AMap | null = null;
	private app: App;
	private mapEl: HTMLElement;
	private labelMarkers: AMap.LabelMarker[] = [];
	private markerData: MapMarker[] = [];
	private labelsLayer: AMap.LabelsLayer | null = null;
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

		// Clean up old labels layer
		if (this.labelsLayer) {
			if (this.map) {
				this.map.remove(this.labelsLayer);
			}
			this.labelsLayer = null;
		}

		// Create new labels layer if map is available
		if (map && amapModule) {
			this.labelsLayer = new amapModule.LabelsLayer({
				zooms: [3, 20],
				zIndex: 1000,
				collision: false,
				allowCollision: true,
			});
			map.add(this.labelsLayer);
		}
	}

	getMarkers(): MapMarker[] {
		return this.markerData;
	}

	getBounds(): AMap.Bounds | null {
		if (!this.map || !this.amapModule || this.markerData.length === 0) return null;

		let southWest: AMap.LngLat | null = null;
		let northEast: AMap.LngLat | null = null;

		for (const markerData of this.markerData) {
			const [lng, lat] = markerData.coordinates;

			if (!southWest) {
				southWest = new this.amapModule.LngLat(lng, lat);
				northEast = new this.amapModule.LngLat(lng, lat);
			} else if (southWest && northEast) {
				southWest = new this.amapModule.LngLat(
					Math.min(southWest.getLng(), lng),
					Math.min(southWest.getLat(), lat)
				);
				northEast = new this.amapModule.LngLat(
					Math.max(northEast.getLng(), lng),
					Math.max(northEast.getLat(), lat)
				);
			}
		}

		if (southWest && northEast) {
			return new this.amapModule.Bounds(southWest, northEast);
		}
		return null;
	}

	clearMarkers(): void {
		if (this.labelsLayer) {
			this.labelsLayer.clear();
		}
		this.labelMarkers = [];
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
			await this.createLabelMarker(markerData);
		}
	}

	private async createLabelMarker(markerData: MapMarker): Promise<void> {
		if (!this.map || !this.amapModule || !this.labelsLayer) {
			return;
		}

		// Use GCJ-02 coordinates directly (format: [lng, lat])
		const amapPosition: [number, number] = markerData.coordinates;

		// Generate icon image using canvas (LabelMarker requires actual image size match)
		const iconName = this.getCustomIcon(markerData.entry);
		const color = this.getCustomColor(markerData.entry) || 'var(--bases-map-marker-background)';
		const iconUrl = await this.generateIconImage(iconName, color);

		// Get document title (without .md) and color for label
		const title = markerData.entry.file.basename || markerData.entry.file.name.replace(/\.md$/, '');
		const labelColor = this.getCustomColor(markerData.entry) || '#2e5c8a';

		// LabelMarker's canvas text measure doesn't handle emoji widths correctly,
		// causing oversized background borders. Strip emoji for the label content.
		const labelTitle = title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{2B50}\u{FE0F}]/gu, '');

		// Create label marker
		const labelMarker = new this.amapModule.LabelMarker({
			name: markerData.entry.file.name,
			position: amapPosition,
			zIndex: 10,
			icon: {
				type: 'image',
				image: iconUrl,
				size: [24, 24],
				anchor: 'center',
			},
			text: {
				content: labelTitle,
				direction: 'right',
				offset: [-2, -2],
				style: {
					fontSize: 12,
					fillColor: labelColor,
					strokeColor: '#ffffff',
					strokeWidth: 2,
					backgroundColor: 'rgba(255, 255, 255, 0.9)',
					borderColor: labelColor,
					borderWidth: 1,
					padding: '2, 4',
				},
			},
		});

		// Set up event handlers
		labelMarker.on('click', (e: any) => {
			const originalEvent = e?.originEvent?.originalEvent || e?.originalEvent;
			const newLeaf = originalEvent ? Boolean(Keymap.isModEvent(originalEvent)) : false;
			this.onOpenFile(markerData.entry.file.path, newLeaf);
		});

		labelMarker.on('mouseover', (e: any) => {
			this.onMarkerHover(markerData);
			const event = e?.originEvent || e;
			if (event) {
				this.app.workspace.trigger('hover-link', {
					event,
					source: 'bases',
					hoverParent: this.mapEl,
					targetEl: this.mapEl,
					linktext: markerData.entry.file.path,
				});
			}
		});

		labelMarker.on('mouseout', () => {
			this.popupManager.hidePopup();
		});

		// Handle right-click context menu
		labelMarker.on('rightclick', (e: any) => {
			this.onMarkerRightClick(markerData, e);
		});

		this.labelsLayer.add(labelMarker);
		this.labelMarkers.push(labelMarker);
	}

	private async generateIconImage(iconName: string | null, color: string): Promise<string> {
		// Resolve CSS variables to actual color values
		const resolvedColor = this.resolveColor(color);
		const resolvedIconColor = this.resolveColor('var(--bases-map-marker-icon-color)');

		// LabelMarker requires icon image actual size to match configured size, so use 24x24 directly
		const size = 24;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			return '';
		}

		// Draw the circle background
		const centerX = size / 2;
		const centerY = size / 2;
		const radius = 8;

		ctx.fillStyle = resolvedColor;
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
		ctx.fill();

		// Add subtle border
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.lineWidth = 1;
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
			const dotRadius = 3;
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
		const [lng, lat] = markerData.coordinates;
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
				const coordString = `${lng}, ${lat}`;
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
}
