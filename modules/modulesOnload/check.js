module.exports = async function ({ api, models }) {
    const fs = require("fs-extra");
    const checkttDataPath = './modules/commands/tt/';
    let day = global.client.getTime("day");
    const users = require('./../../includes/controllers/users');
    const Users = await users({ api, models });

    setInterval(async () => {
        const day_now = global.client.getTime("day");
        if (day != day_now) {
            day = day_now;
            const checkttData = fs.readdirSync(checkttDataPath);
            console.log('-> CHECKTT: Ngày Mới');
            for (const checkttFile of checkttData) {
                const checktt = JSON.parse(fs.readFileSync(checkttDataPath + checkttFile));
                let storage = [], count = 1;
                for (const item of checktt.day) {
                    const userName = await Users.getNameUser(item.id) || 'Facebook User';
                    const itemToPush = item;
                    itemToPush.name = userName;
                    storage.push(itemToPush);
                }
                storage.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                let checkttBody = '[ Top 15 Tương Tác Ngày ]\n\n';
                checkttBody += storage.slice(0, 15).map(item => {
                    return `👑 Top: ${count++}\n👤 Tên: ${item.name}\n💬 Tin Nhắn: ${item.count}\n`;
                }).join('\n');
                api.sendMessage(`${checkttBody}\n📝 Tương tác để giành top nhé`, checkttFile.replace('.json', ''), (err) => err ? console.log(err) : '');

                checktt.day.forEach(e => {
                    e.count = 0;
                });
                checktt.time = day_now;

                fs.writeFileSync(checkttDataPath + checkttFile, JSON.stringify(checktt, null, 4));
            }

            if (new Date().getDay() === 1) {
                console.log('-> CHECKTT: Tuần Mới');
                for (const checkttFile of checkttData) {
                    const checktt = JSON.parse(fs.readFileSync(checkttDataPath + checkttFile));
                    let storage = [], count = 1;
                    for (const item of checktt.week) {
                        const userName = await Users.getNameUser(item.id) || 'Facebook User';
                        const itemToPush = item;
                        itemToPush.name = userName;
                        storage.push(itemToPush);
                    }
                    storage.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                    let checkttBody = '[ TOP 15 TƯơNG TÁC TUẦN ]\n\n';
                    checkttBody += storage.slice(0, 15).map(item => {
                        return `${count++}. ${item.name} (${item.count})`;
                    }).join('\n');
                    api.sendMessage(`${checkttBody}\n📝 Tương tác để giành top nhé`, checkttFile.replace('.json', ''), (err) => err ? console.log(err) : '');

                    checktt.week.forEach(e => {
                        e.count = 0;
                    });

                    fs.writeFileSync(checkttDataPath + checkttFile, JSON.stringify(checktt, null, 4));
                }
            }

            global.client.sending_top = false;
        }
    }, 1000 * 10);
}
