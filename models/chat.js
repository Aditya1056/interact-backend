const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chatSchema = new Schema({

    isGroup:{
        type:Boolean,
        default:false
    },
    groupName:{
        type:String,
        default:null
    },
    groupAdmin:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        default:null
    },
    users:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        }
    ],
    latestMessage:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Message'
    }

},{timestamps:true});

module.exports = mongoose.model('Chat', chatSchema);