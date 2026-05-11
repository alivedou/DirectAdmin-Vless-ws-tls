// ============================================================
// ================= 异常捕获（防止崩溃） ======================
// ============================================================

process.on("uncaughtException", function (err) {
    console.log("uncaughtException:", err);
});

process.on("unhandledRejection", function (err) {
    console.log("unhandledRejection:", err);
});

// ============================================================
// ================= 核心配置区域 ==============================
// ============================================================

// UUID（客户端ID）
const UUID = (
    process.env.UUID || 
    "198cc398-21dd-4bcd-af0d-84c4729a08ae"
).trim();

// 域名
const DOMAIN = (
    process.env.DOMAIN ||
    "web.example.com"
).trim();

// 节点名称
const NAME = "DirectAdmin-adou";

// 自动监听端口
const LISTEN_PORT =
    Number(process.env.PORT) || 0;

// ============================================================
// ================= TXT 地址 =================================
// ============================================================

// 支持多个 TXT
const DOMAIN_TXT_URLS = [

    "https://bestcf.pages.dev/vps789/top10.txt",

    "",

    ""
];

// ============================================================
// ================= Node.js 模块 ==============================
// ============================================================

const http = require("http");

const https = require("https");

const net = require("net");

const wsModule = require("ws");

const WebSocketServer =
    wsModule.WebSocketServer;

const createWebSocketStream =
    wsModule.createWebSocketStream;

// ============================================================
// ================= WS 路径 ==================================
// ============================================================

const WS_PATH = "/" + UUID;

// ============================================================
// ================= 获取 TXT 内容 =============================
// ============================================================

function fetchText(url) {

    return new Promise(function (resolve, reject) {

        https.get(url, function (res) {

            let data = "";

            res.on("data", function (chunk) {

                data += chunk;
            });

            res.on("end", function () {

                resolve(data);
            });

        }).on("error", function (err) {

            reject(err);
        });
    });
}

// ============================================================
// ================= 读取 TXT 并生成节点 =======================
// ============================================================

async function getVlessLinks() {

    try {

        let links = [];

        // 遍历所有 TXT
        for (const url of DOMAIN_TXT_URLS) {

            // 跳过空地址
            if (!url || !url.trim()) {
                continue;
            }

            try {

                console.log(
                    "开始读取:",
                    url
                );

                // 获取 TXT 内容
                const text =
                    await fetchText(url);

                // 按行分割
                const lines = text
                    .replace(/\r/g, "")
                    .split("\n");

                // 遍历每一行
                for (let line of lines) {

                    // 清理空格/BOM
                    line = line
                        .replace(/^\uFEFF/, "")
                        .trim();

                    // 空行跳过
                    if (!line) {
                        continue;
                    }

                    // =================================================
                    // 格式：
                    // xxx.com:443#备注
                    // =================================================

                    const parts =
                        line.split("#");

                    // 地址
                    const address =
                        parts[0].trim();

                    // 备注
                    const remark =
                        parts[1]
                        ? parts[1].trim()
                        : NAME;

                    // =================================================
                    // 生成 VLESS 节点
                    // =================================================

                    const link =

                        "vless://" +
                        UUID +
                        "@" +
                        address +

                        "?encryption=none" +
                        "&security=tls" +
                        "&sni=" + DOMAIN +
                        "&fp=chrome" +
                        "&type=ws" +
                        "&host=" + DOMAIN +
                        "&path=" +
                        encodeURIComponent(
                            WS_PATH
                        ) +

                        "#" +

                        encodeURIComponent(
                            remark
                        );

                    links.push(link);
                }

            } catch (e) {

                console.log(
                    "TXT读取失败:",
                    e
                );
            }
        }

        // ====================================================
        // 去重
        // ====================================================

        links = links.filter(
            function (v, i, a) {

                return (
                    a.indexOf(v) === i
                );
            }
        );

        console.log(
            "最终节点数量:",
            links.length
        );

        // ====================================================
        // 默认节点
        // ====================================================

        if (links.length === 0) {

            return [

                "vless://" +
                UUID +
                "@www.visa.cn:443" +

                "?encryption=none" +
                "&security=tls" +
                "&sni=" + DOMAIN +
                "&fp=chrome" +
                "&type=ws" +
                "&host=" + DOMAIN +
                "&path=" +
                encodeURIComponent(
                    WS_PATH
                ) +

                "#Default"
            ];
        }

        return links;

    } catch (e) {

        console.log(
            "getVlessLinks错误:",
            e
        );

        return [

            "vless://" +
            UUID +
            "@www.visa.cn:443" +

            "?encryption=none" +
            "&security=tls" +
            "&sni=" + DOMAIN +
            "&fp=chrome" +
            "&type=ws" +
            "&host=" + DOMAIN +
            "&path=" +
            encodeURIComponent(
                WS_PATH
            ) +

            "#Error"
        ];
    }
}

// ============================================================
// ================= HTTP 服务 ================================
// ============================================================

const server =
http.createServer(async function (req, res) {

    // 首页
    if (req.url === "/") {

        res.writeHead(200, {
            "Content-Type":
            "text/plain; charset=utf-8"
        });

        return res.end(

            "VLESS WS TLS Running\n\n" +

            "节点地址：\n" +

            WS_PATH
        );
    }

    // 节点页面
    if (req.url.startsWith(WS_PATH)) {

        // 获取节点
        const links =
            await getVlessLinks();

        // 输出文本
        const txt =
            links.join("\n\n");

        res.writeHead(200, {
            "Content-Type":
            "text/plain; charset=utf-8"
        });

        return res.end(txt);
    }

    // 404
    res.writeHead(404);

    res.end("404 Not Found");
});

// ============================================================
// ================= WebSocket 服务 ============================
// ============================================================

const wss = new WebSocketServer({

    noServer: true,

    maxPayload: 256 * 1024
});

// UUID 去掉 -
const uuidClean =
    UUID.replace(/-/g, "");

// ============================================================
// ================= Upgrade 处理 ==============================
// ============================================================

server.on(
    "upgrade",

    function (req, socket, head) {

        // 非法路径
        if (
            !req.url.startsWith(WS_PATH)
        ) {

            socket.destroy();

            return;
        }

        // 升级 WS
        wss.handleUpgrade(
            req,
            socket,
            head,

            function (ws) {

                wss.emit(
                    "connection",
                    ws,
                    req
                );
            }
        );
    }
);

// ============================================================
// ================= WebSocket 连接 ============================
// ============================================================

wss.on(
    "connection",

    function (ws) {

        let tcp = null;

        ws.once(
            "message",

            function (msg) {

                // 数据校验
                if (
                    !Buffer.isBuffer(msg) ||
                    msg.length < 18
                ) {

                    ws.close();

                    return;
                }

                // 协议版本
                const version = msg[0];

                // UUID
                const id =
                    msg.slice(1, 17);

                // UUID 验证
                for (
                    let i = 0;
                    i < 16;
                    i++
                ) {

                    if (
                        id[i] !== parseInt(
                            uuidClean.substr(
                                i * 2,
                                2
                            ),
                            16
                        )
                    ) {

                        ws.close();

                        return;
                    }
                }

                // ====================================================
                // 解析目标地址
                // ====================================================

                let p = msg[17] + 19;

                const port =
                    msg.readUInt16BE(p);

                p += 2;

                const atyp = msg[p++];

                let host = "";

                // IPv4
                if (atyp === 1) {

                    host = Array.from(
                        msg.slice(p, p + 4)
                    ).join(".");

                    p += 4;

                // 域名
                } else if (atyp === 2) {

                    const len = msg[p];

                    host = msg.slice(
                        p + 1,
                        p + 1 + len
                    ).toString();

                    p += 1 + len;

                // IPv6
                } else if (atyp === 3) {

                    const raw =
                        msg.slice(p, p + 16);

                    const parts = [];

                    for (
                        let i = 0;
                        i < 16;
                        i += 2
                    ) {

                        parts.push(
                            raw
                            .readUInt16BE(i)
                            .toString(16)
                        );
                    }

                    host = parts.join(":");

                    p += 16;

                } else {

                    ws.close();

                    return;
                }

                // 返回握手成功
                ws.send(
                    Buffer.from([version, 0])
                );

                // 建立 TCP
                tcp = net.connect(
                    {
                        host: host,
                        port: port
                    },

                    function () {

                        tcp.setNoDelay(true);

                        tcp.write(msg.slice(p));

                        const duplex =
                            createWebSocketStream(ws);

                        duplex
                            .pipe(tcp)
                            .pipe(duplex);
                    }
                );

                // TCP错误
                tcp.on(
                    "error",

                    function () {

                        try {

                            ws.close();

                        } catch (e) {}
                    }
                );
            }
        );

        // WS关闭
        ws.on(
            "close",

            function () {

                try {

                    if (tcp) {
                        tcp.destroy();
                    }

                } catch (e) {}
            }
        );

        // WS错误
        ws.on(
            "error",

            function () {}
        );
    }
);

// ============================================================
// ================= 启动服务 ================================
// ============================================================

server.listen(
    LISTEN_PORT,
    "0.0.0.0"
);

console.log(
    "Server Started:",
    LISTEN_PORT
);

