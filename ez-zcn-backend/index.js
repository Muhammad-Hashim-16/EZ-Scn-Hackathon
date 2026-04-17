const express = require('express');
const supabase = require('./supabaseClient'); // Import the client
const app = express();

app.use(express.json());

// Example: Fetch data from a table called 'users'
app.get('/users', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));