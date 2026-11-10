export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const params = url.searchParams;
    
    const id = params.get('id') || '203';
    const a = params.get('a');
    const b = params.get('b');
    const mode = params.get('mode') || 'temperature';
    
    if (!a || !b) {
      return new Response('Missing required params: a (start date) and b (end date)', { status: 400 });
    }

    const nocache = params.get('nocache') || Date.now();
    const targetUrl = `http://emercit.com/map/csv.php?id=${id}&a=${a}&b=${b}&mode=${mode}&encoding=0&divider=0&point=0&nocache=${nocache}`;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'ru;q=0.6',
      'Referer': 'http://emercit.com/map/',
    };

    try {
      const response = await fetch(targetUrl, { headers });
      const text = await response.text();
      
      return new Response(text, {
        status: response.status,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=300',
        }
      });
    } catch (e) {
      return new Response('Upstream error: ' + e.message, { status: 502 });
    }
  }
};
