export async function onRequestGet(context) {
    const BOT_URL =
        "https://rate.bot.com.tw/xrt?Lang=zh-TW";

    const PROXY_URL =
        "https://corsproxy.io/?url=" +
        encodeURIComponent(BOT_URL);

    try {
        const response = await fetch(PROXY_URL, {
            method: "GET",
            headers: {
                "Accept": "text/html",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
            },
            cf: {
                cacheTtl: 0,
                cacheEverything: false
            }
        });

        if (!response.ok) {
            return jsonResponse({
                ok: false,
                error:
                    `corsproxy.io HTTP ${response.status}`
            }, response.status);
        }

        const html =
            await response.text();

        if (!html || !html.trim()) {
            return jsonResponse({
                ok: false,
                error:
                    "Proxy 回傳空白內容"
            }, 502);
        }

        const rate =
            parseUsdSellRate(html);

        const updated =
            getTaiwanTime();

        return jsonResponse({
            ok: true,
            currency: "USD",
            name: "美金",
            type: "本行即期賣出",
            rate: Number(rate.toFixed(3)),
            updated: updated,
            source: "臺灣銀行"
        });

    } catch (error) {

        return jsonResponse({
            ok: false,
            error:
                error instanceof Error
                    ? error.message
                    : String(error)
        }, 500);
    }
}


// =========================================================
// 解析臺灣銀行 HTML
// =========================================================

function parseUsdSellRate(html) {

    const rowMatch =
        html.match(
            /<tr[\s\S]*?美金[\s\S]*?\(USD\)[\s\S]*?<\/tr>/i
        );

    if (!rowMatch) {
        throw new Error(
            "找不到美金 (USD) 資料"
        );
    }

    const row =
        rowMatch[0];

    const sellMatch =
        row.match(
            /data-table=["']本行即期賣出["'][^>]*>\s*([\d.,]+)\s*</i
        );

    if (!sellMatch) {
        throw new Error(
            "找不到本行即期賣出欄位"
        );
    }

    const rate =
        Number(
            sellMatch[1].replace(/,/g, "")
        );

    if (!Number.isFinite(rate)) {
        throw new Error(
            "匯率不是有效數字"
        );
    }

    return rate;
}


// =========================================================
// 臺灣時間
// =========================================================

function getTaiwanTime() {

    return new Intl.DateTimeFormat(
        "zh-TW",
        {
            timeZone: "Asia/Taipei",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    ).format(
        new Date()
    );
}


// =========================================================
// JSON Response
// =========================================================

function jsonResponse(data, status = 200) {

    return new Response(
        JSON.stringify(data),
        {
            status,
            headers: {
                "Content-Type":
                    "application/json; charset=UTF-8",

                "Cache-Control":
                    "no-store, no-cache, must-revalidate",

                "Access-Control-Allow-Origin":
                    "*"
            }
        }
    );
}
