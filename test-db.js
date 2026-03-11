const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/trudesk';
console.log('Attempting to connect to:', uri);

mongoose.connect(uri, { connectTimeoutMS: 5000 })
  .then(() => {
    console.log('Successfully connected to MongoDB');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
