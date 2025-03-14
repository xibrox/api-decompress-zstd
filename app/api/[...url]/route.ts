import { NextResponse } from 'next/server';
import { ZstdInit } from '@oneidentity/zstd-js/decompress';

export async function GET(
  request: Request,
  { params }: { params: { url?: string[] } }
): Promise<Response> {
  try {
    const { url: urlSegments } = params;
    if (!urlSegments || urlSegments.length === 0) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }
    const targetUrl = decodeURIComponent(urlSegments.join('/'));

    const fetchHeaders: HeadersInit = {
      'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'cs-CZ,cs;q=0.9',
      'DNT': '1',
      'Referer': 'https://vidapi.xyz/',
      'Sec-CH-UA': '"Chromium";v="133", "Not(A:Brand";v="99"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'iframe',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-Storage-Access': 'active',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    };

    const response = await fetch(targetUrl, { headers: fetchHeaders });

    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch the target URL' }, { status: 400 });
    }

    // Ensure we get raw binary data.
    const blob = await response.blob();
    const compressedBuffer = new Uint8Array(await blob.arrayBuffer());

    // Initialize ZSTD.
    const { ZstdSimple, ZstdStream } = await ZstdInit();

    let decompressedBuffer: Uint8Array;
    try {
      decompressedBuffer = ZstdSimple.decompress(compressedBuffer);
    } catch (error: unknown) {
      let simpleErrorMessage = error instanceof Error ? error.message : 'Unknown simple decompression error';
      try {
        decompressedBuffer = ZstdStream.decompress(compressedBuffer);
      } catch (streamError: unknown) {
        let streamErrorMessage = streamError instanceof Error ? streamError.message : 'Unknown stream decompression error';
        throw new Error(`Simple decompression error: ${simpleErrorMessage}; Stream decompression error: ${streamErrorMessage}`);
      }
    }

    const html = new TextDecoder('utf-8').decode(decompressedBuffer);

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error decompressing data', details: errorMessage },
      { status: 500 }
    );
  }
}
