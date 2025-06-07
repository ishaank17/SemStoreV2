const jwt = require('jsonwebtoken');

const requireLogin = (req, res, next) => {
    const token = req.cookies.session;
    console.log(token)
    jwt.verify(token, process.env.SECRET, (err, decodedToken) => console.log("Decoded JWT:", decodedToken));
    // check json web token exists & is verified
    if (token) {
        jwt.verify(token, process.env.SECRET, (err, decodedToken) => {

            if (err) {
                res.redirect('/Error',{error:err.message});
            } else {
                next();
            }
        });
    } else {
        res.render('Error' , {error:"Login First"});
    }
};

module.exports = { requireLogin };