const express = require('express');
const request = require('request');
const querystring = require('querystring');
const crypto = require('crypto');
require('dotenv').config({ path: './.env' });

const app = express();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

const generateRandomString = (length) => {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
};

// Function to handle token exchange
const getAccessToken = (code, callback) => {
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
        },
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
        },
        json: true
    };

    request.post(authOptions, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            callback(error || new Error('Failed to obtain access token'), null);
        } else {
            callback(null, body);
        }
    });
};

app.get('/', (req, res) => {
    const state = generateRandomString(16);
    const scope = 'user-read-private user-read-email ugc-image-upload playlist-read-private playlist-read-collaborative playlist-modify-private user-read-recently-played user-library-modify user-library-read';

    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', (req, res) => {
    const code = req.query.code || null;
    const state = req.query.state || null;

    if (state === null) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        getAccessToken(code, (error, body) => {
            if (error) {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            } else {
                const access_token = body.access_token;
                const refresh_token = body.refresh_token;

                const options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // Make the request to get user profile data
                request.get(options, (error, response, body) => {
                    console.log(body);
                });

                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            }
        });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Client ID:', process.env.CLIENT_ID);
    console.log('Redirect URI:', process.env.REDIRECT_URI);
});
