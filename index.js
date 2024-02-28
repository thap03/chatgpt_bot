require("dotenv/config");
const { Client, GuildMember } = require("discord.js");
const { OpenAI } = require("openai");

const client = new Client({
    intents: ["Guilds", "GuildMembers", "GuildMessages", "MessageContent"]

})

// show that the bot is online
client.on("ready", (c) => {
    console.log(` ${c.user.tag} is online!`);
})

// the bot will not reply to any message that starts with this character
const IGNORE_PREFIX = "!";

// the bot will only reply in these channels
const CHANNELS = ["1212317338842431498" , "1212503054604304415", "1212503457374797864"];

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
})

// checks if message was typed by another bot
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channelId) && !message.mentions.user.has(client.user.id)) 
        return;

    await message.channel.sendTyping();

    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    let conversation = [];
    conversation.push({
        role: "system",
        content: "Chat GPT is the GOAT."
    });

    let prevMessages = await message.channel.messages.fetch({ limit: 10 });
    prevMessages.reverse();

    prevMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user.id) return;
        if (msg.content.startsWith(IGNORE_PREFIX)) return;

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if (msg.author.id === client.user.id) {
            conversation.push({
                role: "assistant",
                name: username,
                content: msg.content,
            });

            return;
        }

        conversation.push({
            role: "user",
            name: username,
            content: msg.content,
        });
    })

    const response = await openai.chat.completions
        .create({
            model: "gpt-3.5-turbo",
            messages: conversation,
        })
        .catch((error) => console.error("OpenAI Error: \n", error));

    clearInterval(sendTypingInterval);

    if(!response){
        message.reply("Try again in a moment.");
        return;
    }

    // prevent errors since discord doesn't allow messages over 2000 characters
    const responseMessage = response.choices[0].message.content;
    const chunkSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunkSizeLimit){
        const chunk = responseMessage.substring(i, i + chunkSizeLimit);

        await message.reply(chunk);
    }
});

// logs into the bot to make it go online
client.login(process.env.TOKEN);