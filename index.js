const express = require('express');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt=require("jsonwebtoken");
const cookieParser = require('cookie-parser');

const userModel=require('./models/user');
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,"public")));
app.set('view engine', 'ejs')

// app.set('views', path.join(__dirname, 'views'));



app.get('/', (req, res) => {
    res.render('index');
})
app.get('/Home', (req, res) => {
    res.render('Home.ejs');
})

app.get('/Signup', (req, res) => {
    res.render('Signup.ejs');
})
// app.post('/Create', async (req, res) => {
//     let{phone,batch,branch,bio}=req.body;
//     let createduser = await userModel.create({
//         phone: phone,
//         batch: batch.slice(-2),
//         branch: branch,
//         bio: bio,
//     });
//
//     let session= jwt.sign({email:"ikk@gmail.com"},"secret");
//     let decrypt= jwt.verify(req.cookies.email,"secret");
//     res.cookie('email',session)
//     res.send(createduser);
//     console.log(req.cookies);
//     console.log(decrypt);
// })




// app.get('/update', async (req, res) => {
//     const updated= await userModel.findOneAndUpdate({phone:"ishaan"}, {phone:"ishaan2"} )
//     res.send(updated);
// })

// app.get('/Profiles/:rollno', (req, res) => {
//
//     res.send('Hello,'+ req.params.rollno);
// })

app.listen(80)

// bcrypt.genSalt(10, (err, salt) => {
//     bcrypt.hash("PASSWORD", salt, (err, hash) => {
//         // store hash
//     })
// })

// bcrypt.compare("PASSWORD", "hash",(err, isMatch) => {
//     if (isMatch) {
//
//     }
// })