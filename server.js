const express = require("express")
const app = express()
const MongoClient = require("mongodb").MongoClient
const methodOverride = require("method-override")
const passport = require("passport")
const localStrategy = require("passport-local").Strategy
const session = require("express-session")
require("dotenv").config()
const bson = require("bson")

// soket.io 세팅
const http = require("http").createServer(app)
const { Server } = require("socket.io")
const io = new Server(http)


// ejs 라이브러리및 미들웨어 등록.
app.set("view engine", "ejs")
// 나는 static파일을 보관하기 위해 public 폴더를 쓸거다 라는 middle ware
app.use("/public", express.static("public"))
// method-override 라이브러리 등록
app.use(methodOverride("_method"))
// 인증관련 미들웨어 등록
app.use(session({ secret: process.env.SESSION_SECRET, resave: true, saveUninitialized: false })) // secret 속성은 세션을 만들때 적용되는 비밀번호
app.use(passport.initialize())
app.use(passport.session())
app.use(express.urlencoded({ extended: true }))

// // 현재 시간정보를 리턴해주는 함수
// function getCurrentDate(){
//   var date = new Date();
//   var year = date.getFullYear();
//   var month = date.getMonth();
//   var today = date.getDate();
//   var hours = date.getHours();
//   var minutes = date.getMinutes();
//   var seconds = date.getSeconds();
//   var milliseconds = date.getMilliseconds();
//   return new Date(Date.UTC(year, month, today, hours, minutes, seconds, milliseconds));
// }


// // 오늘 자정을 리턴해주는 함수
// function getYesterdayMidnight(){
//   var date = new Date();
//   var year = date.getFullYear();
//   var month = date.getMonth();
//   var today = date.getDate();
//   var hours = date.getHours();
//   var minutes = date.getMinutes();
//   var seconds = date.getSeconds();
//   var milliseconds = date.getMilliseconds();
//   return new Date(Date.UTC(year, month, today));
// }

// DB접속이 완료되면 8080포트로 서버 연결시키삼!
MongoClient.connect(process.env.DB_URL, (e, client) => {
  // 예외 처리
  if(e) {
    return console.log(e)
  }
  db = client.db("zolzack") //todoapp 이라는 database(폴더)에 연결좀요

  http.listen(process.env.PORT, () => {
    console.log("listening on 8080")
  })
})

// 현재 시간정보를 리턴해주는 함수
function getCurrentDate(){
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth();
  var today = date.getDate();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  var milliseconds = date.getMilliseconds();
  return new Date(Date.UTC(year, month, today, hours, minutes, seconds, milliseconds));
}


// 오늘 자정을 리턴해주는 함수
function getYesterdayMidnight(){
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth();
  var today = date.getDate();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  var milliseconds = date.getMilliseconds();
  return new Date(Date.UTC(year, month, today));
}





// ID/PW 검사해주는 세부코드.
// 직접 창조해서 작성하기 어려우니 그냥 복붙 하고 원하는 부분 수정하는 식으로 접근하면 충분. 
passport.use(new localStrategy({
  usernameField: 'id',    // name속성의 값(<input type="text" class="form-control" name="id">) => 사용자가 제출한 ID가 어디 적혀 있는지
  passwordField: 'pw',    // name속성의 값(<input type="password" class="form-control" name="pw">) => 사용자가 제출한 pw가 어디적혀 있는지
  session: true,          // user의 세션정보 저장유무.
  passReqToCallback: false,   // ID/PW 말고도 다른 정보 검증시 true로 설정.
  // ID/PW 맞는지 DB와 비교하는 코드.
}, function (inputedID, inputedPW, done) {
  //console.log(inputedID, inputedPW);
  db.collection('login').findOne({ id: inputedID }, function (error, result) {
    if (error) return done(error)

    if (!result) return done(null, false, { message: 'This ID does not exist' })
    // 처음 ID를 검사하고 db랑 일치하는 id가 있다하면 pw검사 실시.
    if (inputedPW == result.pw) {
      return done(null, result)
    } else {
      return done(null, false, { message: 'This Password is wrong' })
    }
  })
}));


// 사용자의 로그인을 유지시키기 위한 세션데이터 만들기.
passport.serializeUser((user, done) => {      
  done(null, user.id)       // user.id를 이용해서 세션을 만듦 -> 그 세션데이터의 id를 쿠키로 만들어서 브라우저에 보내줌.(로그인 성공시 발동)
})
// 세션id로 로그인한 유저의 개인정보를 DB에서 찾는 역할(마이페이지 접속시 발동.)
passport.deserializeUser((id, done) => {    // 여기서 파라미터 id는 serialluzeUser()함수가 보내준 user.id가 그대로 들어감.
  // DB에서 위에있던 user.id로 유저를 찾은 뒤에 유저정보를 done(null, {요기에 넣음.})
  db.collection("login").findOne({ id: id }, (error, result) => {
    done(null, result)    // 이 result 가 req.user로 저장되고 -> mypage에서 req.user를 쓸 수 있음.
    
  })
})


// 로그인 여부를 검사해주는 미들웨어
function isLogin(req, res, next) {
  if (req.user) {     // 로그인 후 세션이 쿠키에 존재하면 req.user가 항상있음
    next()
  } else {
    res.send("<script>alert('로그인 해주십시오.');location.href='/login';</script>");
  }
}




app.get("/", isLogin, (req, res, next) => {
  db.collection("post").find({ date: { $gte: getYesterdayMidnight() }}).sort({ date: -1 }).toArray((error, result) => {
    res.render("home.ejs", { posts: result })
  })
})


app.get("/write", isLogin, (req, res, next) => {
  res.render("write.ejs")
})


app.get("/history", isLogin, (req, res, next) => {
  db.collection("post").find({ date: {$lt: getYesterdayMidnight()} }).sort({ date: -1 }).toArray((error, result) => {
    res.render("history.ejs", { posts: result })
  })
})


app.get("/HallOfFame", isLogin, (req, res, next) => {
  res.render("halloffame.ejs")
})


// 마이페이지 만들기.
app.get("/mypage", isLogin, (req, res, next) => {     // 마이파이지 접속 시 isLogin 함수(미들웨어)가 실행되고 실행이 성공적일 경우 res.render()실행시킴.
  db.collection("post").find({ username: req.user.username }).sort({ date: -1 }).toArray((error, result) => {
    res.render("mypage.ejs", { userInfo: req.user, posts: result })    // 여기서 req.user는 deserializeUser가 보내준 로그인한 유저의 데이터.
  })
})


app.get("/login", (req, res, next) => {
  res.render("login.ejs")
})


app.post("/add", (req, res, next) => {
  
  let date = new Date()
  let dateToString = `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시 ${date.getMinutes()}분`
  db.collection("post").insertOne({ 
    world: [req.body.world1, req.body.world2, req.body.world3], 
    meaning: [req.body.meaning1, req.body.meaning2, req.body.meaning3],
    // date: getCurrentDate(),
    date: getCurrentDate(),
    dateToString: dateToString,
    username: req.user.username
  }, 
    (error, result) => {
    if(error) {
      console.log(error)
    } else {
      console.log("저장 완료!")
    }
  })
  
  res.redirect("/")
})


// login 페이지의 post요청.
app.post("/login", passport.authenticate("local", {
  failureRedirect: "/fail"  // local 방식으로 회원인지 인증해주세요~ 그리고 로그인에 실해하면 /fail 경로로 이동시켜 주세요~
}), (req, res, next) => {
  res.redirect("/") // 로그인 성공 시 루트경로로 이동시켜주세요~
})

// 로그인 실패시 redirect 되는 /fail 경로 만들기
app.get("/fail", (req, res, next) => {
  console.log("401-Unauthorized")
  res.send("<script>alert('아이디 혹은 비빌번호가 잘못되었습니다.\\n다시 로그인해 주십시오.');location.href='/login';</script>");
})


// /signup 경로로 post요청
app.post("/signup", (req, res, next) => {
  db.collection("login").findOne({ $or: [{id: req.body.id}, {username: req.body.username}] }, (error, result) => {
    console.log(result)
    if(!result) {
      db.collection("login").insertOne({
        id: req.body.id,
        pw: req.body.pw,
        username: req.body.username
      })
      res.send("<script>alert('회원가입이 완료되었습니다!\\n로그인 해주십시오.');location.href='/login';</script>");
    } else if (result.id === req.body.id) {      
      res.send("<script>alert('중복된 아이디 입니다.\\n다른 아이디를 입력해주세요.');location.href='/login';</script>");
    } else if (result.username === req.body.username) {      
      res.send("<script>alert('중복된 닉네임 입니다.\\n다른 닉네임을 입력해주세요.');location.href='/login';</script>");
    }
})
})


// /logout 기능 라우팅
app.post("/logout", isLogin, (req, res, next) => {
  req.session.user = null
  req.session.save(function (err) {
    if (err) next(err)

    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(function (err) {
      if (err) next(err)
      res.send("<script>alert('로그아웃이 완료되었습니다.');location.href='/login';</script>");
    })
  })
})

app.delete("/delete", (req, res, next) => {
  console.log(req.body._id)
  // req.body._id = parseInt(req.body._id)  // "string" 자료형을 정수자료형으로 변환.
  // 이걸 deleteOne()에 넣으면 _id가 일치하는것과 username이 일치하는 것 둘 다 만족하는 게시물을 찾아서 지워줌.
  let dataToDelete = { _id: bson.ObjectId(req.body._id), username: req.user.username }  
  // req.body에 담겨온 게시물번호와 req.user.username이 일치하는 게시글을 db에서 찾아서 삭제해 주삼!
  db.collection("post").deleteOne(dataToDelete, (error, result) => {
    if(error) {
      console.log(error)
    } else {
      console.log("delete completed")
      res.status(200).send({ message: "completed!" })
    }
  })
})

app.get("/chat", isLogin, (req, res, next) => {
  db.collection("post").find({ date: { $gte: getYesterdayMidnight() }}).sort({ date: -1 }).toArray((error, result1) => {
    db.collection("chat").find({}).sort({ _id: -1 }).toArray((error, result) => {
      let date = new Date()
      let dateToString = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
      res.render("chat.ejs", { username: req.user.username, data: result, dateToString: dateToString, posts: result1 })
    })
  })
})

// WebSocket 접속시 서버가 무언가를 실행하기 위한 코드.
io.on("connection", (socket) => {
  console.log("User Connected")

  // 서버에서 클라이언트가 보낸 메시지를 수신하기 위함.
  socket.on("user-send", (data) => {  // 누가 'user-send'이름으로 데이터를 보내면 내부 코드 실행시켜주셈.
    // 서버 -> 유저 메시지 전송
    io.emit("broadcast", data)
    let date = new Date()
    let dateToString = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
    db.collection("chat").insertOne({
      message: data,
      dateToString: dateToString
    })
  }) 
})



