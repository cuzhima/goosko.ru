# Деплой Cloudflare Worker для ЭМЕРСИТ (бесплатно, без твоего компа)

## 1. Зайди в Cloudflare Dashboard
https://dash.cloudflare.com → Workers & Pages → Create application → Create Worker

## 2. Вставь код
Скопируй содержимое `emercit-worker.js` в редактор.

## 3. Deploy
Нажми "Deploy" → получишь URL вида:
`https://emercit-proxy.твой-аккаунт.workers.dev`

## 4. Обнови index.html
В `SITE.emercit.base` замени на URL твоего Worker'а:
```js
emercit: {
  base: 'https://emercit-proxy.твой-аккаунт.workers.dev',
  id: 203,
  modes: { ... }
}
```

## 5. Push на GitHub
```bash
git add index.html && git commit -m "emercit: use Cloudflare Worker proxy" && git push
```

---

## Как это работает
- Worker ходит на `http://emercit.com/map/csv.php` с правильными заголовками
- Кеширует 5 минут (`Cache-Control: max-age=300`)
- Отдаёт с `Access-Control-Allow-Origin: *`
- Браузер заходит на Worker → Worker на emercit.com → CSV с CORS

## Лимиты Free-плана
- 100 000 запросов/день
- 10 мс CPU на запрос
- Бессрочно бесплатно

## Альтернатива (если не хочешь Cloudflare)
Локальный сервер на твоём компе (нужен публичный IP / туннель):
```bash
# Python 3.8+
pip install aiohttp
python3 emercit_local_proxy.py
```
