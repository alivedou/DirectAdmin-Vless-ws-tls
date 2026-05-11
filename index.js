process.on("uncaughtException", function (err) {
    console.log("uncaughtException:", err);
});

process.on("unhandledRejection", function (err) {
    console.log("unhandledRejection:", err);
});

// ====== 只修改两个核心变量 UUID/DOMAIN ======
const UUID = (process.env.UUID || "b8b2b871-c722-4fec-8fb3-632ca3c51a0a").trim();
const DOMAIN = (process.env.DOMAIN || "abc.domain.dpdns.org").trim();

// Panel 配置
const NAME = "DirectAdmin-adou";
const LISTEN_PORT = Number(process.env.PORT) || 0;

// ============================================================
// =============== TXT 优选地址 ================================
// ============================================================
const DOMAIN_TXT_URLS = [
    "https://bestcf.pages.dev/gslege/SG.txt",
    "",
    "",
];

// ============================================================
// =============== 模块加载区 ================================
// ============================================================
const http = require("http");
const net = require("net");
const wsModule = require("ws");

const WebSocketServer = wsModule.WebSocketServer;
const createWebSocketStream = wsModule.createWebSocketStream;

// ============================================================
// =============== 动态读取TXT内优选ip===============================
// ============================================================
function getBestDomains() {

    return new Promise(async function (resolve) {

        try {

            let allDomains = [];

            for (const url of DOMAIN_TXT_URLS) {

                // 跳过空地址
                if (!url || !url.trim()) {
                    continue;
                }

                const response = await fetch(url);
			console.log("TXT地址:", url);
			console.log("状态码:", response.status);
                const text = await response.text();	
			console.log(text);
				
				const domains = text
				.replace(/\r/g, "")
				.split("\n")


					.map(function (line) {
   			 return line.replace(/^\uFEFF/, "").trim();
			})
			.filter(function (line) {
				return line.length > 0;
			})

			.map(function (line) {
				return line.split("#")[0].trim();
			})

			.filter(function (line) {
				return line.length > 0;
			});

                allDomains.push.apply(allDomains, domains);
				console.log(domains);
            }

            // 去重
            resolve(
				allDomains.filter(function (v, i, a) {
					return a.indexOf(v) === i;
						})
					);

        } catch (error) {

            console.log("获取 TXT 失败:", error);

            resolve([
                "www.visa.cn:443"
            ]);
        }
    });
}

// ============================================================
// =============== WebSocket Path ============================
// ============================================================
const WS_PATH = "/" + UUID;

// ============================================================
// =============== 生成 VLESS 节点链接函数 ====================
// ============================================================
function generateLink(address) {

    return (
        "vless://" + UUID + "@" + address +
        "?encryption=none" +
        "&security=tls" +
        "&sni=" + DOMAIN +
        "&fp=chrome" +
        "&type=ws" +
        "&host=" + DOMAIN +
        "&path=" + encodeURIComponent(WS_PATH) +
        "#" + NAME
    );
}

// ============================================================
// =============== HTTP 服务 ==================================
// ============================================================
const server = http.createServer(async function (req, res) {

    if (req.headers.upgrade) {

        res.writeHead(426);
        return res.end();
    }

    if (req.url === "/") {

        res.writeHead(200, {
            "Content-Type": "text/plain; charset=utf-8"
        });

        return res.end(
            "VLESS WS TLS Running\n访问 " +
            WS_PATH +
            " 查看节点\n"
        );
    }

    if (req.url === WS_PATH) {

        // 动态获取 TXT 节点
        const BEST_DOMAINS = await getBestDomains();

        let txt = "═════ adou VLESS WS TLS ═════\n\n";

        for (const d of BEST_DOMAINS) {

            txt += generateLink(d) + "\n\n";
        }

        txt += "节点已全部生成，可直接复制使用。\n";

        res.writeHead(200, {
            "Content-Type": "text/plain; charset=utf-8"
        });

        return res.end(txt);
    }

    res.writeHead(404);
    res.end("404 Not Found");
});

// ============================================================
// =============== WebSocket 后端 ============================
// ============================================================
const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 256 * 1024,
});

const uuidClean = UUID.replace(/-/g, "");

server.on("upgrade", function (req, socket, head) {

    if (req.url !== WS_PATH) {

        socket.destroy();
        return;
    }

    wss.handleUpgrade(req, socket, head, function (ws) {

        wss.emit("connection", ws, req);
    });
});

wss.on("connection", function (ws) {

    let tcp = null;

    ws.once("message", function (msg) {

        if (!Buffer.isBuffer(msg) || msg.length < 18) {

            ws.close();
            return;
        }

        const version = msg[0];
        const id = msg.slice(1, 17);

        for (let i = 0; i < 16; i++) {

            if (
                id[i] !== parseInt(
                    uuidClean.substr(i * 2, 2),
                    16
                )
            ) {

                ws.close();
                return;
            }
        }

        let p = msg[17] + 19;

        const port = msg.readUInt16BE(p);

        p += 2;

        const atyp = msg[p++];

        let host = "";

        if (atyp === 1) {

            host = Array.from(
                msg.slice(p, p + 4)
            ).join(".");

            p += 4;

        } else if (atyp === 2) {

            const len = msg[p];

            host = msg.slice(
                p + 1,
                p + 1 + len
            ).toString();

            p += 1 + len;

        } else if (atyp === 3) {

            const raw = msg.slice(p, p + 16);

            const parts = [];

            for (let i = 0; i < 16; i += 2) {

                parts.push(
                    raw.readUInt16BE(i).toString(16)
                );
            }

            host = parts.join(":");

            p += 16;

        } else {

            ws.close();
            return;
        }

        ws.send(Buffer.from([version, 0]));

        tcp = net.connect(
            { host: host, port: port },
            function () {

                tcp.setNoDelay(true);

                tcp.write(msg.slice(p));

                const duplex =
                    createWebSocketStream(ws);

                duplex.pipe(tcp).pipe(duplex);
            }
        );

        tcp.on("error", function () {

            try {

                ws.close();

            } catch (e) {}
        });
    });

    ws.on("close", function () {

        try {

            if (tcp) {
                tcp.destroy();
            }

        } catch (e) {}
    });

    ws.on("error", function () {});
});

// ============================================================
// =============== 启动 ======================================
// ============================================================
server.listen(LISTEN_PORT, "0.0.0.0");

