# Cloudflare Security Setup — ukrbooks.ink

DNS вже за Cloudflare (бачимо `Server: cloudflare` у headers). Цей файл — чек-ліст безплатних security-фіч, які треба увімкнути вручну у [dash.cloudflare.com](https://dash.cloudflare.com) → ukrbooks.ink. ~10 хв клацань, жодних витрат.

## 1. SSL/TLS

**SSL/TLS → Overview**
- Encryption mode: **Full (strict)**

**SSL/TLS → Edge Certificates**
- Always Use HTTPS: **On**
- Automatic HTTPS Rewrites: **On**
- HSTS: **Enable**
  - Max-Age: `1 year`
  - Include subdomains: `On`
  - Preload: `On`

## 2. Security → Settings

- Security Level: **Medium**
- Challenge Passage: `30 minutes`
- Browser Integrity Check: **On**

## 3. Security → Bots

- Bot Fight Mode: **On** (free)
- Static resource protection: **On**

## 4. Security → WAF → Custom rules (5 free)

Додати по черзі через "Create rule":

### Rule 1: Block RU/BY
```
Name: Block RU and BY
Expression: (ip.geoip.country in {"RU" "BY"})
Action: Block
```
Обґрунтування: війна + підвищений ризик abuse/DMCA-trolling з цих регіонів. Легальні українські читачі у RU/BY нехай користуються VPN.

### Rule 2: Challenge empty User-Agent on API
```
Name: Challenge empty UA on /api
Expression: (starts_with(http.request.uri.path, "/api/") and (not http.user_agent or len(http.user_agent) lt 5))
Action: Managed Challenge
```

### Rule 3: Block known scrapers on downloads
```
Name: Block scrapers on /api/download
Expression: (starts_with(http.request.uri.path, "/api/download/") and (http.user_agent contains "python" or http.user_agent contains "curl" or http.user_agent contains "wget" or http.user_agent contains "scrapy" or http.user_agent contains "httpie" or http.user_agent contains "Go-http-client"))
Action: Block
```

### Rule 4: Challenge admin area from outside UA
```
Name: Challenge /admin from outside UA
Expression: (starts_with(http.request.uri.path, "/admin") and ip.geoip.country ne "UA")
Action: Managed Challenge
```

### Rule 5: Rate-limit /api/report
```
Name: Report API abuse protection
Expression: (http.request.uri.path eq "/api/report" and http.request.method eq "POST")
Action: Managed Challenge
```

## 5. Rules → Page Rules (3 free)

### PR 1: Bypass cache for API
```
URL: *ukrbooks.ink/api/*
Settings:
  - Cache Level: Bypass
  - Security Level: High
```

### PR 2: Cache static book covers aggressively
```
URL: *ukrbooks.ink/covers/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 day
```

### PR 3: Cache Next.js static assets
```
URL: *ukrbooks.ink/_next/static/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 year
  - Browser Cache TTL: 1 year
```

## 6. Caching → Configuration

- Caching Level: Standard
- Browser Cache TTL: `Respect Existing Headers`
- Always Online: **On**
- Development Mode: Off (вмикати тільки тимчасово під час хот-фіксів)

## 7. Caching → Tiered Cache

- Smart Tiered Cache: **On** (free, зменшує навантаження на Vercel + R2 origin)

## 8. Rules → Transform Rules → HTTP Response Header Modification

Додати 2 безпечні заголовки (free на Free plan):

### Header 1: Permissions-Policy
```
Name: Permissions-Policy header
When: All incoming requests
Set static: Header name = "Permissions-Policy"
  Value: "camera=(), microphone=(), geolocation=(), payment=()"
```

### Header 2: X-Robots-Tag for admin
```
Name: X-Robots-Tag for admin
When: starts_with(http.request.uri.path, "/admin")
Set static: Header name = "X-Robots-Tag"
  Value: "noindex, nofollow, noarchive"
```

## 9. Analytics & Logs → Analytics

Переконатися що Web Analytics увімкнений (free, безкукі, GDPR-safe).
- Можна додати beacon на сайт (або залишити server-side через CF proxy)

## 10. Після налаштування — перевірка

```bash
# 1) HSTS
curl -sI https://ukrbooks.ink/ | grep -i strict-transport

# 2) Bot blocking on /api/download без UA
curl -s -o /dev/null -w "%{http_code}\n" -A "" https://ukrbooks.ink/api/download/any/file.epub
# Очікується: 403 або Challenge page

# 3) Python scraper block
curl -s -o /dev/null -w "%{http_code}\n" -A "python-requests/2.31" https://ukrbooks.ink/api/download/any/file.epub
# Очікується: 403

# 4) Country block (через VPN RU)
# Має показати CF challenge page

# 5) Cache hits
curl -sI https://ukrbooks.ink/ | grep -i cf-cache-status
# Очікується: cf-cache-status: HIT (після прогріву)
```

## Додатково (коли буде час)

- **Zero Trust → Access** — захистити `/admin` додатковим layer (Google SSO, 1 юзер free)
- **Workers Routes** — можна переписувати headers без коду, якщо треба глобально
- **R2 → bucket → Custom domain** → `files.ukrbooks.ink` з окремими firewall rules (ще один шар між DMCA і фронтом)

## Що моніторити у перший тиждень

- **Security → Events**: топ blocked IP, топ rule hits, false positives
- **Caching → Overview**: cache hit ratio (має бути >70% для публічних pages)
- **Analytics → Security**: threats блокувалось скільки за день — якщо раптом стрибок, можливо нова DMCA-атака

Якщо false positive (легітимний user заблокований) — послабіть Rule 2/3/4 на Managed Challenge замість Block.
