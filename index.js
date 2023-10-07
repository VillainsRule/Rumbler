// Version 1.0.0
const version = '1.0.0';
const repoBase = 'VillainsRule/Rumbler';

let logs = [];
let socketAlive = false;
const log = (log) => {
    logs.push(log);
    if (socketAlive) io.emit('logs', logs);
};

const fs = require('fs');
const SimplDB = require('simpl.db');
const express = require('express');
const chalk = require('chalk');
const selfbot = require('discord.js-selfbot-v13');
const socketio = require('socket.io');

console.log(chalk.red(`> Slashy (Rumble Edition) has started!`))
console.log(chalk.hex('#FFA500')(`\t- Join our Discord: https://discord.gg/BJCms66bcu`))
console.log(chalk.yellowBright(`\n> Your version is: ${version}`))
log(`Slashy (Rumble Edition) has started! Running v${version}.`)

if (!process.version.startsWith('v20')) console.log(chalk.redBright('You are running a NodeJS version under v20. If you don\'t upgrade, you may get large lag spikes or ram overloads.'))

const config = require('./config.js');

process.on('unhandledRejection', (error) => {
    if (error.toString().includes('Cannot read properties of undefined (reading \'type\')')) return;
    if (error.toString().includes('INTERACTION_TIMEOUT')) return;
    console.log(chalk.gray('—————————————————————————————————'));
    console.log(chalk.white('['), chalk.red.bold('Anti-Crash'), chalk.white(']'), chalk.gray(' : '), chalk.white.bold('Unhandled Rejection/Catch'));
    console.log(chalk.gray('—————————————————————————————————'));

    console.error('unhandledRejection', error);
});

process.on('uncaughtException', (error) => {
    console.log(chalk.gray('—————————————————————————————————'));
    console.log(chalk.white('['), chalk.red.bold('Anti-Crash'), chalk.white(']'), chalk.gray(' : '), chalk.white.bold('Unhandled Exception/Catch'));
    console.log(chalk.gray('—————————————————————————————————'));

    console.error('uncaughtException', error);
});

fetch(`https://raw.githubusercontent.com/${repoBase}/main/index.js`).then((res) => res.text()).then((res) => {
    if (res === '404: Not Found') {
        console.log(`> CRITICAL ERROR: Source cannot be fetched. ${(!config.devMode) ? 'Shutting off program...' : 'Keeping program alive due to Dev Mode.'}`);
        if (!config.devMode) process.exit(0);
        else return;
    };

    let v = res.match(/Version ([0-9]*\.?)+/)[0]?.replace('Version ', '');
    if (v && v !== version) console.log(chalk.bold.bgRed(`> There is a new version available: ${v} \n\t- Update: ${chalk.underline(`https://github.com/${repoBase}`)}`));
    log(`v${v} has been released. Please <a href="https://github.com/${repoBase}">update</a> the bot.`)
}).catch((error) => console.log(error));

const db = new SimplDB();
const app = express();

app.use(express.json());
app.use(express.static('site'));

app.get('/api/database', (req, res) => res.json(db.toJSON()));
app.get('/api/config', (req, res) => res.send(config));

const io = new socketio.Server(
    app.listen(config.websitePort, () => console.log(`> Website started. Visit http://localhost:${config.websitePort} to access it.`))
);

socketAlive = true;

io.on('connection', (socket) => {
    socket.emit('balanceUpdate', db);
    socket.emit('logs', logs);
})

let tokens = process.env.tokens ? process.env.tokens.split('\n') : fs.readFileSync('tokens.txt', 'utf-8').split('\n');
let botid = '693167035068317736';

let i = 0;
tokens.forEach((token) => {
    i++;
    setTimeout(() => start(token.trim().split(' ')[0]), i * config.delays.login);
});

async function start(token) {
    let isOnBreak = false;
    let gold = 0;
    let gems = 0;
    let wins = 0;
    let channel = '';

    let client = new selfbot.Client({
        checkUpdate: false
    });

    client.on('ready', async () => {
        client.user.setStatus(config.discordStatus);

        console.log(`${chalk.green('> Logged into @')}${chalk.blue(client.user.username)}`);
        log(`Logged into @${client.user.username}`);

        channel = await client.channels.fetch(config.grindChannelId);

        await channel.sendSlash(botid, 'balance');

        if (config.autoDaily) {
            const now = Date.now();
            const gmt0 = new Date(now).setUTCHours(0, 0, 0, 0);
            let remainingTime;
            if (now > gmt0) {
                const nextGmt0 = new Date(gmt0).setUTCDate(new Date(gmt0).getUTCDate() + 1);
                remainingTime = nextGmt0 - now;
            } else remainingTime = gmt0 - now;

            if (!db.has(client.user.id + '.daily')) await channel.sendSlash(botid, 'daily');

            if (db.get(client.user.id + '.daily') && Date.now() - db.get(client.user.id + '.daily') > remainingTime) {
                await channel.sendSlash(botid, 'daily').then(() => {
                    setInterval(async () => await channel.sendSlash(botid, 'daily'), remainingTime + randomInt(10000, 60000));
                }).catch((e) => console.log(e));
            };
        };

        if (config.autoWeekly) channel.sendSlash(botid, 'weekly');
    });

    client.on('messageCreate', async (message) => {
        if (message.author.id !== botid) return;

        // =================== Win Notice Start ===================
        if (message.mentions.members.size && message.mentions.members.first().id === client.user.id && message.embeds[0]?.title?.includes('WINNER!')) {
            wins++;
            channel.sendSlash(botid, 'balance');
            console.log(`> ${chalk.magentaBright(client.user.username)} won a match and got ${message?.embeds[0]?.description?.match( /(?<=:\*\*\s).*(?=\s<:)/)[0]} coins! Congrats!`);
            log(`${client.user.username} won a match and got ${message?.embeds[0]?.description?.match( /(?<=:\*\*\s).*(?=\s<:)/)[0]} coins! Congrats!`);
        };
        // =================== Win Notice End ===================

        // =================== Claim Checker Start ===================
        if (message.interaction?.user?.id === client.user.id && message?.interaction?.commandName === 'daily' && message?.embeds[0]?.description.includes('You received your daily')) {
            db.set(client.user.id + '.daily', Date.now());
            console.log(chalk.yellow(`> ${client.user.username} claimed daily.`));
            log(`${client.user.username} claimed daily.`);
        };

        if (message.interaction?.user?.id === client.user.id && message?.interaction?.commandName === 'weekly' && message?.embeds[0]?.description.includes('You received your weekly')) {
            console.log(chalk.yellow(`> ${client.user.username} claimed weekly.`));
            log(`${client.user.username} claimed weekly.`);
        };

        // =================== Claim Checker End ===================

        // =================== Update Balance Start ===================

        if (message?.embeds[0]?.author?.name?.toLowerCase().includes(`${client.user.username.toLowerCase()}'s balance`)) {
            gold = parseInt(message?.embeds[0]?.description?.split('\n').filter(a => a.includes('Gold'))[0].split('> ')[1].replace(/,/g, ''));
            gems = parseInt(message?.embeds[0]?.description?.split('\n').filter(a => a.includes('Gems'))[0].split('>')[1].replace(/,/g, ''));

            db.set(client.user.id + '.gold', gold);
            db.set(client.user.id + '.gems', gems);
            io.emit('balanceUpdate', db);

            console.log(`> ${chalk.magentaBright(client.user.username)}: ${chalk.cyan(`Gold: ${gold}`)}, ${chalk.cyan(`Gems: ${gems}`)}`);
            log(`${client.user.username}: Gold: ${gold}, Gems: ${gems}`);
        };

        // =================== Update Balance End ===================

        if (isOnBreak) return;
        await wait(1000);

        // =================== Game Join Start ===================

        if (config.blacklist.servers.indexOf(message?.guild?.id) > -1) return;
        if (config.blacklist.channels.indexOf(message?.channel?.id) > -1) return;

        if (message?.interaction?.commandName === 'battle' && message?.embeds[0]?.title?.includes('Rumble Royale hosted by ')) {
            message.react('872886436012126279');
            console.log(`> ${chalk.magentaBright(client.user.username)} joined a battle created by ${message?.embeds[0]?.title.replace('Rumble Royale hosted by ', '')}! (channel: ${message.channel.id})`);
            log(`${client.user.username} joined a battle created by ${message?.embeds[0]?.title.replace('Rumble Royale hosted by ', '')}! (channel: ${message.channel.id})`);
        }
        if (message?.embeds[0]?.title?.includes('Rumble Royale') && message?.embeds[0]?.footer?.text?.includes('Automatic Session')) {
            message.react('975453286222155786');
            console.log(`> ${chalk.magentaBright(client.user.username)} joined an automatic battle! (channel: ${message.channel.id})`);
            log(`${client.user.username} joined an automatic battle! (channel: ${message.channel.id})`);
        }

        // =================== Game Join End ===================
    });

    setInterval(() => {
        if (isOnBreak) return;

        if (Math.random() < config.breaks.short.frequency) {
            let cooldown = randomInt(config.breaks.short.minLength, config.breaks.short.maxLength);
            isOnBreak = true;
            console.log(`> ${chalk.magentaBright(client.user.username)} ${chalk.gray('is taking a short break for')} ${chalk.yellowBright((cooldown / 1000).toFixed(1))} seconds.`);
            log(`${client.user.username} is taking a short break for ${(cooldown / 1000).toFixed(1)} seconds.`);
            setTimeout(() => isOnBreak = false, cooldown);
        } else if (Math.random() < config.breaks.long.frequency) {
            let cooldown = randomInt(config.breaks.long.minLength, config.breaks.long.maxLength);
            isOnBreak = true;
            console.log(`> ${chalk.magentaBright(client.user.username)}: ${chalk.gray('Taking a long break for')} ${chalk.yellowBright((cooldown / 1000).toFixed(1))} seconds.`);
            log(`${client.user.username} is taking a long break for ${(cooldown / 1000).toFixed(1)} seconds.`);
            setTimeout(() => isOnBreak = false, cooldown);
        };
    }, 45000);

    client.login(token).catch((err) => {
        if (err.toString().includes('TOKEN_INVALID')) {
            console.log(`> ${chalk.redBright('ERROR:')} ${chalk.blueBright('The token you provided is invalid')} - ${chalk.blue(token)}`);
            log(`ERROR: Token "${token}" is invalid.`);
        };
    });
};

const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (mix, max) => Math.floor(Math.random() * (max - min + 1)) + min;
