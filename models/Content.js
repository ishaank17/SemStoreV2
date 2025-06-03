require('dotenv').config();
const MONGO_URL = process.env.MONGO_URL;
const mongoose = require('mongoose');
mongoose.connect(`${MONGO_URL}`)
const contentSchema = mongoose.Schema({
    coursecode:String,
    title:String,
    description:String,
    type:String,
    uploadedBy:String,
    uploadedAt:Date,
    branch: String,
    semester: String,
    tags:String,
    popularity: { type: Number, default: 0 }

})

module.exports= mongoose.model('content', contentSchema);