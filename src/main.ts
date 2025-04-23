import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';

import {
    Client,
    Message,
    PartialMessage,
    PresenceStatusData
} from 'discord.js-selfbot-v13';

const configPath = path.join(import.meta.dirname, '..', 'config.ts');

if (!fs.existsSync(configPath)) {
    fs.cpSync(path.join(import.meta.dirname, '..', 'config.example.ts'), configPath);
    console.log(chalk.red(`> ${chalk.bold('ERROR:')} ${chalk.red('Please edit the config.ts file and restart the bot.')}`));
    process.exit(0);
}

const tokenPath = path.join(import.meta.dirname, '..', 'tokens.txt');

if (!fs.existsSync(tokenPath)) {
    fs.writeFileSync(tokenPath, '');
    console.log(chalk.red(`> ${chalk.bold('ERROR:')} ${chalk.red('Please add tokens to the tokens.txt file and restart the bot.')}`));
    process.exit(0);
}

const config = (await import(configPath)).default;

console.clear();
console.log(chalk.green(`\n\n\tuser@null ~ $ RUMBLER`));

if (!fs.existsSync('./db')) fs.mkdirSync('./db');
if (!fs.existsSync('./db/accounts.json')) fs.writeFileSync('./db/accounts.json', '{}');

const db = JSON.parse(fs.readFileSync('./db/accounts.json', 'utf-8'));
const save = () => fs.writeFileSync('./db/accounts.json', JSON.stringify(db, null, 4));

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const sanitize = (str: string) => str?.replace(/[^A-Z\d\s']/gi, '');

const start = async (token: string) => {
    let onBreak = false;
    let gold = 0;
    let gems = 0;
    let wins = 0;
    let channel;

    let client = new Client();

    client.on('ready', async () => {
        if (!client.user) throw new Error('Failed to login.');

        client.user.setStatus(config.statuses[config.statuses.length * Math.random() | 0] as PresenceStatusData);

        console.log(chalk.blue(`\t   > Logged into ${chalk.bold('@' + client.user.username)}`));

        if (!config.commandChannel) channel = await (await client.users.fetch('693167035068317736')).createDM();
        else channel = await client.channels.fetch(config.commandChannel);

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

    const handleBattle = async (message: Message<boolean> | PartialMessage, type: string) => {
        if (message.channel.type === 'DM') return;
        if (!client.user) throw new Error('Failed to login.');

        let firstEmojiId = message.reactions.cache.first()?.emoji?.id;

        if (firstEmojiId) {
            await wait(randomInt(config.delays.joinBattle[0], config.delays.joinBattle[1]));

            message.react(firstEmojiId);

            if (type === 'n')
                return console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined a battle created by ${message.embeds[0].title?.match(/by (.*?)$/)?.[1]} in #${message.channel.name}!`));
            else
                return console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined an automatic battle in #${message.channel.name}!`));
        };

        let collectedReaction = await message.awaitReactions({
            filter: (_, user) => user.id === '693167035068317736',
            max: 1,
            time: 60_000,
            errors: ['time']
        });

        let first = collectedReaction.first()?.emoji?.id;
        if (!first) return;

        await wait(randomInt(config.delays.joinBattle[0], config.delays.joinBattle[1]));

        message.react(first);

        if (type === 'n')
            console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined a battle created by ${message.embeds[0].title?.match(/by (.*?)$/)?.[1]} in #${message.channel.name}!`));
        else
            console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined an automatic battle in #${message.channel.name}!`));
    };

    client.on('messageCreate', async (message) => {
        if (!client.user) throw new Error('Failed to login.');
        if (message.author.id !== '693167035068317736') return;

        let title = message.embeds[0]?.title;
        let description = message.embeds[0]?.description;

        if (
            message.mentions.members?.size &&
            message.mentions.members.first()?.id === client.user.id &&
            title && sanitize(title)?.includes('WINNER!') &&
            description
        ) {
            wins++;
            channel.sendSlash('693167035068317736', 'balance');
            console.log(chalk.yellow(`\t   > ${chalk.bold('@' + client.user.username)} won a match and got ${Number(description.match(/(?<=:\*\*\s).*(?=\s<:)/)?.[0]).toLocaleString()} gold!`));
        };

        if (
            message.interaction?.user?.id === client.user.id &&
            message?.interaction?.commandName === 'daily' &&
            description && sanitize(description).includes('You received your daily')
        ) {
            db[client.user.id].daily = Date.now() + 8.64e+7;
            save();
            console.log(chalk.blue(`\t   > ${client.user.username} claimed daily.`));
        };

        if (
            message.interaction?.user?.id === client.user.id &&
            message?.interaction?.commandName === 'weekly' &&
            description && sanitize(description).includes('You received your weekly')
        ) {
            db[client.user.id].weekly = Date.now() + 6.048e+8;
            save();
            console.log(chalk.blue(`\t   > ${client.user.username} claimed weekly.`));
        };

        if (description && message.embeds[0].author?.name?.toLowerCase().includes(`${client.user.username.toLowerCase()}'s balance`)) {
            gold = Number(description.match(/Gold\*\*: [a-zA-Z0-9:\<\>]+ ([0-9,]+)/)?.[1].replace(/,/g, ''));
            gems = Number(description.match(/Gold\*\*: [a-zA-Z0-9:\<\>]+ ([0-9,]+)/)?.[1].replace(/,/g, ''));

            db[client.user.id].gold = gold;
            db[client.user.id].gems = gems;
            save();

            console.log(chalk.yellow(`\t   > ${chalk.bold('@' + client.user.username)} has ${gold.toLocaleString()} gold & ${gems.toLocaleString()} gems!`));
        };

        if (message.guildId && (
            onBreak ||
            config.blacklist.servers.includes(message?.guildId) ||
            config.blacklist.channels.includes(message?.channel?.id)
        )) return;

        if (
            title && sanitize(title)?.includes('Started a new') &&
            message.embeds[0].description &&
            sanitize(message.embeds[0].description)?.includes(client.user.id) &&
            message.channel.type !== 'DM'
        ) console.log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} has a battle starting in #${message.channel.name}!`));

        if (
            message?.interaction?.commandName === 'battle' &&
            title && sanitize(description!)?.includes('Click the emoji below to join. Starting in 2 minutes!')
        ) handleBattle(message, 'n');

        if (
            title && sanitize(title)?.includes('Rumble Royale') &&
            message.embeds[0].footer?.text &&
            sanitize(message.embeds[0].footer?.text)?.includes('Automatic Session')
        ) handleBattle(message, 'a');
    });

    client.on('messageUpdate', (_, newMessage) => {
        let newTitle = newMessage.embeds?.[0]?.title;
        if (!newTitle) return;

        if (
            newMessage.interaction?.commandName === 'battle' &&
            sanitize(newTitle)?.includes('Rumble Royale')
        ) handleBattle(newMessage, 'n');

        if (
            sanitize(newTitle)?.includes('Rumble Royale') &&
            newMessage.embeds[0]?.footer?.text &&
            sanitize(newMessage.embeds[0]?.footer?.text)?.includes('Automatic Session')
        ) handleBattle(newMessage, 'a');
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

let tokens = process.env.tokens ? process.env.tokens.split('\n') : fs.readFileSync(tokenPath, 'utf-8').split('\n');
tokens = tokens.map((t) => t.trim()).filter(t => t);

if (tokens.length) for (let i = 0; i < tokens.length; i++) {
    start(tokens[i]);
    await wait(config.delays.login);
} else {
    console.clear();
    console.log(`${chalk.redBright('> ERROR:')} ${chalk.red(`Tokens are missing. Enter a few in tokens.txt.\n\n`)}`);
    process.exit(0);
}