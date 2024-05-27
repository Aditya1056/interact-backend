const Chat = require('../models/chat');
const Message = require('../models/message');
const HttpError = require('../models/http-error');

const helpers = require('../util/helpers');

exports.getChats = async (req, res, next) => {

    try{

        const chats = await Chat.find({users:{ $elemMatch: { $eq: req.userId}}})
                                .populate('users', '-password')
                                .populate('latestMessage')
                                .sort({updatedAt: -1});

        if(!chats){
            throw new HttpError('Chats not found!', 404);
        }

        chats.forEach((chat) => {
            if(chat.latestMessage){
                const decipheredText = helpers.decryptMessage(chat.latestMessage.content);
                chat.latestMessage.content = decipheredText;
            }
        });

        res.status(200).json({message:'chats fetched successfully', data:chats});

    }
    catch(err){
        return next(err);
    }
}

exports.searchChats = async (req, res, next) => {

    try{

        const term = req.query.term;

        const chats = await Chat.find({users:{ $in: [req.userId] }})
                                .populate({
                                    path: 'users',
                                    match:{_id: {$ne: req.userId}},
                                    select: '-password'
                                })
                                .populate('latestMessage')
                                .sort({updatedAt: -1});

        if(!chats){
            throw new HttpError('Chats not found!', 404);
        }

        const filteredChats = chats.filter((chat) => {

            let groupNameSearch = false;
            let userNameSearch = false;

            if(chat.isGroup){
                groupNameSearch = chat.groupName.toLowerCase().includes(term.toLowerCase());
            }
            else{
                userNameSearch = chat.users.some(user => user.name.toLowerCase().includes(term.toLowerCase()));
            }

            return groupNameSearch || userNameSearch;
        });

        filteredChats.forEach((chat) => {
            if(chat.latestMessage){
                const decipheredText = helpers.decryptMessage(chat.latestMessage.content);
                chat.latestMessage.content = decipheredText;
            }
        });

        res.status(200).json({message: "Searched Chats fetched successfully!", data: filteredChats});
    }
    catch(err){
        return next(err);
    }
}

exports.createChat = async (req, res, next) => {
    
    try{

        const users = req.body.users;

        const isGroup = req.body.isGroup;

        let groupName = req.body.groupName;

        let groupAdmin = null;

        if(groupName){
            groupName = groupName.trim();
        }

        if(isGroup){
            groupAdmin = req.userId;
        }

        if(isGroup && groupName.length === 0){
            throw new HttpError('Group name cannot be empty!', 422);
        }

        if(!users){
            throw new HttpError('Provided details are Invalid!', 422);
        }
        
        if(users.length === 0){
            throw new HttpError('No users added!', 422);
        }
        
        if(isGroup && (users.length < 2 || users.length > 19)){
            throw new HttpError('Group should contain 2 to 19 participants (excluding you)!', 422);
        }

        const updatedUsers = [...users];

        updatedUsers.unshift(req.userId);

        updatedUsers.sort();

        const existingChat = await Chat.findOne({
            users:{$all: updatedUsers, $size: updatedUsers.length}
        });

        if(existingChat){
            throw new HttpError('Chat or group already exists with given members!', 422);
        }

        const newChat = new Chat({
            isGroup,
            groupName,
            groupAdmin,
            users:updatedUsers,
            latestMessage:null
        });

        const savedChat = await newChat.save();

        res.status(201).json({message: 'Chat created successfully!', data: {chatId: savedChat._id}});
    }
    catch(err){
        return next(err);
    }
}

exports.addUsersToGroup = async (req, res, next) => {

    try{

        const newUsers = req.body.users;
        const chatId = req.params.groupId;

        const chat = await Chat.findById(chatId);

        if(!chat){
            throw new HttpError('Chat not found!', 404);
        }
        
        if(req.userId.toString() !== chat.groupAdmin.toString()){
            throw new HttpError('You are not authorized to add participants!', 403);
        }

        const updatedUsers = chat.users;

        newUsers.forEach((newUser) => {
            updatedUsers.push(newUser);
        });

        chat.users = updatedUsers;

        await chat.save();

        res.status(200).json({message: 'Users added successfully!', data:{}});
    }
    catch(err){
        return next(err);
    }
}

exports.removeUserFromGroup = async (req, res, next) => {

    try{
        const userId = req.params.userId;
        const chatId = req.params.groupId;
    
        const chat = await Chat.findById(chatId);
    
        if(!chat){
            throw new HttpError('Chat not found!', 404);
        }
        
        if(!chat.isGroup){
            throw new HttpError('Group not found!', 404);
        }
        
        if(userId === chat.groupAdmin.toString()){
            throw new HttpError('Admin cannot be deleted!', 422);
        }
        
        if(req.userId !== userId && req.userId !== chat.groupAdmin.toString()){
            throw new HttpError('You are not allowed to delete this user!', 403);
        }
        
        const existingUserIndex = chat.users.findIndex((user) => {
            return user.toString() === userId;
        });
        
        if(existingUserIndex < 0){
            throw new HttpError('User is not a member of the group!', 403);
        }
    
        const updatedUsers = chat.users.filter((user) => {
            return user.toString() !== userId;
        });
    
        chat.users = updatedUsers;
    
        await chat.save();
    
        res.status(200).json({message:'User removed successfully!' , data:{}});
    }
    catch(err){
        return next(err);
    }
}

exports.deleteGroup = async (req, res, next) => {

    try{

        const groupId = req.params.groupId;

        const chat = await Chat.findById(groupId);

        if(!chat){
            throw new HttpError('Chat not found!', 404);
        }
        
        if(!chat.isGroup){
            throw new HttpError('Only groups can be deleted!', 422);
        }

        if(chat.groupAdmin.toString() !== req.userId.toString()){
            throw new HttpError('You are not authorized to delete this group!', 403);
        }

        await Chat.deleteOne({_id: groupId});

        await Message.deleteMany({chatId: groupId});

        res.status(200).json({message:'Group deleted successfully!', data:{}});
    }
    catch(err){
        return next(err);
    }
}

exports.getMessages = async (req, res, next) => {

    try{

        const chatId = req.params.chatId;

        const chat = await Chat.findById(chatId).
                populate('users', '-password').
                populate('groupAdmin', '-password').
                populate('latestMessage');

        if(!chat){
            throw new HttpError('Chat not found!', 404);
        }

        const userExists = chat.users.find((chatUser) => {
            return chatUser._id.toString() === req.userId.toString();
        })

        if(!userExists){
            throw new HttpError('You are not authorized to view this chat!', 403);
        }

        const messages = await Message.find({chatId: chatId}).populate('sender', '-password').sort({createdAt: 1});

        if(!messages){
            throw new HttpError('messages not found!', 404);
        }

        messages.forEach((message) => {
            const decipheredText = helpers.decryptMessage(message.content);
            message.content = decipheredText;
        });

        res.status(200).json({message: 'messages fetched successfully!', data:{messages, chat}});

    }
    catch(err){
        return next(err);
    }
}

exports.createMessage = async (req, res, next) => {

    try{

        let messageContent = req.body.message;
        const chatId = req.body.chatId;

        if(!messageContent || !chatId || messageContent.length === 0){
            throw new HttpError('Invalid message!', 422);
        }

        messageContent = messageContent.trim();

        const chat = await Chat.findById(chatId);

        if(!chat){
            throw new HttpError('Chat not found!', 404);
        }

        const userExists = chat.users.find((chatUser) => {
            return chatUser.toString() === req.userId.toString();
        });

        if(!userExists){
            throw new HttpError('You are not authorized to message in this chat!', 403);
        }

        const cipherText = helpers.encryptMessage(messageContent);

        const message = new Message({
            sender:req.userId,
            content:cipherText,
            chatId:chatId
        });

        const savedMessage = await message.save();

        chat.latestMessage = savedMessage._id;

        await chat.save();

        res.status(201).json({message:'Message created successfully!', data:{messageId: savedMessage._id}});
    }
    catch(err){
        return next(err);
    }
}

