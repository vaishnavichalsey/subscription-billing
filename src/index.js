const express = require('express');
const bodyParser = require('body-parser');
const usersRouter = require('./routes/users');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.use('/users', usersRouter);

// POST /usage endpoint (top-level)
const usageController = require('./controllers/usageController');
app.post('/usage', usageController.createUsage);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
