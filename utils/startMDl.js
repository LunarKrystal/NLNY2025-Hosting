const fs = require('fs');
const path = require('path');
const logger = require("./log");

module.exports = async (api, event, models) => {
    global.loadMdl = function (mdl) {
        const modules = fs.readdirSync(path.join(`./modules/${mdl}`))
            .filter(module => module.endsWith('.js'));
        for (let module of modules) {
            try {
                const mdlModule = require(`../modules/${mdl}/${module}`);
                if (mdl === "commands") {
                    if (!mdlModule.config || !mdlModule.run || !mdlModule.config.commandCategory) {
                        logger(`Module không đúng định dạng: ${module}`, "error");
                        continue;
                    }
                    if (global.client.commands.has(mdlModule.config.name || "")) {
                        logger(`Tên module đã tồn tại: ${module}`, "error");
                        continue;
                    }
                    if (mdlModule.onLoad) mdlModule.onLoad({ api, models });
                    global.client.commands.set(mdlModule.config.name, mdlModule);
                } else if (mdl === "events") {
                    if (!mdlModule.config || !mdlModule.config.name || !mdlModule.config.eventType || !mdlModule.run) {
                        logger(`Module không đúng định dạng: ${module}`, "error");
                        continue;
                    }
                    if (global.client.events.has(mdlModule.config.name || "")) {
                        logger(`Tên module đã tồn tại: ${module}`, "error");
                        continue;
                    }
                    if (mdlModule.onLoad) mdlModule.onLoad({ api, models });
                    global.client.events.set(mdlModule.config.name, mdlModule);
                } else {
                    logger(`Loại module không hợp lệ: ${mdl}`, "error");
                }
            } catch (e) {
                logger(`Lỗi khi tải module: ${module}\nLỗi: ${e.stack || e.message || JSON.stringify(e, null, 2)}`, "error");
            }
        }
    };

    global.loadMdl("commands");
    global.loadMdl("events");
}
