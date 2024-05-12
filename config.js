/**
 * This file hosts all the configuration for your Rumbler instance.
 * 
 * The words left here will not impact the functionality of the bot,
 * so you might want to leave these helpful guides if you need later.
 * 
 * Do not change ANYTHING except for the intended numbers/booleans,
 * as improper editing can break the program as well as your config.
 * 
 * To reset your config, just copy/paste the default file from Github.
 */

export default {
    // the ID of the channel that the bot runs /daily and /balance in.
    // to get a channel ID, enable dev mode & right click the channel.
    commandChannel: '',
 
    // whether to automatically run the /daily and /weekly commands.
    autoDaily: true,
    autoWeekly: true,
    
    // a list of channels/servers to blacklist.
    // if a server id/channel id is here, the bot will never join battles in that channel.
    blacklist: {
        // a list of server IDs the bot will never join battles in
        servers: [
            'server id 1',
            'server id 2'
        ],
        
        // a list of channel IDs the bot will never join battles in
        channels: [
            'channel id 1',
            'channel id 2'
        ]
    },

    // a large delay manager.
    delays: {
        // how fast to log into the bot accounts.
        // follow discord ratelimits for this one.
        login: 1500,

        // the general delay before joining a battle.
        // format: [min, max] ex. [3000, 5000]
        joinBattle: [4000, 7000]
    },

    // a break manager.
    breaks: {
        // the settings for a short break
        short: {
            minLength: 20000,
            maxLength: 50000,
            frequency: 0.01
        },

        // the settings for a long break
        long: {
            minLength: 100000,
            maxLength: 125000,
            frequency: 0.005
        }
    },

    // the statuses the bot can login with.
    statuses: ['dnd']
};