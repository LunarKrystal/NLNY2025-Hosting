module.exports = function ({ api, models }) {
    const Users = require("./controllers/users")({ models, api }), Threads = require("./controllers/threads")({ models, api }), Currencies = require("./controllers/currencies")({ models });
    require('./handle/handleData')(api, models, Users, Threads, Currencies)
    const handlers = ['handleRefresh', 'handleCreateDatabase', 'handleEvent', 'handleReaction', 'handleCommandEvent', 'handleCommand', 'handleReply', 'handleUnsend'].reduce((acc, name) => { acc[name] = require(`./handle/${name}`)({ api, Threads, Users, Currencies }); return acc }, {});
    return async (event) => {
        const { logMessageType, type } = event;
        if (logMessageType) return await handlers.handleEvent(event), await handlers.handleRefresh(event);
        if (type === 'message') return await handlers.handleCommandEvent(event), await handlers.handleCreateDatabase(event), await handlers.handleCommand(event);
        if (type === 'message_reaction') return handlers.handleUnsend(event), await handlers.handleReaction(event);
        if (type === 'message_reply') return await handlers.handleReply(event), handlers.handleCommandEvent(event), await handlers.handleCreateDatabase(event), await handlers.handleCommand(event);
        if (type === 'message_unsend') return handlers.handleCommandEvent(event);
    };
};