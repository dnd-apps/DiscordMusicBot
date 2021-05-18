import YouTubeDL from 'ytdl-core';
import { logger } from './logger.js';
import Discord from 'discord.js';

export default class Queue {
  constructor(queues) {
    this.queues = queues || new Map();
  }

  getQueueByServerId(serverId) {
    return this.queues[serverId];
  }

  //Function that creates song queues and invokes play function
  //QueueConstructs are created and added to queue map
  /**
   *
   * @param {Discord.Message} message
   * @param {*} args
   * @returns
   */
  async addOrCreateQueue(message, args) {
    const serverQueue = this.getQueueByServerId(message.guild.id),
      voiceChannel = message.member.voice.channel,
      songInfo = await YouTubeDL.getInfo(args[1]),
      song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
      };

    //Create new queue if one doesn't exist
    if (!serverQueue) {
      const queueConstruct = {
        textChannel: message.channel,
        voiceChannel: voiceChannel,
        connection: null,
        songs: [],
        Volume: 3,
        playing: true,
      };

      //referencing main's queue map
      this.queues.set(message.guild.id, queueConstruct);
      queueConstruct.songs.push(song);

      //Get in channel and begin play
      try {
        queueConstruct.connection = await voiceChannel.join();
        await this.play(message.guild, queueConstruct.songs[0]);
      } catch (err) {
        console.log(err);
        if (err.startsWith('[VOICE_CONNECTION_TIMEOUT]')) {
          await this.play(message.guild, queueConstruct.songs[0]);
        } else {
          this.queues.delete(message.guild.id);
        }
        return message.channel.send(
          'Something went wrong creating the queue!: ' + err
        );
      }
    } else {
      serverQueue.songs.push(song);
      return message.channel.send(song.title + ' has been added to the queue!');
    }
  }

  //Recursive function play until queue is empty
  async play(guild, song) {
    logger.debug(`Guild ${guild.id} has request ${song}`);
    const serverQueue = this.queues.get(guild.id);
    if (!song) {
      serverQueue.voiceChannel.leave();
      this.queues.delete(guild.id);
      return;
    }
    await serverQueue.textChannel.send('Loading: ~ ' + song.title + ' ~');

    const dispatcher = serverQueue.connection
      .play(
        YouTubeDL(song.url, { quality: 'highestaudio', filter: 'audioonly' })
      )
      .on('finish', () => {
        serverQueue.songs.shift();
        this.play(guild, serverQueue.songs[0]);
      })
      .on('error', (error) => console.error(error));

    dispatcher.setVolume(0.1 * serverQueue.Volume);
    await serverQueue.textChannel.send('Now playing: ~ ' + song.title + ' ~');
  }

  //Set Volume
  setVolume(message, args) {
    const serverQueue = this.getQueueByServerId(message.guild.id);
    logger.debug(`Guild ${message.guild.id} has request ${args}`);

    if (!message.member.voice.channel)
      return message.channel.send(
        'You have to be in a voice channel to set the volume!'
      );
    if (!serverQueue) return message.channel.send('There is no song playing!');
    serverQueue.connection.dispatcher.setVolume(parseInt(args[1]) * 0.1);
    message.channel.send('Set volume to ' + args[1]);
  }

  //Skip current song
  skip(message) {
    const serverQueue = this.getQueueByServerId(message.guild.id);
    logger.debug(`Guild ${message.guild.id} has request a skip`);

    if (!message.member.voice.channel)
      return message.channel.send(
        'You have to be in a voice channel to skip the song!'
      );
    if (!serverQueue) return message.channel.send('There is no song playing!');

    serverQueue.connection.dispatcher.end();
    message.channel.send('Skipping');
  }

  //Stop playback
  stop(message) {
    const serverQueue = this.getQueueByServerId(message.guild.id);
    logger.debug(`Guild ${message.guild.id} has request a stop`);

    if (!message.member.voice.channel)
      return message.channel.send(
        'You have to be in a voice channel to stop the music!'
      );
    if (!serverQueue) return message.channel.send('There is no song playing!');

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
  }

  //Pause playback
  pause(message) {
    const serverQueue = this.getQueueByServerId(message.guild.id);
    logger.debug(`Guild ${message.guild.id} has request a pause`);

    if (!message.member.voice.channel)
      return message.channel.send(
        'You have to be in a voice channel to pause the music!'
      );
    if (!serverQueue) return message.channel.send('There is no song playing!');

    serverQueue.connection.dispatcher.pause();
    message.channel.send('Pausing playback!');
  }

  //Resume playback
  resume(message) {
    const serverQueue = this.getQueueByServerId(message.guild.id);
    logger.debug(`Guild ${message.guild.id} has request to resume`);

    if (!message.member.voice.channel)
      return message.channel.send(
        'You have to be in a voice channel to pause the music!'
      );
    if (!serverQueue) return message.channel.send('There is no song playing!');

    serverQueue.connection.dispatcher.resume();
    message.channel.send('Resuming playback!');
  }
}
