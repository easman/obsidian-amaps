import { BasesEntry } from 'obsidian';

export interface MapMarker {
	entry: BasesEntry;
	coordinates: [number, number]; // [latitude, longitude]
}

export interface MapMarkerProperties {
	entryIndex: number;
	icon: string;
}
