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

// UUID（客户端密钥）
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

// 面板自动分配端口
const LISTEN_PORT =
    Number(process.env.PORT) || 0;

// ============================================================
// ================= TXT 优选域名地址 ==========================
// ============================================================

// 支持多个 TXT 地址
const DOMAIN_TXT_URLS = [

    // 新加坡优选
    "https://bestcf.pages.dev/gslege/SG.txt",

    // 可继续添加更多TXT
    "",
    ""
];

// ============================================================
// ================= Node.js 模块 ==============================
// ============================================================

const http = require("http");
const net = require("net");

const wsModule = require("ws");

const WebSocketServer =
    wsModule.WebSocketServer;

const createWebSocketStream =
    wsModule.createWebSocketStream;

// ============================================================
// ================= WS 路径 ==================================
// ============================================================

// 最终路径：/UUID
const WS_PATH = "/" + UUID;

// ============================================================
// ================= 读取 TXT 并生成节点 =======================
// ============================================================

async function getVlessLinks() {

    try {

        // 存储所有节点
        let links = [];

        // 遍历所有 TXT
        for (const url of DOMAIN_TXT_URLS) {

            // 跳过空URL
            if (!url || !url.trim()) {
                continue;
            }

            try {

                console.log("开始读取:", url);

                // ====================================================
                // 获取 TXT
                // ====================================================

                const response = await fetch(url);

                console.log(
                    "状态码:",
                    response.status
                );

                // 请求失败
                if (!response.ok) {

                    console.log(
                        "TXT读取失败"
                    );

                    continue;
                }

                // 获取文本
                const text =
                    await response.text();

                // ====================================================
                // 逐行处理 TXT
                // ====================================================

                const lines = text

                    // 删除 Windows 换行
                    .replace(/\r/g, "")

                    // 按行分割
                    .split("\n");

                // ====================================================
                // 遍历每一行
                // ====================================================

                for (let line of lines) {

                    // 删除 BOM + 空格
                    line = line
                        .replace(/^\uFEFF/, "")
                        .trim();

                    // 空行跳过
                    if (!line) {
                        continue;
                    }

                    // =================================================
                    // 解析格式：
                    // xxx.com:443#备注
                    // =================================================

                    const parts =
                        line.split("#");

                    // 地址部分
                    const address =
                        parts[0].trim();

                    // 备注部分
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
                        encodeURIComponent(WS_PATH) +

                        "#" +

                        encodeURIComponent(
                            remark
                        );

                    links.push(link);
                }

            } catch (e) {

                console.log(
                    "TXT读取异常:",
                    e
                );
            }
        }

        // ========================================================
        // 去重
        // ========================================================

        links = links.filter(
            function (v, i, a) {

                return (
                    a.indexOf(v) === i
                );
            }
        );

        // ========================================================
        // 如果一个都没读取到
        // ========================================================

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
                encodeURIComponent(WS_PATH) +

                "#Default"
            ];
        }

        console.log(
            "最终节点数量:",
            links.length
        );

        return links;

    } catch (e) {

        console.log(
            "总异常:",
            e
        );

        return [
            "读取失败"
        ];
    }
}

// ============================================================
// ================= HTTP 服务 ================================
// ============================================================

const server =
http.createServer(async function (req, res) {

    // ========================================================
    // 首页
    // ========================================================

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

    // ========================================================
    // 节点页面
    // ========================================================

    if (req.url.startsWith(WS_PATH)) {

        // 获取节点
        const links =
            await getVlessLinks();

        // 合并输出
        const txt =
            links.join("\n\n");

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
// ================= WebSocket 连接 ============================
// ============================================================

wss.on(
    "connection",

    function (ws) {

        let tcp = null;

        // 首包处理
        ws.once(
            "message",

            function (msg) {

                // 数据异常
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

        // WS 关闭
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

        // WS 错误
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
