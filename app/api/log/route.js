import { NextResponse } from 'next/server';
import { supabase } from '../../utils/supabase';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const { type, payload } = await request.json();
        const logsDir = path.join(process.cwd(), 'logs');

        // Ensure logs directory exists for session logs
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        if (type === 'session') {
            // Keep session logs in CSV as requested (only events to Supabase)
            const filePath = path.join(logsDir, 'sessions.csv');
            const isNewFile = !fs.existsSync(filePath);

            const headers = ['participant_id', 'start_time', 'user_agent', 'language', 'screen_size', 'referrer', 'end_time'];

            if (isNewFile) {
                fs.writeFileSync(filePath, headers.join(',') + '\n');
            }

            const row = headers.map(h => {
                let val = payload[h] || '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',');

            fs.appendFileSync(filePath, row + '\n');

        } else if (type === 'events') {
            // Write events to Supabase
            const events = Array.isArray(payload) ? payload : [payload];

            const { error } = await supabase
                .from('events')
                .insert(events);

            if (error) {
                console.error('Supabase Event Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logging error:', error);
        return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
    }
}
