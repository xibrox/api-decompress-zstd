import { NextRequest, NextResponse } from 'next/server';
import { ZstdInit } from '@oneidentity/zstd-js/decompress';

export async function GET(
    request: NextRequest,
    { params }: { params: Record<string, string | string[]> }
  ): Promise<NextResponse> {
    const { url } = params;
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }
  
    // Normalize urlParts to an array
    const urlParts = Array.isArray(url) ? url : [url];
  
    // Decode the URL
    const targetUrl = decodeURIComponent(urlParts.join('/'));
  
    // (rest of your code remains the same)
    // For example, fetching, decompressing, and replacing URLs
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
  
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch the target URL' },
        { status: 400 }
      );
    }
  
    const blob = await response.blob();
    const compressedBuffer = new Uint8Array(await blob.arrayBuffer());
  
    // Initialize Zstd decompression
    const { ZstdSimple, ZstdStream } = await ZstdInit();
  
    let decompressedBuffer: Uint8Array;
    try {
      decompressedBuffer = ZstdSimple.decompress(compressedBuffer);
    } catch (error: unknown) {
      const simpleErrorMessage =
        error instanceof Error ? error.message : 'Unknown simple decompression error';
      try {
        decompressedBuffer = ZstdStream.decompress(compressedBuffer);
      } catch (streamError: unknown) {
        const streamErrorMessage =
          streamError instanceof Error ? streamError.message : 'Unknown stream decompression error';
        throw new Error(
          `Simple decompression error: ${simpleErrorMessage}; Stream decompression error: ${streamErrorMessage}`
        );
      }
    }
  
    let html = new TextDecoder('utf-8').decode(decompressedBuffer);
  
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }