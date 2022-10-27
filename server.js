const express = require("express")
const app = express()
const MongoClient = require("mongodb").MongoClient
const methodOverride = require("method-override")
const passport = require("passport")
const localStrategy = require("passport-local").Strategy
const session = require("express-session")
require("dotenv").config()

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


app.listen(8080, () => {
  console.log("listending on 8080")
})