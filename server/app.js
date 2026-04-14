const myArgs = process.argv.slice(2);
const domain = myArgs[0];
const port = myArgs[1];

const fs = require('fs'),
    options = {
        key: fs.readFileSync(myArgs[3]),
        cert: fs.readFileSync(myArgs[2]),
        ca: fs.readFileSync(myArgs[4])
    };
const app = require('express')(),
    server = require('https').createServer(options, app),
    io = require('socket.io')(server, {
        cors: {
            origin: "https://klyvex-test.ai",
            // origin: "https://klyvex.ai",
            methods: ["GET", "POST"],
            credentials: true
        },
        maxHttpBufferSize: 50e6, // 50MB - максимальный размер сообщения для base64 изображений
        pingTimeout: 120000,     // 2 минуты для долгих операций
        pingInterval: 25000      // Ping каждые 25 секунд
    }),
    axios = require('axios'),
    RabbitMqConnection = require('rabbitmq-client').Connection;

axios.defaults.baseURL = domain + '/api/bot/';

server.listen(port, function () {
    console.log(`Сервер успешно запущен, порт - ${port}`);
});

const CONFIG = {
    EVENTS: {
        MAIN: {
            SEND: { name: 'send-main-event' },
            RECEIVE: { name: 'receive-main-event' }
        },
        ERROR: {
            RECEIVE: { name: 'receive-error-event' }
        },
        AI: {
            SEND: { name: 'send-ai-event' },
            RECEIVE: { name: 'receive-ai-event' }
        }
    },
    TYPES: {
        MAIN: {
            AUTH: { name: 'auth' },
            SESSION: { name: 'session', METHODS: { CREATE: { name: 'create' } } },
            DICTIONARY: { name: 'dictionary' }
        },
        AI: {
            REQUEST: {
                name: 'request',
                TYPES: {
                    TEXT: { name: 'text' },
                    IMAGE: { name: 'image' },
                    VIDEO: { name: 'video' }
                }
            }
        }
    },
    QUEUES: {
        REQUEST: {
            AI: { name: 'klyvex-front-ai-requests' },
            MAIN: { name: 'klyvex-requests' }
        },
        RESPONSE: {
            AI: { name: 'klyvex-front-ai-responses' },
            MAIN: { name: 'klyvex-responses' }
        }
    },
    DATA: {
        AI: {
            models: []
        }
    }
};

const RABBIT_CONFIG = {
    host: 'fofuhufula.beget.app',
    port: 5672,
    username: 'admin',
    password: 'AP34%MfC'
};

const rabbitConnection = new RabbitMqConnection({
    password: RABBIT_CONFIG.password,
    hostname: RABBIT_CONFIG.host,
    port: RABBIT_CONFIG.port,
    username: RABBIT_CONFIG.username
});

rabbitConnection.on('error', (err) => {
    console.log('RabbitMQ connection error', err);
});

rabbitConnection.on('connection', () => {
    console.log('Connection successfully (re)established');

    const sendToQueue = rabbitConnection.createPublisher({ confirm: true, maxAttempts: 2 });

    const handleFromFrontAi = rabbitConnection.createConsumer({
        queue: CONFIG.QUEUES.RESPONSE.AI.name,
        queueOptions: { durable: true },
        qos: { prefetchCount: 2 },
    }, async (msg) => {
        console.log(`Response from ai:           ${msg.body.toString()}\n`);

        var response = JSON.parse(msg.body);
        io.sockets.emit(`${CONFIG.EVENTS.AI.RECEIVE.name}-${response.id}`, response);
    });

    const handleFromFrontBack = rabbitConnection.createConsumer({
        queue: CONFIG.QUEUES.RESPONSE.MAIN.name,
        queueOptions: { durable: true },
        qos: { prefetchCount: 2 },
    }, async (msg) => {
        console.log(`Response from back:         ${msg.body.toString()}\n`);

        let data = JSON.parse(msg.body);
        if (data.type == CONFIG.TYPES.MAIN.DICTIONARY.name) {
            CONFIG.DATA.AI.models = data.models;
        } else {
            let response = {};
            if (data.type == CONFIG.TYPES.MAIN.AUTH.name) {
                response = { ...data, models: CONFIG.DATA.AI.models };
            } else {
                response = { ...data };
            }

            io.sockets.emit(`${CONFIG.EVENTS.MAIN.RECEIVE.name}-${data.id}`, response);
        }
    });

    io.on('connection', (socket) => {
        socket.on(CONFIG.EVENTS.AI.SEND.name, (ctx) => {
            sendToQueue.send(CONFIG.QUEUES.REQUEST.AI.name, ctx);
            console.log(`Send request to ai:         ${JSON.stringify(ctx)}\n`);
        });

        socket.on(CONFIG.EVENTS.MAIN.SEND.name, (ctx) => {
            sendToQueue.send(CONFIG.QUEUES.REQUEST.MAIN.name, ctx);
            console.log(`Send request to back:       ${JSON.stringify(ctx)}\n`);
        });
    });

    sendToQueue.send(CONFIG.QUEUES.REQUEST.MAIN.name, { type: CONFIG.TYPES.MAIN.DICTIONARY.name, id: -1 });
});