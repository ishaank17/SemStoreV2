const jwt = require('jsonwebtoken');

const requireContri = (req, res, next) => {
    const token = req.cookies.session;

    // check json web token exists & is verified
    if (token) {
        jwt.verify(token, process.env.SECRET, (err, decodedToken) => {
            if (decodedToken.role === 'Admin' || decodedToken.role === 'Owner'|| decodedToken.role === 'Contributor') {
                next();
            } else {
                res.redirect('/Error?error=Unauthorized%20Access%20!');
            }
        });
    } else {
        res.render('Error' , {error:"Login First !"});
    }
};

module.exports = { requireContri };