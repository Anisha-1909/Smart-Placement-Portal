const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://bharathi02072004_db_user:<Tbharathi2004>@cluster0.7hdnrn9.mongodb.net/?appName=Cluster0')
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
const StudentSchema = new mongoose.Schema({
  name: String,
  email: String
});

const Student = mongoose.model('Student', StudentSchema);
app.post('/register', async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.send("Student Registered Successfully");
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/students', async (req, res) => {
  const data = await Student.find();
  res.json(data);
});

app.get('/', (req, res) => {
  res.send("Server Working");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});