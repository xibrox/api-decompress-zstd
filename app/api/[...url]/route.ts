import { NextRequest, NextResponse } from 'next/server';
import { ZstdInit } from '@oneidentity/zstd-js/decompress';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ url?: string | string[] }> }
): Promise<NextResponse> {
  const params = await context.params;
  if (!params.url || (Array.isArray(params.url) && params.url.length === 0)) {
    return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
  }

  const urlParts = Array.isArray(params.url) ? params.url : [params.url];
  const targetUrl = decodeURIComponent(urlParts.join('/'));

  console.log(`Fetching URL: ${targetUrl}`);

  const fetchHeaders: HeadersInit = {
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'cs-CZ,cs;q=0.9',
    'DNT': '1',
    'Referer': 'https://vidapi.xyz/',
    'Sec-Fetch-Dest': 'iframe',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
  };

  try {
    const response = await fetch(targetUrl, { headers: fetchHeaders });

    if (!response.ok) {
      return NextResponse.json({ error: `Fetch failed: ${response.statusText}` }, { status: 400 });
    }

    const blob = await response.blob();
    const compressedBuffer = new Uint8Array(await blob.arrayBuffer());

    console.log(`Fetched ${compressedBuffer.length} bytes from ${targetUrl}`);
    console.log("First 10 bytes:", Array.from(compressedBuffer.slice(0, 10)).map(b => b.toString(16)).join(" "));

    const { ZstdSimple, ZstdStream } = await ZstdInit();


    let decompressedBuffer: Uint8Array;
    try {
      decompressedBuffer = ZstdSimple.decompress(compressedBuffer);
    } catch {
      try {
        decompressedBuffer = ZstdStream.decompress(compressedBuffer);
      } catch {
        console.error('Both decompression methods failed!');
        return NextResponse.json({ error: 'Decompression failed (invalid format or corrupted data)' }, { status: 500 });
      }
    }

    let html = new TextDecoder('utf-8').decode(decompressedBuffer);

    html = html.replaceAll('https://decompress-zstd.vercel.app', 'https://uqloads.xyz');
    html = html.replace(/<head>/i, '<head><base href="https://uqloads.xyz/">');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = "edge";