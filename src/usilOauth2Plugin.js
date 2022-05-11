const session = require("express-session");
const Oauth2Controller = require("./Oauth2Controller.js");

const usilOauth2Plugin = (expressApplication, serverSettings, logger) => {
  const sessionSettings = {
    saveUninitialized: false,
    secret: serverSettings.sessionSecret,
    resave: false,
    cookie: {
      secure: false,
      maxAge: serverSettings.cookieMaxAge || 60000,
    },
  };

  if (serverSettings.useHttpsInSession) {
    expressApplication.set("trust proxy", 1);
    sessionSettings.cookie.secure = true;
  }

  expressApplication.use(session(sessionSettings));

  const oauth2Controller = new Oauth2Controller(serverSettings, logger);

  expressApplication.get("/oauth2/ping", oauth2Controller.ping);

  expressApplication.get("/oauth2/callback", oauth2Controller.callback);

  expressApplication.get("/oauth2/logout", oauth2Controller.logOut);

  expressApplication.get("/oauth2/login", oauth2Controller.logIn);

  expressApplication.get("/settings.json", oauth2Controller.passSignedUser);

  expressApplication.post(
    "/oauth2/token/refresh",
    oauth2Controller.refreshToken
  );

  expressApplication.get("*", oauth2Controller.oauth2Protection);
};

module.exports = usilOauth2Plugin;
