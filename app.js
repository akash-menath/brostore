let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let hbs = require('express-handlebars')
let session = require('express-session')
let nocache = require('nocache')
let fileUpload = require('express-fileupload');
let handlebars = require('handlebars')
let dotenv = require('dotenv')
dotenv.config()

let usersRouter = require('./routes/users');
let adminRouter = require('./routes/admin');

let db = require('./config/connection')

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({
  helpers: {
    inc: (value) => {
      return parseInt(value) + 1;
    }
  },
  extname: 'hbs', layoutsDir: __dirname + '/views/layout/', userDir: __dirname + '/views/user/', adminDir: __dirname + '/views/admin/'
}))

handlebars.registerHelper("when", function (operand_1, operator, operand_2, options) {
  var operators = {
    'eq': function (l, r) { return l == r; },
    'noteq': function (l, r) { return l != r; },
    'gt': function (l, r) { return Number(l) > Number(r); },
    'or': function (l, r) { return l || r; },
    'and': function (l, r) { return l && r; },
    '%': function (l, r) { return (l % r) === 0; }
  }
    , result = operators[operator](operand_1, operand_2);

  if (result) return options.fn(this);
  else return options.inverse(this);
});

app.use(session({ secret: 'key', resave: false, saveUninitialized: true, cookie: { maxAge: 12000000 } }))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
db.connect((err => {
  if (err) {
    res.render('error', { layout: 'admin-layout' });
    console.log('connection error' + err);
  }else{
  console.log('database connected');
} 
}))
app.use(nocache())
app.use(fileUpload());

app.use('/', usersRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', { layout: 'admin-layout' });
});

module.exports = app;
