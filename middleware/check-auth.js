const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

const checkAuth = (req, res, next) => {

    if(req.method === "OPTIONS"){
        return next();
    }

    try{

        const authHeader = req.get('Authorization');
    
        if(!authHeader){
            throw new HttpError('Authentication failed!', 401);
        }
        
        const token = authHeader.split(' ')[1];
        
        if(!token){
            throw new HttpError('Authentication failed!', 401);
        }
        
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        
        if(!decodedToken){
            throw new HttpError('Authentication failed!', 401);
        }

        req.userId = decodedToken.userId;
        next();
    }
    catch(err){
        return next(err);
    }
}

module.exports = checkAuth;