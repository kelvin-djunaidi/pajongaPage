import { v4 as uuidv4 } from 'uuid';

class Logger {
    constructor() {
        this.participantId = null;
        this.buffer = [];
        this.isInitialized = false;
        this.FLUSH_INTERVAL = 5000; // 5 seconds
        this.bufferLimit = 20;
        this.timer = null;
    }

    init() {
        if (typeof window === 'undefined') return;
        if (this.isInitialized) return;

        // Generate new participant ID for this session (reset on reload/session end)
        this.participantId = uuidv4();

        this.logSessionStart();
        this.isInitialized = true;

        // Set flush timer
        this.timer = setInterval(() => this.flush(), this.FLUSH_INTERVAL);

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.log('SYSTEM', 'session_end', { reason: 'page_unload' });
            this.flush(true);
        });
    }

    logSessionStart() {
        const sessionData = {
            participant_id: this.participantId,
            start_time: new Date().toISOString(),
            user_agent: navigator.userAgent,
            language: navigator.language,
            screen_size: `${window.innerWidth}x${window.innerHeight}`,
            referrer: document.referrer || 'direct'
        };

        // Send session metadata immediately
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'session', payload: sessionData }),
            keepalive: true
        }).catch(e => console.error('Session log failed', e));
    }

    log(category, name, data = {}, sceneId = null) {
        if (!this.isInitialized) this.init();

        const event = {
            participant_id: this.participantId,
            timestamp: new Date().toISOString(),
            event_type: category, // NAVIGATION, CHAT, GPS, MEDIA, SYSTEM
            event_name: name,
            scene_id: sceneId, // Can be null if global
            data: data
        };

        this.buffer.push(event);

        if (this.buffer.length >= this.bufferLimit) {
            this.flush();
        }
    }

    flush(sync = false) {
        if (this.buffer.length === 0) return;

        const payload = [...this.buffer];
        this.buffer = [];

        // Use sendBeacon for unload if available (though it has size limits and data type limits, fetch keepalive is safer for JSON)
        // We will use fetch with keepalive: true

        if (sync) {
            // Try synchronous send if possible, otherwise beacon can help
            // But fetch keepalive is the modern way
        }

        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'events', payload }),
            keepalive: true
        }).catch(err => {
            console.error('Log flush failed', err);
            // Determine if we should put back in buffer? 
            // For now, dump to console to avoid memory leak or infinite loops
        });
    }
}

// Singleton instance
const logger = new Logger();
export default logger;
