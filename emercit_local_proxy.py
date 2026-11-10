#!/usr/bin/env python3
"""
Локальный прокси для emercit.com с CORS.
Запуск: python3 emercit_local_proxy.py
Потом в index.html: base: 'http://ТВОЙ_IP:8080'
Нужен публичный IP или туннель (ngrok, cloudflared, туннель роутера).
"""
import asyncio
from aiohttp import web, ClientSession

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru;q=0.6',
    'Referer': 'http://emercit.com/map/',
}

async def handler(request):
    params = request.query
    id_ = params.get('id', '203')
    a = params.get('a')
    b = params.get('b')
    mode = params.get('mode', 'temperature')
    
    if not a or not b:
        return web.Response(text='Missing a/b params', status=400)
    
    nocache = params.get('nocache', str(int(asyncio.get_event_loop().time() * 1000)))
    target = f'http://emercit.com/map/csv.php?id={id_}&a={a}&b={b}&mode={mode}&encoding=0&divider=0&point=0&nocache={nocache}'
    
    async with ClientSession() as session:
        try:
            async with session.get(target, headers=HEADERS) as resp:
                text = await resp.text()
                return web.Response(
                    text=text,
                    status=resp.status,
                    content_type='text/csv; charset=utf-8',
                    headers={
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Cache-Control': 'public, max-age=300',
                    }
                )
        except Exception as e:
            return web.Response(text=f'Upstream error: {e}', status=502)

async def options_handler(request):
    return web.Response(headers={
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    })

app = web.Application()
app.router.add_get('/csv.php', handler)
app.router.add_options('/csv.php', options_handler)

if __name__ == '__main__':
    web.run_app(app, host='0.0.0.0', port=8080)
