import { NextRequest, NextResponse } from 'next/server';
import { ZstdInit } from '@oneidentity/zstd-js/decompress';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ url?: string | string[] }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    if (!params.url || (Array.isArray(params.url) && params.url.length === 0)) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    const urlParts = Array.isArray(params.url) ? params.url : [params.url];
    const targetUrl = decodeURIComponent(urlParts.join('/'));

    // Proxy request headers
    const fetchHeaders: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Referer': 'https://vidapi.xyz/',
      'DNT': '1',
    };

    const response = await fetch(targetUrl, { headers: fetchHeaders });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch the target URL' }, { status: response.status });
    }

    const blob = await response.blob();
    const compressedBuffer = new Uint8Array(await blob.arrayBuffer());
    const { ZstdSimple, ZstdStream } = await ZstdInit();

    let decompressedBuffer: Uint8Array;
    try {
      decompressedBuffer = ZstdSimple.decompress(compressedBuffer);
    } catch (error) {
      try {
        decompressedBuffer = ZstdStream.decompress(compressedBuffer);
      } catch (streamError) {
        return NextResponse.json({ error: 'Decompression failed' }, { status: 500 });
      }
    }

    let html = new TextDecoder('utf-8').decode(decompressedBuffer);

    // Update URLs in response
    html = html.replaceAll('https://decompress-zstd.vercel.app', 'https://uqloads.xyz');
    html = html.replace(/<head>/i, '<head><base href="https://uqloads.xyz/">');

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}