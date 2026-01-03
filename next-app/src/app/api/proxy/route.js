import { NextResponse } from 'next/server';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1EsIhNi44f8ryt4GSv1JPhvQKWwYHFRKzHShJSd9LmZkNpjhnNzzc7SmDT6R_UQwj/exec';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = `${GAS_URL}?${searchParams.toString()}`;
    console.log(`[Next Proxy GET] Forwarding to: ${targetUrl}`);

    try {
        const response = await fetch(targetUrl);
        const text = await response.text();

        try {
            const data = JSON.parse(text);
            return NextResponse.json(data);
        } catch (e) {
            console.warn('[Next Proxy GET] Response is not JSON:', text);
            return NextResponse.json({ success: false, message: text });
        }
    } catch (error) {
        console.error('Proxy GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const searchParams = new URL(request.url).searchParams;

        // Ensure mode is present in query string even for POST
        const forwardParams = new URLSearchParams(searchParams);
        Object.keys(body).forEach(key => {
            if (!forwardParams.has(key)) {
                forwardParams.append(key, body[key]);
            }
        });

        const targetUrl = `${GAS_URL}?${forwardParams.toString()}`;
        console.log(`[Next Proxy POST] Forwarding to: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return NextResponse.json(data);
        } catch (e) {
            console.warn('[Next Proxy POST] Response is not JSON:', text);
            return NextResponse.json({ success: false, message: text });
        }
    } catch (error) {
        console.error('Proxy POST error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
