process.on('uncaughtException', error => console.error('Unhandled Exception:', error));
process.on('unhandledRejection', (reason, promise) => { console.error('Unhandled Rejection:', reason) });
const moment = require("moment-timezone");
const fs = require('fs');
const logger = require("./utils/log");
const login = require('./includes/fca');
const path = require('path');

global.client = {
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map(),
    eventRegistered: [],
    handleReaction: [],
    handleReply: [],
    getTime: option => moment.tz("Asia/Ho_Chi_minh").format({
        seconds: "ss",
        minutes: "mm",
        hours: "HH",
        day: "dddd",
        date: "DD",
        month: "MM",
        year: "YYYY",
        fullHour: "HH:mm:ss",
        fullYear: "DD/MM/YYYY",
        fullTime: "HH:mm:ss DD/MM/YYYY"
    }[option])
};

global.data = new Object({
    threadInfo: new Map(),
    threadData: new Map(),
    userName: new Map(),
    userBanned: new Map(),
    threadBanned: new Map(),
    commandBanned: new Map(),
    allUserID: new Array(),
    allCurrenciesID: new Array(),
    allThreadID: new Array(),
    groupInteractionsData: new Array(),
});

global.config = {};
global.moduleData = new Array();
global.language = new Object();
global.timeStart = Date.now();
global.nodemodule = new Proxy({}, {
    get: (target, name) => {
        if (!target[name]) {
            target[name] = require(name);
        }
        return target[name];
    }
});

try {
    const configValue = require('./config.json');
    Object.assign(global.config, configValue);
    logger.loader("Config Loaded!");
} catch (error) {
    return logger.loader("Config file not found!", "error");
}

const appPath = path.resolve(__dirname, 'appstate.json');
let appstate;

try {
    appstate = require(appPath);
    logger.loader('Đã tìm thấy và đọc được tệp appstate.json');
} catch (error) {
    return logger.loader('Lỗi khi đọc appstate.json:', "error");
}


const langData = fs.readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, { encoding: "utf-8" }).split(/\r?\n|\r/).filter((item) => item.indexOf("#") != 0 && item != "");


for (const item of langData) {
    const getSeparator = item.indexOf("=");
    const itemKey = item.slice(0, getSeparator);
    const itemValue = item.slice(getSeparator + 1, item.length);
    const head = itemKey.slice(0, itemKey.indexOf("."));
    const key = itemKey.replace(head + ".", "");
    const value = itemValue.replace(/\\n/gi, "\n");
    if (typeof global.language[head] == "undefined") global.language[head] = new Object();
    global.language[head][key] = value;
}


global.getText = function (...args) {
    const langText = global.language;
    if (!langText.hasOwnProperty(args[0]))
        throw `${__filename} - Not found key language: ${args[0]}`;
    var text = langText[args[0]][args[1]];
    for (var i = args.length - 1; i > 0; i--) {
        const regEx = RegExp(`%${i}`, "g");
        text = text.replace(regEx, args[i + 1]);
    }
    return text;
};

const { Sequelize, sequelize } = require("./includes/database");
const database = require("./includes/database/model");

function onBot({ models }) {
    const handleError = (err) => {
        //logger(JSON.stringify(err, null, 2), `[ LOGIN ERROR ] >`);
        logger("Thay appstate đi !", `[ LOGIN ERROR ] >`);
    };
    const initializeBot = (api, models) => {
        api.setOptions(global.config.FCAOption);
        global.client.api = api;
        require('./utils/startMDl')(api, models);
        fs.readdirSync(path.join('./modules/modulesOnload')).filter(module => module.endsWith('.js')).forEach(module => require(`./modules/modulesOnload/${module}`)({ api, models }));
        const handleEvent = require('./includes/listen')({ api, models });
        function handleMqttEvents(error, message) {
            if (error) return logger('Lỗi khi lắng nghe sự kiện: ' + JSON.stringify(error), 'error');
            if (message && !['presence', 'typ', 'read_receipt'].includes(message.type)) handleEvent(message);
        }

        setInterval(() => {
            logger("TIẾN HÀNH TẢI LẠI MQTT", "RELOAD MQTT");
            mqttClient.end();
            api.listenMqtt(handleMqttEvents);
        }, 1000 * 60 * 60 * 3);
        api.listenMqtt(handleMqttEvents);
    };

    try {
        login({ appState: appstate }, (err, api) => {
            if (err) return handleError(err);
            fs.writeFileSync(appPath, JSON.stringify(api.getAppState(), null, "\t"));
            initializeBot(api, models);
            logger.loader("┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
            logger.loader(` ID BOT: ${api.getCurrentUserID()}`);
            logger.loader(` PREFIX: ${!global.config.PREFIX ? "Bạn chưa set prefix" : global.config.PREFIX}`);
            logger.loader(` NAME BOT: ${(!global.config.BOTNAME) ? "This bot was made by Niio-team" : global.config.BOTNAME}`);
            logger.loader(` Tổng số module: ${global.client.commands.size}`);
            logger.loader(` Tổng số sự kiện: ${global.client.events.size}`);
            logger.loader("┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛");
            logger.loader(`Thời gian khởi động chương trình: ${Math.floor((Date.now() - global.timeStart) / 1000)}s`);
        });
        const monitorMemory = () => {
            logger.loader("BẮT ĐẦU GIÁM SÁT BỘ NHỚ!!");
            setInterval(() => {
                const memoryUsage = process.memoryUsage();
                const totalMemory = memoryUsage.rss;
                const totalMemoryMB = totalMemory / (1024 * 1024);
                logger(`Bộ nhớ RAM đang sử dụng: ${totalMemoryMB.toFixed(2)} MB`, "[ Giám sát ]");
                if (totalMemory > 500 * 1024 * 1024) {
                    logger('⚠️ Rò rỉ bộ nhớ phát hiện, khởi động lại ứng dụng...', "[ Giám sát ]");
                    startBot();
                }
            }, 60000);
        };
        monitorMemory();

    } catch (err) {
        handleError(err);
        process.exit(1);
    }
}

(async () => {
    try {
        const { Sequelize } = require("sequelize");
        await sequelize.authenticate();
        const authentication = {};
        authentication.Sequelize = Sequelize;
        authentication.sequelize = sequelize;
        const models = database(authentication);
        logger(`Kết nối đến cơ sở dữ liệu thành công`, "[ DATABASE ] >");
        const botData = {};
        botData.models = models;
        logger.autoLogin(onBot, botData);
    } catch (error) {
        logger(`Kết nối đến cơ sở dữ liệu thất bại`, "[ DATABASE ] >");
    }
})();