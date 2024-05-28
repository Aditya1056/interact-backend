const ms = require('ms');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const HttpError = require('../models/http-error');

const avatars = [
    'image-0.png', 'image-1.jpg', 'image-2.jpg', 'image-3.jpg', 'image-4.jpeg', 
    'image-5.jpeg', 'image-6.jpg', 'image-7.jpg', 'image-8.jpg', 'image-9.jpg', 
    'image-10.jpg'
];

exports.getAvatars = (req, res, next) => {
    res.status(200).json({message: 'Avatars fetched successfully!', data:{avatars}});
}

exports.getUser = async  (req, res, next) => {

    try{

        const userId = req.params.userId;

        const user = User.findById(userId).select('-password');

        if(!user){
            throw new HttpError('User not found!', 404);
        }

        res.status(200).json({message:'User fetched successfully!', data: user});
    }
    catch(err){
        return next(err);
    }
}

exports.getUsersByUsername = async (req, res, next) => {

    try{

        const selectedUsers = req.body.selectedUsers;
        const existingUsers = req.body.existingUsers;
        const username = req.body.username.trim();

        const allUsers = await User.find({_id: { $ne: req.userId}}).select('-password');

        if(!allUsers){
            throw new HttpError('No users found!', 404);
        }

        // if(user._id.toString() === req.userId.toString()){
        //     throw new HttpError('You cannot add yourself!', 422);
        // }

        const users = allUsers.filter((user) => {
            return user.username.toLowerCase().includes(username.toLowerCase());
        });

        selectedUsers.forEach((selectedUser) => {
            users.forEach((user, index) => {
                if(user._id.toString() === selectedUser.userId){
                    users.splice(index, 1);
                }
            });
        });
        
        if(existingUsers){
            existingUsers.forEach((existingUser) => {
                users.forEach((user, index) => {
                    if(user._id.toString() === existingUser.userId){
                        users.splice(index, 1);
                    }
                });
            });
        }
        
        if(users.length === 0){
            throw new HttpError('No users found or already added!', 404);
        }

        const updatedUsers = users.map((user) => {
            return {
                userId: user._id,
                username:user.username,
                userImage:user.image
            }
        });

        res.status(200).json({
            message: 'User fetched successfully!', 
            data:{
                users:updatedUsers
            }
        });
    }
    catch(err){
        return next(err);
    }
}

exports.changeAvatar = async (req, res, next) => {

    try{

        const userImage = req.body.image;

        const user = await User.findById(req.userId);

        if(!user){
            throw new HttpError('User not found!', 404);
        }

        user.image = userImage;

        await user.save();

        res.status(200).json({message: "Profile avatar changed successfully!", data:{}});
    }
    catch(err){
        return next(err);
    }
}

exports.checkUsernameAvailability = async (req, res, next) => {

    try{
        const searchTerm = req.query.search;

        const user = await User.findOne({username: searchTerm});

        if(user){
            throw new HttpError('Username already exists', 422);
        }

        res.status(200).json({message:'Username available', data:{}});
    }
    catch(err){
        return next(err);
    }
}

exports.signup = async (req, res, next) => {
    
    try{
    
        let { name, email, username, password, image } = req.body;

        name = name.trim();
        email = email.trim().toLowerCase();
        username = username.trim();
        password = password.trim();
        image = image.trim();

        if(!email.includes('@') || email.length < 6 || password.length < 6 || name.length === 0 || !image || username.length < 3){
            throw new HttpError("Invalid User Details!", 422);
        }
    
        const user = await User.findOne({email: email});
    
        if(user){
            throw new HttpError('User Already exists! Try different email!', 422);
        }
        
        const existingUser = await User.findOne({username: username});
        
        if(existingUser){
            throw new HttpError('Username already exists! Try different username!', 422);
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const newUser = new User({
            name,
            email,
            username,
            password:hashedPassword,
            image
        });

        const savedUser = await newUser.save();

        res.status(201).json({message: 'User Signed up sucessfully!', data:{userId: savedUser._id}});
    }
    catch(err){
        return next(err);
    }
}

exports.login = async (req, res, next) => {

    try{

        let { username, password } = req.body;

        username = username.trim();
        password = password.trim();

        const user = await User.findOne({username: username});

        if(!user){
            throw new HttpError("Invalid Username!", 422);
        }
        
        const isMatched = await bcrypt.compare(password, user.password);
        
        if(!isMatched){
            throw new HttpError("Invalid Password!", 422);
        }

        const expiresIn = '12h';

        const token = jwt.sign(
            {userId: user._id, username: user.username}, 
            process.env.JWT_KEY,
            {expiresIn : expiresIn}
        );

        res.status(200).
        json({
            message:'Login successful!', 
            data:{
                userId: user._id,
                userImage: user.image,
                name:user.name,
                username:user.username,
                joined:user.createdAt,
                token: token,
                expiration: ms(expiresIn)
            }
        });
    }
    catch(err){
        return next(err);
    }
}

