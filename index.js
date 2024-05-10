const express = require('express');
const { check, validationResult } = require('express-validator');
const upload = require('express-fileupload');
const path = require('path');
var myApp = express();
const session = require('express-session');

// Setup Database Connection
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/blog');

// Setup Model for Collection
const Admin = mongoose.model('admin', {
    username : String,
    password : String
});

// Setup Model for Collection
const blogdata = mongoose.model("content", {
    pagetitle : String,
    imageName : String,
    imageType : String,
    imageSize : Number,
    content   : String  
});


// Setup Session Parameters
myApp.use(session({
    secret : 'thisisnilaypatelsecretkey',
    resave : false,
    saveUninitialized : true
}));

myApp.use(express.urlencoded( { extended: true } ));


myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname + '/public/'));
myApp.use('/public/images/', express.static('./public/images'));
myApp.set('view engine', 'ejs');
myApp.use(upload());

// Set Different Routes
myApp.get('/', function(req, res) {
    res.render('home');
});

myApp.get('/about', function(req, res) {
    res.render('about');
});

myApp.post('/login', (req, res) => {
    // Read Values from Form
    var user = req.body.username;
    var pass = req.body.password;

    // Validate Form Values with Database
    Admin.findOne({ username: user, password: pass })
    .then((admin) => {
        if(admin){
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            res.redirect('dashboard');
        }
        else {
            res.render('home', {error: "Sorry Login Failed. Please Try Again!"});
        }            
    }).catch((err) => {
        console.log(`Error: ${err}`);
    });
});


myApp.get('/logout', (req, res) => {
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.render('home', {error: "Logout Successfully!"});
});

myApp.get('/dashboard', function(req, res) {
    const username = req.session.username;
    if(req.session.userLoggedIn)
    {
    // Fetch all blogs from the database
    blogdata.find({})
    .then((blogs) => {
        res.render('dashboard', { blogs: blogs, username: username });
    })
    .catch((err) => {
        console.log("Error fetching blogs:", err);
        res.status(500).send("Internal Server Error");
    });
    }
    else
    {
        res.redirect('/');
    }
});

myApp.get('/addpage', function(req, res) {
    const username = req.session.username;
    if(req.session.userLoggedIn)
    {
    res.render('addpage');
    }
    else
    {
        res.redirect('/');
    }
});
myApp.get('/team', function(req, res) {
    res.render('team');
}); 
myApp.get('/contact', function(req, res) {
    res.render('contact');
});

myApp.post('/savedata',[ 
    check('pagetitle', 'Page title is required').notEmpty(),
    check('content', 'content is required').notEmpty()
], 

function(req, res)

{
const errors = validationResult(req);
if (!errors.isEmpty()) {
    return res.render('addpage', { errors: errors.array() });
}

    var pagetitle = req.body.pagetitle;
    var image = req.files.myImage;
    var imageName = image.name;
    var imagePath = 'public/images/' + imageName;
    var content = req.body.content; 

    image.mv(imagePath, (err) => {
        if(err) {
            console.log(`Error: ${err}`);
            res.send(err);
        } else {
            var pageData = {
                pagetitle: pagetitle, 
                imageName: imageName,
                imageType: image.mimetype,
                imageSize: image.size,
                content: content
            }

            var myPage = new blogdata(pageData); 
            myPage.save()
            .then(() => {
                console.log("File data saved in database!");
                res.redirect('/addpage'); 
            })
            .catch((err) => {
                console.log(`Error saving data: ${err}`);
                res.send(err);
            });
        }
    });
});

myApp.get('/pages', function(req, res) {
    const username = req.session.username;
    if(req.session.userLoggedIn)
    {
    // Fetch page titles from the content collection
    blogdata.find({}, 'pagetitle')
    .then((pages) => {
        // Render the pages template and pass the page titles
        res.render('pages', { pages: pages });
    })
    .catch((err) => {
        console.log("Error fetching page titles:", err);
        res.status(500).send("Internal Server Error");
    }); 
    }
    else
    {
        res.redirect('/');
    
    }
});

myApp.route('/editpages/:pagetitle')
    .get(function(req, res) {
        blogdata.findOne({ pagetitle: req.params.pagetitle })
        .then((page) => {
            res.render('editpages', { page: page });
        })
        .catch((err) => {
            console.log("Error fetching page:", err);
            res.status(500).send("Internal Server Error");
        }); 
    })
    .post(function(req, res) {

        const newPageTitle = req.body.pagetitle;
        const newPageContent = req.body.content;

        blogdata.findOneAndUpdate(
            { pagetitle: req.params.pagetitle }, 
            { pagetitle: newPageTitle, content: newPageContent }
        )
        .then(() => {

            res.redirect('/pages');
        })
        .catch((err) => {
            console.log("Error updating page:", err);
            res.status(500).send("Internal Server Error");
        });
    });


myApp.get('/editpages', function(req, res) {
    
    res.render('editpages');
});

// Route handler for deleting a page
myApp.get('/deletepage/:pagetitle', function(req, res) {
    // Delete the page with the specified title from the content collection
    blogdata.deleteOne({ pagetitle: req.params.pagetitle })
    .then(() => {
        res.redirect('/pages');
    })
    .catch((err) => {
        console.log("Error deleting page:", err);
        res.status(500).send("Internal Server Error");
    });
});

// Execute Website Using Port Number for Localhost
myApp.listen(8080, () => {
    console.log('Website Executed Sucessfully....Open Using http://localhost:8080/');
});
