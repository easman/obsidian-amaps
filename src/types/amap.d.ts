// Type declarations for AMap (Gaode Maps) JavaScript API 2.0
// This is a minimal type definition for the features used in this plugin

declare namespace AMap {
	class Map {
		constructor(container: string | HTMLElement, opts?: MapOptions);
		addControl(control: any): void;
		removeControl(control: any): void;
		add(overlay: Overlay): void;
		remove(overlay: Overlay): void;
		setCenter(center: [number, number] | LngLat): void;
		getCenter(): LngLat;
		setZoom(zoom: number): void;
		getZoom(): number;
		setZoomAndCenter(zoom: number, center: [number, number] | LngLat): void;
		setFitView(overlayList?: Overlay[]): void;
		getBounds(): Bounds;
		on(event: string, callback: (e?: any) => void): void;
		off(event: string, callback: (e?: any) => void): void;
		destroy(): void;
		getContainer(): HTMLElement;
	}

	interface MapOptions {
		center?: [number, number] | LngLat;
		zoom?: number;
		zooms?: [number, number];
		viewMode?: '2D' | '3D';
		layers?: TileLayer[];
		mapStyle?: string;
		resizeEnable?: boolean;
		dragEnable?: boolean;
		zoomEnable?: boolean;
		doubleClickZoom?: boolean;
	}

	class LngLat {
		constructor(lng: number, lat: number);
		lng: number;
		lat: number;
		getLng(): number;
		getLat(): number;
	}

	class Bounds {
		constructor(southWest: LngLat, northEast: LngLat);
		contains(point: LngLat): boolean;
		getCenter(): LngLat;
		getSouthWest(): LngLat;
		getNorthEast(): LngLat;
	}

	class Pixel {
		constructor(x: number, y: number);
		x: number;
		y: number;
		getX(): number;
		getY(): number;
	}

	class Size {
		constructor(width: number, height: number);
		width: number;
		height: number;
		getWidth(): number;
		getHeight(): number;
	}

	class Marker implements Overlay {
		constructor(opts: MarkerOptions);
		setPosition(position: [number, number] | LngLat): void;
		getPosition(): LngLat;
		setIcon(icon: Icon | string): void;
		setTitle(title: string): void;
		getTitle(): string;
		setMap(map: Map | null): void;
		getMap(): Map | null;
		on(event: string, callback: (e?: any) => void): void;
		off(event: string, callback: (e?: any) => void): void;
		setExtData(extData: any): void;
		getExtData(): any;
	}

	interface MarkerOptions {
		position: [number, number] | LngLat;
		icon?: Icon | string;
		title?: string;
		label?: LabelOptions;
		offset?: Pixel;
		anchor?: string;
		angle?: number;
		draggable?: boolean;
		cursor?: string;
		extData?: any;
	}

	class Icon {
		constructor(opts: IconOptions);
		setImageSize(size: Size): void;
	}

	interface IconOptions {
		size?: Size;
		image?: string;
		imageOffset?: Pixel;
		imageSize?: Size;
	}

	interface LabelOptions {
		content?: string;
		offset?: Pixel;
		direction?: string;
	}

	class InfoWindow {
		constructor(opts: InfoWindowOptions);
		open(map: Map, position: [number, number] | LngLat): void;
		close(): void;
		setContent(content: string | HTMLElement): void;
		getContent(): string | HTMLElement;
		setPosition(position: [number, number] | LngLat): void;
		getPosition(): LngLat;
		on(event: string, callback: () => void): void;
		off(event: string, callback: () => void): void;
		getContent(): HTMLElement | null;
	}

	interface InfoWindowOptions {
		content?: string | HTMLElement;
		position?: [number, number] | LngLat;
		offset?: Pixel;
		size?: Size;
		anchor?: string;
		isCustom?: boolean;
		closeWhenClickMap?: boolean;
	}

	class ToolBar {
		constructor(opts?: ToolBarOptions);
	}

	interface ToolBarOptions {
		position?: string;
		offset?: Pixel;
	}

	class MapType {
		constructor(opts?: MapTypeOptions);
	}

	interface MapTypeOptions {
		defaultType?: number;
		showTraffic?: boolean;
		showRoad?: boolean;
	}

	class Scale {
		constructor(opts?: ScaleOptions);
	}

	interface ScaleOptions {
		position?: string;
		offset?: Pixel;
	}

	class TileLayer {
		constructor(opts?: TileLayerOptions);
		getTiles(): any[];
		reload(): void;
	}

	namespace TileLayer {
		class Satellite extends TileLayer {}
		class RoadNet extends TileLayer {}
	}

	interface TileLayerOptions {
		zIndex?: number;
		opacity?: number;
		visible?: boolean;
	}

	interface Overlay {
		setMap(map: Map | null): void;
		getMap(): Map | null;
		hide(): void;
		show(): void;
	}

	namespace event {
		function addListener(instance: any, eventName: string, handler: (e?: any) => void): void;
		function removeListener(instance: any, eventName: string, handler: (e?: any) => void): void;
		function clearListeners(instance: any): void;
	}

	// Utility function for converting coordinate arrays to LngLat
	function LngLat(lng: number, lat: number): LngLat;
	function Pixel(x: number, y: number): Pixel;
	function Size(width: number, height: number): Size;
	function Bounds(southWest: LngLat, northEast: LngLat): Bounds;
}

// AMap Loader return type
declare module '@amap/amap-jsapi-loader' {
	interface LoaderOptions {
		key: string;
		version: string;
		plugins?: string[];
		AMapUI?: {
			version?: string;
			plugins?: string[];
		};
		Loca?: {
			version?: string;
		};
	}

	function load(options: LoaderOptions): Promise<typeof AMap>;

	export { load };
}
