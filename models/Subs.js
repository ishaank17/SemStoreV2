require('dotenv').config();
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME=process.env.DB_NAME;
const mongoose = require('mongoose');
mongoose.connect(`${MONGO_URL}`,{dbName: `${DB_NAME}`})
const userSchema = mongoose.Schema({
    id: String,
    sub: {
        type: Object, // or: mongoose.Schema.Types.Mixed
        required: true
    }
})

module.exports= mongoose.model('sub', userSchema);