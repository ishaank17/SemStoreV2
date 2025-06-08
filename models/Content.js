require('dotenv').config();
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME=process.env.DB_NAME;
const mongoose = require('mongoose');
mongoose.connect(`${MONGO_URL}`,{dbName: `${DB_NAME}`})
const contentSchema = mongoose.Schema({

    coursecode:String,
    title:String,
    description:String,
    type:String,
    uploadedBy:String,
    uploadedAt:String,
    branch: String,
    semester: String,
    tags:String,
    path: String,
    popularity: { type: Number, default: 0 },

})

module.exports= mongoose.model('content', contentSchema);