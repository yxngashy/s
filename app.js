const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');

const app = express();
const port = 3000;


// Get the absolute path of the database file
const dbPath = path.resolve(__dirname, 'studietid.db');
console.log(`Connecting to database at: ${dbPath}`);

// Koble til databasen
const db = sqlite3(dbPath, { verbose: console.log });

// Verify database connection and table existence
try {
    const verifyUserTableStmt = db.prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?');
    const userTableExists = verifyUserTableStmt.get('table', 'user');
    if (!userTableExists) {
        console.error('Table "user" does not exist in the database.');
        process.exit(1); // Exit the process if the table does not exist
    } else {
        console.log('Table "user" exists in the database.');
    }

    // Ensure the activity table exists
    const createActivityTableStmt = `
        CREATE TABLE IF NOT EXISTS activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            activity TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.exec(createActivityTableStmt);
    console.log('Table "activity" exists or has been created.');
} catch (error) {
    console.error('Error verifying table existence:', error.message);
    process.exit(1); // Exit the process if there is an error
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // For å servere statiske filer (HTML, CSS, JS)
app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Passport configuration
passport.use(new GoogleStrategy({
    clientID: '201121203283-62chjl96av2ump93dra8viasn021fbp8.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;
    const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
    let user = stmt.get(email);
    if (!user) {
        const insertStmt = db.prepare('INSERT INTO user (firstName, lastName, email) VALUES (?, ?, ?)');
        insertStmt.run(profile.name.givenName, profile.name.familyName, email);
        user = stmt.get(email);
    }
    return done(null, user);
}));

passport.serializeUser((user, done) => {
    done(null, user.email);
});

passport.deserializeUser((email, done) => {
    const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
    const user = stmt.get(email);
    done(null, user);
});

// Hjemmeside (HTML)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/user', ensureAuthenticated, (req, res) => {
    res.render('user', { user: req.user });
});

// Google authentication routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/user');
    }
);

// Legg til bruker
app.post('/addUser', (req, res) => {
    const { firstName, lastName, idRole, email } = req.body;
    const userId = uuidv4(); // Generate a unique user ID
    console.log(`Attempting to add user with ID: ${userId}`);
    const result = addUser(firstName, lastName, idRole, email);
    res.send(result ? `Bruker lagt til med ID: ${userId}` : 'Feil ved å legge til bruker');
    
});

// Function add user to the database
function addUser(firstName, lastName, idRole, email) {
    try {
        // Check if email already exists
        const checkEmailStmt = db.prepare('SELECT COUNT(*) AS count FROM user WHERE email = ?');
        const emailExists = checkEmailStmt.get(email).count > 0;

        if (emailExists) {
            console.error('Error adding user: Email already exists');
            return false;
        }

        const stmt = db.prepare('INSERT INTO user (firstName, lastName, idRole, email) VALUES (?, ?, ?, ?)');
        stmt.run(firstName, lastName, idRole, email);
        console.log(`User added with email: ${email}`);
        return true;
    } catch (error) {
        console.error('Error adding user:', error.message);
        return false;
    }
}

// Login user
// Login user
app.post('/login', (req, res) => {
    const { email } = req.body;
    // Log user login
    const user = finduser(email);

    // Check if user exists
    if (user) {
        // Log the user login
        logger.info(`User logged in: ${email}, Hardcoded ID: 1`);

        // Return the hardcoded user ID (1)
        res.json({
            message: 'Login successful',
            userId: 1, // Hardcoded ID
            userEmail: user.email
        });
    } else {
        // Log if user not found
        logger.warn(`Login failed: User not found for email: ${email}`);
        
        // Respond with error
        res.status(404).json({
            message: 'User not found'
        });
    }
});


function finduser(email) {
    const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
    const user = stmt.get(email);
    return user;
}

// Write content
app.post('/write', (req, res) => {
    const { email, content } = req.body;
    // Log user writing activity
    logger.info(`User wrote content: ${email}, Content: ${content}`);
    res.send('Content saved');
});

// Route handler to update user information
app.post('/update-user', (req, res) => {
    const { email, firstName, lastName } = req.body;
    try {
        const stmt = db.prepare('UPDATE user SET firstName = ?, lastName = ? WHERE email = ?');
        stmt.run(firstName, lastName, email);
        res.redirect(`/user?email=${email}`);
    } catch (error) {
        console.error('Error updating user:', error.message);
        res.status(500).send('Error updating user');
    }
});

// Register activity
// Register activity
app.post('/regActivity', (req, res) => {
    const userId = 1; // Hardcoded userId
    const { activity, startTime } = req.body;

    // Validate inputs
    if (!activity || typeof activity !== 'string') {
        return res.status(400).send('Invalid activity');
    }
    if (!startTime) {
        return res.status(400).send('startTime is required');
    }

    // Convert startTime to a string if it's not already
    const formattedStartTime = new Date(startTime).toISOString();

    const stmt = db.prepare("INSERT INTO activity (userId, activity, formattedStartTime) VALUES (?, ?, ?)");
    try {
        stmt.run(userId, activity, formattedStartTime);
        res.send('Activity logged successfully');
    } catch (err) {
        console.error('Error registering activity:', err.message);
        res.status(500).send('Error registering activity');
    }

    console.log('userId:', userId);
    console.log('activity:', activity);
    console.log('formattedStartTime:', formattedStartTime);
});



function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        console.log('User is authenticated:', req.user);
        if (req.user.idRole === 'admin') {
            return next();
        } else {
            console.log('User is not an admin:', req.user);
            return res.status(403).send('Access denied');
        }
    }
    console.log('User is not authenticated');
    res.redirect('/');
}

// Admin page to view activities
app.get('/admin', ensureAuthenticated, (req, res) => {
    try {
        const stmt = db.prepare('SELECT * FROM activity');
        const activities = stmt.all();
        res.render('admin', { activities: activities });
    } catch (error) {
        console.error('Error fetching activities:', error.message);
        res.status(500).send('Error fetching activities');
    }
});


app.get('/admin/logs', (req, res) => {
    const logFilePath = path.join(__dirname, 'user-activity.log');
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading log file');
        }
        res.send(`<pre>${data}</pre>`);
    });
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// Delete user
app.post('/deleteUser', (req, res) => {
    const { firstName, lastName, isAdmin, email } = req.body;
    try {
        const stmt = db.prepare('DELETE FROM user WHERE firstName = ? AND lastName = ? AND isAdmin = ? AND email = ?');
        stmt.run(firstName, lastName, isAdmin, email);
        res.send('Bruker slettet');
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).send('Error deleting user');
    }
});

// Get user
app.post('/getUser', (req, res) => {
    const { email } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM user WHERE email = ?');
        const user = stmt.get(email);
        if (user) {
            res.json(user);
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error fetching user:', error.message);
        res.status(500).send('Error fetching user');
    }
});



app.listen(port, () => {
    console.log(`Server kjører på http://localhost:${port}`);
});