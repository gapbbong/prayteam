import { NextResponse } from 'next/server';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzxeKZ-3ibGFZf3r8T91KNPuvl8Kr5pFDxPPnddODhizSuYzY_LkkzTCFvMgEbSGfxF/exec';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const targetUrl = `${GAS_URL}?${searchParams.toString()}`;
    console.log(`[Next Proxy GET] ${request.nextUrl.pathname}?${searchParams.toString().replace(/(pwd|password)=[^&]*/gi, '$1=***')}`);

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

        // [FIX] Do NOT append body to URL params (avoids URI Too Long errors)
        // GAS handles mode from JSON body (e.postData.contents)
        const targetUrl = `${GAS_URL}?${searchParams.toString()}`;
        console.log(`[Next Proxy POST] ${request.nextUrl.pathname} mode=${body?.mode || ''}`);

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
