import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const { type, payload } = await request.json();
        const logsDir = path.join(process.cwd(), 'logs');

        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        if (type === 'session') {
            const filePath = path.join(logsDir, 'sessions.csv');
            const isNewFile = !fs.existsSync(filePath);

            // Headers based on typical session metadata
            const headers = ['participant_id', 'start_time', 'user_agent', 'language', 'screen_size', 'referrer', 'end_time'];

            if (isNewFile) {
                fs.writeFileSync(filePath, headers.join(',') + '\n');
            }

            // If it's an end session update, we might need a different approach or append a new row for simplicity
            // For CSV simplicity, we'll just log "START" and "END" as events or keep sessions simple.
            // Let's assume payload is a flat object matching headers.
            // For robustness with CSV, we map payload to headers order.
            const row = headers.map(h => {
                let val = payload[h] || '';
                // Escape commas and quotes
                if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',');

            fs.appendFileSync(filePath, row + '\n');

        } else if (type === 'events') {
            const filePath = path.join(logsDir, 'events.csv');
            const isNewFile = !fs.existsSync(filePath);

            // Events schema
            const headers = ['participant_id', 'timestamp', 'event_type', 'event_name', 'scene_id', 'data'];

            if (isNewFile) {
                fs.writeFileSync(filePath, headers.join(',') + '\n');
            }

            // Payload is an array of events
            const events = Array.isArray(payload) ? payload : [payload];

            const rows = events.map(event => {
                return headers.map(h => {
                    let val = event[h];
                    if (h === 'data' && typeof val === 'object') {
                        val = JSON.stringify(val);
                    }
                    val = val || '';
                    // Escape for CSV
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                        val = `"${val.replace(/"/g, '""')}"`;
                    }
                    return val;
                }).join(',');
            }).join('\n');

            fs.appendFileSync(filePath, rows + '\n');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logging error:', error);
        return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
    }
}
