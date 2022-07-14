var Airtable = require('airtable');
require('dotenv').config();

var base = new Airtable({ apiKey: process.env.airtable_api }).base(process.env.base);
table = base('QnA Bot')

// Create a new record when user starts the conversation with the bot
const createRecord = async (chat_id, name) => {

  const students = await table.select({
    filterByFormula: `ChatID = ${chat_id}`,
    view: "Grid view"
  }).all();
  var len = students.length;
  // console.log(len)

  if (len == 0) {

    table.create([
      {
        "fields": {
          "ChatID": chat_id,
          "Name": name
        }
      }
    ], function (err, records) {
      if (err) {
        console.error(err);
        reject(err);
      }


    });

  }
  else {
    console.log("Already registered")
  }

}

// Delete the record when user sends /stop command
const deleteRecord = async (chat_id) => {
  const rec = await table.select({
    filterByFormula: `ChatID = ${chat_id}`,
    view: "Grid view"
  }).all();


  rec.forEach(function (record) {
    var id = record.id
    table.destroy(id, function (err, deletedRecord) {
      if (err) {
        console.error(err);
        return;
      }

    });

  });
}


module.exports = {
  createRecord,
  deleteRecord,

}
