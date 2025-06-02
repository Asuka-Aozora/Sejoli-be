require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
 const PORT = process.env.PORT || 3000;
//const PORT = 1111;

// Middleware
app.use(cors({ origin: "http://server.local:8082" }));
app.use(bodyParser.json());

// Register routes
const routes = require('./common/routes');
app.use('/', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
