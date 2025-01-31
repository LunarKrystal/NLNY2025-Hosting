const stringSimilarity = require('string-similarity');
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const logger = require("../../utils/log.js");
global.prefixTO = {}
module.exports = function ({ api, models, Users, Threads, Currencies }) {
    return async function (event) {
        const { PREFIX, ADMINBOT, MAINTENANCE, NDH } = global.config;
        const { commands, cooldowns } = global.client;
        let { body, senderID, threadID, messageID } = event;

        if (!global.prefixTO[threadID]) {
            const threadData = await Threads.getData(threadID);
            global.prefixTO[threadID] = threadData?.data?.PREFIX || PREFIX;
        }
        const prefix = global.prefixTO[threadID];
        const prefixRegex = new RegExp(`^(<@!?${senderID}>|${escapeRegex(prefix)})\\s*`);
        if (!prefixRegex.test(body)) return;

        if (!ADMINBOT.includes(senderID) && MAINTENANCE) return api.sendMessage('⚠️ Bot đang bảo trì, vui lòng quay lại sau!', threadID, messageID);

        const [matchedPrefix] = body.match(prefixRegex);
        const args = body.slice(matchedPrefix.length).trim().split(/ +/);
        let commandName = args.shift().toLowerCase();
        let command = commands.get(commandName);

        if (!command) {
            const allCommands = Array.from(commands.keys());
            const { bestMatch } = stringSimilarity.findBestMatch(commandName, allCommands);
            if (bestMatch.rating >= 0.5)
                command = commands.get(bestMatch.target);
            else return api.sendMessage(`❎ Lệnh không tồn tại. Gõ "${prefix}menu" để xem danh sách lệnh.
✏️ Gợi ý: ${bestMatch.target}`, threadID, messageID);
        }

        let permission = 0;
        if (ADMINBOT.includes(senderID)) permission = 3;
        else if (NDH.includes(senderID)) permission = 2;
        else {
            try {
                const threadInfo = (await api.getThreadInfo(threadID))
                const isAdmin = threadInfo.adminIDs?.some(admin => admin.id == senderID);
                if (isAdmin) permission = 1;
            } catch (error) {
                logger(`Lỗi khi lấy thông tin nhóm: ${error}`, "error");
            }
        }

        if (command.config.hasPermssion > permission) return api.sendMessage(`❌ Bạn cần quyền "${["Thành viên", "Quản trị viên", "SUPPORTBOT", "ADMINBOT"][command.config.hasPermssion]}" để sử dụng lệnh này!`, threadID, messageID);
        const now = Date.now();
        if (!cooldowns.has(command.config.name)) cooldowns.set(command.config.name, new Map());
        const timestamps = cooldowns.get(command.config.name);
        const cooldownAmount = (command.config.cooldowns || 1) * 1000;

        if (timestamps.has(senderID)) {
            const expirationTime = timestamps.get(senderID) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
                return api.sendMessage(`⏳ Vui lòng chờ ${timeLeft} giây trước khi sử dụng lại lệnh.`, threadID, messageID);
            }
        }
        timestamps.set(senderID, now);
        try {
            await command.run({ api, event, args, models, Users, Threads, Currencies, permission });
        } catch (error) {
            api.sendMessage(`❌ Đã xảy ra lỗi: ${error.message}`, threadID, messageID);
            logger(`Lỗi khi thực thi lệnh ${commandName}: ${error.stack}`, "error");
        }
    };
};
