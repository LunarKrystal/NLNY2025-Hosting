const os = require('os');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const nodeDiskInfo = require('node-disk-info');
const path = require('path');

const formatSize = (size) => {
    if (size < 1024) return `${size} B`;
    else if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    else return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getTotalSize = async (dirPath) => {
    let totalSize = 0;

    const calculateSize = async (filePath) => {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
            totalSize += stats.size;
        } else if (stats.isDirectory()) {
            const fileNames = await fs.readdir(filePath);
            await Promise.all(fileNames.map(fileName => calculateSize(path.join(filePath, fileName))));
        }
    };

    await calculateSize(dirPath);

    return totalSize;
};

module.exports = {
    config: {
        name: "upt",
        version: "2.1.4",
        hasPermission: 0,
        Rent: 2,
        credits: "Vtuan rmk Niio-team",
        description: "Display system information of the bot!",
        commandCategory: "Admin",
        usages: "",
        cooldowns: 5,
        usePrefix: false,
    },
    run: async ({ api, event, Users, args }) => {
        const startPing = Date.now();

        const getDependencyCount = async () => {
            try {
                const packageJsonString = await fs.readFile('package.json', 'utf8');
                const packageJson = JSON.parse(packageJsonString);
                return Object.keys(packageJson.dependencies).length;
            } catch (error) {
                console.error('❎ Cannot read package.json file:', error);
                return -1;
            }
        };

        const p = args[0] || './';
        const f = await fs.readdir(p);

        let totalSize = 0;

        await Promise.all(f.map(async (n) => {
            const filePath = path.join(p, n);
            const stats = await fs.stat(filePath);

            if (stats.isDirectory()) {
                const dirSize = await getTotalSize(filePath);
                totalSize += dirSize;
            } else {
                totalSize += stats.size;
            }
        }));

        const getStatusByPing = (ping) => ping < 200 ? 'smooth' : ping < 800 ? 'average' : 'lag';

        const memoryUsage = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const uptime = process.uptime();
        const [uptimeHours, uptimeMinutes, uptimeSeconds] = [
            Math.floor(uptime / 3600),
            Math.floor((uptime % 3600) / 60),
            Math.floor(uptime % 60)
        ];
        const name = await Users.getNameUser(event.senderID);
        const dependencyCount = await getDependencyCount();
        const botStatus = getStatusByPing(Date.now() - startPing);

        try {
            const disks = await nodeDiskInfo.getDiskInfo();
            const firstDisk = disks[0] || {};

            const convertToGB = (bytes) => bytes ? (bytes / (1024 * 1024 * 1024)).toFixed(2) + 'GB' : 'N/A';

            const pingReal = Date.now() - startPing;

            const replyMsg = `
🕒 ${moment().tz('Asia/Ho_Chi_Minh').format('HH:mm:ss')} | 📅 ${moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY')}
⌛ Uptime: ${uptimeHours.toString().padStart(2, '0')}:${uptimeMinutes.toString().padStart(2, '0')}:${uptimeSeconds.toString().padStart(2, '0')}
🔣 Bot status: ${botStatus}
🛢️ Total RAM: ${(totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB
🔍 Free RAM: ${(freeMemory / 1024 / 1024 / 1024).toFixed(2)}GB
💾 Used RAM: ${(usedMemory / 1024 / 1024 / 1024).toFixed(2)}GB
📈 RSS Memory Usage: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB
📊 Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB
🔋 Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB
🔍 External Memory: ${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB
📊 Free storage: ${convertToGB(firstDisk.available)}
🗂️ Total packages: ${dependencyCount >= 0 ? dependencyCount : "Unknown"}
🛜 Ping: ${pingReal}ms
💾 Total File Size: ${formatSize(totalSize)}
👤 Requested by: ${name}
`.trim();

            api.sendMessage(replyMsg, event.threadID, event.messageID);
        } catch (error) {
            console.error('❎ Error getting disk information:', error.message);
        }
    }
};