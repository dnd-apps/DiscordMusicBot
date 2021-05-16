//Bring in dependencies and environment variables
require('dotenv').config();
const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const token = process.env.TOKEN;
const prefix ="!";

//This contains the queues
const queue = new Map();

//Create a Client and Log In
const client = new Discord.Client();
client.login(token);

//Log Connection Statuses
client.once('ready', () => {
    console.log("Client is Ready!");
});

client.once('reconnecting', () => {
    console.log("Client is reconnecting!");
});

client.once('disconnect', () => {
    console.log("Client has disconnected!");
});

//Read Messages and Act
client.on('message', async message => {
    //Ignore Bot's messages
    if (message.author.bot) return;
    //Ignore messages without command prefix
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    //Determine which command to apply
    const args = message.content.split(" ");

    //Ensure member is in a voice channel and that bot can join it
    const voiceChannel = message.member.voice.channel;
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if((!voiceChannel) || (!permissions.has("CONNECT")) || (!permissions.has("SPEAK"))) {
        return message.channel.send("You need to be a voice channel that I can join to hear music!");
    };

    switch(args[0].toLowerCase()) {
        case prefix+"play" :
            addOrCreateQueue(message, args, serverQueue, voiceChannel);
            break;
        case prefix+"stop":
            stop(message, serverQueue);
            break;
        case prefix+"skip":
            skip(message, serverQueue);
            break;
        case prefix+"pause":
            pause();
            break;
        case prefix+"volume":
            setVolume(message, args, serverQueue);
            break;
        default:
            message.channel.send("Invalid command! Choose one of the following options: !play !pause !stop !skip !volume")
    }
});

client.login(token);


//Function that creates song queues and invokes play function
//QueueConstructs are created and added to queue map
async function addOrCreateQueue(message, args, serverQueue, voiceChannel) {
    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
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
            playing: true
        };

        //referencing main's queue map
        queue.set(message.guild.id, queueConstruct);
        queueConstruct.songs.push(song);

        //Get in channel and begin play
        try {
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            play(message.guild, queueConstruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send("Something went wrong creating the queue!: " + err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(song.title + ' has been added to the queue!');
    };
};

//Recursive function play until queue is empty
function play(guild, song){
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url, { quality: "highestaudio", filter: "audioonly"}))
        .on("finish", ()=> {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));

    dispatcher.setVolume(0.1 * serverQueue.Volume);
    serverQueue.textChannel.send('Now playing: ~ ' + song.title + ' ~');
};

//Set Volume
function setVolume(message, args, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("You have to be in a voice channel to set the volume!");
    if (!serverQueue)
        return message.channel.send("There is no song playing!");
    serverQueue.connection.dispatcher.setVolume(parseInt(args[1]) * 0.1);
    message.channel.send("Set volume to " + args[1]);
};

//Skip current song
function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("You have to be in a voice channel to skip the song!");
    if (!serverQueue)
        return message.channel.send("There is no song playing!");

    serverQueue.connection.dispatcher.end();
    message.channel.send("Skipping");
};


//Stop playback
function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("You have to be in a voice channel to stop the music!");
    if (!serverQueue)
        return message.channel.send("There is no song playing!");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
};





