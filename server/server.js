const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 5000;
const passport = require('passport');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var GoogleStrategy = require('passport-google-oauth20').Strategy;

mongoose.connect(
	'mongodb://admin:thebible321@ds119800.mlab.com:19800/node-passport'
);

var userSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true
	},
	name: String
});

var User = mongoose.model('User', userSchema);

passport.use(
	new GoogleStrategy(
		{
			clientID:
				'1092663563958-5aloa56io0i6bag8g6oh4728qouof55b.apps.googleusercontent.com',
			clientSecret: '9hqoHyBp0nrv3-F1w-FNT390',
			callbackURL: 'http://localhost:5000/auth/google/callback'
		},
		function(accessToken, refreshToken, profile, cb) {
			console.log(profile);
			User.findOne({ email: profile.emails[0].value }, (err, user) => {
				if (user) {
					cb(null, profile);
				} else {
					let newUser = new User({
						email: profile.emails[0].value,
						name: profile.displayName
					});

					newUser.save();

					return cb(null, profile);
				}
			});
		}
	)
);

app.get(
	'/auth/google',
	passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/callback', function(req, res, next) {
	passport.authenticate('google', (err, user) => {
		if (err) {
			console.log(err);
		}

		var token = jwt.sign(user, 'mama', {
			expiresIn: '7d'
		});

		res.redirect(`http://localhost:3000/login?authcode=${token}`);
	})(req, res, next);
});

app.get('/auth/verify', (req, res, next) => {
	var token = req.headers.token;

	if (token) {
		jwt.verify(token, 'mama', function(err, decoded) {
			if (err) {
				res.status(400).json({
					success: false,
					message: 'Authentication Error: Invalid/No JWtoken Provided'
				});
			} else {
				// make sure user still exists
				console.log('decoded', decoded);
				User.findOne({ email: decoded.emails[0].value }, function(
					err,
					user
				) {
					if (!user) {
						res.status(400).json({
							success: false,
							message: 'User not found'
						});
					} else {
						// User exists, JWtoken valid: Success
						res.json({
							success: true,
							message: 'Success! JWtoken Valid',
							user: user._doc
						});
					}
				});
			}
		});
	} else {
		res.json({
			success: false,
			message: 'Authentication Error: Invalid/No JWtoken Provided'
		});
	}
});

app.get('/api/hello', (req, res) => {
	res.send({ express: 'Hello From Express' });
});

app.listen(port, () => console.log(`Listening on port ${port}`));
