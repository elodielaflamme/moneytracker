const express = require('express');
const cors = require('cors');
const path = require('path');

require('./database');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/ventes', require('./routes/ventes'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/content', require('./routes/content'));
app.use('/api/suivis', require('./routes/suivis'));
app.use('/api/achats', require('./routes/achats'));
app.use('/api/stats', require('./routes/stats'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
