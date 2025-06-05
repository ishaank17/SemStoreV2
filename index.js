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
const {requireAdmin}=require('./models/AdminCheck');
const multer = require('multer');
const crypto = require('crypto');
const mime = require('mime-types');


app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,"public")));
app.set('view engine', 'ejs')



// MULTER
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/contents')
    },
    filename: function (req, file, cb) {
         crypto.randomBytes(12, (e,b)=>{
             if (e) {
                 console.error("Error generating random bytes:", e);
                 return cb(e, null);
             }
              const fname=path.basename(file.originalname,path.extname(file.originalname)) +"-"+b.toString("hex") + path.extname(file.originalname);
             console.log("Generated file name:", fname);
             cb(null, fname );
         })

    }
})
const upload = multer({ storage: storage })

console.log( process.env.STORAGE_KEY.replace(/\\n/g, '\n'))
//UPLOAD TO GOOGLE
const fs=require('fs');
const {google} = require('googleapis');
const apikeys= {
    "type": "service_account",
    "project_id": "oauth-461019",
    "private_key_id": `${process.env.STORAGE_KEY_ID}`,
    "private_key": process.env.STORAGE_KEY.replace(/\\n/g, '\n'),
    "client_email": `${process.env.STORAGE_CLIENT_EMAIL}`,
    "client_id":process.env.STORAGE_CLIENT_ID ,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.STORAGE_CLIENT_CERT_URL,
    "universe_domain": "googleapis.com"
}
const SCOPE=['https://www.googleapis.com/auth/drive'];
async function authorize() {
    const jwtClient = new google.auth.JWT(
        apikeys.client_email,
        null,
        apikeys.private_key,
        SCOPE
    );
    await jwtClient.authorize();
    return jwtClient;
}
async function uploadFile(authClient,filename){
    return new Promise((resolve,rejected)=>{
        const drive = google.drive({version:'v3',auth:authClient});
        const mimeType = mime.lookup(filename) || 'application/octet-stream';
        var fileMetaData = {
            name:`${filename}`,
            parents:['1W9QcqqyhnKRsC7bN5j_--qdSgxXx8sxO'] // A folder ID to which file will get uploaded
        }

        drive.files.create({
            resource:fileMetaData,
            media:{
                body: fs.createReadStream(`public/contents/${filename}`), // files that will get uploaded
                mimeType:mimeType
            },
            fields:'id'
        },function(error,file){
            if(error){
                return rejected(error)
            }
            resolve(file);
        })
    });
}
function uploadGoogle (fname) {
    return authorize()
        .then(auth => uploadFile(auth, fname))
        .then(file => {
            const fileId = file.data.id;
            const url = `https://drive.google.com/file/d/${fileId}/view`;
            console.log("Drive URL:", url);
            return url;
        }).catch(e=>console.log("Error while uploading:",e));
}
async function downloadFile(fileId, destination) {
    const auth = new google.auth.GoogleAuth({
        keyFile:'apikeys.json', // Replace with path to your JSON file
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    // console.log("Here",fileId);
    const { data: metadata } = await drive.files.get({fileId} );
    // console.log("Metadata",metadata);
    const fileName = metadata.name ;
    const fullDest = path.resolve(destination, fileName);
    // console.log("FUll DESt",fullDest);
    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
    );

    const dest = fs.createWriteStream(fullDest);
    await new Promise((resolve, reject) => {
        res.data
            .on('end', () => {
                console.log('✅ File downloaded successfully');
                resolve();
            })
            .on('error', err => {
                console.error('❌ Error downloading file', err);
                reject(err);
            })
            .pipe(dest);
    });
    return fullDest;
}




//SESSION MIDDLE WARE
app.use((req, res, next) => {
    try {
        const decoded = jwt.verify(req.cookies.session, process.env.SECRET);
        res.locals.name = decoded.name;
        res.locals.email = decoded.email;
        res.locals.profilePhoto = decoded.profilePhoto;
        res.locals.role = decoded.role;
        // console.log(decoded.role)
    } catch (err) {
        res.locals.name = null;
        res.locals.link = null;
        res.locals.role = "Error";
    }
    next();
});


//GOOGLE OAUTH2
const {OAuth2Client, JWT} = require('google-auth-library');
const {file} = require("googleapis/build/src/apis/file");

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



//REDIRECTS OF PAGES
app.get('/Login', async (req, res) => {
    const code = req.query.code;
    const redirectURL = `${BASE_URL}/Login`;
    // console.log(redirectURL);
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

    // console.log(row)

    if(!row) {
        let session= jwt.sign({rollno:data.family_name,
            name: data.given_name,
            email: data.email,
            profilePhoto: data.picture,
            role:"Student"},process.env.SECRET);
        await userModel.create({
            rollno:data.family_name,
            name: data.given_name,
            email: data.email,
            profilePhoto: data.picture,
            role:"Student"
        })
        res.cookie('session',session);
        res.redirect('/Signup',);
    }
    else{
        let session= jwt.sign({rollno:row.rollno,
            name: row.name,
            email: row.email,
            profilePhoto: row.profilePhoto,
            role:row.role},process.env.SECRET);
        res.cookie('session',session);
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
    const error = req.query.error;
    res.render('error', { error });
});

app.get('/Logout', (req, res) => {
    res.cookie('session', "")
    res.redirect('/');
})

app.get('/AdminPanel',requireAdmin, (req, res) => {
    res.send('Admin page here');
})
app.get('/Upload',requireAdmin, (req, res) => {
    res.render('Upload.ejs');
})

app.post('/UploadFile',upload.single("file_input") ,async (req, res) => {
    const {code , title ,desc , tags , branch ,sem }= req.body;
    const url= await uploadGoogle(req.file.filename);
    fs.unlink(`public/contents/${req.file.filename}`, (err) => {
        if (err) {
            console.error("Failed to delete file after upload:", err);
        } else {
            console.log("File deleted successfully after upload");
        }
    });
    let date = new Date().toLocaleDateString();
    await content.create({
        coursecode: code,
        title,
        description:desc,
        type:path.extname(req.file.originalname).slice(1).toUpperCase(),
        uploadedBy:jwt.verify(req.cookies.session, process.env.SECRET).name,
        uploadedAt:date,
        branch,
        semester: sem,
        path:url,
        tags,
    })
    console.log("done uploading")
    res.redirect('Upload');
})
app.get("/contents/:file", (req, res) => {
    const fullPath = path.resolve("public/contents", req.params.file);
    res.sendFile(fullPath);
});

app.get("/api/file/:id", async (req, res) => {
    try {
        const filePath = await downloadFile(req.params.id, "public/contents");
        const fileName = path.basename(filePath);
        console.log(fileName);
        res.json({ fileName });
    } catch (err) {
        res.status(500).json({ error: "Failed to get file metadata" });
    }
});
app.post('/delete/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.resolve('public/contents', filename);

    try {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error("Failed to delete file after cache:", err);
            } else {
                console.log("File deleted successfully after cache");
            }
        });
        console.log(`Deleted file: ${filename}`);
        res.json({ success: true });
    } catch (err) {
        console.error(`Error deleting file: ${filename}`, err);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});
app.listen(80)

