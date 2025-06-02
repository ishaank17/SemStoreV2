const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/DATABASE")
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

module.exports= mongoose.model('SemStore', userSchema);