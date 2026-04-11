import { Value, NumberValue, StringValue, ListValue } from 'obsidian';

/**
 * Converts a Value to coordinate tuple [lng, lat] (GCJ-02 format for AMap)
 *
 * Supports:
 * - List values: [longitude, latitude] e.g., ["116.4074", "39.9042"]
 * - String values: "longitude,latitude" e.g., "116.4074,39.9042"
 *
 * Note: This plugin only supports GCJ-02 (Mars Coordinates) used by AMap.
 * Users should provide coordinates in GCJ-02 format.
 */
export function coordinateFromValue(value: Value | null): [number, number] | null {
	let lng: number | null = null;
	let lat: number | null = null;

	// Handle list values (format: [longitude, latitude] for GCJ-02)
	// e.g., ["116.4074", "39.9092"] or [116.4074, 39.9092]
	if (value instanceof ListValue) {
		if (value.length() >= 2) {
			lng = parseCoordinate(value.get(0));  // longitude first
			lat = parseCoordinate(value.get(1));  // latitude second
		}
	}
	// Handle string values (format: "longitude,latitude" or "[longitude, latitude]" for GCJ-02)
	// e.g., "116.4074,39.9092" or "[116.4074, 39.9092]"
	else if (value instanceof StringValue) {
		// Remove brackets and split by comma
		const cleanValue = value.toString().trim().replace(/^[\[\(]|[\]\)]$/g, '');
		const parts = cleanValue.split(',');
		if (parts.length >= 2) {
			lng = parseCoordinate(parts[0].trim());  // longitude first
			lat = parseCoordinate(parts[1].trim());  // latitude second
		}
	}

	if (lng !== null && lat !== null && verifyLatLng(lat, lng)) {
		return [lng, lat];  // GCJ-02 format: [longitude, latitude]
	}

	return null;
}

/**
 * Verifies that lat/lng values are within valid ranges
 * GCJ-02 coordinates for China mainland
 */
export function verifyLatLng(lat: number, lng: number): boolean {
	return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Check if coordinates are within China's approximate bounds
 * Used to validate GCJ-02 coordinates
 */
export function isInChina(lat: number, lng: number): boolean {
	return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;
}

/**
 * Parses a coordinate value from various formats
 */
export function parseCoordinate(value: unknown): number | null {
	if (value instanceof NumberValue) {
		const numData = Number(value.toString());
		return isNaN(numData) ? null : numData;
	}
	if (value instanceof StringValue) {
		const num = parseFloat(value.toString());
		return isNaN(num) ? null : num;
	}
	if (typeof value === 'string') {
		const num = parseFloat(value);
		return isNaN(num) ? null : num;
	}
	if (typeof value === 'number') {
		return isNaN(value) ? null : value;
	}
	return null;
}

/**
 * Wrapper for Object.hasOwn which performs type narrowing
 */
export function hasOwnProperty<K extends PropertyKey>(o: unknown, v: K): o is Record<K, unknown> {
	return o != null && typeof o === 'object' && Object.hasOwn(o, v);
}

