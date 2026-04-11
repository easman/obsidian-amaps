import { BasesEntry } from 'obsidian';

export interface MapMarker {
	entry: BasesEntry;
	coordinates: [number, number]; // [longitude, latitude] in GCJ-02 format
}

export interface MapMarkerProperties {
	entryIndex: number;
	icon: string;
}
