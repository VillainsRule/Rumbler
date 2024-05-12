const { emit: originalEmit } = process;
process.emit = function (event, error) {
    return event === 'warning' && error.name === 'DeprecationWarning' ? false : originalEmit.apply(process, arguments);
};

import fs from 'fs';
import chalk from 'chalk';
import * as selfbot from 'discord.js-selfbot-v13';

import config from '../config.js';

console.clear();
console.log(chalk.green(`\n\n\tuser@null ~ $ RUMBLER`));

if (!fs.existsSync('./db')) fs.mkdirSync('./db');
if (!fs.existsSync('./db/accounts.json')) fs.writeFileSync('./db/accounts.json', '{}');

const db = JSON.parse(fs.readFileSync('./db/accounts.json', 'utf-8'));
const save = () => fs.writeFileSync('./db/accounts.json', JSON.stringify(db, null, 4));

const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sanitize = (str) => str?.replace(/[^A-Z\d\s']/gi, '');

const start = async (token) => {
    let onBreak = false;
    let gold = 0;
    let gems = 0;
    let wins = 0;
    let channel;

    let client = new selfbot.Client({ checkUpdate: false });

    client.on('ready', async () => {
        client.user.setStatus(config.statuses[config.statuses.length * Math.random() | 0]);

        console.log(chalk.blue(`\t   > Logged into ${chalk.bold('@' + client.user.username)}`));

        channel = await client.channels.fetch(config.commandChannel);

        if (!db[client.user.id]) {
            db[client.user.id] = { username: client.user.username };
            save();
        };

        if (config.autoDaily) {
            if (!db[client.user.id].daily) await channel.sendSlash('693167035068317736', 'daily');
            else if (db[client.user.id].daily && (db[client.user.id].daily - Date.now() < 0)) await channel.sendSlash('693167035068317736', 'daily');
            else setTimeout(() => channel.sendSlash('693167035068317736', 'daily'), Date.now() - db[client.user.id].daily);
        };

        if (config.autoWeekly) {
            if (!db[client.user.id].weekly) await channel.sendSlash('693167035068317736', 'weekly');
            else if (db[client.user.id].weekly && (db[client.user.id].weekly - Date.now() < 0)) await channel.sendSlash('693167035068317736', 'weekly');
            else setTimeout(() => channel.sendSlash('693167035068317736', 'weekly'), Date.now() - db[client.user.id].weekly);
        };
    });

    client.on('messageCreate', async (message) => {
        if (message.author.id !== '693167035068317736') return;

        if (
            message.mentions.members?.size &&
            message.mentions.members.first().id === client.user.id &&
            sanitize(message.embeds[0]?.title)?.includes('WINNER!')
        ) {
            wins++;
            channel.sendSlash('693167035068317736', 'balance');
            console.log(chalk.yellow(`\t   > ${chalk.bold('@' + client.user.username)} won a match and got ${Number(message?.embeds[0]?.description?.match(/(?<=:\*\*\s).*(?=\s<:)/)[0]).toLocaleString()} gold!`));
        };

        if (
            message.interaction?.user?.id === client.user.id &&
            message?.interaction?.commandName === 'daily' &&
            sanitize(message?.embeds[0]?.description).includes('You received your daily')
        ) {
            db[client.user.id].daily = Date.now() + 8.64e+7;
            save();
            console.log(chalk.blue(`\t   > ${client.user.username} claimed daily.`));
        };

        if (
            message.interaction?.user?.id === client.user.id &&
            message?.interaction?.commandName === 'weekly' &&
            sanitize(message?.embeds[0]?.description).includes('You received your weekly')
        ) {
            db[client.user.id].weekly = Date.now() + 6.048e+8;
            save();
            console.log(chalk.blue(`\t   > ${client.user.username} claimed weekly.`));
        };

        if (message?.embeds[0]?.author?.name?.toLowerCase().includes(`${client.user.username.toLowerCase()}'s balance`)) {
            gold = Number(message.embeds[0].description.match(/Gold\*\*: [a-zA-Z0-9:\<\>]+ ([0-9,]+)/)[1].replace(/,/g, ''));
            gems = Number(message.embeds[0].description.match(/Gold\*\*: [a-zA-Z0-9:\<\>]+ ([0-9,]+)/)[1].replace(/,/g, ''));

            db[client.user.id].gold = gold;
            db[client.user.id].gems = gems;
            save();

            console.log(chalk.yellow(`\t   > ${chalk.bold('@' + client.user.username)} has ${gold.toLocaleString()} gold & ${gems.toLocaleString()} gems!`));
        };

        if (
            onBreak ||
            config.blacklist.servers.includes(message?.guild?.id) ||
            config.blacklist.channels.includes(message?.channel?.id)
        ) return;

        if (
            sanitize(message.embeds[0]?.title)?.includes('Started a new') &&
            sanitize(message.embeds[0]?.description)?.includes(client.user.id)
        ) console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} has a battle starting in #${message.channel.name}!`));

        await wait(config.delays.joinBattle[0], config.delays.joinBattle[1]);

        if (
            message?.interaction?.commandName === 'battle' &&
            sanitize(message?.embeds[0]?.title)?.includes('Rumble Royale')
        ) {
            message.react('1238266638046855180');
            console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined a battle created by ${message?.embeds[0]?.title.match(/by (.*?)$/)[1]} in #${message.channel.name}!`));
        };

        if (
            sanitize(message.embeds[0]?.title)?.includes('Rumble Royale') &&
            sanitize(message?.embeds[0]?.footer?.text)?.includes('Automatic Session')
        ) {
            message.react('1238266638046855180');
            console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined an automatic battle in #${message.channel.name}!`));
        };
    });

    setInterval(() => {
        if ((Math.random() < config.breaks.short.frequency) && !onBreak && client.user?.username) {
            let cooldown = randomInt(config.breaks.short.minLength, config.breaks.short.maxLength);

            onBreak = true;
            setTimeout(() => onBreak = false, cooldown);

            console.log(chalk.magenta(`\t   > ${chalk.bold('@' + client.user.username)} is taking a short break for ${(cooldown / 1000).toFixed(1)} seconds.`));
        };

        if ((Math.random() < config.breaks.long.frequency) && !onBreak && client.user?.username) {
            let cooldown = randomInt(config.breaks.long.minLength, config.breaks.long.maxLength);

            onBreak = true;
            setTimeout(() => onBreak = false, cooldown);

            console.log(chalk.magenta(`\t   > ${chalk.bold('@' + client.user.username)} is taking a long break for ${(cooldown / 1000).toFixed(1)} seconds.`));
        };
    }, 30000);

    client.login(token).catch((err) => {
        if (err.toString().includes('TOKEN_INVALID'))
            console.log(`\t   ${chalk.redBright('> ERROR:')} ${chalk.red(`The token "${token}" is invalid.`)}`);
    });
};

let tokens = process.env.tokens ? process.env.tokens.split('\n') : fs.readFileSync('tokens.txt', 'utf-8').split('\n');
tokens = tokens.map((t) => t.trim()).filter(t => t);

if (tokens.length) for (let i = 0; i < tokens.length; i++) {
    start(tokens[i]);
    await wait(config.delays.login);
} else console.log(`\t   ${chalk.redBright('> ERROR:')} ${chalk.red(`Tokens are missing. Enter a few in tokens.txt.\n\n`)}`);