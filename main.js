require('dotenv').config("./env");
const airtable = require('./airtable')


const mongoose = require("mongoose");
const mongodb = require('./mongodb');

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.apiKey,
});
const openai = new OpenAIApi(configuration);


const TOKEN = process.env.TOKEN;
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(TOKEN, { polling: false });

//Set up Webhook for TelegramBot
const url = process.env.server_url;
const port = process.env.PORT;
bot.setWebHook(`${url}/openai`);

const express = require('express');
const app = express();
app.use(express.json());

app.post(`/openai`, async (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);

});

// Connect mongodb
MONGO_URL = `mongodb://${process.env.MONGOUSER}:${process.env.MONGOPASSWORD}@${process.env.MONGOHOST}:${process.env.MONGOPORT}`

mongoose.connect(MONGO_URL)
    .then((x) => {
        console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`)
    })
    .catch((err) => {
        console.error("Error connecting to mongo", err);
    });


bot.on('message', async msg => {
    // console.log(msg, msg.text)

    // Check if incoming message is a text message and not a command 
    if (msg.entities == undefined) {
        incoming_msg = msg.text
        chat_id = msg.chat.id

        record = await mongodb.findRecord(chat_id).then().catch(e => console.error("Error finding record " + e));

        answer = await ask(incoming_msg, record.chatLog).then().catch(e => console.error("Error executing OpenAI " + e));
        answer = answer.replace(/\r?\n|\r/g, "")

        await append_chatlog(incoming_msg, answer, record.chatLog, chat_id)

        console.dir("incoming_msg " + incoming_msg + " by " + chat_id + " " + msg.chat.first_name)

        bot.sendMessage(chat_id, answer).then().catch(e => console.error("e2 " + e))

    }
})

// On receiving /start command store user information in Airtable and create a record in MongoDB
// After successful registration send the welcome message
bot.onText(/\/start/, async (msg) => {

    let session_prompt = `"Q: What is human life expectancy in the United States?\nA: Human life expectancy in the United States is 78 years.\n\nQ: Who was president of the United States in 1955?\nA: Dwight D. Eisenhower was president of the United States in 1955.\n\nQ: Which party did he belong to?\nA: He belonged to the Republican Party.\n\nQ: What is the square root of banana?\nA: Unknown\n\nQ: How many squigs are in a bonk?\nA: Unknown\n\nQ: What is AI?\nA: AI is short for artificial intelligence. It is a branch of computer science that deals with the creation of intelligent computer systems, which are able to perform tasks that ordinarily require human intelligence, such as visual perception, natural language understanding, and decision-making.\n\nQ: What is a chatbot?\nA: A chatbot is a computer program designed to simulate conversation with human users, especially over the Internet.\n\nQ: What is a parabola\nA: A parabola is a two-dimensional curve that can be defined by a quadratic equation. It has a U-shaped or V-shaped appearance, and its sides are symmetrical."`

    chat_id = msg.chat.id
    first_name = msg.chat.first_name
    last_name = msg.chat.last_name

    if (first_name == undefined) {
        //console.log(first_name)
        userName = `${last_name}`
    }
    else if (last_name == undefined) {
        //console.log(last_name)
        userName = `${first_name}`
    }
    else {
        userName = `${msg.chat.first_name} ${msg.chat.last_name}`
    }//console.log(typeof chat_id + " " + userName);

    await airtable.createRecord(chat_id, userName)
        .then(async () => {
            record = await mongodb.findRecord(chat_id)
            //console.log(record)
            if (record == 0) {
                //New record
                mongodb.createDoc(chat_id, session_prompt)

            }
            bot.sendMessage(chat_id, `Welcome ${userName} to Ekatra Question & Answer bot. \n\nI am a highly intelligent question answering bot. If you ask me a question that is rooted in truth, I will give you the answer. If you ask me a question that is nonsense, trickery, or has no clear answer, I will respond with "Unknown".`)
        })
        .catch(error => console.log("Error registering " + error));

})

bot.onText(/\/stop/, async (msg) => {
    chat_id = msg.chat.id
    await airtable.deleteRecord(chat_id).then(console.log("Successfully Deleted " + chat_id))
        .catch(error => console.log("Error deleting " + error));


})

// OpenAI Settings
start_sequence = "\nA:"
restart_sequence = "\n\nQ:"

async function ask(question, chatLog) {
    return new Promise(async (resolve, reject) => {
        let response = await openai.createCompletion({
            model: "text-davinci-002",
            prompt: `${chatLog}${restart_sequence} ${question}${start_sequence}`,
            temperature: 0.2,
            max_tokens: 100,
            top_p: 1,
            frequency_penalty: 1,
            presence_penalty: 1,
            stop: ["Q:", "A:"]
        })

        //setting = JSON.parse(response.config.data)
        //console.log(setting.prompt, response.data)
        ans = response.data.choices[0].text;
        // ans = response['choices'][0]['text']
        resolve(ans)
    })
}

// Update mongoDB chatlog record.
async function append_chatlog(ques, answer, chatLog, id) {
    return new Promise(async function (resolve, reject) {

        await mongodb.updateDoc(id, `${chatLog}${restart_sequence} ${ques}${start_sequence}${answer}`)
        rec = await mongodb.findRecord(id)

        //console.log("rec", rec)
        resolve(rec)

    });

}

//Start Express Server
app.listen(port, () => {

    console.log(`Express server is listening on ${port}`);
});


