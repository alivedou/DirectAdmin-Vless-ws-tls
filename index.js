```javascript
// ============================================================
// ================= 异常捕获（防止程序崩溃） ==================
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

// UUID（客户端连接密钥）
const UUID = (
    process.env.UUID ||
    "b8b2b871-c722-4fec-8fb3-632ca3c51a0a"
).trim();

// 你的域名
const DOMAIN = (
    process.env.DOMAIN ||
    "web.945.ccwu.cc"
).trim();

// 节点显示名称
const NAME = "DirectAdmin-adou";

// 自动适配面板端口
const LISTEN_PORT =
    Number(process.env.PORT) || 0;

// ============================================================
// ================= TXT 优选IP列表 ============================
// ============================================================

// 支持多个 TXT 地址
const DOMAIN_TXT_URLS = [
    // 新加坡优选IP
    "https://bestcf.pages.dev/gslege/SG.txt",
    // 可继续添加更多TXT
    "",
    ""
];

// ============================================================
// ================= Node.js 模块加载 ==========================
// ============================================================

// HTTP 服务
const http = require("http");

// TCP 连接
const net = require("net");

// WebSocket 模块
const wsModule = require("ws");

// WebSocket 服务端
const WebSocketServer =
    wsModule.WebSocketServer;

// WebSocket 转 TCP 流
const createWebSocketStream =
    wsModule.createWebSocketStream;

// ============================================================
// ================= 动态读取 TXT 优选IP =======================
// ============================================================

async function getBestDomains() {

    try {

        // 存放所有读取到的IP
        let allDomains = [];

        // 遍历所有 TXT 地址
        for (const url of DOMAIN_TXT_URLS) {

            // 跳过空地址
            if (!url || !url.trim()) {
                continue;
            }

            try {

                console.log("开始获取:", url);

                // ====================================================
                // fetch 超时控制（8秒）
                // ====================================================

                const controller =
                    new AbortController();

                const timeout = setTimeout(
                    function () {
                        controller.abort();
                    },
                    8000
                );

                // 获取 TXT 文件
                const response = await fetch(url, {
                    signal: controller.signal
                });

                clearTimeout(timeout);

                console.log(
                    "状态码:",
                    response.status
                );

                // ====================================================
                // 请求失败则跳过
                // ====================================================

                if (!response.ok) {

                    console.log(
                        "TXT获取失败:",
                        response.status
                    );

                    continue;
                }

                // 获取 TXT 内容
                const text =
                    await response.text();

                // ====================================================
                // TXT 内容解析
                // ====================================================

                const domains = text

                    // 删除 windows 换行符
                    .replace(/\r/g, "")

                    // 按行分割
                    .split("\n")

                    // 清理空格/BOM
                    .map(function (line) {

                        return line
                            .replace(/^\uFEFF/, "")
                            .trim();
                    })

                    // 删除空行
                    .filter(function (line) {

                        return (
                            line.length > 0
                        );
                    })

                    // 删除 # 后面的备注
                    .map(function (line) {

                        return line
                            .split("#")[0]
                            .trim();
                    })

                    // 再过滤一次
                    .filter(function (line) {

                        return (
                            line.length > 0
                        );
                    });

                console.log(
                    "读取到节点数量:",
                    domains.length
                );

                // 合并到总数组
                allDomains.push.apply(
                    allDomains,
                    domains
                );

            } catch (e) {

                console.log(
                    "TXT读取异常:",
                    e
                );
            }
        }

        // ====================================================
        // 数组去重
        // ====================================================

        allDomains = allDomains.filter(
            function (v, i, a) {

                return (
                    a.indexOf(v) === i
                );
            }
        );

        // ====================================================
        // 如果一个节点都没有读取到
        // 返回默认节点
        // ====================================================

        if (allDomains.length === 0) {

            console.log(
                "未读取到任何TXT节点"
            );

            return [
                "www.visa.cn:443"
            ];
        }

        console.log(
            "最终节点数量:",
            allDomains.length
        );

        return allDomains;

    } catch (error) {

        console.log(
            "获取 TXT 总失败:",
            error
        );

        return [
            "www.visa.cn:443"
        ];
    }
}

// ============================================================
// ================= WebSocket 路径 ============================
// ============================================================

// 最终访问路径：/UUID
const WS_PATH = "/" + UUID;

// ============================================================
// ================= 生成 VLESS 节点链接 =======================
// ============================================================

function generateLink(address) {

    return (
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
        encodeURIComponent(WS_PATH) +

        "#" + NAME
    );
}

// ============================================================
// ================= HTTP 服务 ================================
// ============================================================

const server =
http.createServer(async function (req, res) {

    // ========================================================
    // 禁止普通HTTP升级请求
    // ========================================================

    if (req.headers.upgrade) {

        res.writeHead(426);

        return res.end();
    }

    // ========================================================
    // 首页
    // ========================================================

    if (req.url === "/") {

        res.writeHead(200, {
            "Content-Type":
            "text/plain; charset=utf-8"
        });

        return res.end(
            "VLESS WS TLS Running\n访问 " +
            WS_PATH +
            " 查看节点\n"
        );
    }

    // ========================================================
    // 节点页面
    // 支持 /uuid 和 /uuid/
    // ========================================================

    if (req.url.startsWith(WS_PATH)) {

        // 动态获取 TXT 节点
        const BEST_DOMAINS =
            await getBestDomains();

        let txt =
            "═════ adou VLESS WS TLS ═════\n\n";

        // 生成所有节点
        for (const d of BEST_DOMAINS) {

            txt +=
                generateLink(d) +
                "\n\n";
        }

        txt +=
            "节点已全部生成，可直接复制使用。\n";

        res.writeHead(200, {
            "Content-Type":
            "text/plain; charset=utf-8"
        });

        return res.end(txt);
    }

    // ========================================================
    // 404
    // ========================================================

    res.writeHead(404);

    res.end("404 Not Found");
});

// ============================================================
// ================= WebSocket 服务 ============================
// ============================================================

const wss = new WebSocketServer({

    // 不自动创建 HTTP Server
    noServer: true,

    // 最大载荷限制
    maxPayload: 256 * 1024
});

// 去除 UUID 中的 -
const uuidClean =
    UUID.replace(/-/g, "");

// ============================================================
// ================= HTTP Upgrade ==============================
// ============================================================

server.on(
    "upgrade",
    function (req, socket, head) {

        // 非法路径直接断开
        if (
            !req.url.startsWith(WS_PATH)
        ) {

            socket.destroy();

            return;
        }

        // 升级 WebSocket
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
// ================= WebSocket 连接处理 ========================
// ============================================================

wss.on(
    "connection",
    function (ws) {

        let tcp = null;

        // ====================================================
        // 首次消息（VLESS握手）
        // ====================================================

        ws.once(
            "message",

            function (msg) {

                // 数据过短
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

                // =================================================
                // UUID 验证
                // =================================================

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

                // =================================================
                // 解析目标地址
                // =================================================

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

                // =================================================
                // 回复握手成功
                // =================================================

                ws.send(
                    Buffer.from([version, 0])
                );

                // =================================================
                // 建立 TCP 连接
                // =================================================

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

                        // 双向转发
                        duplex
                            .pipe(tcp)
                            .pipe(duplex);
                    }
                );

                // TCP 错误
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

        // WebSocket关闭
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

        // WebSocket错误
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
