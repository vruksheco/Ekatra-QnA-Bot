const mongoose = require("mongoose");
const BSON = require('bson');

const chatLogSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userID: String,
    chatLog: String
});
const chatLog = new mongoose.model("chatLog", chatLogSchema)

//Create a new record as the user registers 
const createDoc = async (chat_id, session_prompt) => {
    const chatlog = new chatLog({
        _id: new mongoose.Types.ObjectId(),
        userID: chat_id,
        chatLog: session_prompt
    });
    chatlog.save((err) => {
        if (err) {

            console.log("Error creating document " + err);
        }
        else {
            console.log("Successfully Registered " + chat_id)
        }
    })
}

// Update the chatlog for better context
const updateDoc = async (chat_id, value) => {
    chatLog.updateOne({ userID: chat_id },
        {
            $set: {
                chatLog: value
            }

        }, async (err, record) => {
            if (err) {
                console.log("update error ", err);
            }
            if (record) {
                chatSize = await findRecord(chat_id)
                const size = BSON.calculateObjectSize(chatSize.chatLog);
                console.log(`Size of chat ${chat_id} = ${size}`);
            }
        })
}

// Find record of specified ID
async function findRecord(id) {
    return new Promise(async function (resolve, reject) {


        chatLog.find({ userID: id }, (err, record) => {
            if (err) {
                console.log(err);
            }
            if (record) {
                let len = record.length
                if (len == 0) {
                    resolve(len)
                }
                else {
                    record.forEach(function (chat) {
                        resolve(chat)
                    })
                }

            }
        });
    })
}

module.exports = {
    createDoc,
    updateDoc,
    findRecord
}
