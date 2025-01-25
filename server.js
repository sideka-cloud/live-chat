const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const multer = require("multer");
const path = require("path");

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.use(express.static("public"));
app.use(express.json());
app.set("view engine", "ejs");

// Set up multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Save images to the 'uploads' folder in 'public'
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use the timestamp as the filename
    }
});

const upload = multer({ storage: storage });

// Define Chat Schema
const chatSchema = new mongoose.Schema({
    username: String,
    message: String,
    imageUrl: String, // Add field for image URL
    timestamp: { type: Date, default: Date.now },
});
const Chat = mongoose.model("Chat", chatSchema);

// Serve the index page
app.get("/", (req, res) => {
    res.render("index");
});

// Chat History API
app.get("/history", async (req, res) => {
    const chats = await Chat.find().sort({ timestamp: 1 }).exec();
    res.json(chats);
});

// Handle image upload
app.post("/upload", upload.single("image"), (req, res) => {
    if (req.file) {
        res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
    } else {
        res.status(400).json({ success: false, message: "No file uploaded" });
    }
});

// User registration
app.post("/register", (req, res) => {
    const { username } = req.body;
    if (username) {
        res.json({ success: true, username });
    } else {
        res.json({ success: false, message: "Username is required" });
    }
});

// Socket.io Chat Handler
io.on("connection", (socket) => {
    console.log("New user connected");

    // Handle incoming messages
    socket.on("chat_message", async (data) => {
        const { username, message, imageUrl } = data;
        const chat = new Chat({ username, message, imageUrl });
        await chat.save();
        io.emit("chat_message", { username, message, imageUrl, timestamp: chat.timestamp });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
});

// Clear Chat History API
app.post("/clear-chat-history", async (req, res) => {
    try {
        await Chat.deleteMany({});
        io.emit("clear_chat_history");
        res.json({ success: true });
    } catch (err) {
        console.error("Error clearing chat history:", err);
        res.status(500).json({ success: false, message: "Failed to clear chat history" });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
