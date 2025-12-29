"use client";

import { useEffect, useRef } from 'react';
import logger from '../utils/logger';

export default function LocationTracker({ currentScene }) {
    const watchId = useRef(null);

    useEffect(() => {
        if (!("geolocation" in navigator)) {
            logger.log('SYSTEM', 'gps_error', { error: 'Geolocation not supported' });
            return;
        }

        const handleSuccess = (position) => {
            const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;

            logger.log('GPS', 'location_update', {
                lat: latitude,
                lng: longitude,
                acc: accuracy,
                spd: speed, // m/s, can imply "Movement Interruption" if drops to 0
                head: heading,
                alt: altitude
            }, currentScene);
        };

        const handleError = (error) => {
            let errorMsg = 'Unknown error';
            switch (error.code) {
                case error.PERMISSION_DENIED: errorMsg = 'User denied request for Geolocation'; break;
                case error.POSITION_UNAVAILABLE: errorMsg = 'Location information is unavailable'; break;
                case error.TIMEOUT: errorMsg = 'The request to get user location timed out'; break;
            }
            logger.log('SYSTEM', 'gps_error', { error: errorMsg, code: error.code });
        };

        // Watch position
        watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 5000 // Don't use too old cache
        });

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, [currentScene]); // Re-attach if scene changes? No, just keep watching. But we pass scene to logger.
    // Actually, wait. The closure will capture `currentScene`. 
    // If we want `handleSuccess` to use the fresh `currentScene`, we should use a ref for currentScene or re-bind.
    // Re-binding on every scene change might reset the GPS watcher (causing battery drain or gaps).
    // Better use a Ref for scene ID.

    const sceneRef = useRef(currentScene);
    useEffect(() => {
        sceneRef.current = currentScene;
    }, [currentScene]);

    // We re-write the effect to NOT depend on [currentScene].
    // Instead it uses sceneRef inside.

    useEffect(() => {
        // ... (same as above but use sceneRef.current)
        if (!("geolocation" in navigator)) {
            logger.log('SYSTEM', 'gps_error', { error: 'Geolocation not supported' });
            return;
        }

        const handleSuccess = (position) => {
            const { latitude, longitude, accuracy, speed, heading, altitude } = position.coords;

            logger.log('GPS', 'location_update', {
                lat: latitude,
                lng: longitude,
                acc: accuracy,
                spd: speed,
                head: heading,
                alt: altitude
            }, sceneRef.current);
        };

        const handleError = (error) => {
            let errorMsg = 'Unknown error';
            switch (error.code) {
                case error.PERMISSION_DENIED: errorMsg = 'User denied request for Geolocation'; break;
                case error.POSITION_UNAVAILABLE: errorMsg = 'Location information is unavailable'; break;
                case error.TIMEOUT: errorMsg = 'The request to get user location timed out'; break;
            }
            logger.log('SYSTEM', 'gps_error', { error: errorMsg, code: error.code });
        };

        // Watch position
        watchId.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0 // Prefer fresh
        });

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, []); // Run once on mount

    return null; // Invisible component
}
