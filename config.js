/**
 * This file hosts all the configuration for your Rumbler instance.
 * 
 * Do not change ANYTHING except for the intended numbers/booleans,
 * as mistakes here can throw errors when you try torun the program.
 * 
 * To reset your config, copy & paste the original file from Github.
 */

export default {

    websitePort: 3000,
    // the ID of the channel that the bot runs /daily and /balance in.
    // to get a channel ID, enable dev mode & right click the channel.
    // you can also set this to "dm" or leave it blank to use DMs.
    commandChannel: '',

    // whether to automatically run the /daily and /weekly commands.
    autoDaily: false,
    autoWeekly: false,

    blacklist: {
        // a list of server IDs the bot will never join battles in.
        servers: [
            'id1',
            'id2'
        ],

        // a list of channel IDs the bot will never join battles in.
        channels: [
            'id1',
            'id2'
        ]
    },

    delays: {
        // the speed we log into bot accounts.
        // do not go over 1000 (discord ratelimits).
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
    // list: 'online', 'idle', 'dnd', 'invisible'
    statuses: ['dnd'],

     // the ID of the channel where the bot sends battle results.
    resultChannelId: 'your-channel-id',

     // whether to send a slash command each time the bot wins a battle.
    sendSlashOnWin: true
};
