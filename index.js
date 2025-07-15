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
const report=require('./models/Report');
const subscribe=require('./models/Subs');
const {requireLogin}=require('./models/LoginCheck');
const {requireAdmin}=require('./models/AdminCheck');
const {requireContri}=require('./models/ContriCheck');
const multer = require('multer');
const crypto = require('crypto');
const mime = require('mime-types');
const mongoose = require('mongoose');
const fs=require('fs');

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,"public")));
app.set('view engine', 'ejs')


// MULTER
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './public/contents')
//     },
//     filename: function (req, file, cb) {
//          crypto.randomBytes(12, (e,b)=>{
//              if (e) {
//                  console.error("Error generating random bytes:", e);
//                  return cb(e, null);
//              }
//               const fname=path.basename(file.originalname,path.extname(file.originalname)) +"-"+b.toString("hex") + path.extname(file.originalname);
//              console.log("Generated file name:", fname);
//              cb(null, fname );
//          })
//
//     }
// })
// const upload = multer({ storage: storage })
const upload = multer({ storage: multer.memoryStorage() });


//UPLOAD TO GOOGLE
// const {google} = require('googleapis');
// const apikeys= {
//     "type": "service_account",
//     "project_id": "oauth-461019",
//     "private_key_id": `${process.env.STORAGE_KEY_ID}`,
//     "private_key": process.env.STORAGE_KEY.replace(/\\n/g, '\n'),
//     "client_email": `${process.env.STORAGE_CLIENT_EMAIL}`,
//     "client_id":process.env.STORAGE_CLIENT_ID ,
//     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
//     "token_uri": "https://oauth2.googleapis.com/token",
//     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
//     "client_x509_cert_url": process.env.STORAGE_CLIENT_CERT_URL,
//     "universe_domain": "googleapis.com"
// }
// const SCOPE=['https://www.googleapis.com/auth/drive'];
// async function authorize() {
//     const jwtClient = new google.auth.JWT(
//         apikeys.client_email,
//         null,
//         apikeys.private_key,
//         SCOPE
//     );
//     await jwtClient.authorize();
//     return jwtClient;
// }



function generateUniqueFilename(originalName) {
    const timestamp = Date.now();  // current time in ms
    const random = crypto.randomBytes(3).toString('hex');  // 6-char hex string
    const base = path.basename(originalName, path.extname(originalName));
    const ext = path.extname(originalName);
    return `${base}-${timestamp}-${random}${ext}`;
}

function uploadGCS (file) {
    return new Promise((resolve, reject) =>{
    const fileName = generateUniqueFilename(file.originalname);
        const blob = bucket.file(fileName);
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });

        blobStream.on("error", err => reject(err));

        blobStream.on("finish", () => {
            const publicUrl = `/files/${fileName}`;
            resolve(publicUrl);
        });

        blobStream.end(file.buffer);
    });
}
async function deleteGCSFile(filename) {
    try {
          await bucket.file(filename).delete();
        console.log(`🗑️ Deleted file ${filename}`);
    } catch (err) {
        console.error('❌ Failed to delete file:', err);
    }

}
const { Storage } = require('@google-cloud/storage');
const gcsstorage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n')
    },
});

const bucket = gcsstorage.bucket('semstore');
app.get('/files/:filename',requireLogin, async (req, res) => {
    const filename = req.params.filename;
    const file = bucket.file(filename);

    try {
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) return res.status(404).send('File not found');

        // Get metadata for content-type
        const [metadata] = await file.getMetadata();
        res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year browser cache

        file.createReadStream().pipe(res);
    } catch (err) {
        console.error('❌ GCS fetch error:', err);
        res.status(500).send('Internal server error');
    }
});





//SESSION MIDDLE WARE
app.use((req, res, next) => {
    try {
        const decoded = jwt.verify(req.cookies.session, process.env.SECRET);
        res.locals.name = decoded.name;
        res.locals.email = decoded.email;
        res.locals.profilePhoto = decoded.profilePhoto;
        res.locals.role = decoded.role;
        res.locals._id = decoded._id;
        // console.log(decoded.role)
    } catch (err) {
        res.locals.name = null;
        res.locals.link = null;
        res.locals.role = "Error";
    }
    next();
});
async function fetchCourseCodes(req, res, next) {
    try {
        req.courseCodes = await content.distinct('coursecode');
        next();
    } catch (err) {
        console.error('Middleware error:', err);
        next(err); // pass error to error handler
    }
}

//GOOGLE OAUTH2
const {OAuth2Client, JWT} = require('google-auth-library');
const {file} = require("googleapis/build/src/apis/file");
const constants = require("node:constants");

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
    if(!(row)) {

        const result =await userModel.create({
            rollno:data.family_name,
            name: data.given_name,
            email: data.email,
            profilePhoto: data.picture,
            role:"Student"
        })

        let session= jwt.sign({rollno:data.family_name,
            _id:result._id,
            name: data.given_name,
            email: data.email,
            profilePhoto: data.picture,
            role:"Student"},process.env.SECRET);

        res.cookie('session',session);
        res.redirect('/Signup',);
    }
    else{
        let session= jwt.sign({rollno:row.rollno,
            _id:row._id,
            name: row.name,
            email: row.email,
            profilePhoto: row.profilePhoto,
            role:row.role},process.env.SECRET);
        res.cookie('session',session);
        if(!row.branch)res.redirect('/Signup');
        else res.redirect('/Home');
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
app.get('/Home', fetchCourseCodes, requireLogin,async(req, res) => {
    res.render('Home.ejs',{ courseCodes: req.courseCodes });

})
app.get('/AdminPanel/Results', requireAdmin, async (req, res) => {
    const contentNo= await content.countDocuments();
    const usersNo= await userModel.countDocuments();

    res.json({contents: contentNo,users:usersNo});
});
app.get('/Home/search', requireLogin, async (req, res) => {
    const { q, semester, branch,order,currentPage } = req.query;
    // console.log("Fetching");
    let filter = {};

    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { coursecode: { $regex: q, $options: 'i' } },
            { tags: { $regex: q, $options: 'i' } },
                           // MONITOR THIS
        ];
    }
    if (semester) filter.semester = semester;
    if (branch) filter.branch = branch;
    // console.log(typeof (order));
    // console.log("Filter:", JSON.stringify(filter, null, 2));
    const totalCount = await content.countDocuments(filter);
    const itemsPerPage=20
    const skip = (currentPage - 1) * itemsPerPage;
    const results = await content.find(filter).sort({ popularity: parseInt(order) }).skip(skip).limit(itemsPerPage);

    res.json({
        datasent: results,
        totalCount,
        itemsPerPage
        });
});
app.get('/AdminPanel/search', requireAdmin, async (req, res) => {
    const { q, semester, branch,order,currentPage } = req.query;

    let filter = {};

    if (q) {
        const orConditions = [
            { title: { $regex: q, $options: 'i' } },
            { coursecode: { $regex: q, $options: 'i' } },
            { tags: { $regex: q, $options: 'i' } },
        ];

        // Check if q is valid ObjectId
        if (mongoose.Types.ObjectId.isValid(q)) {
            orConditions.push({ _id: q });  // exact match, no regex
        }

        filter.$or = orConditions;
    }
    if (semester) filter.semester = semester;
    if (branch) filter.branch = branch;

    const totalCount = await content.countDocuments(filter);
    const itemsPerPage=20
    const skip = (currentPage - 1) * itemsPerPage;
    const results = await content.find(filter).sort({ popularity: parseInt(order) }).skip(skip).limit(itemsPerPage);
    res.json({
        datasent: results,
        totalCount,
        itemsPerPage
    });
});


app.get('/AdminPanel/Users/search', requireAdmin, async (req, res) => {
    const { q, role ,currentPage} = req.query;

    let filter = {};

    if (q) {
        filter.$or=[{ name: { $regex: q, $options: 'i' }} , {role:{ $regex: q, $options: 'i' } }]
    }
    if (role) filter.role = role;

    const totalCount = await userModel.countDocuments(filter);
    const itemsPerPage=20
    const skip = (currentPage - 1) * itemsPerPage;


    const results = await userModel.find(filter).skip(skip).limit(itemsPerPage); //.sort({name: 1}); //.limit(20)
    res.json({
        datasent: results,
        totalCount,
        itemsPerPage
    });
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
    res.render("AdminPanel.ejs");
})
app.get('/Downloads',requireLogin, (req, res) => {
    res.render('Downloads.ejs');
})
app.get('/Upload',requireContri, (req, res) => {
    res.render('Upload.ejs');
})

app.post('/UploadFile',requireContri,upload.single("file_input") ,async (req, res) => {
    try{
        const {code , title ,desc , tags , branch ,sem }= req.body;
        const url= await uploadGCS(req.file);


        let date = new Date().toLocaleDateString();
        const result=await content.findOne({coursecode: code})
        const pop=result?.popularity??0;
        await content.create({
            coursecode: code,
            title,
            description:desc,
            type:path.extname(req.file.originalname).slice(1).toUpperCase(),
            uploadedBy:jwt.verify(req.cookies.session, process.env.SECRET).name,
            uploadedByID:jwt.verify(req.cookies.session, process.env.SECRET)._id,
            uploadedAt:date,
            branch,
            semester: sem,
            path:url,
            tags,
            popularity: pop,
        })
        console.log("done uploading")
        res.redirect('Upload');
    } catch (err) {
        console.error("❌ Upload failed:", err);
        res.status(500).send("Upload failed");
    }
});
app.get("/contents/:file",requireLogin, (req, res) => {
    const fullPath = path.resolve("public/contents", req.params.file);
    res.sendFile(fullPath);
});
app.get("/api/file/:id",requireLogin, async (req, res) => {
    try {
        const filePath = await downloadFile(req.params.id, "public/contents");
        const fileName = path.basename(filePath);
        console.log(fileName);
        res.json({ fileName });
    } catch (err) {
        res.status(500).json({ error: "Failed to get file metadata" });
    }
});

// app.post('/delete/:filename',requireLogin, async (req, res) => {
//     const filename = req.params.filename;
//     const filePath = path.resolve('public/contents', filename);
//
//     try {
//         fs.unlink(filePath, (err) => {
//             if (err) {
//                 console.error("Failed to delete file after cache:", err);
//             } else {
//                 console.log("File deleted successfully after cache");
//             }
//         });
//         console.log(`Deleted file: ${filename}`);
//         res.json({ success: true });
//     } catch (err) {
//         console.error(`Error deleting file: ${filename}`, err);
//         res.status(500).json({ error: 'Failed to delete file' });
//     }
// });


app.get('/AdminPanel/Users', requireAdmin,async (req, res) => {
    res.render('ManageUsers.ejs');
});
app.get('/AdminPanel/Reports',requireAdmin,  (req, res) => {
    console.log("Rendering reports");
    res.render('ManageReports.ejs');
})
app.get('/AdminPanel/GetReports',requireAdmin ,async (req, res) => {
    const status = req.query.st;
    let query = {};
    if (status === "Pending" || status === "Resolved") {
        query.status = status;
    }

    const results = await report.find(query).sort({ createdAt: -1 });
    res.json(results);
});

app.get('/AdminPanel/Delete/:file/:_id',requireAdmin, async (req, res) => {

    try {
        await deleteGCSFile(req.params.file);

        const resu = await content.deleteOne({ _id: req.params._id });
        console.log("✅ Successfully deleted content:", resu);
    } catch (err) {
        console.error('❌ Failed during deletion:', err);
    }

    res.redirect('/AdminPanel/Content');
});
app.post('/AdminPanel/Users/:id/promote',requireAdmin, async (req, res) => {
    const result =await userModel.findOne({ _id: req.params.id });
    let roles="";
    if(result.role==='Student')  roles = "Contributor";
    else if(result.role==='Contributor')  roles = "Admin";
    else if(result.role==='Admin')  roles = "Owner";
    await userModel.updateOne({ _id: req.params.id },{role:roles})
    res.redirect('/AdminPanel/Users');

});
app.post('/AdminPanel/Users/:id/demote',requireAdmin, async (req, res) => {
    const result =await userModel.findOne({ _id: req.params.id });
    let roles="";
    if(result.role==='Contributor')  roles = "Student";
    else if(result.role==='Admin')  roles = "Contributor";
    else if(result.role==='Owner')  roles = "Admin";
    await userModel.updateOne({ _id: req.params.id },{role:roles})
    res.redirect('/AdminPanel/Users');
});
app.post('/AdminPanel/Users/:id/delete',requireAdmin, async (req, res) => {
    const result =await userModel.deleteOne({_id: req.params.id});
    res.redirect('/AdminPanel/Users');

});


const webpush = require('web-push');

webpush.setVapidDetails(
    'mailto:ishaan.kamath@iitgn.ac.in',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);
app.post("/AdminPanel/Notify/",requireAdmin, async (req, res) => {
    const subs = await subscribe.find();
    const payload = JSON.stringify({
        title: req.body.title,
        body: req.body.msg
    });

    const results = [];

    for (const subdata of subs) {
        const sub = subdata.sub;
        try {
            const result = await webpush.sendNotification(sub, payload);
            console.log("sent");
            results.push({ endpoint: sub.endpoint, success: true });
        } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
                // Remove expired subscription from DB
                await subscribe.deleteOne({ "sub.endpoint": sub.endpoint });
                console.log(`Removed expired subscription: ${sub.endpoint}`);
                results.push({ endpoint: sub.endpoint, success: false, removed: true });
            } else {
                console.error(`Failed to send to ${sub.endpoint}`, err);
                results.push({ endpoint: sub.endpoint, success: false, error: err.message });
            }
        }
    }

    res.json({ results });
});
app.post("/Subscribe", async (req, res) => {
    try {
        const subData = req.body;
        const data = await jwt.verify(req.cookies.session, process.env.SECRET);

        const result = await subscribe.findOne({ id: data._id, "sub.endpoint": subData.endpoint });
        if (!result) {
            await subscribe.create({ id: data._id, sub: subData });
        }

        res.sendStatus(200); // ✅ No body, no JSON shown
    } catch (err) {
        console.error("Subscribe error:", err);
        res.sendStatus(500); // ✅ Fail silently on error
    }
});
app.get("/AdminPanel/Announce",requireAdmin,  (req, res) => {
    res.render('Announce.ejs');
})
app.post("/AdminPanel/Reports/:id/reply/:by",requireAdmin, async (req, res) => {
    try {
        const repoID = req.params.id;
        const by = req.params.by;
        const {reply} = req.body;
        const data = await jwt.verify(req.cookies.session, process.env.SECRET);
        const result = await report.findOneAndUpdate({_id: repoID}, {
            reply: reply,
            replyBy: data._id,
            repliedAt: new Date().toLocaleDateString()
        });

        const subs = await subscribe.find({id: by});
        const payload = JSON.stringify({
            title: "An Admin has replied to your report !",
            body: reply
        });

        const results = [];

        for (const subdata of subs) {
            const sub = subdata.sub;
            try {
                const result = await webpush.sendNotification(sub, payload);
                console.log("sent");
                results.push({endpoint: sub.endpoint, success: true});
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Remove expired subscription from DB
                    await subscribe.deleteOne({"sub.endpoint": sub.endpoint});
                    console.log(`Removed expired subscription: ${sub.endpoint}`);
                    results.push({endpoint: sub.endpoint, success: false, removed: true});
                } else {
                    console.error(`Failed to send to ${sub.endpoint}`, err);
                    results.push({endpoint: sub.endpoint, success: false, error: err.message});
                }
            }
        }
        return res.redirect("/AdminPanel/Reports");
    }
    catch (err) {
        console.error("Error handling reply:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
})

app.post("/AdminPanel/Reports/:id/resolve/:by",requireAdmin, async (req, res) => {
    try {
        const repoID = req.params.id;
        const by = req.params.by;
        const data = await jwt.verify(req.cookies.session, process.env.SECRET);
        const result = await report.findOneAndUpdate({_id: repoID}, {
            replyBy: data._id,
            status: "Resolved",
            repliedAt: new Date().toLocaleDateString()
        });

        const subs = await subscribe.find({id: by});
        const payload = JSON.stringify({
            title: "An Admin has replied to your report !",
            body: "Your Issue has Been Resolved !!!"
        });

        const results = [];

        for (const subdata of subs) {
            const sub = subdata.sub;
            try {
                const result = await webpush.sendNotification(sub, payload);
                console.log("sent");
                results.push({endpoint: sub.endpoint, success: true});
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Remove expired subscription from DB
                    await subscribe.deleteOne({"sub.endpoint": sub.endpoint});
                    console.log(`Removed expired subscription: ${sub.endpoint}`);
                    results.push({endpoint: sub.endpoint, success: false, removed: true});
                } else {
                    console.error(`Failed to send to ${sub.endpoint}`, err);
                    results.push({endpoint: sub.endpoint, success: false, error: err.message});
                }
            }
        }
        return res.redirect("/AdminPanel/Reports");
    }
    catch (err) {
        console.error("Error handling reply:", err);
        return res.status(500).json({ message: "Server error", error: err.message });
    }
})


app.post("/AdminPanel/Reports/delete-resource/:id",requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        res.redirect(`/AdminPanel/Content/${id}`);
    } catch (err) {
        console.error("Error in delete route:", err);
        res.status(500).send("Server Error");
    }
});
// app.get('/AdminPanel/Content', async (req, res) => {
//     res.render('ManageContent.ejs');
// });
app.get('/AdminPanel/Content{/:id}',requireAdmin, async (req, res) => {
    const searchid = req.params.id || null;
    res.render('ManageContent.ejs', { searchid });
});
app.post('/followCourse',requireLogin, async (req, res) => {
    const { coursecode } = req.body;
    await content.updateMany(
        { coursecode },
        { $inc: { popularity: 1 } }
    );
    res.sendStatus(200);
});

app.post('/unfollowCourse',requireLogin, async (req, res) => {
    const { coursecode } = req.body;
    await content.updateMany(
        { coursecode },
        { $inc: { popularity: -1 } }
    );
    res.sendStatus(200);
});


app.post('/ReportResource',requireLogin, async (req, res) => {
    const {id,code,reason,details} = req.body;
    const data = await jwt.verify(req.cookies.session, process.env.SECRET);
    await report.create({
        by:data._id,
        resourceTitle:code,
        resourceID:id,
        reportedByEmail:data.email,
        reason:reason,
        description:details,
        createdAt:new Date().toLocaleDateString(),
    })
    res.sendStatus(200);
})

app.post('/Feedback',requireLogin, async (req, res) => {
    const {code,reason,details} = req.body;
    const data = await jwt.verify(req.cookies.session, process.env.SECRET);
    await report.create({
        by:data._id,
        resourceTitle:code,
        reportedByEmail:data.email,
        reason:reason,
        description:details,
        createdAt:new Date().toLocaleDateString(),
    })
    res.sendStatus(200);
})

app.get('/ManageUpload',requireContri, async (req, res) => {
    res.render('ManageUpload.ejs');
})

app.get('/ManageUpload/search', requireAdmin, async (req, res) => {
    const { q, semester, branch,order,currentPage } = req.query;
    const data = await jwt.verify(req.cookies.session, process.env.SECRET);

    let filter = {};

    if (q) {
        const orConditions = [
            { title: { $regex: q, $options: 'i' } },
            { coursecode: { $regex: q, $options: 'i' } },
            { tags: { $regex: q, $options: 'i' } },
        ];

        // Check if q is valid ObjectId
        if (mongoose.Types.ObjectId.isValid(q)) {
            orConditions.push({ _id: q });  // exact match, no regex
        }

        filter.$or = orConditions;
    }
    if (semester) filter.semester = semester;
    if (branch) filter.branch = branch;
    filter.uploadedByID = data._id;
    // console.log(typeof (order));
    // console.log("Filter:", JSON.stringify(filter, null, 2));
     //.limit(20)
    const totalCount = await content.countDocuments(filter);
    const itemsPerPage=1
    const skip = (currentPage - 1) * itemsPerPage;
    const results = await content.find(filter).sort({ popularity: parseInt(order) }).skip(skip).limit(itemsPerPage);
    res.json({
        datasent: results,
        totalCount,
        itemsPerPage
    });
});

app.get('/ManageUpload/Delete/:file/:_id',requireContri, async (req, res) => {
    try {
        await deleteGCSFile(req.params.file);

        const resu = await content.deleteOne({ _id: req.params._id });
        console.log("✅ Successfully deleted content:", resu);
    } catch (err) {
        console.error('❌ Failed during deletion:', err);
    }

    res.redirect('/ManageUpload');
});
app.listen(80,() => console.log(`Server running on port 80`));


