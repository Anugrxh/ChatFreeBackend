// controllers/chatController.js

const User = require('../models/User');
const axios = require('axios');

// Function 1: Get all chats for a user (Unchanged)
exports.getChats = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function 2: Create a new chat (Unchanged)
exports.createNewChat = async (req, res) => {
  try {
    const { title } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newChat = { title, messages: [] };
    user.chats.push(newChat);
    await user.save();
    
    // Return the last chat added, which is the new one
    res.status(201).json(user.chats[user.chats.length - 1]);
  } catch (error) {
    console.error("Error creating new chat:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function 3: Get a specific chat by its ID (Unchanged)
exports.getChatById = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const chat = user.chats.id(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Function 4: Add a message (MODIFIED FOR MEMORY)
exports.addMessageToChat = async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: "Message is required." });

  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const chat = user.chats.id(req.params.chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    // Save the user's new message first
    chat.messages.push({ sender: "user", text: message, timestamp: new Date() });

    // --- MEMORY IMPLEMENTATION START ---

    // 1. Format the entire chat history for the Gemini API.
    // The API expects roles to be 'user' and 'model'.
    const history = chat.messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // 2. To prevent errors with very long conversations, we'll only send the last 20 messages.
    // This gives the AI enough context without exceeding token limits.
    const recentHistory = history.slice(-20); 

    // 3. The new message is already included in `recentHistory` from the push above.
    // The entire history now becomes the 'contents' payload.
    const payload = {
      contents: recentHistory,
      // Optional: Add safety settings and generation config if needed
      // generationConfig: { ... },
      // safetySettings: [ ... ],
    };

    // --- MEMORY IMPLEMENTATION END ---

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      payload, // Send the payload with the full history
      { headers: { "Content-Type": "application/json" } }
    );

    const reply = geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
    
    // Save the bot's reply
    chat.messages.push({ sender: "bot", text: reply, timestamp: new Date() });
    await user.save();

    res.json({ reply, chatId: chat._id });

  } catch (err) {
    // Log the detailed error from the Gemini API if it exists
    console.error("Gemini API error:", err.response ? err.response.data : err.message);
    res.status(500).json({ message: "Error communicating with Gemini API" });
  }
};


// Function 5: Delete a chat (Unchanged)
exports.deleteChat = async (req, res) => {
  try {
    const { userId } = req.user;
    const { chatId } = req.params;

    const result = await User.updateOne(
      { _id: userId },
      { $pull: { chats: { _id: chatId } } } 
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Chat not found or user does not own this chat" });
    }

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ message: "Server error while deleting chat" });
  }
};
