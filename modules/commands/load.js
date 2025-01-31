const { readdirSync } = require('fs-extra');
const { join } = require('path');
const path = require('path');

module.exports.config = {
    name: "load",
    version: "2.0.0",
    hasPermssion: 2,
    credits: "Niio-team (Vtuan)",
    description: "Load module",
    commandCategory: "Admin",
    usages: "[all] | + (có thể có Event) +  [tên module] | All",
    cooldowns: 0,
};
const fs = require('fs-extra');
const logger = require('../../utils/log')
module.exports.run = async function ({ event, args, api, models }) {
    const threadID = event.threadID;
    const messageID = event.messageID;

    function reloadModule(type, name) {
        const dirPath = type === 'commands' ? __dirname : path.join(__dirname, '..', 'events');
        const filePath = path.join(dirPath, `${name}.js`);
        delete require.cache[require.resolve(filePath)];
        try {
            const mdlModule = require(filePath);

            if (type === 'commands') {
                if (!mdlModule.config || !mdlModule.run || !mdlModule.config.commandCategory) {
                    return api.sendMessage(`❎ Module không đúng định dạng: ${name}`, threadID, messageID);
                }
            }
            else if (type === 'events') {
                if (!mdlModule.config || !mdlModule.config.name || !mdlModule.config.eventType || !mdlModule.run) {
                    return api.sendMessage(`❎ Module không đúng định dạng: ${name}`, threadID, messageID);
                }
            }

            if (mdlModule.onLoad) mdlModule.onLoad(api, models);
            global.client[type].set(mdlModule.config.name, mdlModule);
            api.sendMessage(`✅ Đã tải lại thành công ${type.slice(0, -1)} ${name}!`, threadID, messageID);
        } catch (error) {
            console.error(`❎ Lỗi khi tải lại ${type.slice(0, -1)} ${name}: ${error.message}`);
            api.sendMessage(`❎ Lỗi khi tải lại ${type.slice(0, -1)} ${name}`, threadID, messageID);
        }
    }


    if (args[0] === "All") {
        for (const command of global.client.commands.keys()) {
            global.client.commands.delete(command);
        }
        for (const event of global.client.events.keys()) {
            global.client.events.delete(event);
        }
        const commandFiles = readdirSync(__dirname).filter(file => file.endsWith('.js') && !file.includes('example'));
        for (const file of commandFiles) {
            const filePath = join(__dirname, file);
            delete require.cache[require.resolve(filePath)];
        }
        const eventFiles = readdirSync(path.join(__dirname, '..', 'events')).filter(file => file.endsWith('.js') && !file.includes('example'));

        for (const file of eventFiles) {
            const filePath = join(__dirname, '..', 'events', file);
            delete require.cache[require.resolve(filePath)];
        }

        loadMdl('commands');
        loadMdl('events');
        api.sendMessage('✅ Đã tải thành công ' + global.client.commands.size + ' modules' + 'và ' + global.client.events.size + ' event', threadID, messageID);
    } else if (args[0] === "Event") {
        const eventName = args[1];
        if (!eventName) {
            return api.sendMessage('❎ Vui lòng nhập tên event cần tải lại hoặc sử dụng "all" để tải lại tất cả các events.', threadID, messageID);
        }
        if (global.client.events.has(eventName)) {
            global.client.events.delete(eventName);
        }
        reloadModule('events', eventName);
    } else {
        const moduleName = args[0];
        if (!moduleName) {
            return api.sendMessage('❎ Vui lòng nhập tên lệnh cần tải lại hoặc sử dụng "all" để tải lại tất cả các lệnh.', threadID, messageID);
        }
        if (global.client.commands.has(moduleName)) {
            global.client.commands.delete(moduleName);
        }
        reloadModule('commands', moduleName);
    }
};

function loadMdl(mdl, api, models) {
    const modules = fs.readdirSync(path.join(`./modules/${mdl}`))
        .filter(module => module.endsWith('.js'));
    for (let module of modules) {
        try {
            if (mdl === "commands") {
                // console.log(`abcxyz`)
                const mdlModule = require(`../commands/${module}`);
                if (!mdlModule.config || !mdlModule.run || !mdlModule.config.commandCategory) {
                    logger(`Module không đúng định dạng: ${module}`, "error");
                    continue;
                }
                if (global.client.commands.has(mdlModule.config.name || "")) {
                    logger(`Tên module đã tồn tại: ${module}`, "error");
                    continue;
                }
                if (mdlModule.onLoad) mdlModule.onLoad(api, models);
                global.client.commands.set(mdlModule.config.name, mdlModule);
            } else if (mdl === "events") {
                const mdlModule = require(`../events/${module}`);
                if (!mdlModule.config || !mdlModule.config.name || !mdlModule.config.eventType || !mdlModule.run) {
                    logger(`Module không đúng định dạng: ${module}`, "error");
                    continue;
                }
                if (global.client.events.has(mdlModule.config.name || "")) {
                    logger(`Tên module đã tồn tại: ${module}`, "error");
                    continue;
                }
                if (mdlModule.onLoad) mdlModule.onLoad(api, models);
                global.client.events.set(mdlModule.config.name, mdlModule);
            } else {
                logger(`Loại module không hợp lệ: ${mdl}`, "error");
            }
        } catch (e) {
            logger(`Lỗi khi tải module: ${module}\nLỗi: ${e.stack || e.message || JSON.stringify(e, null, 2)}`, "error");
        }
    }
};