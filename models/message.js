const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    content:{
        type:String,
        required:true
    },
    chatId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Chat',
        required:true
    }
}, {timestamps: true});

module.exports = mongoose.model('Message', messageSchema);