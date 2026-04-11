import { Value, NumberValue, StringValue, ListValue } from 'obsidian';

/**
 * Converts a Value to coordinate tuple [lat, lng]
 */
export function coordinateFromValue(value: Value | null): [number, number] | null {
	let lat: number | null = null;
	let lng: number | null = null;

	// Handle list values (e.g., ["34.1395597", "-118.3870991"] or [34.1395597, -118.3870991])
	if (value instanceof ListValue) {
		if (value.length() >= 2) {
			lat = parseCoordinate(value.get(0));
			lng = parseCoordinate(value.get(1));
		}
	}
	// Handle string values (e.g., "34.1395597,-118.3870991" or "34.1395597, -118.3870991")
	else if (value instanceof StringValue) {
		// Split by comma and handle various spacing
		const parts = value.toString().trim().split(',');
		if (parts.length >= 2) {
			lat = parseCoordinate(parts[0].trim());
			lng = parseCoordinate(parts[1].trim());
		}
	}

	if (lat && lng && verifyLatLng(lat, lng)) {
		return [lat, lng];
	}

	return null;
}

/**
 * Verifies that lat/lng values are within valid ranges
 */
export function verifyLatLng(lat: number, lng: number): boolean {
	return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
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

/**
 * WGS-84 to GCJ-02 coordinate conversion (Mars Coordinate System)
 *
 * AMap uses GCJ-02 coordinate system, but most GPS devices use WGS-84.
 * This function converts WGS-84 coordinates to GCJ-02.
 *
 * Algorithm based on public domain implementation:
 * https://github.com/wandergis/coordtransform
 */
export function wgs84ToGcj02([lat, lng]: [number, number]): [number, number] {
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

/**
 * GCJ-02 to WGS-84 coordinate conversion
 *
 * Converts GCJ-02 coordinates back to WGS-84.
 * Uses iterative approximation for better accuracy.
 */
export function gcj02ToWgs84([lat, lng]: [number, number]): [number, number] {
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
	const mglat = lat - dlat;
	const mglng = lng - dlng;

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
