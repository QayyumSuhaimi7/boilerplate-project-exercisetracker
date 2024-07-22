const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware setup
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

// Mongoose Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json(savedUser);
  } catch (error) {
    res.status(400).json({ error: 'Username already taken' });
  }
});

// Get a list of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username'); // Select only _id and username fields
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: 'Error fetching users' });
  }
});

// Add exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  
  let exerciseDate = date ? new Date(date) : new Date();
  
  try {
    const exercise = new Exercise({
      userId,
      description,
      duration,
      date: exerciseDate
    });
    const savedExercise = await exercise.save();
    const user = await User.findById(userId);
    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString()
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid user ID or data' });
  }
});

// Get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;
  
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query = { userId };
    if (from) query.date = { $gte: new Date(from) };
    if (to) query.date = { ...query.date, $lte: new Date(to) };

    const exercises = await Exercise.find(query).limit(parseInt(limit));
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (error) {
    res.status(400).json({ error: 'Invalid user ID or query parameters' });
  }
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
