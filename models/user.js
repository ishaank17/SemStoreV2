require('dotenv').config();
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME=process.env.DB_NAME;
const mongoose = require('mongoose');
mongoose.connect(`${MONGO_URL}`,{dbName: `${DB_NAME}`})
const userSchema = mongoose.Schema({
    rollno:String,
    name:String,
    email:String,
    profilePhoto:String,
    phone: String,
    batch: String,
    branch: String,
    bio: String,
    role:String
})

module.exports= mongoose.model('user', userSchema);