import express from 'express';
import { Server as SocketIO } from 'socket.io';
import SimplDB from 'simpl.db';
import fs from 'fs';
import chalk from 'chalk';
import { exec } from 'child_process';
import * as selfbot from 'discord.js-selfbot-v13';
import config from '../config.js';

console.clear();
console.log(chalk.green(`\n\n\tuser@null ~ $ RUMBLER`));

const app = express();
const db = new SimplDB({ name: 'accounts', storagePath: './db' });

// Static files
app.use(express.static('site'));

// API endpoints
app.get('/api/database', (req, res) => res.json(db.toJSON()));
app.get('/api/config', (req, res) => res.send(config));

// Start the server
const server = app.listen(config.websitePort, () => {
    console.log(`> Website started. Visit http://localhost:${config.websitePort} to access it.`);
});

// Setup Socket.io
const io = new SocketIO(server);

io.on('connection', (socket) => {
    socket.emit('balanceUpdate', db.toJSON());
    socket.emit('logs', cleanLogs(logs)); // Envía los registros limpios a través de Socket.io
});

// Logs array to keep track of log messages
const logs = [];

// Function to log messages
const log = (message) => {
    logs.push(message);
    console.log(message);
    io.emit('logs', logs);
};

// Function to clean logs from ANSI color codes
const cleanLogs = (logs) => {
    return logs.map(log => log.replace(/\x1b\[[0-9;]*m/g, '')); // Elimina códigos de color ANSI de cada log
};

const wait = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sanitize = (str) => str?.replace(/[^\p{L}\p{N}\s']/gu, '');

const start = async (token) => {
    let onBreak = false;
    let gold = 0;
    let gems = 0;
    let wins = 0;
    let totalGold = 0;
    let channel;

    let client = new selfbot.Client({ checkUpdate: false });
    const processedMessages = new Set(); // Mover la declaración aquí

    client.on('ready', async () => {
        client.user.setStatus(config.statuses[Math.floor(Math.random() * config.statuses.length)]);

        log(chalk.blue(`\t   > Logged into ${chalk.bold('@' + client.user.username)}`));

        if (config.commandChannel === '' || config.commandChannel === 'dm')
            channel = await (await client.users.fetch('693167035068317736')).createDM();
        else channel = await client.channels.fetch(config.commandChannel);

        if (!db.has(client.user.id)) {
            db.set(client.user.id, { username: client.user.username });
        }

        if (config.autoDaily) {
            if (!db.get(client.user.id).daily) await channel.sendSlash('693167035068317736', 'daily');
            else if (db.get(client.user.id).daily && (db.get(client.user.id).daily - Date.now() < 0)) await channel.sendSlash('693167035068317736', 'daily');
            else setTimeout(() => channel.sendSlash('693167035068317736', 'daily'), Date.now() - db.get(client.user.id).daily);
        }

        if (config.autoWeekly) {
            if (!db.get(client.user.id).weekly) await channel.sendSlash('693167035068317736', 'weekly');
            else if (db.get(client.user.id).weekly && (db.get(client.user.id).weekly - Date.now() < 0)) await channel.sendSlash('693167035068317736', 'weekly');
            else setTimeout(() => channel.sendSlash('693167035068317736', 'weekly'), Date.now() - db.get(client.user.id).weekly);
        }
    });

    const handleBattle = async (message, type) => {
        if (processedMessages.has(message.id)) return;
        processedMessages.add(message.id);

        try {
            if (message.reactions.cache.first()?.emoji?.id) {
                await wait(randomInt(config.delays.joinBattle[0], config.delays.joinBattle[1]));

                await message.react(message.reactions.cache.first()?.emoji?.id);

                if (type === 'n')
                    log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined a battle created by ${message?.embeds[0]?.title.match(/by (.*?)$/)[1]} in #${message.channel.name}!`));
                else
                    log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined an automatic battle in #${message.channel.name}!`));
            } else {
                let collectedReaction = await message.awaitReactions({
                    filter: (_, user) => user.id === '693167035068317736',
                    max: 1,
                    time: 60_000,
                    errors: ['time']
                });

                await wait(randomInt(config.delays.joinBattle[0], config.delays.joinBattle[1]));

                await message.react(collectedReaction.first()?.emoji?.id);

                if (type === 'n')
                    log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined a battle created by ${message?.embeds[0]?.title.match(/by (.*?)$/)[1]} in #${message.channel.name}!`));
                else
                    log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} joined an automatic battle in #${message.channel.name}!`));
            }
        } catch (error) {
            log(chalk.red(`\t   > Error joining battle for ${chalk.bold('@' + client.user.username)}: ${error.message}`));
        }
    };

    client.on('messageCreate', async (message) => {
        if (message.author.id !== '693167035068317736') return;

        const embedTitle = message.embeds[0]?.title;
        if (embedTitle && embedTitle.includes('WINNER!')) {
            if (message.mentions.members?.size &&
                message.mentions.members.first().id === client.user.id
            ) {
                const description = message.embeds[0].description;
                const goldMatch = description.match(/(?<=\*\*Reward:\*\* )(\d+)/);
                if (goldMatch) {
                    const goldAmount = Number(goldMatch[0]);
                    totalGold += goldAmount;
                    updateTotalCounters(1); // Actualiza el contador de victorias en 1
                    if (config.sendSlashOnWin) {
                        await channel.sendSlash('693167035068317736', 'balance');
                    }
                    log(chalk.yellow(`\t   > ${chalk.bold('@' + client.user.username)} won a match and got ${goldAmount.toLocaleString()} gold!`));
                    updateWindowTitle();
                } else {
                    console.error("Could not extract gold amount from description:", description);
                }
            }
        }

        function updateTotalCounters(amount) {
            wins += amount;
            log(`Total wins this session: ${wins}`);
            log(`Total gold this session: ${totalGold.toLocaleString()}`);

            // También puedes enviar estos contadores a un canal de Discord específico
            // Ejemplo:
            const resultChannel = client.channels.cache.get(config.resultChannelId);
            if (resultChannel) {
                resultChannel.send(`This session\nTotal wins: ${wins}\nTotal gold earned: ${totalGold.toLocaleString()}`)
                    .catch(console.error);  // Capturar errores potenciales
            } else {
                console.error("Channel not found!");
            }
        }

        function updateWindowTitle() {
            // Implementa la lógica para actualizar el título de la ventana o el elemento de la interfaz de usuario
            exec(`title Total wins this session: ${wins}, total gold this session: ${totalGold.toLocaleString()}`);
        }

        exec(`title Total wins this session: ${wins}, total gold this session: ${totalGold.toLocaleString()}`);
        if (
            message.interaction?.user?.id === client.user.id &&
            message.interaction?.commandName === 'daily' &&
            sanitize(message.embeds[0].description).includes('You received your daily')
        ) {
            db.set(client.user.id, { ...db.get(client.user.id), daily: Date.now() + 8.64e+7 });
            log(chalk.blue(`\t   > ${client.user.username} claimed daily.`));
        }

        if (
            message.interaction?.user?.id === client.user.id &&
            message.interaction?.commandName === 'weekly' &&
            sanitize(message.embeds[0].description).includes('You received your weekly')
        ) {
            db.set(client.user.id, { ...db.get(client.user.id), weekly: Date.now() + 6.048e+8 });
            log(chalk.blue(`\t   > ${client.user.username} claimed weekly.`));
        }

        if (message.embeds[0]?.author?.name?.toLowerCase().includes(`${client.user.username.toLowerCase()}'s balance`)) {
            const embedDescription = message.embeds[0].description;

            const goldMatch = embedDescription.match(/Gold\*\*:\s*<:[a-zA-Z0-9_]+:\d+>\s*([\d,]+)/);
            const gemsMatch = embedDescription.match(/Gems\*\*:\s*<:[a-zA-Z0-9_]+:\d+>\s*([\d,]+)/);

            const gold = goldMatch ? Number(goldMatch[1].replace(/,/g, '')) : 0;
            const gems = gemsMatch ? Number(gemsMatch[1].replace(/,/g, '')) : 0;

            db.set(client.user.id, { ...db.get(client.user.id), gold, gems });
            log(chalk.magenta(`\t   > @${client.user.username} has ${gold.toLocaleString()} gold & ${gems.toLocaleString()} gems!`));
        }

        if (
            onBreak ||
            config.blacklist.servers.includes(message?.guild?.id) ||
            config.blacklist.channels.includes(message?.channel?.id)
        ) return;

        if (
            sanitize(message.embeds[0]?.title)?.includes('Started a new') &&
            sanitize(message.embeds[0]?.description)?.includes(client.user.id)
        ) //log(chalk.blue(`\t   > ${chalk.bold('@' + client.user.username)} has a battle starting in #${message.channel.name}!`));

        if (
            message?.interaction?.commandName === 'battle' &&
            sanitize(message.embeds[0]?.title)?.includes('Rumble Royale')
        ) handleBattle(message, 'n');

        if (
            sanitize(message.embeds[0]?.title)?.includes('Rumble Royale') &&
            sanitize(message.embeds[0]?.footer?.text)?.includes('Automatic Session')
        ) handleBattle(message, 'a');
    });

    client.on('messageUpdate', (_, newMessage) => {
        if (
            newMessage.interaction?.commandName === 'battle' &&
            sanitize(newMessage.embeds[0]?.title)?.includes('Rumble Royale')
        ) handleBattle(newMessage, 'n');

        if (
            sanitize(newMessage.embeds[0]?.title)?.includes('Rumble Royale') &&
            sanitize(newMessage.embeds[0]?.footer?.text)?.includes('Automatic Session')
        ) handleBattle(newMessage, 'a');
    });

    setInterval(() => {
        if ((Math.random() < config.breaks.short.frequency) && !onBreak && client.user?.username) {
            let cooldown = randomInt(config.breaks.short.minLength, config.breaks.short.maxLength);

            onBreak = true;
            setTimeout(() => onBreak = false, cooldown);

            log(chalk.magenta(`\t   > ${chalk.bold('@' + client.user.username)} is taking a short break for ${(cooldown / 1000).toFixed(1)} seconds.`));
        };

        if ((Math.random() < config.breaks.long.frequency) && !onBreak && client.user?.username) {
            let cooldown = randomInt(config.breaks.long.minLength, config.breaks.long.maxLength);

            onBreak = true;
            setTimeout(() => onBreak = false, cooldown);

            log(chalk.magenta(`\t   > ${chalk.bold('@' + client.user.username)} is taking a long break for ${(cooldown / 1000).toFixed(1)} seconds.`));
        };
    }, 30000);

    client.login(token).catch((err) => {
        if (err.toString().includes('TOKEN_INVALID'))
            log(`\t   ${chalk.redBright('> ERROR:')} ${chalk.red(`The token "${token}" is invalid.`)}`);
    });
};

let tokens = process.env.tokens ? process.env.tokens.split('\n') : fs.readFileSync('tokens.txt', 'utf-8').split('\n');
tokens = tokens.map((t) => t.trim()).filter(t => t);

if (tokens.length) {
    for (let i = 0; i < tokens.length; i++) {
        await start(tokens[i]);
        await wait(config.delays.login);
    }
} else {
    console.log(`\t   ${chalk.redBright('> ERROR:')} ${chalk.red(`Tokens are missing. Enter a few in tokens.txt.\n\n`)}`);
}
