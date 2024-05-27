const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const http = require('http');

const HttpError = require('./models/http-error');

const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors:{
        origin:[process.env.FRONTEND_URL],
        methods:["GET", "POST", "PATCH", "DELETE"]
    }
});

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.w2wp3km.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const port = process.env.PORT || 8080;

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers', 
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
});

app.use(bodyParser.json());

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);

app.use((req, res, next) => {
    return next(new HttpError( "This Page does not exits!", 404));
});

app.use((error, req, res, next) => {
    if(res.headerSent){
        return next(error);
    }
    res.status(error.statusCode || 500).
    json({message: error.message || 'Something went wrong! Try again later!', data:{}});
});

const userSocketMap = {};

io.on('connection', (socket) => {

    console.log('client connected with socketId: ' + socket.id);

    const userId = socket.handshake.query.userId;

    if(userId){
        userSocketMap[userId] = socket.id;
    }
    
    io.emit("onlineUsers", userSocketMap);

    socket.on("join-rooms", (roomIds) => {
        roomIds.forEach((roomId) => {
            socket.join(roomId);
        });
    });

    socket.on("send-message" , (roomId) => {
        socket.to(roomId).emit('receive-message', roomId);
    });

    socket.on("outgoing-call", (data) => {
        socket.to(data.to).emit("incoming-call", {from: data.to, fromName: data.fromName, remoteOffer: data.offer});
    });
    
    socket.on("user-busy", (data) => {
        socket.to(data.to).emit("user-busy", {from: data.to});
    });
    
    socket.on("leave-call", (data) => {
        socket.to(data.to).emit("leave-call", {from: data.to});
    });

    socket.on("reject-call", (data) => {
        socket.to(data.to).emit("call-rejected", {from: data.to});
    })

    socket.on("accept-call", (data) => {
        socket.to(data.to).emit("call-accepted", {from: data.to, remoteOffer: data.offer});
    })

    socket.on("ice-candidate", (data) => {
        socket.to(data.to).emit("ice-candidate-receive", {from: data.to, candidate: data.candidate});
    })

    socket.on("disconnect", () =>{
        console.log("client disconnected with socketId: " + socket.id);
        delete userSocketMap[userId];
        io.emit("onlineUsers", userSocketMap);
    });
});

mongoose.connect(MONGO_URI).
then(() => {
    console.log("connected to database!");
    server.listen(port, () => {
        console.log("Server is listening on " + port);
    })
}).
catch((err) => {
    console.log(err.message);
});

