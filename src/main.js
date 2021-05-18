//Bring in dependencies and environment variables
import { Client } from 'discord.js';
import { token, permissions, prefix } from './config.js';
import { logger } from './logger.js';
import Queue from './queue.js';

if (token.length === 0) {
  throw new Error('Token not provided!');
}
logger.info('Client is loading...');

//This contains the queues
const queue = new Queue();

//Create a Client and Log In
const client = new Client();

client.removeAllListeners();
//Log Connection Statuses
client
  .once('ready', async () => {
    logger.info('Client is Ready!');
    logger.info(
      `Invite Me Via: ${await client.generateInvite({ permissions })}`
    );
    logger.info(`I am in ${client.guilds.holds.length} servers! ❤`);
    logger.info(
      JSON.stringify({
        prefix,
        permissions,
      })
    );
  })
  .once('reconnecting', () => {
    logger.info('Client is reconnecting!');
  })
  .on('disconnect', function (msg, code) {
    if (code === 0) return console.error(msg);
    client.connect();
  })
  .once('message', async function (message) {
    logger.info(message.content.toString());
  })
  .on('message', async (message) => {
    //Ignore Bot's messages
    if (message.author.bot) return;
    //Ignore messages without command prefix
    if (!message.content.startsWith(prefix)) return;

    logger.debug(`Message Received from ${message.author.username}`);

    //Determine which command to apply
    const args = message.content.split(' ');

    //Ensure member is in a voice channel and that bot can join it
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.channel.send(
        'You need to be in a voice channel to hear music or control its playback.'
      );
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
      return message.channel.send(
        'You need to be in a voice channel that I can join to hear music!'
      );
    }

    const command = args[0].toLowerCase();
    logger.debug(`${message.author.username} launching command : ${command}`);
    if (command.startsWith(prefix)) {
      switch (command.substr(1)) {
        case 'play':
          return queue.addOrCreateQueue(message, args);
        case 'stop':
          return queue.stop(message);
        case 'skip':
          return queue.skip(message);
        case 'pause':
          return queue.pause(message);
        case 'resume':
          return queue.resume(message);
        case 'volume':
          return queue.setVolume(message, args);
        default:
          await message.channel.send(
            'Invalid command! Choose one of the following options: !play !pause !resume !stop !skip !volume'
          );
      }
    }
  })
  .login(token);
