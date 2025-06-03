const dotenv = require('dotenv');
dotenv.config();
const BASE_URL = process.env.BASE_URL;
const express = require('express');
const app = express();
const path = require('path');
const jwt=require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const userModel=require('./models/user');
const content=require('./models/Content');
const {requireLogin}=require('./models/LoginCheck');


app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,"public")));
app.set('view engine', 'ejs')

app.use((req, res, next) => {
    try {
        const decoded = jwt.verify(req.cookies.session, process.env.SECRET);
        res.locals.name = decoded.name;
        res.locals.email = decoded.email;
        res.locals.profilePhoto = decoded.profilePhoto;
        res.locals.role = decoded.role;
    } catch (err) {
        res.locals.name = null;
        res.locals.link = null;
    }
    next();
});



const {OAuth2Client} = require('google-auth-library');

app.get('/', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:80');
    res.header("Access-Control-Allow-Credentials", 'true');
    res.header("Referrer-Policy","no-referrer-when-downgrade");
    const redirectURL = `${BASE_URL}/Login`;

    const oAuth2Client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,redirectURL
    );
    const authorizeUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/userinfo.profile  openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile ',
        prompt: 'consent'
    });
    res.render('index' , {link: authorizeUrl});
})

async function getUserData(accessToken) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
    return await response.json();
}

app.get('/Login', async (req, res) => {
    const code = req.query.code;
    const redirectURL = `${BASE_URL}/Login`;
    console.log(redirectURL);
    const oAuth2Client = new OAuth2Client(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,redirectURL
    );
    const result = await oAuth2Client.getToken(code);
    // console.log("1");
    // console.log(result);
    await oAuth2Client.setCredentials(result.tokens)
    const user = oAuth2Client.credentials;
    // console.log("3");
    // console.log(user);
    const data= await getUserData(user.access_token)
    // console.log("4");
    // console.log(data);
    let row= await userModel.findOne({rollno:data.family_name})
    let session= jwt.sign({rollno:data.family_name,
        name: data.given_name,
        email: data.email,
        profilePhoto: data.picture,
        role:"Student"},process.env.SECRET);
    res.cookie('session',session);

    if(!row) {
        await userModel.create({
            rollno:data.family_name,
            name: data.given_name,
            email: data.email,
            profilePhoto: data.picture,
            role:"Student"
        })
        res.redirect('/Signup',);
    }
    else{
        res.redirect('/Home');
    }
})


app.post('/Create', async (req, res) => {
    let {phone,branch ,batch ,bio}= req.body;
    const data = await jwt.verify(req.cookies.session, process.env.SECRET);
    await userModel.findOneAndUpdate({rollno:data.rollno,},{
        phone,
        branch,
        batch:batch.slice(-2),
        bio
    })
    res.redirect('/Home');
})

app.get('/Home',  requireLogin,async(req, res) => {
    res.render('Home.ejs');

})
app.get('/Home/search', requireLogin, async (req, res) => {
    const { q, semester, branch,order } = req.query;

    let filter = {};

    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { coursecode: { $regex: q, $options: 'i' } },
            { tags: { $regex: q, $options: 'i' } }
        ];
    }
    if (semester) filter.semester = semester;
    if (branch) filter.branch = branch;
    // console.log(typeof (order));
    // console.log("Filter:", JSON.stringify(filter, null, 2));
    const results = await content.find(filter).sort({ popularity: parseInt(order) })   .limit(20);
    res.json(results);
});

app.get('/Signup', (req, res) => {
    res.render('Signup.ejs');
})
app.get('/Error', (req, res) => {
    res.render('Error.ejs');
})

app.get('/Logout', (req, res) => {
    res.cookie('session', "")
    res.redirect('/');
})

// app.get('/Login', (req, res) => {
//     res.send('Login file here');
// })
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

