require('dotenv').config();
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME=process.env.DB_NAME;
const mongoose = require('mongoose');
mongoose.connect(`${MONGO_URL}`,{dbName: `${DB_NAME}`})
const userSchema = mongoose.Schema({
    by:String, //id
    resourceID:String,
    resourceTitle: String, //code and title
    reportedByEmail:String, //email
    reason: String, //rsn - innap outdated others
    description: String, // desc
    status:{type:String,default:'Pending'} , //"Pending", or "Resolved"
    createdAt: String , //new Date().toLocaleDateString()
    reply: {type:String,default:''},
    replyBy: {type:String,default:''},
    repliedAt:{type:String,default:''}//id of replier
    // true def, on reply change to false and then display notif and put in list then
})

module.exports= mongoose.model('report', userSchema);