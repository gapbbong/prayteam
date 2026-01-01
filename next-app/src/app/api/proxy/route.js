import { NextResponse } from 'next/server';

const GAS_URL = 'https://script.google.com/macros/s/AKfycby0CFJF0DUi-9VaMEyUHUXh6oalCvsj3Tg9-JnTsJP6sTRuolYoZbYlVuIEKg2fFtri/exec';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = `${GAS_URL}?${searchParams.toString()}`;

    try {
        const response = await fetch(targetUrl);
        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Proxy GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const mode = body.mode || '';

        // Forward all body params as query string for GAS compatibility
        const searchParams = new URLSearchParams();
        Object.keys(body).forEach(key => {
            searchParams.append(key, body[key]);
        });

        const targetUrl = `${GAS_URL}?${searchParams.toString()}`;

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Proxy POST error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
