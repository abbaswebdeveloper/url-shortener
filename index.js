const express = require('express');
const cors = require('cors');
const dns = require('dns');
const url = require('url');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const shortid = require('shortid');

const app = express();

// Middleware
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage (for free tier - no database needed)
let urlDatabase = [];
let counter = 1;

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'URL Shortener Microservice',
    endpoints: {
      'POST /api/shorturl': 'Create short URL',
      'GET /api/shorturl/:short_url': 'Redirect to original URL'
    },
    example: {
      'POST /api/shorturl': {
        'body': { 'url': 'https://www.freecodecamp.org' },
        'response': { 
          'original_url': 'https://www.freecodecamp.org', 
          'short_url': 1 
        }
      },
      'GET /api/shorturl/1': 'Redirects to https://www.freecodecamp.org'
    }
  });
});

// URL validation function
function validateUrl(inputUrl) {
  try {
    // Check if URL is valid format
    if (!validUrl.isWebUri(inputUrl)) {
      return false;
    }
    
    // Parse URL to extract hostname
    const parsedUrl = new URL(inputUrl);
    const hostname = parsedUrl.hostname;
    
    return new Promise((resolve) => {
      // DNS lookup to verify the host exists
      dns.lookup(hostname, (err) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  } catch (error) {
    return Promise.resolve(false);
  }
}

// POST endpoint to create short URL
app.post('/api/shorturl', async (req, res) => {
  const { url: originalUrl } = req.body;
  
  if (!originalUrl) {
    return res.json({ error: 'invalid url' });
  }
  
  try {
    // Validate URL
    const isValid = await validateUrl(originalUrl);
    
    if (!isValid) {
      return res.json({ error: 'invalid url' });
    }
    
    // Check if URL already exists in database
    const existingUrl = urlDatabase.find(entry => entry.original_url === originalUrl);
    
    if (existingUrl) {
      return res.json({
        original_url: existingUrl.original_url,
        short_url: existingUrl.short_url
      });
    }
    
    // Create new short URL entry
    const newUrl = {
      original_url: originalUrl,
      short_url: counter
    };
    
    urlDatabase.push(newUrl);
    counter++;
    
    // Return response
    res.json({
      original_url: newUrl.original_url,
      short_url: newUrl.short_url
    });
    
  } catch (error) {
    res.json({ error: 'invalid url' });
  }
});

// GET endpoint to redirect using short URL
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortUrl = parseInt(req.params.short_url);
  
  if (isNaN(shortUrl)) {
    return res.json({ error: 'Wrong format' });
  }
  
  // Find URL in database
  const urlEntry = urlDatabase.find(entry => entry.short_url === shortUrl);
  
  if (!urlEntry) {
    return res.json({ error: 'No short URL found for the given input' });
  }
  
  // Redirect to original URL
  res.redirect(urlEntry.original_url);
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Server configuration
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`URL Shortener running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;